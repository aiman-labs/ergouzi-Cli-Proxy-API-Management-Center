import { describe, expect, test } from 'bun:test';
import type { AuthFileItem } from '../src/types';
import { resolveAuthFileEnabledFilterValue } from '../src/utils/quota/resolvers';

describe('resolveAuthFileEnabledFilterValue', () => {
  test('classifies auth files by disabled state', () => {
    const enabledFile: AuthFileItem = {
      name: 'enabled.json',
      type: 'codex',
    };
    const disabledFile: AuthFileItem = {
      name: 'disabled.json',
      type: 'codex',
      disabled: true,
    };
    const numericDisabledFile: AuthFileItem = {
      name: 'numeric-disabled.json',
      type: 'codex',
      disabled: 1,
    };
    const stringDisabledFile: AuthFileItem = {
      name: 'string-disabled.json',
      type: 'codex',
      disabled: 'true',
    };

    expect(resolveAuthFileEnabledFilterValue(enabledFile)).toBe('enabled');
    expect(resolveAuthFileEnabledFilterValue(disabledFile)).toBe('disabled');
    expect(resolveAuthFileEnabledFilterValue(numericDisabledFile)).toBe('disabled');
    expect(resolveAuthFileEnabledFilterValue(stringDisabledFile)).toBe('disabled');
  });
});
