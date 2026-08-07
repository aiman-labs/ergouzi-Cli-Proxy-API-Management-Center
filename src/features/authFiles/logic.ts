/** Auth-file search and sorting helpers, kept React-free for direct tests. */

import type { AuthFileItem } from '@/types';
import { isRuntimeOnlyAuthFile } from './constants';
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
