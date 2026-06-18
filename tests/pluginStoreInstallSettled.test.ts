import { describe, expect, test } from 'bun:test';
import { isPluginStoreInstallSettled } from '../src/features/plugins/pluginPolling';
import type { PluginStoreEntry } from '../src/types';

const plugin = (patch: Partial<PluginStoreEntry> = {}): PluginStoreEntry => ({
  storeId: 'default/codex',
  sourceId: 'default',
  sourceName: 'Default',
  sourceUrl: '',
  id: 'codex',
  name: 'Codex',
  description: '',
  author: '',
  version: '1.2.0',
  repository: '',
  logo: '',
  homepage: '',
  license: '',
  tags: [],
  installed: true,
  installedVersion: '1.0.0',
  path: 'plugins/codex',
  configured: true,
  registered: true,
  enabled: true,
  effectiveEnabled: true,
  updateAvailable: true,
  ...patch,
});

describe('isPluginStoreInstallSettled', () => {
  test('keeps install completion behavior unchanged', () => {
    expect(isPluginStoreInstallSettled(plugin(), { isUpdate: false })).toBe(true);
  });

  test('does not settle updates on stale installed store rows', () => {
    expect(
      isPluginStoreInstallSettled(plugin(), {
        isUpdate: true,
        expectedVersion: '1.2.0',
      })
    ).toBe(false);
  });

  test('settles updates once the installed version advances', () => {
    expect(
      isPluginStoreInstallSettled(plugin({ installedVersion: '1.2.0' }), {
        isUpdate: true,
        expectedVersion: '1.2.0',
      })
    ).toBe(true);
  });

  test('settles updates when the store clears updateAvailable', () => {
    expect(
      isPluginStoreInstallSettled(plugin({ updateAvailable: false }), {
        isUpdate: true,
        expectedVersion: '',
      })
    ).toBe(true);
  });
});
