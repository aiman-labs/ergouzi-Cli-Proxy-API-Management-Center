import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('auth-file details cache invalidation wiring', () => {
  test('invalidates the saved credential before reloading the inventory', () => {
    const hookSource = readFileSync(
      new URL('../src/features/authFiles/hooks/useAuthFilesPrefixProxyEditor.ts', import.meta.url),
      'utf8'
    );
    const pageSource = readFileSync(
      new URL('../src/features/authFiles/AuthFilesPage.tsx', import.meta.url),
      'utf8'
    );
    const patchIndex = hookSource.indexOf('await authFilesApi.patchFields(name, payload);');
    const invalidateIndex = hookSource.indexOf('onFileMutated(name);', patchIndex);
    const reloadIndex = hookSource.indexOf('await loadFiles();', invalidateIndex);

    expect(patchIndex).toBeGreaterThanOrEqual(0);
    expect(invalidateIndex).toBeGreaterThan(patchIndex);
    expect(reloadIndex).toBeGreaterThan(invalidateIndex);
    expect(pageSource).toContain(
      'onFileMutated: (name) => invalidateDerivedCaches([name])'
    );
  });
});
