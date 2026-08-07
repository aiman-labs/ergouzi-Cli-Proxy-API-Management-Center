/**
 * 额度页纯逻辑：文件归类、tab 过滤、计数、分页。
 * React-free —— 由 tests/quotaPageLogic.test.ts 直接消费。
 */

import type { AuthFileItem } from '@/types';
import {
  isAntigravityFile,
  isClaudeFile,
  isCodexFile,
  isKimiFile,
  isXaiFile,
  matchesCodexPlanFilterValue,
  resolveAuthFileEnabledFilterValue,
  type CodexPlanFilterValue,
} from '@/utils/quota';
import type { QuotaProviderType } from './providers/types';
import type { QuotaCardState } from './providers';
import { QUOTA_TAB_ORDER, type QuotaSortMode, type QuotaTabId } from './constants';

const QUOTA_FILTER_MAP: Record<QuotaProviderType, (file: AuthFileItem) => boolean> = {
  antigravity: isAntigravityFile,
  claude: isClaudeFile,
  codex: isCodexFile,
  kimi: isKimiFile,
  xai: isXaiFile,
};

export interface QuotaFileEntry {
  file: AuthFileItem;
  type: QuotaProviderType;
}

export type QuotaEnabledFilter = 'all' | 'enabled' | 'disabled';
export type QuotaIssueFilter = 'all' | 'normal' | 'problem';

export interface QuotaFilterState extends QuotaCardState {
  planType?: string | null;
}

export interface QuotaEntryFilterOptions {
  searchQuery: string;
  enabledFilter: QuotaEnabledFilter;
  issueFilter: QuotaIssueFilter;
  codexPlanFilter: CodexPlanFilterValue;
  quotaFor: (entry: QuotaFileEntry) => QuotaFilterState | undefined;
}

const HEALTHY_STATUS_MESSAGES = new Set(['ok', 'healthy', 'ready', 'success', 'available']);

const getStatusMessage = (file: AuthFileItem): string => {
  const value = file.statusMessage ?? file['status_message'];
  return typeof value === 'string' ? value.trim() : '';
};

const searchableQuotaText = (entry: QuotaFileEntry, quota?: QuotaFilterState): string =>
  [
    entry.file.name,
    entry.file.type,
    entry.file.provider,
    entry.file.email,
    entry.file.projectId,
    entry.file.note,
    entry.file.authIndex,
    entry.file['auth_index'],
    entry.file.status,
    entry.file.statusMessage,
    entry.file['status_message'],
    quota?.error,
    quota?.errorStatus,
  ]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).toLowerCase())
    .join('\n');

export function hasQuotaProblem(entry: QuotaFileEntry, quota?: QuotaFilterState): boolean {
  const file = entry.file;
  if (file.unavailable === true) return true;

  const status = typeof file.status === 'string' ? file.status.trim().toLowerCase() : '';
  if (status === 'error') return true;

  const message = getStatusMessage(file).toLowerCase();
  if (message && !HEALTHY_STATUS_MESSAGES.has(message)) return true;

  return quota?.status === 'error';
}

export function filterQuotaEntries(
  entries: QuotaFileEntry[],
  options: QuotaEntryFilterOptions
): QuotaFileEntry[] {
  const query = options.searchQuery.trim().toLowerCase();
  return entries.filter((entry) => {
    const quota = options.quotaFor(entry);
    if (query && !searchableQuotaText(entry, quota).includes(query)) return false;

    const enabledState = resolveAuthFileEnabledFilterValue(entry.file);
    if (options.enabledFilter !== 'all' && enabledState !== options.enabledFilter) return false;

    if (options.issueFilter !== 'all') {
      const problem = hasQuotaProblem(entry, quota);
      if (options.issueFilter === 'problem' ? !problem : problem) return false;
    }

    if (options.codexPlanFilter !== 'all') {
      if (entry.type !== 'codex') return false;
      if (!matchesCodexPlanFilterValue(entry.file, options.codexPlanFilter, quota?.planType)) {
        return false;
      }
    }
    return true;
  });
}

const isRuntimeOnly = (file: AuthFileItem): boolean =>
  file.runtimeOnly === true || String(file.runtimeOnly).toLowerCase() === 'true';

export const isCodexStatusMutable = (entry: QuotaFileEntry): boolean =>
  entry.type === 'codex' && !isRuntimeOnly(entry.file);

export function getCodexStatusTargetNames(
  entries: QuotaFileEntry[],
  enabled: boolean,
  pendingNames: ReadonlySet<string>
): string[] {
  return entries
    .filter(
      (entry) =>
        isCodexStatusMutable(entry) &&
        !pendingNames.has(entry.file.name) &&
        (enabled
          ? resolveAuthFileEnabledFilterValue(entry.file) === 'disabled'
          : resolveAuthFileEnabledFilterValue(entry.file) === 'enabled')
    )
    .map((entry) => entry.file.name);
}

export const resolveQuotaProviderType = (file: AuthFileItem): QuotaProviderType | null =>
  QUOTA_TAB_ORDER.find((type) => QUOTA_FILTER_MAP[type](file)) ?? null;

/**
 * Classify every supported credential, including disabled credentials, so
 * operators can inspect and recover them from the quota view.
 */
export function classifyQuotaFiles(files: AuthFileItem[]): QuotaFileEntry[] {
  const groups = new Map<QuotaProviderType, QuotaFileEntry[]>(
    QUOTA_TAB_ORDER.map((type) => [type, []])
  );
  for (const file of files) {
    const type = resolveQuotaProviderType(file);
    if (!type) continue;
    groups.get(type)?.push({ file, type });
  }
  return QUOTA_TAB_ORDER.flatMap((type) => groups.get(type) ?? []);
}

export function filterEntriesByTab(entries: QuotaFileEntry[], tab: QuotaTabId): QuotaFileEntry[] {
  if (tab === 'all') return entries;
  return entries.filter((entry) => entry.type === tab);
}

/**
 * Order the grid by whichever credential recovers first.
 *
 * The instant is injected rather than read here: quota lives in the store and
 * arrives asynchronously, and keeping this function store-free is what makes
 * the ordering rules directly testable.
 *
 * Credentials with no instant — not loaded yet, failed, or reporting no
 * upcoming reset — sink to the bottom rather than sorting as "now". They keep
 * their incoming provider-grouped order, so the unloaded tail still reads like
 * the default view instead of an arbitrary shuffle. Because loading is
 * click-to-fetch, that tail is most of the list until the user asks for data.
 *
 * The original index is the final tiebreak, making stability an asserted
 * property rather than an assumption about the engine's sort.
 */
export function sortQuotaEntries(
  entries: QuotaFileEntry[],
  mode: QuotaSortMode,
  resolveNextRecoveryMs: (entry: QuotaFileEntry) => number | null
): QuotaFileEntry[] {
  if (mode !== 'soonest') return [...entries];

  // Decorate once — resolving pokes at provider-shaped state per entry.
  return entries
    .map((entry, index) => ({ entry, index, atMs: resolveNextRecoveryMs(entry) }))
    .sort((a, b) => {
      if (a.atMs === null && b.atMs === null) return a.index - b.index;
      if (a.atMs === null) return 1;
      if (b.atMs === null) return -1;
      return a.atMs - b.atMs || a.index - b.index;
    })
    .map((decorated) => decorated.entry);
}

export function buildTabCounts(entries: QuotaFileEntry[]): Record<string, number> {
  const counts: Record<string, number> = { all: entries.length };
  for (const type of QUOTA_TAB_ORDER) {
    counts[type] = 0;
  }
  for (const entry of entries) {
    counts[entry.type] += 1;
  }
  return counts;
}

export const isQuotaRefreshDisabled = (
  canRefresh: boolean,
  loading: boolean,
  resetting: boolean
): boolean => !canRefresh || loading || resetting;

export const isQuotaResetDisabled = (
  canRefresh: boolean,
  loading: boolean,
  resetting: boolean,
  credentialDisabled: boolean
): boolean => credentialDisabled || isQuotaRefreshDisabled(canRefresh, loading, resetting);

export interface QuotaPagination<T> {
  pageItems: T[];
  currentPage: number;
  totalPages: number;
}

/** 页码越界时收敛到有效区间（列表缩短后停留在最后一页而不是空页）。 */
export function paginate<T>(items: T[], page: number, pageSize: number): QuotaPagination<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    currentPage,
    totalPages,
  };
}
