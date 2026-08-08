import { describe, expect, test } from 'bun:test';
import { runLimitedBatch, runLimitedSettledBatch } from '../src/utils/runLimitedBatch';

describe('runLimitedBatch', () => {
  test('limits concurrent workers and preserves result order', async () => {
    let active = 0;
    let maxActive = 0;
    const seen: number[] = [];

    const results = await runLimitedBatch({
      items: [1, 2, 3, 4, 5],
      concurrency: 2,
      worker: async (item) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        seen.push(item);
        active -= 1;
        return item * 10;
      },
    });

    expect(maxActive).toBeLessThanOrEqual(2);
    expect(seen).toEqual([1, 2, 3, 4, 5]);
    expect(results).toEqual([10, 20, 30, 40, 50]);
  });

  test('keeps a 1600-item quota batch within four concurrent workers', async () => {
    let active = 0;
    let maxActive = 0;
    let completed = 0;
    const items = Array.from({ length: 1600 }, (_, index) => index);

    const results = await runLimitedBatch({
      items,
      concurrency: 4,
      worker: async (item) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await Promise.resolve();
        active -= 1;
        return item;
      },
      onResult: () => {
        completed += 1;
      },
    });

    expect(maxActive).toBe(4);
    expect(completed).toBe(1600);
    expect(results).toEqual(items);
  });

  test('settles a 1600-item status batch without exceeding four concurrent requests', async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 1600 }, (_, index) => index);

    const results = await runLimitedSettledBatch({
      items,
      concurrency: 4,
      worker: async (item) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await Promise.resolve();
        active -= 1;
        if (item === 99) throw new Error('expected failure');
        return item;
      },
    });

    expect(maxActive).toBe(4);
    expect(results).toHaveLength(1600);
    expect(results[99].status).toBe('rejected');
    expect(results[100]).toEqual({ status: 'fulfilled', value: 100 });
  });
});
