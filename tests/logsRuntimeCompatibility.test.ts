import { describe, expect, test } from 'bun:test';
import { requiresFileLogging } from '@/pages/hooks/logRuntime';
import { normalizeLogsResponse } from '@/services/api/logs';

describe('logs runtime compatibility', () => {
  test('requires file logging only for the CPA runtime', () => {
    expect(requiresFileLogging('cpa', false)).toBe(true);
    expect(requiresFileLogging('cpa', true)).toBe(false);
    expect(requiresFileLogging('home', false)).toBe(false);
    expect(requiresFileLogging('unknown', false)).toBe(false);
  });

  test('normalizes Home log records and preserves request-log routing metadata', () => {
    const response = normalizeLogsResponse({
      logs: [
        {
          timestamp: '2026-07-27T07:30:00Z',
          request_id: 'request-new',
          home_ip: '10.0.0.2',
          line: 'new line',
        },
        {
          timestamp: '2026-07-27T07:29:00Z',
          request_id: 'request-old',
          home_ip: '10.0.0.1',
          line: 'old line',
        },
      ],
    });

    expect(response.lines).toEqual(['old line', 'new line']);
    expect(response.latestAfter).toBe('2026-07-27T07:30:00Z');
    expect(response.requestLogHomeIpById).toEqual({
      'request-old': '10.0.0.1',
      'request-new': '10.0.0.2',
    });
  });
});
