import type { TFunction } from 'i18next';
import type { AuthFileItem, CodexQuotaState } from '@/types';
import type {
  CodexQuotaJobResponse,
  CodexQuotaJobResult,
  CodexQuotaJobSummary,
} from '@/services/api';
import type { CodexQuotaJobProgress } from '@/stores/useCodexQuotaJobStore';
import { buildCodexQuotaDataFromUsageBody, CODEX_CONFIG } from './quotaConfigs';

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
