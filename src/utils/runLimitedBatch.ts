interface RunLimitedBatchOptions<TItem, TResult> {
  items: TItem[];
  concurrency: number;
  worker: (item: TItem, index: number) => Promise<TResult>;
  onResult?: (result: TResult, index: number, item: TItem) => void;
}

export async function runLimitedBatch<TItem, TResult>({
  items,
  concurrency,
  worker,
  onResult,
}: RunLimitedBatchOptions<TItem, TResult>): Promise<TResult[]> {
  if (items.length === 0) return [];

  const limit = Math.max(1, Math.min(items.length, Math.floor(concurrency)));
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];
      const result = await worker(item, index);
      results[index] = result;
      onResult?.(result, index, item);
    }
  };

  await Promise.all(Array.from({ length: limit }, runWorker));
  return results;
}
