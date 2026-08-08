import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('quota page Ergouzi parity', () => {
  test('keeps a single-card quota refresh isolated from the credential inventory', () => {
    const source = readFileSync(
      new URL('../src/features/quota/QuotaPage.tsx', import.meta.url),
      'utf8'
    );
    expect(source).toContain('void refreshQuota(entry.file, QUOTA_ADAPTERS[entry.type])');
    expect(source).not.toContain(
      'refreshQuota(entry.file, QUOTA_ADAPTERS[entry.type]).then(loadFiles)'
    );
  });

  test('keeps current-page quota refresh isolated from the credential inventory', () => {
    const source = readFileSync(
      new URL('../src/features/quota/QuotaPage.tsx', import.meta.url),
      'utf8'
    );
    expect(source).toContain('await loadQuota(pageItems);');
    expect(source).not.toMatch(/await loadQuota\(pageItems\);\s+await loadFiles\(\);/);
  });

  test('keeps refresh-all completion isolated from the credential inventory', () => {
    const source = readFileSync(
      new URL('../src/features/quota/QuotaPage.tsx', import.meta.url),
      'utf8'
    );
    expect(source).toContain('useCodexQuotaRefreshJob()');
    expect(source).not.toContain('onComplete: loadFiles');
    expect(source).not.toContain('if (directTargets.length > 0) await loadFiles();');
  });

  test('keeps the Codex refresh-job hook free of completion side effects', () => {
    const source = readFileSync(
      new URL('../src/components/quota/useCodexQuotaRefreshJob.ts', import.meta.url),
      'utf8'
    );
    expect(source).not.toContain('onComplete');
    expect(source).not.toContain('completionHandler');
  });

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
