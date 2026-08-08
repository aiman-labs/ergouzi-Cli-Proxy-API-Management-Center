import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('quota page Ergouzi parity', () => {
  test('keeps a single-card quota refresh isolated from the credential inventory', () => {
    const source = readFileSync(
      new URL('../src/features/quota/QuotaPage.tsx', import.meta.url),
      'utf8'
    );
    expect(source).toContain('onRefresh={() => void handleQuotaRefresh(entry)}');
    expect(source).not.toContain(
      'refreshQuota(entry.file, QUOTA_ADAPTERS[entry.type]).then(loadFiles)'
    );
    expect(source).toContain('syncAuthFileSnapshots([entry.file.name])');
  });

  test('keeps current-page quota refresh isolated from the credential inventory', () => {
    const source = readFileSync(
      new URL('../src/features/quota/QuotaPage.tsx', import.meta.url),
      'utf8'
    );
    expect(source).toContain('await loadQuota(pageItems);');
    expect(source).not.toMatch(/await loadQuota\(pageItems\);\s+await loadFiles\(\);/);
    expect(source).toContain('syncAuthFileSnapshots(pageItems.map((entry) => entry.file.name))');
  });

  test('keeps refresh-all completion isolated from the credential inventory', () => {
    const source = readFileSync(
      new URL('../src/features/quota/QuotaPage.tsx', import.meta.url),
      'utf8'
    );
    expect(source).toContain('useCodexQuotaRefreshJob()');
    expect(source).not.toContain('onComplete: loadFiles');
    expect(source).not.toContain('if (directTargets.length > 0) await loadFiles();');
    expect(source).toContain('pendingCodexInventorySyncRef');
    expect(source).toContain('if (!pending || !codexJobProgress.jobId || codexJobActive) return;');
    expect(source).toContain('syncAuthFileSnapshots(pending.targetNames)');
    expect(source).toContain(
      'syncAuthFileSnapshots(directTargets.map((entry) => entry.file.name))'
    );
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
