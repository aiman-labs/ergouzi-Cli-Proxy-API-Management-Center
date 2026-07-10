import type { ApiKeyEntry } from '@/types';

interface IndexedSponsorEntry {
  index: number;
}

export const replaceVisibleSponsorEntry = <T>(
  list: readonly T[],
  entries: readonly IndexedSponsorEntry[],
  replacement?: T
): T[] => {
  const visibleIndex = entries[0]?.index;
  if (visibleIndex === undefined) {
    return replacement === undefined ? [...list] : [...list, replacement];
  }
  return list.flatMap((item, index) => {
    if (index !== visibleIndex) return [item];
    return replacement === undefined ? [] : [replacement];
  });
};

export const mergeSponsorOpenAIAPIKeyEntries = (
  existingEntries: readonly ApiKeyEntry[] | undefined,
  apiKey: string,
  proxyUrl: string | undefined
): ApiKeyEntry[] => {
  if (!apiKey) return [];
  const next = (existingEntries ?? []).map((entry) => ({ ...entry }));
  if (next.length === 0) {
    return [{ apiKey, proxyUrl }];
  }
  const firstNonEmptyIndex = next.findIndex((entry) => entry.apiKey.trim());
  const editableIndex = firstNonEmptyIndex >= 0 ? firstNonEmptyIndex : 0;
  next[editableIndex] = {
    ...next[editableIndex],
    apiKey,
    proxyUrl,
  };
  return next;
};
