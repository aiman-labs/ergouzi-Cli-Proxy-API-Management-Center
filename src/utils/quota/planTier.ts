import { normalizePlanType } from './parsers';

/**
 * Pure mapping from Codex plan tier to badge style.
 *
 * - elite   -> liquid platinum badge for Pro 20x with plan=pro
 * - premium -> gold badge for Pro Lite, Antigravity ultra, and paid xAI
 * - plain   -> standard text badge for plus, team, free, or unknown
 */
export type CodexPlanTier = 'elite' | 'premium' | 'plain';

export const PREMIUM_CODEX_PLAN_TYPES = new Set(['pro', 'prolite', 'pro-lite', 'pro_lite']);

// Pro 20x with plan=pro sits above gold premium as a liquid platinum badge.
// See .elitePlanValue in QuotaPage.module.scss.
export const ELITE_CODEX_PLAN_TYPE = 'pro';

/**
 * Order matters because `pro` also matches PREMIUM_CODEX_PLAN_TYPES. Check elite first
 * or Pro 20x silently falls back to gold. quotaPlanTier tests enforce this contract.
 */
export function resolvePlanTier(planType: string | null | undefined): CodexPlanTier {
  const normalized = normalizePlanType(planType);
  if (!normalized) return 'plain';
  if (normalized === ELITE_CODEX_PLAN_TYPE) return 'elite';
  if (PREMIUM_CODEX_PLAN_TYPES.has(normalized)) return 'premium';
  return 'plain';
}
