import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createOAuthAttempts } from '../src/features/oauth/oauthAttempts';

const VERTEX_PATH = 'src/features/oauth/hooks/useVertexImport.ts';
const OAUTH_PATH = 'src/features/oauth/hooks/useOAuthFlows.ts';

// Execute the actual hook body without globally mocking React or requiring a DOM.
function compileHook(path: string, name: string) {
  const source = readFileSync(path, 'utf8');
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === name
  );
  if (!declaration) throw new Error(`Missing hook: ${name}`);
  return (
    ts.transpileModule(declaration.getText(ast).replace(/^export /, ''), {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText + `\nreturn ${name};`
  );
}

function harness(path: string, name: string) {
  let authState = {
    apiBase: 'http://synthetic.example.test',
    managementKey: 'synthetic-a',
    isAuthenticated: true,
  };
  let revision = 1;
  const slots: any[] = [];
  let cursor = 0;
  const effects: any[] = [];
  let effectCursor = 0;
  let subscribers: any[] = [];
  const requests: any[] = [];
  let notifications = 0;
  let changes = 0;
  let added = 0;
  const useState = (initial: unknown) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [
      slots[index],
      (update: any) => {
        slots[index] = typeof update === 'function' ? update(slots[index]) : update;
      },
    ];
  };
  const useRef = (initial: unknown) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = { current: initial };
    return slots[index];
  };
  const useEffect = (activate: () => unknown, dependencies: unknown[]) => {
    const index = effectCursor++;
    const previous = effects[index];
    if (
      !previous ||
      dependencies.some((value, offset) => value !== previous.dependencies[offset])
    ) {
      previous?.cleanup?.();
      effects[index] = { dependencies, cleanup: activate() };
    }
  };
  const useAuthStore = (selector: (state: typeof authState) => unknown) => selector(authState);
  useAuthStore.subscribe = (subscriber: any) => {
    subscribers.push(subscriber);
    return () => {
      subscribers = subscribers.filter((entry) => entry !== subscriber);
    };
  };
  const request = (...args: unknown[]) =>
    new Promise((resolve, reject) => {
      requests.push({ args, resolve, reject });
    });
  const environment = {
    useState,
    useRef,
    useEffect,
    useAuthStore,
    apiClient: { getConnectionRevision: () => revision },
    useTranslation: () => ({ t: (key: string) => key }),
    useNotificationStore: () => ({
      showNotification: () => {
        notifications++;
      },
    }),
    vertexApi: { importCredential: request },
    pluginsApi: { list: request },
    createOAuthAttempts,
    isJsonFile: (file: File) => file.name.endsWith('.json'),
    getErrorMessage: (error: Error) => error.message,
    notifyAuthFilesChanged: () => {
      changes++;
    },
    buildPluginOAuthProviderCards: (entries: unknown) => entries,
    window: { setTimeout, clearTimeout },
  };
  const hook = new Function(...Object.keys(environment), compileHook(path, name))(
    ...Object.values(environment)
  );
  return {
    requests,
    render() {
      cursor = 0;
      effectCursor = 0;
      return name === 'useVertexImport'
        ? hook({
            isFocused: () => false,
            onCredentialAdded: () => {
              added++;
            },
          })
        : hook(authState.apiBase);
    },
    get state() {
      return slots[0];
    },
    get counts() {
      return { notifications, changes, added };
    },
    switchKey() {
      const previous = authState;
      authState = { ...authState, managementKey: 'synthetic-b' };
      revision++;
      subscribers.slice().forEach((subscriber) => subscriber(authState, previous));
    },
    unmount() {
      effects.forEach((effect) => effect.cleanup?.());
    },
  };
}
function startVertexImport(h: ReturnType<typeof harness>) {
  let hook = h.render();
  hook.pickFile(new File(['{}'], 'synthetic.json'));
  hook = h.render();
  return hook.importCredential();
}
describe('OAuth connection isolation', () => {
  for (const outcome of ['success', 'failure']) {
    test(`Vertex ignores late ${outcome} after a same-base key switch`, async () => {
      const h = harness(VERTEX_PATH, 'useVertexImport');
      const pending = startVertexImport(h);
      h.switchKey();
      expect(h.requests[0].args[2].aborted).toBe(true);
      if (outcome === 'success') h.requests[0].resolve({ email: 'synthetic@example.test' });
      else h.requests[0].reject(new Error('late failure'));
      await pending;
      expect(h.state.file).toBeUndefined();
      expect(h.state.result).toBeUndefined();
      expect(h.state.error).toBeUndefined();
      expect(h.state.loading).toBe(false);
      expect(h.counts).toEqual({ notifications: 0, changes: 0, added: 0 });
    });
  }
  test('Vertex unmount aborts the request and suppresses late effects', async () => {
    const h = harness(VERTEX_PATH, 'useVertexImport');
    const pending = startVertexImport(h);
    h.unmount();
    expect(h.requests[0].args[2].aborted).toBe(true);
    h.requests[0].resolve({ project_id: 'old-project' });
    await pending;
    expect(h.state.result).toBeUndefined();
    expect(h.counts).toEqual({ notifications: 0, changes: 0, added: 0 });
  });
  test('Vertex accepts current success and counts the credential once', async () => {
    const h = harness(VERTEX_PATH, 'useVertexImport');
    const pending = startVertexImport(h);
    h.requests[0].resolve({ project_id: 'fresh-project' });
    await pending;
    expect(h.state.result.projectId).toBe('fresh-project');
    expect(h.state.loading).toBe(false);
    expect(h.counts).toEqual({ notifications: 1, changes: 1, added: 1 });
  });
  test('plugin discovery rejects stale responses and reloads on same-base key changes', async () => {
    const h = harness(OAUTH_PATH, 'usePluginOAuthProviders');
    h.render();
    h.switchKey();
    // Settle before effect cleanup: the revision must already reject this response.
    h.requests[0].resolve({ plugins: ['old-plugin'] });
    await Promise.resolve();
    await Promise.resolve();
    expect(h.state).toEqual([]);
    h.render();
    expect(h.requests).toHaveLength(2);
    h.requests[1].resolve({ plugins: ['new-plugin'] });
    await Promise.resolve();
    await Promise.resolve();
    expect(h.state).toEqual(['new-plugin']);
  });
});
