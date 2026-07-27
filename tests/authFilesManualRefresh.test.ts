import { describe, expect, test } from 'bun:test';
import {
  getManualRefreshSafeStatusTargetNames,
  getManualRefreshSnapshot,
  mergeManualRefreshResult,
} from '@/features/authFiles/manualRefresh';
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

  test('merges only the refreshed target into the current inventory', () => {
    const currentFiles = [
      { name: 'target.json', status: 'active' },
      { name: 'disabled.json', status: 'disabled', disabled: true },
      { name: 'uploaded.json', status: 'active' },
    ];
    const staleResponse = [
      { name: 'target.json', status: 'error', status_message: '401 Unauthorized' },
      { name: 'disabled.json', status: 'active', disabled: false },
    ];

    expect(mergeManualRefreshResult(currentFiles, staleResponse, 'target.json')).toEqual([
      { name: 'target.json', status: 'error', status_message: '401 Unauthorized' },
      { name: 'disabled.json', status: 'disabled', disabled: true },
      { name: 'uploaded.json', status: 'active' },
    ]);
  });

  test('does not restore a target deleted while its refresh request was in flight', () => {
    const currentFiles = [{ name: 'kept.json', status: 'active' }];
    const staleResponse = [
      { name: 'deleted.json', status: 'error', status_message: '401 Unauthorized' },
      { name: 'kept.json', status: 'active' },
    ];

    expect(mergeManualRefreshResult(currentFiles, staleResponse, 'deleted.json')).toEqual(
      currentFiles
    );
  });

  test('excludes manually refreshing files from batch status targets', () => {
    const files = [
      { name: 'enable.json', disabled: true },
      { name: 'refreshing-enable.json', disabled: true },
      { name: 'disable.json', disabled: false },
      { name: 'refreshing-disable.json', disabled: false },
    ];
    const manualRefreshing = {
      'refreshing-enable.json': true,
      'refreshing-disable.json': true,
    };

    expect(getManualRefreshSafeStatusTargetNames(files, manualRefreshing, true)).toEqual([
      'enable.json',
    ]);
    expect(getManualRefreshSafeStatusTargetNames(files, manualRefreshing, false)).toEqual([
      'disable.json',
    ]);
  });
});
