import { describe, expect, test } from 'bun:test';
import {
  applyLogPage,
  buildLogsQuery,
  emptyLogBuffer,
  shouldCatchUp,
  LOG_PAGE_SIZE,
} from '../src/features/logs/model/logBuffer';

describe('cursor log buffer', () => {
  test('preserves identical lines and stable IDs across pages', () => {
    const first = applyLogPage(emptyLogBuffer(), { lines: ['A'], nextCursor: 'one' });
    const second = applyLogPage(first, { lines: ['A'], nextCursor: 'two' }, 'one');
    expect(second.buffer).toEqual(['A', 'A']);
    expect(second.bufferStart).toBe(0);
    expect(second.nextId).toBe(2);
  });
  test('reset replaces history and advances identity', () => {
    const first = applyLogPage(emptyLogBuffer(), { lines: ['old'], nextCursor: 'one' });
    const reset = applyLogPage(
      first,
      { lines: ['new'], cursorReset: true, nextCursor: 'two' },
      'one'
    );
    expect(reset.buffer).toEqual(['new']);
    expect(reset.bufferStart).toBe(1);
  });
  test('bounds both line count and text footprint without truncating a line', () => {
    let state = applyLogPage(emptyLogBuffer(), { lines: ['a', 'bb', 'ccc'] }, undefined, 2, 100);
    expect(state.buffer).toEqual(['bb', 'ccc']);
    expect(state.bufferStart).toBe(1);
    state = applyLogPage(state, { lines: ['oversized'], nextCursor: 'next' }, 'cursor', 2, 4);
    expect(state.buffer).toEqual(['oversized']);
    expect(state.evicted).toBe(3);
    expect(state.textUnits).toBe(10);
  });
  test('missing cursor tails rather than guessing timestamps or deduplicating', () => {
    expect(buildLogsQuery()).toEqual({ limit: LOG_PAGE_SIZE });
    expect(buildLogsQuery('opaque')).toEqual({ limit: LOG_PAGE_SIZE, cursor: 'opaque' });
    const state = applyLogPage(emptyLogBuffer(), { lines: ['old'] });
    expect(applyLogPage(state, { lines: ['new'] }).buffer).toEqual(['new']);
  });
  test('only advancing full cursor pages trigger bounded catch-up', () => {
    const page = { lines: Array(LOG_PAGE_SIZE).fill('A'), nextCursor: 'next' };
    expect(shouldCatchUp(page, 'old')).toBe(true);
    expect(shouldCatchUp(page, 'next')).toBe(false);
    expect(shouldCatchUp(page)).toBe(false);
    expect(shouldCatchUp({ ...page, cursorReset: true }, 'old')).toBe(false);
    expect(shouldCatchUp({ ...page, lines: [] }, 'old')).toBe(false);
  });

  test('Home refresh appends with after and retains its position across empty pages', () => {
    const after = '2026-09-30T16:00:00.123Z';
    const first = applyLogPage(emptyLogBuffer(), {
      lines: ['older'],
      latestAfter: after,
      requestLogHomeIpById: { old: 'node-a' },
    });
    expect(buildLogsQuery(first.cursor, first.after)).toEqual({ limit: LOG_PAGE_SIZE, after });
    const nextAfter = '2026-09-30T16:00:01.456Z';
    const next = applyLogPage(
      first,
      {
        lines: ['newer'],
        latestAfter: nextAfter,
        requestLogHomeIpById: { new: 'node-b' },
      },
      first.after
    );
    expect(next.buffer).toEqual(['older', 'newer']);
    expect(next.requestLogHomeIpById).toEqual({ old: 'node-a', new: 'node-b' });
    const empty = applyLogPage(next, { lines: [], requestLogHomeIpById: {} }, next.after);
    expect(empty.after).toBe(nextAfter);
    expect(empty.buffer).toEqual(next.buffer);
    expect(empty.requestLogHomeIpById).toEqual(next.requestLogHomeIpById);
    expect(buildLogsQuery(empty.cursor, empty.after)).toEqual({
      limit: LOG_PAGE_SIZE,
      after: nextAfter,
    });
    const reset = applyLogPage(
      empty,
      {
        lines: ['replacement'],
        cursorReset: true,
        requestLogHomeIpById: { replacement: 'node-c' },
      },
      empty.after
    );
    expect(reset.buffer).toEqual(['replacement']);
    expect(reset.after).toBeUndefined();
    expect(reset.requestLogHomeIpById).toEqual({ replacement: 'node-c' });
    expect(emptyLogBuffer().requestLogHomeIpById).toEqual({});
  });

  test('CPA timestamps do not enable the Home after protocol', () => {
    const state = applyLogPage(emptyLogBuffer(), { lines: ['CPA'], latestAfter: 123 });
    expect(state.after).toBeUndefined();
    expect(buildLogsQuery(state.cursor, state.after)).toEqual({ limit: LOG_PAGE_SIZE });
    expect(buildLogsQuery('opaque', 123)).toEqual({ limit: LOG_PAGE_SIZE, cursor: 'opaque' });
  });
});
