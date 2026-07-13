import { describe, expect, test } from 'bun:test';
import type { CodexQuotaState } from '../src/types';
import {
  addCodexQuotaJobLocalFailures,
  applyCodexQuotaJobLocalFailures,
  applyCodexQuotaJobResultBatch,
  canUseQuotaCardActions,
  createCodexQuotaJobProgress,
  partitionCodexQuotaJobTargets,
  reduceCodexQuotaJobProgress,
} from '../src/components/quota/codexQuotaJobState';

const t = ((key: string) => key) as never;

describe('Codex quota job batched state', () => {
  test('blocks card actions while a Codex full refresh is active', () => {
    expect(canUseQuotaCardActions(false, 'success', false)).toBe(true);
    expect(canUseQuotaCardActions(false, 'success', true)).toBe(false);
    expect(canUseQuotaCardActions(true, 'success', false)).toBe(false);
    expect(canUseQuotaCardActions(false, 'loading', false)).toBe(false);
  });

  test('keeps valid targets and records missing auth indices as local failures', () => {
    const valid = { name: 'valid.json', auth_index: 'auth-valid' };
    const missing = { name: 'missing.json', type: 'codex' };
    const partitioned = partitionCodexQuotaJobTargets([valid, missing]);

    expect([...partitioned.targetNamesByAuthIndex.entries()]).toEqual([
      ['auth-valid', 'valid.json'],
    ]);
    expect(partitioned.invalidFiles).toEqual([missing]);

    const previous: Record<string, CodexQuotaState> = {
      'valid.json': { status: 'idle', windows: [] },
      'missing.json': { status: 'idle', windows: [] },
    };
    const quota = applyCodexQuotaJobLocalFailures(previous, partitioned.invalidFiles, 'missing');
    expect(quota['valid.json']).toBe(previous['valid.json']);
    expect(quota['missing.json']).toMatchObject({ status: 'error', error: 'missing' });

    expect(
      addCodexQuotaJobLocalFailures(
        {
          jobId: 'job',
          status: 'running',
          total: 1,
          completed: 0,
          succeeded: 0,
          failed: 0,
          nextSeq: 0,
          error: '',
        },
        1
      )
    ).toMatchObject({ total: 2, completed: 1, succeeded: 0, failed: 1 });
  });

  test('applies successes and failures in one immutable batch and advances every sequence', () => {
    const previous: Record<string, CodexQuotaState> = {
      'a.json': { status: 'idle', windows: [] },
      'b.json': { status: 'idle', windows: [] },
    };
    const result = applyCodexQuotaJobResultBatch({
      quota: previous,
      appliedSeq: 0,
      targetNamesByAuthIndex: new Map([
        ['auth-a', 'a.json'],
        ['auth-b', 'b.json'],
      ]),
      results: [
        {
          seq: 1,
          authIndex: 'auth-a',
          status: 'success',
          statusCode: 200,
          body: JSON.stringify({
            plan_type: 'pro',
            rate_limit: { primary_window: { used_percent: 12, reset_after_seconds: 60 } },
          }),
          error: '',
        },
        {
          seq: 2,
          authIndex: 'auth-b',
          status: 'error',
          statusCode: 429,
          body: '',
          error: 'rate limited',
        },
        {
          seq: 3,
          authIndex: 'removed-auth',
          status: 'success',
          statusCode: 200,
          body: '{}',
          error: '',
        },
      ],
      filesByName: new Map([
        ['a.json', { name: 'a.json', plan_type: 'free' }],
        ['b.json', { name: 'b.json' }],
      ]),
      t,
    });

    expect(result.quota).not.toBe(previous);
    expect(result.quota['a.json']?.status).toBe('success');
    expect(result.quota['a.json']?.planType).toBe('pro');
    expect(result.quota['b.json']).toMatchObject({
      status: 'error',
      error: 'rate limited',
      errorStatus: 429,
    });
    expect(result.appliedSeq).toBe(3);
  });

  test('ignores duplicate sequences and stale job responses', () => {
    const previous: Record<string, CodexQuotaState> = {
      'a.json': { status: 'success', windows: [], planType: 'team' },
    };
    const batch = applyCodexQuotaJobResultBatch({
      quota: previous,
      appliedSeq: 5,
      targetNamesByAuthIndex: new Map([['auth-a', 'a.json']]),
      results: [
        {
          seq: 5,
          authIndex: 'auth-a',
          status: 'error',
          statusCode: 500,
          body: '',
          error: 'duplicate',
        },
      ],
      filesByName: new Map([['a.json', { name: 'a.json' }]]),
      t,
    });
    expect(batch.quota).toBe(previous);
    expect(batch.appliedSeq).toBe(5);

    const progress = createCodexQuotaJobProgress({
      jobId: 'current',
      status: 'running',
      total: 10,
      completed: 2,
      succeeded: 2,
      failed: 0,
      nextSeq: 2,
      error: '',
    });
    expect(
      reduceCodexQuotaJobProgress(progress, {
        jobId: 'stale',
        status: 'completed',
        total: 1,
        completed: 1,
        succeeded: 1,
        failed: 0,
        nextSeq: 1,
        error: '',
        results: [],
      })
    ).toBe(progress);
  });
});
