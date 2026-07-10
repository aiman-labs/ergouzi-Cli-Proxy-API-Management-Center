import { describe, expect, test } from 'bun:test';
import { sponsorEntryIndicesToReplace } from '../src/features/providers/sponsorPersistence';

describe('sponsor persistence', () => {
  test('replaces only the visible entry and preserves hidden entries', () => {
    expect(sponsorEntryIndicesToReplace([{ index: 2 }, { index: 5 }, { index: 8 }])).toEqual([2]);
  });
});
