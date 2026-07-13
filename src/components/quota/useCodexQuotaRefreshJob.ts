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
let completionHandler: (() => Promise<void> | void) | undefined;

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

export interface UseCodexQuotaRefreshJobOptions {
  enabled?: boolean;
  onComplete?: () => Promise<void> | void;
}

export function useCodexQuotaRefreshJob(options: UseCodexQuotaRefreshJobOptions = {}) {
  const { t } = useTranslation();
  const cacheGeneration = useQuotaStore((state) => state.cacheGeneration);
  const setCodexQuota = useQuotaStore((state) => state.setCodexQuota);
  const progress = useCodexQuotaJobStore((state) => state.progress);
  const starting = useCodexQuotaJobStore((state) => state.starting);
  const setProgress = useCodexQuotaJobStore((state) => state.setProgress);
  const setStarting = useCodexQuotaJobStore((state) => state.setStarting);
  const resetProgress = useCodexQuotaJobStore((state) => state.reset);

  useEffect(() => {
    if (!options.enabled) return;
    const handler = options.onComplete;
    completionHandler = handler;
    return () => {
      if (completionHandler === handler) completionHandler = undefined;
    };
  }, [options.enabled, options.onComplete]);

  const finishWithError = useCallback(
    (run: ActiveCodexQuotaJobRun, error: unknown) => {
      if (activeRun !== run) return;
      activeRun = null;
      setProgress((current) => ({
        ...current,
        status: 'error',
        error: error instanceof Error ? error.message : t('common.unknown_error'),
      }));
    },
    [setProgress, t]
  );

  const poll = useCallback(
    async (run: ActiveCodexQuotaJobRun) => {
      let transientFailures = 0;
      while (!run.controller.signal.aborted && activeRun === run) {
        try {
          const response = await codexQuotaJobsApi.poll(run.jobId, run.appliedSeq, {
            signal: run.controller.signal,
          });
          transientFailures = 0;
          if (run.controller.signal.aborted || activeRun !== run) return;
          if (captureQuotaCacheGeneration() !== run.cacheGeneration) {
            run.controller.abort();
            activeRun = null;
            resetProgress();
            return;
          }

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
            if (response.status === 'completed') await completionHandler?.();
            return;
          }
          if (!terminal) await waitForNextPoll(run.controller.signal);
        } catch (error: unknown) {
          if (run.controller.signal.aborted || isAbortError(error)) return;
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
    [finishWithError, resetProgress, setCodexQuota, setProgress, t]
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
      const progressSummary = addCodexQuotaJobLocalFailures(summary, localFailures);
      setProgress(createCodexQuotaJobProgress(progressSummary));
      void poll(run);
      return progressSummary;
    },
    [poll, setCodexQuota, setProgress, setStarting, t]
  );

  const cancel = useCallback(async () => {
    const run = activeRun;
    if (!run) return;
    run.controller.abort();
    activeRun = null;
    try {
      const summary = await cancelCodexQuotaJobAtConnection(run.jobId, run.connection);
      setProgress(
        createCodexQuotaJobProgress(addCodexQuotaJobLocalFailures(summary, run.localFailures))
      );
    } catch (error: unknown) {
      setProgress((current) => ({
        ...current,
        status: 'error',
        error: error instanceof Error ? error.message : t('common.unknown_error'),
      }));
    }
  }, [setProgress, t]);

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
    isActive: starting || progress.status === 'queued' || progress.status === 'running',
    start,
    cancel,
  };
}
