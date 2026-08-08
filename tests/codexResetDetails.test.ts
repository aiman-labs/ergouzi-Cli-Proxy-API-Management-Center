import { describe, expect, test } from 'bun:test';
import {
  CodexResetDetailScheduler,
  collectCodexResetDetailTargets,
  mergeCodexResetCreditDetails,
  shouldLoadCodexResetDetails,
} from '@/features/quota/providers/codex/resetDetails';
import type { CodexQuotaState } from '@/types';

describe('Codex reset-credit detail loading', () => {
  test('loads details only when enabled and the visible page contains Codex', () => {
    const codexEntry = { type: 'codex' as const, file: { name: 'codex.json' } };
    const claudeEntry = { type: 'claude' as const, file: { name: 'claude.json' } };

    expect(shouldLoadCodexResetDetails(false, [codexEntry])).toBe(false);
    expect(shouldLoadCodexResetDetails(true, [claudeEntry])).toBe(false);
    expect(shouldLoadCodexResetDetails(true, [claudeEntry, codexEntry])).toBe(true);
  });

  test('loads only visible successful Codex entries whose details are not loaded or in flight', () => {
    const quota: Record<string, CodexQuotaState> = {
      'ready.json': { status: 'success', windows: [], rateLimitResetCreditsLoaded: false },
      'loaded.json': { status: 'success', windows: [], rateLimitResetCreditsLoaded: true },
      'pending.json': { status: 'success', windows: [], rateLimitResetCreditsLoaded: false },
      'failed.json': { status: 'error', windows: [], error: '401' },
    };
    const entries = Object.keys(quota).map((name) => ({
      type: 'codex' as const,
      file: { name },
    }));

    expect(
      collectCodexResetDetailTargets(entries, quota, new Set(['pending.json'])).map(
        (entry) => entry.file.name
      )
    ).toEqual(['ready.json']);
  });

  test('merges details only into the unchanged successful usage snapshot', () => {
    const snapshot: CodexQuotaState = {
      status: 'success',
      windows: [],
      rateLimitResetCreditsAvailableCount: 2,
      rateLimitResetCreditsLoaded: false,
    };
    const details = {
      availableCount: 1,
      applicableAvailableCount: 1,
      credits: [
        {
          id: 'credit-1',
          status: 'available',
          grantedAt: '2030-01-01T00:00:00Z',
          expiresAt: '2030-02-01T00:00:00Z',
        },
      ],
      error: '',
    };

    expect(mergeCodexResetCreditDetails(snapshot, snapshot, details)).toMatchObject({
      rateLimitResetCreditsAvailableCount: 1,
      rateLimitResetCreditsLoaded: true,
      rateLimitResetCreditsError: '',
    });
    expect(
      mergeCodexResetCreditDetails({ ...snapshot, planType: 'pro' }, snapshot, details)
    ).toBeNull();
  });

  test('keeps one four-request pool across page changes', async () => {
    let active = 0;
    let maxActive = 0;
    const releases: Array<() => void> = [];
    const committed: string[] = [];
    const makeQuota = (names: string[]) =>
      Object.fromEntries(
        names.map((name) => [
          name,
          { status: 'success' as const, windows: [], rateLimitResetCreditsLoaded: false },
        ])
      );
    const pageOne = Array.from({ length: 6 }, (_, index) => `one-${index}.json`);
    const pageTwo = Array.from({ length: 6 }, (_, index) => `two-${index}.json`);
    const scheduler = new CodexResetDetailScheduler(4);
    const fetchDetails = async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((resolve) => releases.push(resolve));
      active -= 1;
      return { availableCount: 0, applicableAvailableCount: 0, credits: [], error: '' };
    };
    const sync = (names: string[]) =>
      scheduler.sync({
        enabled: true,
        entries: names.map((name) => ({ type: 'codex' as const, file: { name } })),
        quota: makeQuota(names),
        fetchDetails,
        commitDetails: ({ name }) => committed.push(name),
      });

    sync(pageOne);
    await Promise.resolve();
    expect(active).toBe(4);
    sync(pageTwo);
    await Promise.resolve();
    expect(active).toBe(4);

    while (releases.length > 0) {
      releases.shift()?.();
      await Promise.resolve();
      await Promise.resolve();
    }
    await scheduler.whenIdle();

    expect(maxActive).toBe(4);
    expect(committed.every((name) => pageTwo.includes(name))).toBe(true);
    scheduler.dispose();
  });

  test('requeues a credential when its quota snapshot changes in flight', async () => {
    const snapshot = {
      status: 'success' as const,
      windows: [],
      rateLimitResetCreditsLoaded: false,
    };
    const refreshed = { ...snapshot, planType: 'pro' };
    const releases: Array<() => void> = [];
    let calls = 0;
    const scheduler = new CodexResetDetailScheduler(1);
    const fetchDetails = async () => {
      calls += 1;
      await new Promise<void>((resolve) => releases.push(resolve));
      return { availableCount: 0, applicableAvailableCount: 0, credits: [], error: '' };
    };
    const commitDetails = () => undefined;
    const entry = { type: 'codex' as const, file: { name: 'account.json' } };

    scheduler.sync({
      enabled: true,
      entries: [entry],
      quota: { 'account.json': snapshot },
      fetchDetails,
      commitDetails,
    });
    await Promise.resolve();
    scheduler.sync({
      enabled: true,
      entries: [entry],
      quota: { 'account.json': refreshed },
      fetchDetails,
      commitDetails,
    });
    releases.shift()?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toBe(2);
    releases.shift()?.();
    await scheduler.whenIdle();
    scheduler.dispose();
  });

  test('rejects stale details and requeues when a same-name credential is replaced', async () => {
    const snapshot = {
      status: 'success' as const,
      windows: [],
      rateLimitResetCreditsLoaded: false,
    };
    const releases: Array<() => void> = [];
    const calls: string[] = [];
    const commits: string[] = [];
    const scheduler = new CodexResetDetailScheduler(1);
    const fetchDetails = async (entry: { file: { auth_index?: string } }) => {
      const authIndex = entry.file.auth_index ?? '';
      calls.push(authIndex);
      await new Promise<void>((resolve) => releases.push(resolve));
      return {
        availableCount: 0,
        applicableAvailableCount: 0,
        credits: [],
        error: authIndex,
      };
    };
    const sync = (authIndex: string) =>
      scheduler.sync({
        enabled: true,
        entries: [
          {
            type: 'codex',
            file: { name: 'account.json', auth_index: authIndex },
          },
        ],
        quota: { 'account.json': snapshot },
        fetchDetails,
        commitDetails: ({ details }) => commits.push(details.error),
      });

    sync('old-index');
    await Promise.resolve();
    sync('new-index');
    releases.shift()?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toEqual(['old-index', 'new-index']);
    expect(commits).toEqual([]);

    releases.shift()?.();
    await scheduler.whenIdle();
    expect(commits).toEqual(['new-index']);
    scheduler.dispose();
  });
});
