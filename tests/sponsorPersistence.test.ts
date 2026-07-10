import { describe, expect, test } from 'bun:test';
import {
  mergeSponsorOpenAIAPIKeyEntries,
  sponsorEntryIndicesToReplace,
} from '../src/features/providers/sponsorPersistence';

describe('sponsor persistence', () => {
  test('replaces only the visible entry and preserves hidden entries', () => {
    expect(sponsorEntryIndicesToReplace([{ index: 2 }, { index: 5 }, { index: 8 }])).toEqual([2]);
  });

  test('updates the visible OpenAI key without dropping additional keys', () => {
    const existing = [
      { apiKey: 'first', proxyUrl: 'https://old.example', authIndex: 'first-index' },
      { apiKey: 'second', proxyUrl: 'https://second.example', authIndex: 'second-index' },
    ];

    expect(
      mergeSponsorOpenAIAPIKeyEntries(existing, 'updated-first', 'https://new.example')
    ).toEqual([
      { apiKey: 'updated-first', proxyUrl: 'https://new.example', authIndex: 'first-index' },
      { apiKey: 'second', proxyUrl: 'https://second.example', authIndex: 'second-index' },
    ]);
  });
});
