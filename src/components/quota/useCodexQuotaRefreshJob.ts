import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  captureQuotaCacheGeneration,
  commitIfQuotaCacheCurrent,
  useCodexQuotaJobStore,
  useQuotaStore,
} from '@/stores';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  cancelCodexQuotaJobAtConnection,
  codexQuotaJobsApi,
  pollCodexQuotaJobAtConnection,
  type CodexQuotaJobConnection,
  type CodexQuotaJobSummary,
} from '@/services/api';
import type { AuthFileItem } from '@/types';
import { getStatusFromError } from '@/utils/quota';
import {
  addCodexQuotaJobLocalFailures,
  applyCodexQuotaJobLocalFailures,
  applyCodexQuotaJobResultBatch,
  createCodexQuotaJobProgress,
  partitionCodexQuotaJobTargets,
  reduceCodexQuotaJobProgress,
} from './codexQuotaJobState';

const POLL_INTERVAL_MS = 1000;
const MAX_TRANSIENT_POLL_FAILURES = 3;

interface ActiveCodexQuotaJobRun {
  jobId: string;
  controller: AbortController;
  cacheGeneration: number;
  appliedSeq: number;
  targetNamesByAuthIndex: Map<string, string>;
  filesByName: Map<string, AuthFileItem>;
  localFailures: number;
  connection: CodexQuotaJobConnection;
}

let activeRun: ActiveCodexQuotaJobRun | null = null;
let startInFlight = false;

const waitForNextPoll = (signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timeout = window.setTimeout(resolve, POLL_INTERVAL_MS);
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeout);
        resolve();
      },
      { once: true }
    );
  });

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError');

export function useCodexQuotaRefreshJob() {
  const { t } = useTranslation();
  const cacheGeneration = useQuotaStore((state) => state.cacheGeneration);
  const setCodexQuota = useQuotaStore((state) => state.setCodexQuota);
  const progress = useCodexQuotaJobStore((state) => state.progress);
  const starting = useCodexQuotaJobStore((state) => state.starting);
  const active = useCodexQuotaJobStore((state) => state.active);
  const inventorySyncContext = useCodexQuotaJobStore((state) => state.inventorySyncContext);
  const remoteTerminalJobId = useCodexQuotaJobStore((state) => state.remoteTerminalJobId);
  const setProgress = useCodexQuotaJobStore((state) => state.setProgress);
  const setStarting = useCodexQuotaJobStore((state) => state.setStarting);
  const setActive = useCodexQuotaJobStore((state) => state.setActive);
  const setInventorySyncContext = useCodexQuotaJobStore((state) => state.setInventorySyncContext);
  const confirmRemoteTerminal = useCodexQuotaJobStore(
    (state) => state.confirmRemoteTerminal
  );
  const clearInventorySyncContext = useCodexQuotaJobStore(
    (state) => state.clearInventorySyncContext
  );
  const resetProgress = useCodexQuotaJobStore((state) => state.reset);

  const finishWithError = useCallback(
    (run: ActiveCodexQuotaJobRun, error: unknown) => {
      if (activeRun !== run) return;
      activeRun = null;
      setActive(false);
      setProgress((current) => ({
        ...current,
        status: 'error',
        error: error instanceof Error ? error.message : t('common.unknown_error'),
      }));
    },
    [setActive, setProgress, t]
  );

  const poll = useCallback(
    async (run: ActiveCodexQuotaJobRun) => {
      let transientFailures = 0;
      const cancelIfStale = (): boolean => {
        if (captureQuotaCacheGeneration() === run.cacheGeneration) return false;
        run.controller.abort();
        activeRun = null;
        void cancelCodexQuotaJobAtConnection(run.jobId, run.connection).catch(() => undefined);
        resetProgress();
        return true;
      };
      while (!run.controller.signal.aborted && activeRun === run) {
        if (cancelIfStale()) return;
        try {
          const response = await pollCodexQuotaJobAtConnection(
            run.jobId,
            run.appliedSeq,
            run.connection,
            run.controller.signal
          );
          transientFailures = 0;
          if (run.controller.signal.aborted || activeRun !== run) return;
          if (cancelIfStale()) return;

          let nextAppliedSeq = run.appliedSeq;
          commitIfQuotaCacheCurrent(run.cacheGeneration, () => {
            setCodexQuota((previous) => {
              const applied = applyCodexQuotaJobResultBatch({
                quota: previous,
                appliedSeq: run.appliedSeq,
                targetNamesByAuthIndex: run.targetNamesByAuthIndex,
                filesByName: run.filesByName,
                results: response.results,
                t,
              });
              nextAppliedSeq = applied.appliedSeq;
              return applied.quota;
            });
          });
          run.appliedSeq = nextAppliedSeq;
          const progressResponse = addCodexQuotaJobLocalFailures(response, run.localFailures);
          setProgress((current) => reduceCodexQuotaJobProgress(current, progressResponse));

          const terminal = response.status === 'completed' || response.status === 'cancelled';
          if (terminal && response.results.length === 0) {
            activeRun = null;
            confirmRemoteTerminal(run.jobId);
            setActive(false);
            return;
          }
          if (!terminal) await waitForNextPoll(run.controller.signal);
        } catch (error: unknown) {
          if (run.controller.signal.aborted || isAbortError(error)) return;
          if (cancelIfStale()) return;
          const status = getStatusFromError(error);
          transientFailures += 1;
          if (status !== undefined || transientFailures >= MAX_TRANSIENT_POLL_FAILURES) {
            finishWithError(run, error);
            return;
          }
          await waitForNextPoll(run.controller.signal);
        }
      }
    },
    [
      confirmRemoteTerminal,
      finishWithError,
      resetProgress,
      setActive,
      setCodexQuota,
      setProgress,
      t,
    ]
  );

  const start = useCallback(
    async (targets: AuthFileItem[]): Promise<CodexQuotaJobSummary> => {
      if (activeRun || startInFlight) {
        throw new Error(t('quota_management.refresh_job_already_running'));
      }
      const startGeneration = captureQuotaCacheGeneration();
      const { targetNamesByAuthIndex, filesByName, invalidFiles } =
        partitionCodexQuotaJobTargets(targets);
      const missingAuthIndexMessage = t('codex_quota.missing_auth_index');
      if (invalidFiles.length > 0) {
        commitIfQuotaCacheCurrent(startGeneration, () => {
          setCodexQuota((previous) =>
            applyCodexQuotaJobLocalFailures(previous, invalidFiles, missingAuthIndexMessage)
          );
        });
      }
      if (targetNamesByAuthIndex.size === 0) throw new Error(missingAuthIndexMessage);

      const authState = useAuthStore.getState();
      const connection = {
        apiBase: authState.apiBase,
        managementKey: authState.managementKey,
      };
      startInFlight = true;
      setStarting(true);
      let summary: CodexQuotaJobSummary;
      try {
        summary = await codexQuotaJobsApi.create([...targetNamesByAuthIndex.keys()]);
      } finally {
        startInFlight = false;
        setStarting(false);
      }
      if (captureQuotaCacheGeneration() !== startGeneration) {
        void cancelCodexQuotaJobAtConnection(summary.jobId, connection).catch(() => undefined);
        throw new Error(t('quota_management.refresh_job_connection_changed'));
      }
      const localFailures = invalidFiles.length;
      const run: ActiveCodexQuotaJobRun = {
        jobId: summary.jobId,
        controller: new AbortController(),
        cacheGeneration: startGeneration,
        appliedSeq: 0,
        targetNamesByAuthIndex,
        filesByName,
        localFailures,
        connection,
      };
      activeRun = run;
      setInventorySyncContext({
        jobId: summary.jobId,
        targetNames: [...filesByName.keys()],
      });
      setActive(true);
      const progressSummary = addCodexQuotaJobLocalFailures(summary, localFailures);
      setProgress(createCodexQuotaJobProgress(progressSummary));
      void poll(run);
      return progressSummary;
    },
    [poll, setActive, setCodexQuota, setInventorySyncContext, setProgress, setStarting, t]
  );

  const cancel = useCallback(async () => {
    const run = activeRun;
    if (!run) return;
    run.controller.abort();
    activeRun = null;
    setActive(false);
    try {
      const summary = await cancelCodexQuotaJobAtConnection(run.jobId, run.connection);
      setProgress(
        createCodexQuotaJobProgress(addCodexQuotaJobLocalFailures(summary, run.localFailures))
      );
      if (summary.status === 'completed' || summary.status === 'cancelled') {
        confirmRemoteTerminal(summary.jobId);
      }
    } catch (error: unknown) {
      setProgress((current) => ({
        ...current,
        status: 'error',
        error: error instanceof Error ? error.message : t('common.unknown_error'),
      }));
    }
  }, [confirmRemoteTerminal, setActive, setProgress, t]);

  useEffect(() => {
    const run = activeRun;
    if (!run || run.cacheGeneration === cacheGeneration) return;
    run.controller.abort();
    activeRun = null;
    void cancelCodexQuotaJobAtConnection(run.jobId, run.connection).catch(() => undefined);
    resetProgress();
  }, [cacheGeneration, resetProgress]);

  return {
    progress,
    isActive: starting || active,
    inventorySyncContext,
    remoteTerminalJobId,
    clearInventorySyncContext,
    start,
    cancel,
  };
}
