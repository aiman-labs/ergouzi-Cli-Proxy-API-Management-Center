import { afterEach, describe, expect, test } from 'bun:test';
import { useCodexQuotaJobStore } from '../src/stores/useCodexQuotaJobStore';

describe('Codex quota job inventory synchronization context', () => {
  afterEach(() => useCodexQuotaJobStore.getState().reset());

  test('keeps the job-bound sync context globally until the matching job clears it', () => {
    const store = useCodexQuotaJobStore.getState();
    store.setInventorySyncContext({
      jobId: 'job-1',
      targetNames: ['alpha.json', 'beta.json'],
    });

    expect(useCodexQuotaJobStore.getState().inventorySyncContext).toEqual({
      jobId: 'job-1',
      targetNames: ['alpha.json', 'beta.json'],
    });

    useCodexQuotaJobStore.getState().clearInventorySyncContext('newer-job');
    expect(useCodexQuotaJobStore.getState().inventorySyncContext?.jobId).toBe('job-1');

    useCodexQuotaJobStore.getState().clearInventorySyncContext('job-1');
    expect(useCodexQuotaJobStore.getState().inventorySyncContext).toBeNull();
  });

  test('clears the sync context when the job store resets for a new connection', () => {
    useCodexQuotaJobStore.getState().setInventorySyncContext({
      jobId: 'stale-job',
      targetNames: ['stale.json'],
    });
    useCodexQuotaJobStore.getState().reset();

    expect(useCodexQuotaJobStore.getState().inventorySyncContext).toBeNull();
  });
});
