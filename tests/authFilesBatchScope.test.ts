import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('auth-files batch scope', () => {
  test('does not advertise a filtered-result selection when actions are current-page scoped', () => {
    const source = readFileSync(
      new URL('../src/features/authFiles/components/BatchActionBar.tsx', import.meta.url),
      'utf8'
    );
    expect(source).not.toContain('onSelectFiltered');
    expect(source).not.toContain('batch_select_filtered');
  });
});
