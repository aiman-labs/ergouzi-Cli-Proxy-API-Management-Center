import { describe, expect, test } from 'bun:test';
import type { AuthFileItem } from '../src/types';
import { mergeAuthFileSnapshots } from '../src/utils/authFiles';

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
