import { normalizePlanType } from './parsers';

/** Fork Pro badges retain platinum; Pro Max is additive. */
export type CodexPlanTier = 'elite' | 'premium' | 'plain';

/** Pro Max aliases. */
export const PRO_MAX_CODEX_PLAN_TYPES = new Set(['promax', 'pro-max', 'pro_max']);

/** Pro Lite aliases. */
export const PRO_LITE_CODEX_PLAN_TYPES = new Set(['prolite', 'pro-lite', 'pro_lite']);

/** Pro plan. */
export const PRO_CODEX_PLAN_TYPE = 'pro';

/** Business Premium retains the standard tier. */
export const BUSINESS_PREMIUM_CODEX_PLAN_TYPE = 'self_serve_business_prolite';

export function resolvePlanTier(planType: string | null | undefined): CodexPlanTier {
  const normalized = normalizePlanType(planType);
  if (!normalized) return 'plain';
  if (normalized === PRO_CODEX_PLAN_TYPE || PRO_MAX_CODEX_PLAN_TYPES.has(normalized)) return 'elite';
  if (normalized === PRO_CODEX_PLAN_TYPE || PRO_LITE_CODEX_PLAN_TYPES.has(normalized)) {
    return 'premium';
  }
  return 'plain';
}
