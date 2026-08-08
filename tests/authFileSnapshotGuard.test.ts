import { describe, expect, test } from 'bun:test';
import {
  AuthFileSnapshotGuard,
  syncTargetedAuthFileSnapshots,
} from '../src/utils/authFileSnapshotGuard';

describe('AuthFileSnapshotGuard', () => {
  test('retries a target mutated after its snapshot request started', () => {
    const guard = new AuthFileSnapshotGuard();
    const request = guard.begin(['target.json', 'other.json']);

    guard.markTargetsMutated(['target.json']);

    expect(guard.settle(request)).toEqual({
      applyNames: ['other.json'],
      retryNames: ['target.json'],
    });
  });

  test('lets the latest request win when responses arrive out of order', () => {
    const guard = new AuthFileSnapshotGuard();
    const older = guard.begin(['target.json']);
    const newer = guard.begin(['target.json']);

    expect(guard.settle(older)).toEqual({ applyNames: [], retryNames: [] });
    expect(guard.settle(newer)).toEqual({
      applyNames: ['target.json'],
      retryNames: [],
    });
  });

  test('retries every current request target after a whole-inventory replacement', () => {
    const guard = new AuthFileSnapshotGuard();
    const request = guard.begin(['alpha.json', 'beta.json']);

    guard.markAllMutated();

    expect(guard.settle(request)).toEqual({
      applyNames: [],
      retryNames: ['alpha.json', 'beta.json'],
    });
  });

  test('rejects an older whole-inventory response after a targeted snapshot commits', () => {
    const guard = new AuthFileSnapshotGuard();
    const inventoryRequest = guard.beginAll();
    const targetedRequest = guard.begin(['target.json']);

    expect(guard.settle(targetedRequest)).toEqual({
      applyNames: ['target.json'],
      retryNames: [],
    });
    expect(guard.settleAll(inventoryRequest)).toBe(false);
  });

  test('lets only the latest whole-inventory request commit', () => {
    const guard = new AuthFileSnapshotGuard();
    const older = guard.beginAll();
    const newer = guard.beginAll();

    expect(guard.settleAll(older)).toBe(false);
    expect(guard.settleAll(newer)).toBe(true);
    expect(guard.isLatestAll(older)).toBe(false);
    expect(guard.isLatestAll(newer)).toBe(true);
  });

  test('treats a newer whole-inventory commit as covering an older targeted request', () => {
    const guard = new AuthFileSnapshotGuard();
    const targetedRequest = guard.begin(['target.json']);
    const inventoryRequest = guard.beginAll();

    expect(guard.settleAll(inventoryRequest)).toBe(true);
    expect(guard.settle(targetedRequest)).toEqual({ applyNames: [], retryNames: [] });
  });

  test('rejects and then refreshes a whole-inventory request crossed by a status mutation', () => {
    const guard = new AuthFileSnapshotGuard();
    const stale = guard.beginAll();

    guard.markTargetsMutated(['target.json']);

    expect(guard.settleAll(stale)).toBe(false);
    expect(guard.isLatestAll(stale)).toBe(true);

    const refreshed = guard.beginAll();
    expect(guard.settleAll(refreshed)).toBe(true);
  });
});

describe('syncTargetedAuthFileSnapshots', () => {
  test('retries a transient snapshot request failure within the attempt bound', async () => {
    const guard = new AuthFileSnapshotGuard();
    const snapshots = [{ files: ['target.json'] }];
    let loadCalls = 0;
    const applied: Array<{ snapshot: (typeof snapshots)[number]; names: string[] }> = [];

    const synced = await syncTargetedAuthFileSnapshots({
      targetNames: ['target.json'],
      guard,
      load: async () => {
        loadCalls += 1;
        if (loadCalls === 1) throw new Error('temporary failure');
        return snapshots[0];
      },
      apply: (snapshot, names) => {
        applied.push({ snapshot, names });
        return true;
      },
    });

    expect(synced).toBe(true);
    expect(loadCalls).toBe(2);
    expect(applied).toEqual([{ snapshot: snapshots[0], names: ['target.json'] }]);
  });

  test('stops after three consecutive snapshot request failures', async () => {
    const guard = new AuthFileSnapshotGuard();
    let loadCalls = 0;

    const synced = await syncTargetedAuthFileSnapshots({
      targetNames: ['target.json'],
      guard,
      load: async () => {
        loadCalls += 1;
        throw new Error('still unavailable');
      },
      apply: () => true,
    });

    expect(synced).toBe(false);
    expect(loadCalls).toBe(3);
  });
});
