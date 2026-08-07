import { describe, expect, test } from 'bun:test';
import {
  MAX_QUOTA_PAGE_SIZE,
  QUOTA_PAGE_SIZE,
  clampQuotaPageSize,
} from '@/features/quota/constants';
import {
  buildTabCounts,
  classifyQuotaFiles,
  filterQuotaEntries,
  filterEntriesByTab,
  getCodexStatusTargetNames,
  hasQuotaProblem,
  isCodexStatusMutable,
  isQuotaBulkRefreshDisabled,
  isQuotaRefreshDisabled,
  isQuotaResetDisabled,
  paginate,
  resolveQuotaProviderType,
  sortQuotaEntries,
  type QuotaFileEntry,
} from '@/features/quota/logic';
import type { AuthFileItem } from '@/types';

const file = (name: string, provider: string, extra: Partial<AuthFileItem> = {}): AuthFileItem =>
  ({ name, provider, ...extra }) as AuthFileItem;

const FILES: AuthFileItem[] = [
  file('codex-a.json', 'codex'),
  file('claude-a.json', 'claude'),
  file('kimi-a.json', 'kimi'),
  file('codex-b.json', 'codex'),
  file('grok-a.json', 'grok'),
  file('gemini-a.json', 'gemini'),
  file('claude-off.json', 'claude', { disabled: true }),
];

describe('resolveQuotaProviderType', () => {
  test('maps provider aliases, includes disabled files, and rejects unsupported files', () => {
    expect(resolveQuotaProviderType(file('a', 'grok'))).toBe('xai');
    expect(resolveQuotaProviderType(file('a', 'antigravity'))).toBe('antigravity');
    expect(resolveQuotaProviderType(file('a', 'gemini'))).toBeNull();
    expect(resolveQuotaProviderType(file('a', 'claude', { disabled: true }))).toBe('claude');
  });
});

describe('classifyQuotaFiles', () => {
  test('drops unsupported files but retains disabled credentials for governance', () => {
    const entries = classifyQuotaFiles(FILES);
    expect(entries.map((entry) => entry.file.name)).not.toContain('gemini-a.json');
    expect(entries.map((entry) => entry.file.name)).toContain('claude-off.json');
    expect(entries).toHaveLength(6);
  });

  test('orders entries by provider tab order', () => {
    const entries = classifyQuotaFiles(FILES);
    expect(entries.map((entry) => entry.type)).toEqual([
      'codex',
      'codex',
      'claude',
      'claude',
      'xai',
      'kimi',
    ]);
  });

  test('keeps all 1600 Codex credentials in the refresh-all target inventory', () => {
    const inventory = Array.from({ length: 1600 }, (_, index) =>
      file(`codex-${index}.json`, 'codex', { disabled: index % 7 === 0 })
    );
    const entries = classifyQuotaFiles(inventory);
    expect(entries).toHaveLength(1600);
    expect(entries.every((entry) => entry.type === 'codex')).toBe(true);
  });
});

describe('buildTabCounts', () => {
  test('counts per provider plus an all total, zero-filling empty tabs', () => {
    expect(buildTabCounts(classifyQuotaFiles(FILES))).toEqual({
      all: 6,
      claude: 2,
      antigravity: 0,
      codex: 2,
      xai: 1,
      kimi: 1,
    });
  });
});

describe('filterEntriesByTab', () => {
  const entries = classifyQuotaFiles(FILES);

  test("passes everything through on the 'all' tab", () => {
    expect(filterEntriesByTab(entries, 'all')).toHaveLength(6);
  });

  test('filters to a single provider', () => {
    expect(filterEntriesByTab(entries, 'codex').map((entry) => entry.file.name)).toEqual([
      'codex-a.json',
      'codex-b.json',
    ]);
    expect(filterEntriesByTab(entries, 'antigravity')).toEqual([]);
  });
});

describe('filterQuotaEntries', () => {
  const entries = classifyQuotaFiles([
    file('codex-plus.json', 'codex', {
      email: 'plus@example.com',
      note: 'primary',
      account: 'secret-api-key',
      codex_inventory_plan_group: 'plus',
    }),
    file('codex-team.json', 'codex', {
      disabled: true,
      status: 'error',
      statusMessage: '401 unauthorized',
      codex_inventory_plan_group: 'bug_team',
    }),
    file('claude.json', 'claude'),
  ]);
  const quotaFor = (entry: QuotaFileEntry) =>
    entry.file.name === 'codex-plus.json'
      ? ({ status: 'success', planType: 'plus' } as never)
      : entry.file.name === 'codex-team.json'
        ? ({ status: 'error', error: 'token rejected', planType: 'team' } as never)
        : undefined;

  test('searches safe credential metadata and quota errors without indexing account secrets', () => {
    expect(
      filterQuotaEntries(entries, {
        searchQuery: 'plus@example.com',
        enabledFilter: 'all',
        issueFilter: 'all',
        codexPlanFilter: 'all',
        quotaFor,
      }).map((entry) => entry.file.name)
    ).toEqual(['codex-plus.json']);
    expect(
      filterQuotaEntries(entries, {
        searchQuery: 'token rejected',
        enabledFilter: 'all',
        issueFilter: 'all',
        codexPlanFilter: 'all',
        quotaFor,
      }).map((entry) => entry.file.name)
    ).toEqual(['codex-team.json']);
    expect(
      filterQuotaEntries(entries, {
        searchQuery: 'secret-api-key',
        enabledFilter: 'all',
        issueFilter: 'all',
        codexPlanFilter: 'all',
        quotaFor,
      })
    ).toEqual([]);
  });

  test('combines enabled state, problem state, and Codex plan filters before pagination', () => {
    expect(
      filterQuotaEntries(entries, {
        searchQuery: '',
        enabledFilter: 'disabled',
        issueFilter: 'problem',
        codexPlanFilter: 'team',
        quotaFor,
      }).map((entry) => entry.file.name)
    ).toEqual(['codex-team.json']);
    expect(
      filterQuotaEntries(entries, {
        searchQuery: '',
        enabledFilter: 'all',
        issueFilter: 'normal',
        codexPlanFilter: 'all',
        quotaFor,
      }).map((entry) => entry.file.name)
    ).toEqual(['codex-plus.json', 'claude.json']);
  });

  test('treats active as a normal runtime status unless explicit error evidence exists', () => {
    const active = classifyQuotaFiles([file('active.json', 'codex', { status: 'active' })])[0];
    expect(hasQuotaProblem(active)).toBe(false);
    expect(hasQuotaProblem(active, { status: 'error', error: '401' })).toBe(true);
  });
});

describe('getCodexStatusTargetNames', () => {
  test('targets only persistent Codex credentials whose status must change', () => {
    const entries = classifyQuotaFiles([
      file('enabled.json', 'codex'),
      file('disabled.json', 'codex', { disabled: true }),
      file('disabled-compatible.json', 'codex', {
        disabled: 'true' as unknown as boolean,
      }),
      file('runtime.json', 'codex', { disabled: true, runtimeOnly: true }),
      file('claude.json', 'claude', { disabled: true }),
    ]);
    expect(getCodexStatusTargetNames(entries, true, new Set())).toEqual([
      'disabled.json',
      'disabled-compatible.json',
    ]);
    expect(getCodexStatusTargetNames(entries, false, new Set(['enabled.json']))).toEqual([]);
    expect(isCodexStatusMutable(entries.find((entry) => entry.file.name === 'runtime.json')!)).toBe(
      false
    );
  });
});

describe('isQuotaRefreshDisabled', () => {
  test('blocks a single-card refresh while the same quota is resetting', () => {
    expect(isQuotaRefreshDisabled(true, false, true)).toBe(true);
    expect(isQuotaRefreshDisabled(true, false, false)).toBe(false);
  });
});

describe('isQuotaResetDisabled', () => {
  test('keeps disabled credentials refreshable but blocks reset writes', () => {
    expect(isQuotaRefreshDisabled(true, false, false)).toBe(false);
    expect(isQuotaResetDisabled(true, false, false, true)).toBe(true);
    expect(isQuotaResetDisabled(true, false, false, false)).toBe(false);
  });
});

describe('isQuotaBulkRefreshDisabled', () => {
  test('blocks page and whole-pool refresh while any quota reset is active', () => {
    expect(isQuotaBulkRefreshDisabled(false, false, false, null)).toBe(false);
    expect(isQuotaBulkRefreshDisabled(false, false, false, 'codex.json')).toBe(true);
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 45 }, (_, index) => index);

  test('uses the configured default page size', () => {
    expect(QUOTA_PAGE_SIZE).toBe(12);
    expect(paginate(items, 2, QUOTA_PAGE_SIZE)).toEqual({
      pageItems: items.slice(12, 24),
      currentPage: 2,
      totalPages: 4,
    });
  });

  test('supports up to 100 credentials per page', () => {
    expect(clampQuotaPageSize(500)).toBe(MAX_QUOTA_PAGE_SIZE);
    expect(
      paginate(
        Array.from({ length: 1600 }, (_, index) => index),
        1,
        100
      ).pageItems
    ).toHaveLength(100);
  });

  test('clamps an out-of-range page instead of returning an empty slice', () => {
    expect(paginate(items, 9, QUOTA_PAGE_SIZE).currentPage).toBe(4);
    expect(paginate(items, 9, QUOTA_PAGE_SIZE).pageItems).toEqual(items.slice(36));
    expect(paginate(items, 0, QUOTA_PAGE_SIZE).currentPage).toBe(1);
  });

  test('keeps at least one page when the list is empty', () => {
    expect(paginate([], 1, QUOTA_PAGE_SIZE)).toEqual({
      pageItems: [],
      currentPage: 1,
      totalPages: 1,
    });
  });
});

describe('sortQuotaEntries', () => {
  const entries = classifyQuotaFiles(FILES);
  const byName = (list: QuotaFileEntry[]) => list.map((entry) => entry.file.name);

  /** Recovery instants keyed by file name; anything absent resolves to null. */
  const resolver = (instants: Record<string, number>) => (entry: QuotaFileEntry) =>
    instants[entry.file.name] ?? null;

  test('default mode preserves order but returns a new array', () => {
    const sorted = sortQuotaEntries(entries, 'default', () => 1);
    expect(byName(sorted)).toEqual(byName(entries));
    expect(sorted).not.toBe(entries);
  });

  test('orders loaded credentials by how soon they recover, across providers', () => {
    const sorted = sortQuotaEntries(
      entries,
      'soonest',
      resolver({
        'codex-a.json': 300,
        'claude-a.json': 100,
        'kimi-a.json': 200,
        'codex-b.json': 400,
        'grok-a.json': 50,
      })
    );
    expect(byName(sorted)).toEqual([
      'grok-a.json',
      'claude-a.json',
      'kimi-a.json',
      'codex-a.json',
      'codex-b.json',
      'claude-off.json',
    ]);
  });

  test('sinks credentials with no instant, keeping their provider-grouped order', () => {
    // Loading is click-to-fetch, so an unloaded tail is the normal case.
    const sorted = sortQuotaEntries(
      entries,
      'soonest',
      resolver({ 'codex-b.json': 200, 'kimi-a.json': 100 })
    );
    expect(byName(sorted)).toEqual([
      'kimi-a.json',
      'codex-b.json',
      // unresolved tail, in the order classifyQuotaFiles produced
      'codex-a.json',
      'claude-a.json',
      'claude-off.json',
      'grok-a.json',
    ]);
  });

  test('leaves the order untouched when nothing has loaded', () => {
    expect(byName(sortQuotaEntries(entries, 'soonest', () => null))).toEqual(byName(entries));
  });

  test('breaks ties on the original position, so equal instants stay stable', () => {
    const sorted = sortQuotaEntries(entries, 'soonest', () => 500);
    expect(byName(sorted)).toEqual(byName(entries));
  });

  test('does not mutate the input', () => {
    const input = [...entries];
    sortQuotaEntries(input, 'soonest', resolver({ 'codex-b.json': 1 }));
    expect(input).toEqual(entries);
  });

  test('sorts before paginating, so the globally soonest lands on page one', () => {
    // Last in the default order, first to recover.
    const last = entries[entries.length - 1].file.name;
    const sorted = sortQuotaEntries(entries, 'soonest', resolver({ [last]: 1 }));
    expect(paginate(sorted, 1, 2).pageItems[0].file.name).toBe(last);
  });
});
