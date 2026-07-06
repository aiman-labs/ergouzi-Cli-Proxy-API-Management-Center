import { parsePriorityValue, normalizeProviderKey } from '@/features/authFiles/constants';
import type { AuthFilesSortMode } from '@/features/authFiles/uiState';
import type { AuthFileItem } from '@/types/authFile';

const parseTimestampMs = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) return numeric < 1e12 ? numeric * 1000 : numeric;
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const getAuthFileImportTime = (file: AuthFileItem): number | null =>
  parseTimestampMs(file['created_at'] ?? file.createdAt ?? file.created);

const compareNameAsc = (a: AuthFileItem, b: AuthFileItem): number => a.name.localeCompare(b.name);

const compareImportTime = (a: AuthFileItem, b: AuthFileItem, direction: 'asc' | 'desc'): number => {
  const ta = getAuthFileImportTime(a);
  const tb = getAuthFileImportTime(b);
  if (ta !== null && tb !== null && ta !== tb) {
    return direction === 'asc' ? ta - tb : tb - ta;
  }
  if (ta !== null && tb === null) return -1;
  if (ta === null && tb !== null) return 1;
  return compareNameAsc(a, b);
};

const comparePriority = (a: AuthFileItem, b: AuthFileItem, direction: 'asc' | 'desc'): number => {
  const pa = parsePriorityValue(a.priority) ?? 0;
  const pb = parsePriorityValue(b.priority) ?? 0;
  if (pa !== pb) {
    return direction === 'asc' ? pa - pb : pb - pa;
  }
  return compareImportTime(a, b, 'desc');
};

export const sortAuthFiles = (
  files: AuthFileItem[],
  sortMode: AuthFilesSortMode
): AuthFileItem[] => {
  const copy = [...files];
  if (sortMode === 'default') {
    copy.sort((a, b) => {
      const providerA = normalizeProviderKey(String(a.provider ?? a.type ?? 'unknown'));
      const providerB = normalizeProviderKey(String(b.provider ?? b.type ?? 'unknown'));
      const providerCompare = providerA.localeCompare(providerB);
      if (providerCompare !== 0) return providerCompare;
      return compareNameAsc(a, b);
    });
  } else if (sortMode === 'az') {
    copy.sort(compareNameAsc);
  } else if (sortMode === 'import_desc') {
    copy.sort((a, b) => compareImportTime(a, b, 'desc'));
  } else if (sortMode === 'import_asc') {
    copy.sort((a, b) => compareImportTime(a, b, 'asc'));
  } else if (sortMode === 'priority_desc') {
    copy.sort((a, b) => comparePriority(a, b, 'desc'));
  } else if (sortMode === 'priority_asc') {
    copy.sort((a, b) => comparePriority(a, b, 'asc'));
  }
  return copy;
};
