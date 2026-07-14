import type { AuthFilesErrorTypeFilter } from '@/features/authFiles/uiState';
import { getAuthFileStatusMessage } from '@/features/authFiles/constants';
import type { AuthFileItem } from '@/types';

export type KnownAuthFileErrorType = Exclude<AuthFilesErrorTypeFilter, 'all'>;

const AUTH_FILE_AUTHENTICATION_ERROR_PATTERNS = [
  /\b401\b/,
  /authentication[_\s-]*error/,
  /unauthori[sz]ed/,
  /auth[_\s-]*unavailable/,
  /authentication token has been invalidated/,
  /please try signing in again/,
  /\binvalid(?:ated)?\s+(?:auth(?:entication)?\s+)?token\b/,
  /\btoken\s+(?:has\s+been\s+)?invalidated\b/,
  /\btoken[_\s-]+(?:revoked|invalidated)\b/,
];

export const resolveAuthFileProblemMessage = (
  file: AuthFileItem,
  quotaIssue?: string
): string => getAuthFileStatusMessage(file) || String(quotaIssue ?? '').trim();

export const classifyAuthFileErrorType = (message: string): KnownAuthFileErrorType | null => {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return null;

  if (
    normalized.includes('usage_limit_reached') ||
    normalized.includes('usage limit has been reached') ||
    normalized.includes('usage limit reached') ||
    normalized.includes('usage limited reach')
  ) {
    return 'usage_limit';
  }

  if (/\bdeactiv(?:e|ated)[_\s-]*workspace\b/.test(normalized)) {
    return 'deactivated_workspace';
  }

  if (AUTH_FILE_AUTHENTICATION_ERROR_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return 'authentication_error';
  }

  return 'other';
};
