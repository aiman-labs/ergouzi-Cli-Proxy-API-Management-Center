import { describe, expect, test } from 'bun:test';
import {
  mergeSponsorOpenAIAPIKeyEntries,
  replaceVisibleSponsorEntry,
} from '../src/features/providers/sponsorPersistence';

describe('sponsor persistence', () => {
  test('replaces the visible entry in place and preserves hidden entry order', () => {
    expect(
      replaceVisibleSponsorEntry(
        ['before', 'visible', 'middle', 'hidden'],
        [{ index: 1 }, { index: 3 }],
        'updated'
      )
    ).toEqual(['before', 'updated', 'middle', 'hidden']);
  });

  test('removes only the visible entry when the protocol is cleared', () => {
    expect(
      replaceVisibleSponsorEntry(['before', 'visible', 'hidden'], [{ index: 1 }, { index: 2 }])
    ).toEqual(['before', 'hidden']);
  });

  test('appends a new sponsor entry when no visible entry exists', () => {
    expect(replaceVisibleSponsorEntry(['existing'], [], 'created')).toEqual([
      'existing',
      'created',
    ]);
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
