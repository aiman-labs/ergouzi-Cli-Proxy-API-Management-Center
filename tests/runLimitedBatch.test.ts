import { describe, expect, test } from 'bun:test';
import { runLimitedBatch } from '../src/utils/runLimitedBatch';

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
});
