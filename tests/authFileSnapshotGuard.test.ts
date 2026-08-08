import { describe, expect, test } from 'bun:test';
import { AuthFileSnapshotGuard } from '../src/utils/authFileSnapshotGuard';

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
});
