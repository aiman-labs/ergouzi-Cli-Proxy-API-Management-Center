/** Auth-file search and sorting helpers, kept React-free for direct tests. */

import type { AuthFileItem } from '@/types';
import { isRuntimeOnlyAuthFile } from './constants';
import type { AuthFilesEnabledFilter, AuthFilesHealthFilter } from './uiState';
export { sortAuthFiles } from './sort';

const escapeWildcardSearchSegment = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Use substring matching unless the query contains an explicit wildcard. */
export const buildWildcardSearch = (value: string): RegExp | null => {
  if (!value.includes('*')) return null;
  const pattern = value.split('*').map(escapeWildcardSearchSegment).join('.*');
  return new RegExp(pattern, 'i');
};

/**
 * Search operational metadata but never `account`, which may contain an API key.
 */
export const matchesAuthFileSearch = (
  file: AuthFileItem,
  term: string,
  wildcard: RegExp | null
): boolean => {
  if (!term) return true;
  const needle = term.toLowerCase();
  return [
    file.name,
    file.type,
    file.provider,
    file.email,
    file.projectId,
    file.note,
    file.authIndex,
    file.status,
    file.statusMessage,
    file.status_message,
  ].some((value) => {
    const content = (value || '').toString();
    return wildcard ? wildcard.test(content) : content.toLowerCase().includes(needle);
  });
};

/**
 * Freeze filtered deletion to the visible persistent snapshot, then intersect
 * it with the latest inventory so stale or newly added files cannot leak in.
 */
export const resolveAuthFileDeleteTargets = (
  files: AuthFileItem[],
  filteredNames: string[]
): string[] => {
  const requested = new Set(filteredNames);
  return files
    .filter((file) => requested.has(file.name) && !isRuntimeOnlyAuthFile(file))
    .map((file) => file.name);
};

export const filterAuthFilesByHealthAndEnabled = (
  files: AuthFileItem[],
  healthFilter: AuthFilesHealthFilter,
  enabledFilter: AuthFilesEnabledFilter,
  getProblemMessage: (file: AuthFileItem) => string
): AuthFileItem[] =>
  files.filter((file) => {
    const hasProblem = Boolean(getProblemMessage(file));
    if (healthFilter === 'problem' && !hasProblem) return false;
    if (healthFilter === 'normal' && hasProblem) return false;
    if (enabledFilter === 'enabled' && file.disabled === true) return false;
    if (enabledFilter === 'disabled' && file.disabled !== true) return false;
    return true;
  });

/** Resolve an exact filtered snapshot for a status change without touching runtime-only files. */
export const resolveAuthFileStatusTargets = (
  files: AuthFileItem[],
  manualRefreshing: Record<string, boolean>,
  targetDisabled: boolean
): string[] =>
  files
    .filter(
      (file) =>
        !isRuntimeOnlyAuthFile(file) &&
        manualRefreshing[file.name] !== true &&
        (file.disabled === true) === targetDisabled
    )
    .map((file) => file.name);
