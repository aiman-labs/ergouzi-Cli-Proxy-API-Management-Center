import { describe, expect, test } from 'bun:test';
import {
  cancelCodexQuotaJobAtConnection,
  normalizeCodexQuotaJobResponse,
  normalizeCodexQuotaJobSummary,
  pollCodexQuotaJobAtConnection,
} from '../src/services/api/codexQuotaJobs';
import {
  buildCodexQuotaDataFromUsageBody,
  CODEX_CONFIG,
} from '../src/features/quota/providers/codex/data';
import { apiCallApi } from '../src/services/api';
import { CODEX_USAGE_URL } from '../src/utils/quota';

const t = ((key: string) => key) as never;

describe('Codex quota refresh job API normalization', () => {
  test('normalizes a job summary and bounded result page', () => {
    expect(
      normalizeCodexQuotaJobSummary({
        job_id: 'job-1',
        status: 'running',
        total: 1600,
        completed: 21,
        succeeded: 20,
        failed: 1,
        next_seq: 21,
      })
    ).toEqual({
      jobId: 'job-1',
      status: 'running',
      total: 1600,
      completed: 21,
      succeeded: 20,
      failed: 1,
      nextSeq: 21,
      error: '',
    });

    expect(
      normalizeCodexQuotaJobResponse({
        job_id: 'job-1',
        status: 'completed',
        total: 2,
        completed: 2,
        succeeded: 1,
        failed: 1,
        next_seq: 2,
        results: [
          { seq: 1, auth_index: 'a', status: 'success', status_code: 200, body: '{}' },
          { seq: 2, auth_index: 'b', status: 'error', status_code: 429, error: 'rate limited' },
        ],
      }).results
    ).toEqual([
      { seq: 1, authIndex: 'a', status: 'success', statusCode: 200, body: '{}', error: '' },
      {
        seq: 2,
        authIndex: 'b',
        status: 'error',
        statusCode: 429,
        body: '',
        error: 'rate limited',
      },
    ]);
  });

  test('rejects a malformed result instead of advancing past it', () => {
    expect(() =>
      normalizeCodexQuotaJobResponse({
        job_id: 'job-1',
        status: 'running',
        total: 1,
        completed: 1,
        succeeded: 1,
        failed: 0,
        next_seq: 1,
        results: [{ seq: 1, status: 'success', body: '{}' }],
      })
    ).toThrow('Invalid Codex quota refresh job result');
  });

  test('cancels against the captured connection instead of the mutable API client', async () => {
    const originalFetch = globalThis.fetch;
    let capturedUrl = '';
    let capturedAuthorization = '';
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedAuthorization = new Headers(init?.headers).get('Authorization') ?? '';
      return new Response(
        JSON.stringify({
          job_id: 'old-job',
          status: 'cancelled',
          total: 10,
          completed: 2,
          succeeded: 2,
          failed: 0,
          next_seq: 2,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    try {
      await cancelCodexQuotaJobAtConnection('old-job', {
        apiBase: 'https://old-cpa.example.com',
        managementKey: 'old-key',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(capturedUrl).toBe(
      'https://old-cpa.example.com/v0/management/codex/quota-refresh-jobs/old-job'
    );
    expect(capturedAuthorization).toBe('Bearer old-key');
  });

  test('polls against the captured connection instead of the mutable API client', async () => {
    const originalFetch = globalThis.fetch;
    let capturedUrl = '';
    let capturedAuthorization = '';
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedAuthorization = new Headers(init?.headers).get('Authorization') ?? '';
      return new Response(
        JSON.stringify({
          job_id: 'old-job',
          status: 'running',
          total: 10,
          completed: 2,
          succeeded: 2,
          failed: 0,
          next_seq: 2,
          results: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    try {
      await pollCodexQuotaJobAtConnection('old-job', 2, {
        apiBase: 'https://old-cpa.example.com',
        managementKey: 'old-key',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(capturedUrl).toBe(
      'https://old-cpa.example.com/v0/management/codex/quota-refresh-jobs/old-job?after_seq=2'
    );
    expect(capturedAuthorization).toBe('Bearer old-key');
  });

  test('preserves HTTP status errors when polling the captured connection', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: 'job not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    let capturedError: unknown;
    try {
      await pollCodexQuotaJobAtConnection('missing-job', 0, {
        apiBase: 'https://old-cpa.example.com',
        managementKey: 'old-key',
      });
    } catch (error: unknown) {
      capturedError = error;
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(capturedError).toBeInstanceOf(Error);
    expect((capturedError as Error & { status?: number }).status).toBe(404);
  });
});

describe('Codex usage-only quota conversion', () => {
  test('single-card refresh leaves reset-credit details for the explicit display toggle', async () => {
    const originalRequest = apiCallApi.request;
    const requestedUrls: string[] = [];
    apiCallApi.request = async (request) => {
      requestedUrls.push(request.url);
      return {
        statusCode: 200,
        header: {},
        bodyText: '',
        body: {
          plan_type: 'pro',
          rate_limit_reset_credits: { available_count: 2 },
          rate_limit: {
            primary_window: { used_percent: 20, reset_after_seconds: 3600 },
          },
        },
      };
    };

    try {
      const data = await CODEX_CONFIG.fetchQuota(
        { name: 'codex.json', type: 'codex', auth_index: 'auth-1' },
        t
      );
      expect(requestedUrls).toEqual([CODEX_USAGE_URL]);
      expect(data.rateLimitResetCreditsLoaded).toBe(false);
    } finally {
      apiCallApi.request = originalRequest;
    }
  });

  test('shows reset only for a known positive credit count', () => {
    const canResetQuota = CODEX_CONFIG.canResetQuota;
    const quota = {
      status: 'success' as const,
      windows: [],
      rateLimitResetCredits: [],
      rateLimitResetCreditsLoaded: false,
      rateLimitResetCreditsError: '',
    };

    expect(canResetQuota?.({ ...quota, rateLimitResetCreditsAvailableCount: null })).toBe(false);
    expect(canResetQuota?.({ ...quota, rateLimitResetCreditsAvailableCount: 0 })).toBe(false);
    expect(canResetQuota?.({ ...quota, rateLimitResetCreditsAvailableCount: 1 })).toBe(true);
  });

  test('uses reset-credit count from usage without loading expiry details', () => {
    const data = buildCodexQuotaDataFromUsageBody(
      {
        name: 'codex.json',
        type: 'codex',
        plan_type: 'free',
        subscription_active_until: '2030-01-01T00:00:00Z',
      },
      JSON.stringify({
        plan_type: 'pro',
        rate_limit_reset_credits: { available_count: 3 },
        rate_limit: {
          primary_window: { used_percent: 25, reset_after_seconds: 3600 },
        },
      }),
      t
    );

    expect(data.planType).toBe('pro');
    expect(data.rateLimitResetCreditsAvailableCount).toBe(3);
    expect(data.rateLimitResetCredits).toEqual([]);
    expect(data.rateLimitResetCreditsLoaded).toBe(false);
    expect(data.windows.length).toBeGreaterThan(0);
  });

  test('rejects an invalid usage body', () => {
    expect(() => buildCodexQuotaDataFromUsageBody({ name: 'bad.json' }, 'not-json', t)).toThrow();
  });
});
