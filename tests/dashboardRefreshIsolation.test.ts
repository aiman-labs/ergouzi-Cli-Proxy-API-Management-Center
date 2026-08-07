import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/features/dashboard/hooks/useDashboardOverview.ts', import.meta.url),
  'utf8'
);

describe('dashboard refresh isolation wiring', () => {
  test('keeps first load cacheable and forces model refresh from the manual action', () => {
    expect(source).toContain('const loadModels = useCallback(\n    async (forceRefresh = false)');
    expect(source).toContain('fetchModelsFromStore(apiBase, apiKeys[0], forceRefresh)');
    expect(source).toContain('loadModels(true)');
  });

  test('drops stale auth-file responses and invalidates them on disconnect', () => {
    expect(source).toContain('const requestId = ++authFilesRequestIdRef.current;');
    expect(source).toContain('if (requestId !== authFilesRequestIdRef.current) return;');
    expect(source).toContain('authFilesRequestIdRef.current += 1;');
  });
});
