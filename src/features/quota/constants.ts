import type { QuotaProviderType } from './providers/types';

/** Provider order used by both tabs and the combined grid. */
export const QUOTA_TAB_ORDER: readonly QuotaProviderType[] = [
  'codex',
  'claude',
  'antigravity',
  'xai',
  'kimi',
  'devin',
  'meta',
  'plugin',
];

export type QuotaTabId = 'all' | QuotaProviderType;

export const DEFAULT_QUOTA_PAGE_SIZE = 12;
export const QUOTA_PAGE_SIZE = DEFAULT_QUOTA_PAGE_SIZE;
export const MIN_QUOTA_PAGE_SIZE = 1;
export const MAX_QUOTA_PAGE_SIZE = 100;

export const clampQuotaPageSize = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_QUOTA_PAGE_SIZE;
  return Math.min(MAX_QUOTA_PAGE_SIZE, Math.max(MIN_QUOTA_PAGE_SIZE, Math.round(value)));
};

/** Card ordering modes. */
export const QUOTA_SORT_MODES = ['default', 'soonest'] as const;

export type QuotaSortMode = (typeof QUOTA_SORT_MODES)[number];

/** Card layout (Even rows / Stacked / Compact), kept in localStorage across sessions. */
export const QUOTA_CARD_LAYOUT_KEY = 'quotaPage.cardLayout';

/** Column minimums and gaps for the Stacked and Compact layouts; Even rows uses `.grid`. */
export const QUOTA_STACKED_COLUMNS = { minColumnWidth: 340, gap: 16 } as const;
export const QUOTA_COMPACT_COLUMNS = { minColumnWidth: 260, gap: 10 } as const;

/** Card entrance budget, aligned with useRevealGroup. */
export const CARD_ENTRANCE_BUDGET_MS = 360;
