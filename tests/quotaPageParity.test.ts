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
    expect(source).toContain('syncAuthFileSnapshotsWithFeedback([entry.file.name])');
  });

  test('keeps current-page quota refresh isolated from the credential inventory', () => {
    const source = readFileSync(
      new URL('../src/features/quota/QuotaPage.tsx', import.meta.url),
      'utf8'
    );
    expect(source).toContain('await loadQuota(pageItems);');
    expect(source).not.toMatch(/await loadQuota\(pageItems\);\s+await loadFiles\(\);/);
    expect(source).toContain(
      'syncAuthFileSnapshotsWithFeedback(pageItems.map((entry) => entry.file.name))'
    );
  });

  test('keeps refresh-all completion isolated from the credential inventory', () => {
    const source = readFileSync(
      new URL('../src/features/quota/QuotaPage.tsx', import.meta.url),
      'utf8'
    );
    expect(source).toContain('useCodexQuotaRefreshJob()');
    expect(source).not.toContain('onComplete: loadFiles');
    expect(source).not.toContain('if (directTargets.length > 0) await loadFiles();');
    expect(source).not.toContain('pendingCodexInventorySyncRef');
    expect(source).toContain('inventorySyncContext');
    expect(source).toContain('clearInventorySyncContext');
    expect(source).toContain('targetedAuthFileSyncs');
    expect(source).toContain('syncAuthFileSnapshotsForJob(');
    expect(source).toContain('shouldSyncCodexQuotaInventory({');
    expect(source).toContain('remoteTerminalJobId');
    expect(source).toContain('inventorySyncContext.targetNames');
    expect(source).toContain(
      'syncAuthFileSnapshotsWithFeedback(directTargets.map((entry) => entry.file.name))'
    );
  });

  test('reports exhausted targeted auth snapshot synchronization without reloading the inventory', () => {
    const source = readFileSync(
      new URL('../src/features/quota/QuotaPage.tsx', import.meta.url),
      'utf8'
    );
    expect(source).toContain('syncAuthFileSnapshotsWithFeedback');
    expect(source).toContain("t('quota_management.auth_snapshot_sync_failed')");
    expect(source).toContain("showNotification(message, 'warning')");
    expect(source).not.toContain('syncAuthFileSnapshotsWithFeedback(names).then(loadFiles)');
  });

  test('keeps the Codex refresh-job hook free of completion side effects', () => {
    const source = readFileSync(
      new URL('../src/components/quota/useCodexQuotaRefreshJob.ts', import.meta.url),
      'utf8'
    );
    expect(source).not.toContain('onComplete');
    expect(source).not.toContain('completionHandler');
    expect(source).toContain('setInventorySyncContext({');
    expect(source).toContain('targetNames: [...filesByName.keys()]');
  });

  test('keeps a cancelling Codex job current until its remote result is published', () => {
    const source = readFileSync(
      new URL('../src/components/quota/useCodexQuotaRefreshJob.ts', import.meta.url),
      'utf8'
    );
    const cancelSource = source.match(
      /const cancel = useCallback[\s\S]*?\n {2}useEffect\(\(\) => \{/
    )?.[0];
    expect(cancelSource).toBeDefined();
    expect(cancelSource).toContain('if (!run || run.cancelling) return;');
    expect(cancelSource).toContain('run.cancelling = true;');
    expect(cancelSource).toContain('if (activeRun !== run) return;');
    expect(cancelSource).toMatch(
      /finally \{\s+if \(activeRun === run\) \{\s+activeRun = null;\s+setActive\(false\);/
    );
    expect(cancelSource?.slice(0, cancelSource.indexOf('try {'))).not.toContain(
      'activeRun = null'
    );
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
