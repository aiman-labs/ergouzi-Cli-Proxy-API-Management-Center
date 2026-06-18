import { describe, expect, test } from 'bun:test';
import type { AuthFileItem } from '../src/types';
import { resolveCodexPlanFilterValue } from '../src/utils/quota/resolvers';

describe('resolveCodexPlanFilterValue', () => {
  test('does not infer Pro 20x from the imported filename', () => {
    const file: AuthFileItem = {
      name: 'codex-someone-pro.json',
      type: 'codex',
    };

    expect(resolveCodexPlanFilterValue(file)).toBe('unknown');
  });

  test('uses refreshed quota plan type before auth file metadata', () => {
    const file: AuthFileItem = {
      name: 'random-name.json',
      type: 'codex',
      plan_type: 'free',
    };

    expect(resolveCodexPlanFilterValue(file, 'pro')).toBe('pro20x');
  });

  test('classifies structured auth file plan type without filename dependency', () => {
    const proFile: AuthFileItem = {
      name: 'anything.json',
      type: 'codex',
      metadata: {
        planType: 'pro',
      },
    };
    const freeFile: AuthFileItem = {
      name: 'anything-else.json',
      type: 'codex',
      attributes: {
        plan_type: 'free',
      },
    };

    expect(resolveCodexPlanFilterValue(proFile)).toBe('pro20x');
    expect(resolveCodexPlanFilterValue(freeFile)).toBe('non_pro20x');
  });
});
