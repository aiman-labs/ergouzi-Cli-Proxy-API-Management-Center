import type { TFunction } from 'i18next';
import type { AuthFileItem, CodexQuotaState } from '@/types';
import type {
  CodexQuotaJobResponse,
  CodexQuotaJobResult,
  CodexQuotaJobSummary,
} from '@/services/api';
import type { CodexQuotaJobProgress } from '@/stores/useCodexQuotaJobStore';
import { normalizeAuthIndex } from '@/utils/authIndex';
import {
  buildCodexQuotaDataFromUsageBody,
  CODEX_CONFIG,
} from '@/features/quota/providers/codex/data';

export const canUseQuotaCardActions = (
  sectionDisabled: boolean,
  quotaStatus: string | undefined,
  codexRefreshActive: boolean
): boolean => !sectionDisabled && !codexRefreshActive && quotaStatus !== 'loading';

export const partitionCodexQuotaJobTargets = (files: AuthFileItem[]) => {
  const targetNamesByAuthIndex = new Map<string, string>();
  const filesByName = new Map<string, AuthFileItem>();
  const invalidFiles: AuthFileItem[] = [];
  for (const file of files) {
    const authIndex = normalizeAuthIndex(file['auth_index'] ?? file.authIndex);
    if (!authIndex) {
      invalidFiles.push(file);
      continue;
    }
    targetNamesByAuthIndex.set(authIndex, file.name);
    filesByName.set(file.name, file);
  }
  return { targetNamesByAuthIndex, filesByName, invalidFiles };
};

export const applyCodexQuotaJobLocalFailures = (
  quota: Record<string, CodexQuotaState>,
  files: AuthFileItem[],
  message: string
): Record<string, CodexQuotaState> => {
  if (files.length === 0) return quota;
  const nextQuota = { ...quota };
  for (const file of files) {
    nextQuota[file.name] = CODEX_CONFIG.buildErrorState(message);
  }
  return nextQuota;
};

export const addCodexQuotaJobLocalFailures = <TSummary extends CodexQuotaJobSummary>(
  summary: TSummary,
  localFailures: number
): TSummary => {
  if (localFailures <= 0) return summary;
  return {
    ...summary,
    total: summary.total + localFailures,
    completed: summary.completed + localFailures,
    failed: summary.failed + localFailures,
  };
};

export const createCodexQuotaJobProgress = (
  summary: CodexQuotaJobSummary
): CodexQuotaJobProgress => ({ ...summary });

export const reduceCodexQuotaJobProgress = (
  current: CodexQuotaJobProgress,
  response: CodexQuotaJobResponse
): CodexQuotaJobProgress => {
  if (current.jobId !== response.jobId) return current;
  return {
    jobId: response.jobId,
    status: response.status,
    total: response.total,
    completed: response.completed,
    succeeded: response.succeeded,
    failed: response.failed,
    nextSeq: response.nextSeq,
    error: response.error,
  };
};

interface ApplyCodexQuotaJobResultBatchArgs {
  quota: Record<string, CodexQuotaState>;
  appliedSeq: number;
  targetNamesByAuthIndex: ReadonlyMap<string, string>;
  filesByName: ReadonlyMap<string, AuthFileItem>;
  results: CodexQuotaJobResult[];
  t: TFunction;
}

export const applyCodexQuotaJobResultBatch = ({
  quota,
  appliedSeq,
  targetNamesByAuthIndex,
  filesByName,
  results,
  t,
}: ApplyCodexQuotaJobResultBatchArgs): {
  quota: Record<string, CodexQuotaState>;
  appliedSeq: number;
} => {
  let nextQuota = quota;
  let nextAppliedSeq = appliedSeq;
  for (const result of results) {
    if (result.seq <= appliedSeq) continue;
    nextAppliedSeq = Math.max(nextAppliedSeq, result.seq);
    const name = targetNamesByAuthIndex.get(result.authIndex);
    const file = name ? filesByName.get(name) : undefined;
    if (!name || !file) continue;
    if (nextQuota === quota) nextQuota = { ...quota };
    if (result.status === 'error') {
      nextQuota[name] = CODEX_CONFIG.buildErrorState(
        result.error || t('common.unknown_error'),
        result.statusCode || undefined
      );
      continue;
    }
    try {
      nextQuota[name] = CODEX_CONFIG.buildSuccessState(
        buildCodexQuotaDataFromUsageBody(file, result.body, t)
      );
    } catch (error: unknown) {
      nextQuota[name] = CODEX_CONFIG.buildErrorState(
        error instanceof Error ? error.message : t('common.unknown_error'),
        result.statusCode || undefined
      );
    }
  }
  return { quota: nextQuota, appliedSeq: nextAppliedSeq };
};
