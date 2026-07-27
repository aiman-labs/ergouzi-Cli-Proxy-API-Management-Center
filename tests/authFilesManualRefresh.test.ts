import { describe, expect, test } from 'bun:test';
import { getManualRefreshSnapshot } from '@/features/authFiles/manualRefresh';
import { resolveAuthProvider } from '@/utils/quota';

describe('auth file manual refresh', () => {
  test('uses the same provider precedence as quota cards', () => {
    expect(resolveAuthProvider({ name: 'codex.json', type: 'claude', provider: 'codex' })).toBe(
      'codex'
    );
  });

  test('ignores the immediate metadata update from the refresh request', () => {
    const before = {
      name: 'codex.json',
      status: 'active',
      status_message: '',
      last_refresh: '2026-07-27T01:00:00Z',
      updated_at: '2026-07-27T01:00:00Z',
    };
    const afterPatch = {
      ...before,
      updated_at: '2026-07-27T01:01:00Z',
    };

    expect(getManualRefreshSnapshot(afterPatch)).toBe(getManualRefreshSnapshot(before));
  });

  test('detects completed and failed refresh outcomes', () => {
    const before = {
      name: 'codex.json',
      status: 'active',
      status_message: '',
      last_refresh: '2026-07-27T01:00:00Z',
    };

    expect(
      getManualRefreshSnapshot({
        ...before,
        last_refresh: '2026-07-27T01:01:00Z',
      })
    ).not.toBe(getManualRefreshSnapshot(before));
    expect(
      getManualRefreshSnapshot({
        ...before,
        status: 'error',
        status_message: '401 Unauthorized',
        unavailable: true,
      })
    ).not.toBe(getManualRefreshSnapshot(before));
  });
});
