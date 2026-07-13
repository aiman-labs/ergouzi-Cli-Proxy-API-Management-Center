import type { AxiosRequestConfig } from 'axios';
import { apiClient } from './client';
import { isRecord } from '@/utils/helpers';
import { computeApiUrl } from '@/utils/connection';

export type CodexQuotaJobStatus = 'queued' | 'running' | 'completed' | 'cancelled';
export type CodexQuotaJobResultStatus = 'success' | 'error';

export interface CodexQuotaJobSummary {
  jobId: string;
  status: CodexQuotaJobStatus;
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  nextSeq: number;
  error: string;
}

export interface CodexQuotaJobResult {
  seq: number;
  authIndex: string;
  status: CodexQuotaJobResultStatus;
  statusCode: number;
  body: string;
  error: string;
}

export interface CodexQuotaJobResponse extends CodexQuotaJobSummary {
  results: CodexQuotaJobResult[];
}

export interface CodexQuotaJobConnection {
  apiBase: string;
  managementKey: string;
}

const readString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const readCount = (value: unknown): number => {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
};

const readStatus = (value: unknown): CodexQuotaJobStatus => {
  if (value === 'queued' || value === 'running' || value === 'completed' || value === 'cancelled') {
    return value;
  }
  throw new Error('Invalid Codex quota refresh job status');
};

export const normalizeCodexQuotaJobSummary = (payload: unknown): CodexQuotaJobSummary => {
  if (!isRecord(payload)) throw new Error('Invalid Codex quota refresh job response');
  const jobId = readString(payload.job_id);
  if (!jobId) throw new Error('Codex quota refresh job response is missing job_id');
  return {
    jobId,
    status: readStatus(payload.status),
    total: readCount(payload.total),
    completed: readCount(payload.completed),
    succeeded: readCount(payload.succeeded),
    failed: readCount(payload.failed),
    nextSeq: readCount(payload.next_seq),
    error: readString(payload.error),
  };
};

export const normalizeCodexQuotaJobResponse = (payload: unknown): CodexQuotaJobResponse => {
  const summary = normalizeCodexQuotaJobSummary(payload);
  const record = payload as Record<string, unknown>;
  const results = Array.isArray(record.results)
    ? record.results.map<CodexQuotaJobResult>((entry) => {
        if (!isRecord(entry)) throw new Error('Invalid Codex quota refresh job result');
        const seq = readCount(entry.seq);
        const authIndex = readString(entry.auth_index);
        const status = entry.status;
        if (!seq || !authIndex || (status !== 'success' && status !== 'error')) {
          throw new Error('Invalid Codex quota refresh job result');
        }
        return {
          seq,
          authIndex,
          status,
          statusCode: readCount(entry.status_code),
          body: typeof entry.body === 'string' ? entry.body : '',
          error: readString(entry.error),
        };
      })
    : [];
  return { ...summary, results };
};

export const codexQuotaJobsApi = {
  create: async (authIndices: string[]): Promise<CodexQuotaJobSummary> =>
    normalizeCodexQuotaJobSummary(
      await apiClient.post<unknown>('/codex/quota-refresh-jobs', { auth_indices: authIndices })
    ),

  poll: async (
    jobId: string,
    afterSeq: number,
    config?: AxiosRequestConfig
  ): Promise<CodexQuotaJobResponse> =>
    normalizeCodexQuotaJobResponse(
      await apiClient.get<unknown>(
        `/codex/quota-refresh-jobs/${encodeURIComponent(jobId)}?after_seq=${Math.max(0, Math.floor(afterSeq))}`,
        config
      )
    ),

  cancel: async (jobId: string, config?: AxiosRequestConfig): Promise<CodexQuotaJobSummary> =>
    normalizeCodexQuotaJobSummary(
      await apiClient.delete<unknown>(
        `/codex/quota-refresh-jobs/${encodeURIComponent(jobId)}`,
        config
      )
    ),
};

export const cancelCodexQuotaJobAtConnection = async (
  jobId: string,
  connection: CodexQuotaJobConnection
): Promise<CodexQuotaJobSummary> => {
  const managementBase = computeApiUrl(connection.apiBase);
  if (!managementBase) throw new Error('Codex quota refresh connection is unavailable');
  const response = await fetch(
    `${managementBase}/codex/quota-refresh-jobs/${encodeURIComponent(jobId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${connection.managementKey}`,
        'Content-Type': 'application/json',
      },
    }
  );
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === 'string'
      ? payload.error
      : `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return normalizeCodexQuotaJobSummary(payload);
};
