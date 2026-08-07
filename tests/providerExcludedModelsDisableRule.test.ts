import { describe, expect, test } from 'bun:test';
import { buildExcludedModels } from '../src/features/providers/useProviderWorkbench';

/**
 * `excluded-models: ['*']` is the backend encoding for a disabled provider.
 * The form's `disabled` toggle owns it exclusively: loading strips it into that flag, and
 * saving restores it only from that flag.
 *
 * These assertions preserve that invariant so excluded-model editor rewrites cannot corrupt
 * the disabled state.
 */
describe('buildExcludedModels — the "*" disable-rule invariant', () => {
  test('appends "*" when disabled', () => {
    expect(buildExcludedModels('a\nb', true, 'gemini')).toEqual(['a', 'b', '*']);
  });

  test('omits "*" when not disabled', () => {
    expect(buildExcludedModels('a\nb', false, 'gemini')).toEqual(['a', 'b']);
  });

  test('a hand-typed "*" never duplicates the disable rule', () => {
    expect(buildExcludedModels('a\n*\nb', true, 'gemini')).toEqual(['a', 'b', '*']);
  });

  test('a hand-typed "*" never switches the provider to disabled', () => {
    expect(buildExcludedModels('a\n*\nb', false, 'gemini')).toEqual(['a', 'b']);
  });

  test('disabled with no rules yields exactly the disable rule', () => {
    expect(buildExcludedModels('', true, 'gemini')).toEqual(['*']);
  });

  test('no rules and not disabled yields undefined, not an empty array', () => {
    expect(buildExcludedModels('', false, 'gemini')).toBeUndefined();
  });

  test('openaiCompatibility never receives the disable rule', () => {
    expect(buildExcludedModels('a', true, 'openaiCompatibility')).toEqual(['a']);
    expect(buildExcludedModels('', true, 'openaiCompatibility')).toBeUndefined();
  });
});
