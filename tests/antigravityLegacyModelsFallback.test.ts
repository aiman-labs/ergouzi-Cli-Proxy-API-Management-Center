import { describe, expect, test } from 'bun:test';
import { buildAntigravityLegacyModelGroups } from '../src/utils/quota';

describe('Antigravity legacy model quota fallback', () => {
  test('builds quota groups from model-bucket shaped payloads', () => {
    const groups = buildAntigravityLegacyModelGroups({
      'gemini-3-pro-high': {
        displayName: 'Gemini 3 Pro High',
        quotaInfo: {
          remainingFraction: 0.42,
          resetTime: '2026-06-18T12:00:00Z',
        },
      },
      'claude-sonnet-4-6': {
        quota_info: {
          remaining: '0.08',
          reset_time: '2026-06-18T13:00:00Z',
        },
      },
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('model-buckets');
    expect(groups[0].buckets.map((bucket) => bucket.id)).toEqual([
      'claude-sonnet-4-6',
      'gemini-3-pro-high',
    ]);
    expect(groups[0].buckets[1]).toMatchObject({
      label: 'Gemini 3 Pro High',
      remainingFraction: 0.42,
      resetTime: '2026-06-18T12:00:00Z',
      description: 'gemini-3-pro-high',
    });
  });

  test('treats reset-only legacy buckets as depleted', () => {
    const groups = buildAntigravityLegacyModelGroups({
      'gemini-3-pro-high': {
        quotaInfo: {
          resetTime: '2026-06-18T12:00:00Z',
        },
      },
    });

    expect(groups[0].buckets[0].remainingFraction).toBe(0);
  });
});
