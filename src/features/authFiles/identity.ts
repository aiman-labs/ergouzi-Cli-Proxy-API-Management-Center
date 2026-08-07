/**
 * Credential identity derivation: show account identity, not filename, as the card title.
 * React-free so tests/authFileIdentity.test.ts can consume it directly.
 *
 * Real filenames look like codex-<hash8>-<email>-<plan>.json. Email sits in the
 * middle, so end ellipsis preserves only the provider prefix already shown by the badge.
 *
 * Guardrails:
 * 1. Read only email/projectId. For API-key credentials, backend account is the API
 *    key itself (sdk/cliproxy/auth/types.go AccountInfo); exposing it in titles or
 *    search would leak secrets. OAuth account also duplicates email.
 * 2. Never regex email from filenames. Codex uses '-' as a separator, but '-' is
 *    valid in local parts and domains, so filenames such as
 *    codex-abc12345-first-last@example.com-team are ambiguous. Providers that need
 *    email already expose json:"email"; Kimi filenames contain no email to recover.
 */

import type { AuthFileItem } from '@/types';

export type AuthFileIdentityKind = 'email' | 'projectId' | 'fileName';

export type AuthFileIdentity = {
  /** Card title; empty when no identity exists rather than inventing a placeholder. */
  primary: string;
  /** Title source; fileName uses mono rendering and is not repeated below. */
  kind: AuthFileIdentityKind;
  /** Secondary row with the .json suffix removed; null omits the row. */
  secondary: string | null;
  /** Original full filename for the secondary-row title. */
  fullName: string;
};

/** AuthFileItem has an index signature, so reject non-string backend values here. */
const readIdentityText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/** Remove a case-insensitive .json suffix only when content remains. */
export const stripJsonExtension = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed.length <= 5) return trimmed;
  return trimmed.toLowerCase().endsWith('.json') ? trimmed.slice(0, -5) : trimmed;
};

/**
 * Identity fallback: email -> projectId -> filename without .json.
 * This is intentionally provider-agnostic. The secondary-row dedupe structurally
 * handles runtime-only virtual credentials where name === email === channel ID,
 * which is more robust than a provider allowlist.
 */
export const deriveAuthFileIdentity = (file: AuthFileItem): AuthFileIdentity => {
  const fullName = readIdentityText(file.name);
  const base = stripJsonExtension(fullName);
  const email = readIdentityText(file.email);
  const projectId = readIdentityText(file.projectId);

  const kind: AuthFileIdentityKind = email ? 'email' : projectId ? 'projectId' : 'fileName';
  const primary = email || projectId || base;

  const secondary =
    kind === 'fileName' || !base || base.toLowerCase() === primary.toLowerCase() ? null : base;

  return { primary, kind, secondary, fullName };
};
