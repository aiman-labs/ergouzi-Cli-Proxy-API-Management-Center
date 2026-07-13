import { describe, expect, test } from 'bun:test';
import {
  appendLatestProviderRecord,
  matchesProviderKeyAtIndex,
  replaceLatestProviderRecord,
} from '../src/services/api/providers';

const mergeRecord = (raw: unknown, payload: Record<string, unknown>) => ({
  ...(raw as Record<string, unknown> | undefined),
  ...payload,
});

describe('provider list concurrency', () => {
  test('preserves concurrent additions while appending a provider', () => {
    const latest = [
      { 'api-key': 'existing', custom: 'keep' },
      { 'api-key': 'concurrent', custom: 'also-keep' },
    ];

    expect(appendLatestProviderRecord(latest, { 'api-key': 'created' }, mergeRecord)).toEqual([
      { 'api-key': 'existing', custom: 'keep' },
      { 'api-key': 'concurrent', custom: 'also-keep' },
      { 'api-key': 'created' },
    ]);
  });

  test('replaces only the selected provider in the latest list', () => {
    const latest = [
      { 'api-key': 'existing', custom: 'keep' },
      { 'api-key': 'concurrent', custom: 'also-keep' },
    ];

    expect(
      replaceLatestProviderRecord(
        latest,
        (record) => record['api-key'] === 'existing',
        { 'api-key': 'updated' },
        mergeRecord
      )
    ).toEqual([
      { 'api-key': 'updated', custom: 'keep' },
      { 'api-key': 'concurrent', custom: 'also-keep' },
    ]);
  });

  test('uses the selected index when duplicate provider keys exist', () => {
    const latest = [
      { 'api-key': 'duplicate', 'base-url': 'https://example.com', prefix: 'first' },
      { 'api-key': 'duplicate', 'base-url': 'https://example.com', prefix: 'second' },
    ];

    expect(
      replaceLatestProviderRecord(
        latest,
        (record, index) =>
          matchesProviderKeyAtIndex(record, index, 'duplicate', 'https://example.com', 1),
        { prefix: 'updated' },
        mergeRecord
      )
    ).toEqual([
      { 'api-key': 'duplicate', 'base-url': 'https://example.com', prefix: 'first' },
      { 'api-key': 'duplicate', 'base-url': 'https://example.com', prefix: 'updated' },
    ]);
  });
});
