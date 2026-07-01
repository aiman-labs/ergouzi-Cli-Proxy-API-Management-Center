import { describe, expect, test } from 'bun:test';
import {
  transformAuthFileImportJson,
  transformAuthFilesForImport,
} from '../src/features/authFiles/importOptions';

describe('transformAuthFileImportJson', () => {
  test('removes supplier priority when import mode strips priority', () => {
    const input = JSON.stringify({
      type: 'codex',
      email: 'team@example.com',
      priority: 99,
    });

    const transformed = JSON.parse(
      transformAuthFileImportJson(input, { priorityMode: 'strip' })
    ) as Record<string, unknown>;

    expect(transformed).toEqual({
      type: 'codex',
      email: 'team@example.com',
    });
  });

  test('overwrites supplier priority for one import batch', () => {
    const input = JSON.stringify({
      type: 'codex',
      priority: 99,
    });

    const transformed = JSON.parse(
      transformAuthFileImportJson(input, { priorityMode: 'set', priorityValue: 30 })
    ) as Record<string, unknown>;

    expect(transformed.priority).toBe(30);
  });

  test('preserves supplier priority when requested', () => {
    const input = JSON.stringify({
      type: 'codex',
      priority: 99,
    });

    const transformed = JSON.parse(
      transformAuthFileImportJson(input, { priorityMode: 'preserve' })
    ) as Record<string, unknown>;

    expect(transformed.priority).toBe(99);
  });

  test('removes supplier disabled state by default so imported files are enabled', () => {
    const input = JSON.stringify({
      type: 'codex',
      disabled: true,
    });

    const transformed = JSON.parse(
      transformAuthFileImportJson(input, { priorityMode: 'strip', disabledMode: 'enabled' })
    ) as Record<string, unknown>;

    expect(transformed.disabled).toBeUndefined();
  });

  test('can import a whole batch as disabled', () => {
    const input = JSON.stringify({
      type: 'codex',
      disabled: false,
    });

    const transformed = JSON.parse(
      transformAuthFileImportJson(input, { priorityMode: 'strip', disabledMode: 'disabled' })
    ) as Record<string, unknown>;

    expect(transformed.disabled).toBe(true);
  });

  test('keeps one malformed file from aborting the whole import batch', async () => {
    const goodFile = new File(
      [
        JSON.stringify({
          type: 'codex',
          priority: 99,
        }),
      ],
      'good.json',
      { type: 'application/json' }
    );
    const badFile = new File(['not-json'], 'bad.json', { type: 'application/json' });

    const transformed = await transformAuthFilesForImport([goodFile, badFile], {
      priorityMode: 'strip',
      disabledMode: 'enabled',
    });

    const goodPayload = JSON.parse(await transformed[0].text()) as Record<string, unknown>;
    expect(goodPayload.priority).toBeUndefined();
    expect(await transformed[1].text()).toBe('not-json');
  });
});
