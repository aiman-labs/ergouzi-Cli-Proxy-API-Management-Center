import type { ApiKeyEntry } from '@/types';

interface IndexedSponsorEntry {
  index: number;
}

export const sponsorEntryIndicesToReplace = (
  entries: readonly IndexedSponsorEntry[]
): number[] => entries.slice(0, 1).map((entry) => entry.index);

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
