import type { QuotaProviderType } from './providers/types';

/** Provider order used by both tabs and the combined grid. */
export const QUOTA_TAB_ORDER: readonly QuotaProviderType[] = [
  'claude',
  'antigravity',
  'codex',
  'xai',
  'kimi',
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

/** Card entrance budget, aligned with useRevealGroup. */
export const CARD_ENTRANCE_BUDGET_MS = 360;
