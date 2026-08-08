import { describe, expect, test } from 'bun:test';
import type { AuthFileItem } from '../src/types';
import {
  mergeAuthFileSnapshots,
  mergeTargetedAuthFileSnapshots,
} from '../src/utils/authFiles';

describe('mergeAuthFileSnapshots', () => {
  test('updates auth file metadata from the refreshed backend snapshot', () => {
    const currentFiles: AuthFileItem[] = [
      { name: 'enabled.json', type: 'codex', disabled: false, status: 'ok' },
      { name: 'removed.json', type: 'codex', disabled: false, status: 'ok' },
    ];
    const refreshedFiles: AuthFileItem[] = [
      {
        name: 'enabled.json',
        type: 'codex',
        disabled: true,
        status: 'disabled',
        statusMessage: 'auto disabled',
      },
      { name: 'new.json', type: 'codex', disabled: false, status: 'ok' },
    ];

    expect(mergeAuthFileSnapshots(currentFiles, refreshedFiles)).toEqual([
      {
        name: 'enabled.json',
        type: 'codex',
        disabled: true,
        status: 'disabled',
        statusMessage: 'auto disabled',
      },
      { name: 'new.json', type: 'codex', disabled: false, status: 'ok' },
    ]);
  });
});

describe('mergeTargetedAuthFileSnapshots', () => {
  test('updates only targeted credentials and preserves unrelated references', () => {
    const target = { name: 'target.json', type: 'codex', disabled: false, status: 'ok' };
    const unrelated = { name: 'other.json', type: 'codex', disabled: false, status: 'ok' };
    const currentFiles: AuthFileItem[] = [target, unrelated];
    const refreshedFiles: AuthFileItem[] = [
      { name: 'target.json', type: 'codex', disabled: true, status: 'disabled' },
      { name: 'other.json', type: 'codex', disabled: true, status: 'disabled' },
    ];

    const merged = mergeTargetedAuthFileSnapshots(currentFiles, refreshedFiles, [
      'target.json',
    ]);

    expect(merged).not.toBe(currentFiles);
    expect(merged[0]).toEqual(refreshedFiles[0]);
    expect(merged[1]).toBe(unrelated);
  });

  test('preserves the array and item references when target metadata is unchanged', () => {
    const target = { name: 'target.json', type: 'codex', disabled: false, status: 'ok' };
    const unrelated = { name: 'other.json', type: 'codex', disabled: false, status: 'ok' };
    const currentFiles: AuthFileItem[] = [target, unrelated];

    const merged = mergeTargetedAuthFileSnapshots(
      currentFiles,
      [
        { name: 'target.json', type: 'codex', disabled: false, status: 'ok' },
        { name: 'other.json', type: 'codex', disabled: true, status: 'disabled' },
      ],
      ['target.json']
    );

    expect(merged).toBe(currentFiles);
    expect(merged[0]).toBe(target);
    expect(merged[1]).toBe(unrelated);
  });

  test('removes a deleted target without importing unrelated additions', () => {
    const target = { name: 'target.json', type: 'codex', disabled: false, status: 'ok' };
    const unrelated = { name: 'other.json', type: 'codex', disabled: false, status: 'ok' };

    const merged = mergeTargetedAuthFileSnapshots(
      [target, unrelated],
      [
        unrelated,
        { name: 'new.json', type: 'codex', disabled: false, status: 'ok' },
      ],
      ['target.json']
    );

    expect(merged).toEqual([unrelated]);
    expect(merged[0]).toBe(unrelated);
  });
});
