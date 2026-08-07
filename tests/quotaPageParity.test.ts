import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('quota page Ergouzi parity', () => {
  test('keeps the Codex reset-detail toggle in the current quota toolbar', () => {
    const source = readFileSync(
      new URL('../src/features/quota/QuotaPage.tsx', import.meta.url),
      'utf8'
    );
    expect(source).toContain('show_codex_reset_expiry');
    expect(source).toContain('showCodexResetCreditExpiries');
    expect(source).not.toContain("tab !== 'codex' || showCodexResetCreditExpiries");
  });

  test('keeps the quota-card viewport bounded and independently scrollable', () => {
    const source = readFileSync(
      new URL('../src/features/quota/QuotaPage.module.scss', import.meta.url),
      'utf8'
    );
    expect(source).toMatch(/\.gridViewport\s*\{[^}]*max-height:/s);
    expect(source).toMatch(/\.gridViewport\s*\{[^}]*overflow-y:\s*auto/s);
    expect(source).not.toContain('clamp(760px');
    expect(source).toMatch(/@include mobile[\s\S]*?\.controls\s*\{[^}]*flex:\s*0 0 auto/s);
  });
});
