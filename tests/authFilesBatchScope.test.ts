import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolveAuthFileStatusTargets } from '@/features/authFiles/logic';
import type { AuthFileItem } from '@/types';

describe('auth-files batch scope', () => {
  test('builds cross-page filtered status targets without runtime-only or refreshing files', () => {
    const files: AuthFileItem[] = [
      { name: 'disabled-a.json', disabled: true },
      { name: 'enabled-a.json', disabled: false },
      { name: 'refreshing.json', disabled: true },
      { name: 'runtime.json', disabled: true, runtimeOnly: true },
    ];

    expect(resolveAuthFileStatusTargets(files, { 'refreshing.json': true }, true)).toEqual([
      'disabled-a.json',
    ]);
    expect(resolveAuthFileStatusTargets(files, {}, false)).toEqual(['enabled-a.json']);
  });

  test('renders filtered-result enable and disable actions in the new page structure', () => {
    const source = readFileSync(
      new URL('../src/features/authFiles/AuthFilesPage.tsx', import.meta.url),
      'utf8'
    );
    expect(source).toContain('batch_enable_filtered_button');
    expect(source).toContain('batch_disable_filtered_button');
    expect(source).toContain('scope_filtered_result');
  });

  test('routes cross-page status changes through the bounded settled runner', () => {
    const source = readFileSync(
      new URL('../src/features/authFiles/hooks/useAuthFilesData.ts', import.meta.url),
      'utf8'
    );
    expect(source).toContain('runLimitedSettledBatch');
    expect(source).toContain('BATCH_STATUS_CONCURRENCY');
    expect(source).not.toContain('Promise.allSettled(\n          targetNameList.map');
  });

  test('interpolates the filtered delete count in the toolbar label', () => {
    const source = readFileSync(
      new URL('../src/features/authFiles/AuthFilesPage.tsx', import.meta.url),
      'utf8'
    );
    expect(source).toContain("t('auth_files.delete_filtered_result_button', {");
    expect(source).toContain('count: filteredDeleteTargetNames.length');
    expect(source).toMatch(
      /normalizedSearch\.length > 0[\s\S]*?healthFilter === 'normal'[\s\S]*?delete_filtered_result_button/
    );
  });
});
