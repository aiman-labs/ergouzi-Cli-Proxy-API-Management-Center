/**
 * Resolver functions for extracting data from auth files.
 */

import type { AuthFileItem } from '@/types';
import {
  normalizeNumberValue,
  normalizeStringValue,
  normalizePlanType,
  parseIdTokenPayload,
} from './parsers';
import { isDisabledAuthFile } from './validators';

export type CodexPlanFilterValue = 'all' | 'pro20x' | 'non_pro20x' | 'unknown';
export type AuthFileEnabledFilterValue = 'all' | 'enabled' | 'disabled';

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const resolveCodexAuthInfo = (value: unknown): Record<string, unknown> | null => {
  const payload = parseIdTokenPayload(value);
  if (!payload) return null;
  const nested = toRecord(payload['https://api.openai.com/auth']);
  return nested ?? payload;
};

export function extractCodexChatgptAccountId(value: unknown): string | null {
  const payload = parseIdTokenPayload(value);
  if (!payload) return null;
  return normalizeStringValue(payload.chatgpt_account_id ?? payload.chatgptAccountId);
}

export function resolveCodexChatgptAccountId(file: AuthFileItem): string | null {
  const metadata =
    file && typeof file.metadata === 'object' && file.metadata !== null
      ? (file.metadata as Record<string, unknown>)
      : null;
  const attributes =
    file && typeof file.attributes === 'object' && file.attributes !== null
      ? (file.attributes as Record<string, unknown>)
      : null;

  const candidates = [file.id_token, metadata?.id_token, attributes?.id_token];

  for (const candidate of candidates) {
    const id = extractCodexChatgptAccountId(candidate);
    if (id) return id;
  }

  return null;
}

export function resolveCodexPlanType(file: AuthFileItem): string | null {
  const metadata =
    file && typeof file.metadata === 'object' && file.metadata !== null
      ? (file.metadata as Record<string, unknown>)
      : null;
  const attributes =
    file && typeof file.attributes === 'object' && file.attributes !== null
      ? (file.attributes as Record<string, unknown>)
      : null;
  const idToken = resolveCodexAuthInfo(file.id_token);
  const metadataIdToken = resolveCodexAuthInfo(metadata?.id_token);
  const attributesIdToken = resolveCodexAuthInfo(attributes?.id_token);
  const candidates = [
    file.plan_type,
    file.planType,
    file['plan_type'],
    file['planType'],
    file.chatgpt_plan_type,
    file.chatgptPlanType,
    idToken?.plan_type,
    idToken?.planType,
    idToken?.chatgpt_plan_type,
    idToken?.chatgptPlanType,
    metadata?.plan_type,
    metadata?.planType,
    metadata?.chatgpt_plan_type,
    metadata?.chatgptPlanType,
    metadataIdToken?.plan_type,
    metadataIdToken?.planType,
    metadataIdToken?.chatgpt_plan_type,
    metadataIdToken?.chatgptPlanType,
    attributes?.plan_type,
    attributes?.planType,
    attributes?.chatgpt_plan_type,
    attributes?.chatgptPlanType,
    attributesIdToken?.plan_type,
    attributesIdToken?.planType,
    attributesIdToken?.chatgpt_plan_type,
    attributesIdToken?.chatgptPlanType,
  ];

  for (const candidate of candidates) {
    const planType = normalizePlanType(candidate);
    if (planType) return planType;
  }

  return null;
}

export function resolveCodexPlanFilterValue(
  file: AuthFileItem,
  quotaPlanType?: unknown
): Exclude<CodexPlanFilterValue, 'all'> {
  const planType = normalizePlanType(quotaPlanType) ?? resolveCodexPlanType(file);
  if (!planType) return 'unknown';
  return planType === 'pro' ? 'pro20x' : 'non_pro20x';
}

export function resolveAuthFileEnabledFilterValue(
  file: AuthFileItem
): Exclude<AuthFileEnabledFilterValue, 'all'> {
  return isDisabledAuthFile(file) ? 'disabled' : 'enabled';
}

const normalizeDateLikeValue = (value: unknown): string | number | null => {
  const numberValue = normalizeNumberValue(value);
  if (numberValue === 0) return null;
  if (numberValue !== null) return numberValue;

  const stringValue = normalizeStringValue(value);
  if (!stringValue || stringValue === '0') return null;
  return stringValue;
};

export function resolveCodexSubscriptionActiveUntil(file: AuthFileItem): string | number | null {
  const metadata = toRecord(file.metadata);
  const attributes = toRecord(file.attributes);
  const idToken = resolveCodexAuthInfo(file.id_token);
  const metadataIdToken = resolveCodexAuthInfo(metadata?.id_token);
  const attributesIdToken = resolveCodexAuthInfo(attributes?.id_token);
  const subscription = toRecord(file.subscription);
  const metadataSubscription = toRecord(metadata?.subscription);
  const attributesSubscription = toRecord(attributes?.subscription);

  const candidates = [
    file.chatgpt_subscription_active_until,
    file.chatgptSubscriptionActiveUntil,
    file.subscription_active_until,
    file.subscriptionActiveUntil,
    subscription?.active_until,
    subscription?.activeUntil,
    idToken?.chatgpt_subscription_active_until,
    idToken?.chatgptSubscriptionActiveUntil,
    metadata?.chatgpt_subscription_active_until,
    metadata?.chatgptSubscriptionActiveUntil,
    metadata?.subscription_active_until,
    metadata?.subscriptionActiveUntil,
    metadataSubscription?.active_until,
    metadataSubscription?.activeUntil,
    metadataIdToken?.chatgpt_subscription_active_until,
    metadataIdToken?.chatgptSubscriptionActiveUntil,
    attributes?.chatgpt_subscription_active_until,
    attributes?.chatgptSubscriptionActiveUntil,
    attributes?.subscription_active_until,
    attributes?.subscriptionActiveUntil,
    attributesSubscription?.active_until,
    attributesSubscription?.activeUntil,
    attributesIdToken?.chatgpt_subscription_active_until,
    attributesIdToken?.chatgptSubscriptionActiveUntil,
  ];

  for (const candidate of candidates) {
    const value = normalizeDateLikeValue(candidate);
    if (value !== null) return value;
  }

  return null;
}

export function extractGeminiCliProjectId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const matches = Array.from(value.matchAll(/\(([^()]+)\)/g));
  if (matches.length === 0) return null;
  const candidate = matches[matches.length - 1]?.[1]?.trim();
  return candidate ? candidate : null;
}

export function resolveGeminiCliProjectId(file: AuthFileItem): string | null {
  const metadata =
    file && typeof file.metadata === 'object' && file.metadata !== null
      ? (file.metadata as Record<string, unknown>)
      : null;
  const attributes =
    file && typeof file.attributes === 'object' && file.attributes !== null
      ? (file.attributes as Record<string, unknown>)
      : null;

  const candidates = [file.account, file['account'], metadata?.account, attributes?.account];

  for (const candidate of candidates) {
    const projectId = extractGeminiCliProjectId(candidate);
    if (projectId) return projectId;
  }

  return null;
}
