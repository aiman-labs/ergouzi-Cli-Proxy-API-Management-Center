interface IndexedSponsorEntry {
  index: number;
}

export const sponsorEntryIndicesToReplace = (
  entries: readonly IndexedSponsorEntry[]
): number[] => entries.slice(0, 1).map((entry) => entry.index);
