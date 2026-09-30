import { afterEach, expect, test } from 'bun:test';
import { apiClient } from '@/services/api/client';
import { providersApi } from '@/services/api/providers';
import { normalizeProviderGroups } from '@/services/api/transformers';
import type { ProviderKeyConfig } from '@/types';

const originalGet = apiClient.get;
const originalPut = apiClient.put;
afterEach(() => { apiClient.get = originalGet; apiClient.put = originalPut; });

test('v8 source identity updates only the selected duplicate and preserves concurrent groups', async () => {
  const group = { name: 'pool', keys: [
    { 'api-key': 'duplicate', prefix: 'first', 'future-field': 'one' },
    { 'api-key': 'duplicate', prefix: 'second', 'future-field': 'two' },
  ] };
  const selected = (normalizeProviderGroups([group]) as ProviderKeyConfig[])[1];
  const concurrent = { name: 'concurrent', keys: [{ 'api-key': 'new' }] };
  apiClient.get = (async () => ({ 'api-keys': { codex: [group, concurrent] } })) as typeof apiClient.get;
  let written: unknown;
  apiClient.put = (async (_path, value) => { written = value; }) as typeof apiClient.put;
  await providersApi.updateCodexConfig(selected.apiKey, selected.baseUrl, { ...selected, priority: 7 });
  expect(written).toEqual([{ ...group, keys: [group.keys[0], { ...group.keys[1], priority: 7 }] }, concurrent]);
});

test('v8 source identity rejects a stale selected credential without writing', async () => {
  const group = { name: 'pool', keys: [{ 'api-key': 'before' }] };
  const selected = (normalizeProviderGroups([group]) as ProviderKeyConfig[])[0];
  apiClient.get = (async () => ({ 'api-keys': { codex: [{ name: 'pool', keys: [{ 'api-key': 'after' }] }] } })) as typeof apiClient.get;
  let writes = 0;
  apiClient.put = (async () => { writes++; }) as typeof apiClient.put;
  await expect(providersApi.updateCodexConfig(selected.apiKey, selected.baseUrl, { ...selected, priority: 7 })).rejects.toThrow();
  expect(writes).toBe(0);
});
