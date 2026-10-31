/**
 * 认证状态管理
 * 从原项目 src/modules/login.js 和 src/core/connection.js 迁移
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthState, LoginCredentials, ConnectionStatus, ServerRuntimeKind } from '@/types';
import { STORAGE_KEY_AUTH } from '@/utils/constants';
import { isCurrentObfuscated } from '@/utils/encryption';
import { obfuscatedStorage } from '@/services/storage/secureStorage';
import { apiClient } from '@/services/api/client';
import { versionApi } from '@/services/api/version';
import { LegacyBackendError, probeLegacyBackend } from '@/services/api/legacyBackendProbe';
import { useConfigStore } from './useConfigStore';
import { useModelsStore } from './useModelsStore';
import { useQuotaStore } from './useQuotaStore';
import { detectApiBaseFromLocation, normalizeApiBase } from '@/utils/connection';

interface AuthStoreState extends AuthState {
  connectionStatus: ConnectionStatus;

  // 操作
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  restoreSession: () => Promise<boolean>;
  updateServerVersion: (
    version: string | null,
    buildDate?: string | null,
    runtimeKind?: ServerRuntimeKind | null
  ) => void;
  updateServerRuntimeKind: (runtimeKind: ServerRuntimeKind) => void;
  hasRestorableSession: () => boolean;
  updateServerPluginSupport: (supportsPlugin: boolean) => void;
}

let restoreSessionPromise: Promise<boolean> | null = null;

const detectRuntimeKind = async (): Promise<ServerRuntimeKind> => {
  try {
    return await versionApi.detectRuntimeKind();
  } catch (error) {
    console.warn('Runtime kind detection failed:', error);
    return 'unknown';
  }
};
/**
 * 自动登录的前提：上次登录时勾选了记住密码且未登出（isLoggedIn 标记），并且保存了密钥。
 * restoreSession 与 hasRestorableSession 共用此判断，保证"显示启动画面"与"真的去自动登录"一致。
 */
export const shouldAttemptAutoLogin = (
  wasLoggedIn: boolean,
  apiBase: string,
  managementKey: string
): boolean => wasLoggedIn && Boolean(apiBase) && Boolean(managementKey);

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      // 初始状态
      isAuthenticated: false,
      apiBase: '',
      managementKey: '',
      rememberPassword: false,
      serverVersion: null,
      serverBuildDate: null,
      serverRuntimeKind: 'unknown',
      supportsPlugin: false,
      connectionStatus: 'disconnected',

      // 恢复会话并自动登录
      restoreSession: () => {
        if (restoreSessionPromise) return restoreSessionPromise;

        restoreSessionPromise = (async () => {
          const wasLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
          const legacyBase =
            obfuscatedStorage.getItem<string>('apiBase') ||
            obfuscatedStorage.getItem<string>('apiUrl', { encrypt: true });
          const { apiBase, managementKey, rememberPassword } = get();
          const resolvedBase = normalizeApiBase(
            apiBase || legacyBase || detectApiBaseFromLocation()
          );
          const resolvedKey = managementKey || '';
          const resolvedRememberPassword = rememberPassword;

          set({
            apiBase: resolvedBase,
            managementKey: resolvedKey,
            rememberPassword: resolvedRememberPassword,
          });
          apiClient.setConfig({ apiBase: resolvedBase, managementKey: resolvedKey });

          if (shouldAttemptAutoLogin(wasLoggedIn, resolvedBase, resolvedKey)) {
            try {
              await get().login({
                apiBase: resolvedBase,
                managementKey: resolvedKey,
                rememberPassword: resolvedRememberPassword,
              });
              return true;
            } catch (error) {
              console.warn('Auto login failed:', error);
              return false;
            }
          }

          return false;
        })();

        return restoreSessionPromise;
      },

      hasRestorableSession: () => {
        if (typeof localStorage === 'undefined') return false;
        const wasLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const { apiBase, managementKey } = get();
        // 与 restoreSession 相同：地址总能回退到当前访问地址，因此只需地址非空的占位判断
        const base = apiBase || detectApiBaseFromLocation();
        return shouldAttemptAutoLogin(wasLoggedIn, base, managementKey);
      },

      // 登录
      login: async (credentials) => {
        const apiBase = normalizeApiBase(credentials.apiBase);
        const managementKey = credentials.managementKey.trim();
        const rememberPassword = credentials.rememberPassword ?? get().rememberPassword ?? false;

        try {
          set({
            connectionStatus: 'connecting',
            serverVersion: null,
            serverBuildDate: null,
            serverRuntimeKind: 'unknown',
            supportsPlugin: false,
          });
          useConfigStore.getState().clearCache();
          useModelsStore.getState().clearCache();
          useQuotaStore.getState().clearQuotaCache();

          // 配置 API 客户端
          apiClient.setConfig({
            apiBase,
            managementKey,
          });

          // 测试连接 - 获取配置。只在 v8 路由不存在时诊断旧版后端。
          const revision = apiClient.getConnectionRevision();
          try {
            await useConfigStore.getState().fetchConfig(true);
          } catch (error) {
            if (
              (error as { status?: number })?.status === 404 &&
              revision === apiClient.getConnectionRevision() &&
              (await probeLegacyBackend(apiBase, managementKey)) &&
              revision === apiClient.getConnectionRevision()
            ) {
              throw new LegacyBackendError();
            }
            throw error;
          }
          const runtimeKind = await detectRuntimeKind();

          // 登录成功
          set({
            isAuthenticated: true,
            apiBase,
            managementKey,
            rememberPassword,
            connectionStatus: 'connected',
            ...(runtimeKind !== 'unknown' ? { serverRuntimeKind: runtimeKind } : {}),
          });
          if (rememberPassword) {
            localStorage.setItem('isLoggedIn', 'true');
          } else {
            localStorage.removeItem('isLoggedIn');
          }
        } catch (error: unknown) {
          set({ connectionStatus: 'error' });
          throw error;
        }
      },

      // 登出
      logout: () => {
        restoreSessionPromise = null;
        apiClient.setConfig({ apiBase: '', managementKey: '' });
        useConfigStore.getState().clearCache();
        useModelsStore.getState().clearCache();
        useQuotaStore.getState().clearQuotaCache();
        set({
          isAuthenticated: false,
          apiBase: '',
          managementKey: '',
          serverVersion: null,
          serverBuildDate: null,
          serverRuntimeKind: 'unknown',
          supportsPlugin: false,
          connectionStatus: 'disconnected',
        });
        localStorage.removeItem('isLoggedIn');
      },

      // 检查认证状态
      checkAuth: async () => {
        const { managementKey, apiBase } = get();

        if (!managementKey || !apiBase) {
          return false;
        }

        try {
          // 重新配置客户端
          apiClient.setConfig({ apiBase, managementKey });
          set({ supportsPlugin: false });

          // 验证连接
          await useConfigStore.getState().fetchConfig();
          const runtimeKind = await detectRuntimeKind();

          set({
            isAuthenticated: true,
            connectionStatus: 'connected',
            ...(runtimeKind !== 'unknown' ? { serverRuntimeKind: runtimeKind } : {}),
          });

          return true;
        } catch {
          set({
            isAuthenticated: false,
            connectionStatus: 'error',
            supportsPlugin: false,
          });
          return false;
        }
      },

      // 更新服务器版本
      updateServerVersion: (version, buildDate, runtimeKind) => {
        set((state) => ({
          serverVersion: version || null,
          serverBuildDate: buildDate || null,
          serverRuntimeKind: runtimeKind || state.serverRuntimeKind,
        }));
      },

      updateServerRuntimeKind: (runtimeKind) => {
        set({ serverRuntimeKind: runtimeKind });
      },

      updateServerPluginSupport: (supportsPlugin) => {
        set({ supportsPlugin });
      },
    }),
    {
      name: STORAGE_KEY_AUTH,
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          // Retire all pre-v2 login credentials without decoding or migrating them.
          localStorage.removeItem('managementKey');
          const raw = localStorage.getItem(name);
          if (!raw || !isCurrentObfuscated(raw)) {
            localStorage.removeItem(name);
            localStorage.removeItem('isLoggedIn');
            return null;
          }
          const data = obfuscatedStorage.getItem<AuthStoreState>(name);
          return data ? JSON.stringify(data) : null;
        },
        setItem: (name, value) => {
          obfuscatedStorage.setItem(name, JSON.parse(value));
        },
        removeItem: (name) => {
          obfuscatedStorage.removeItem(name);
        },
      })),
      partialize: (state) => ({
        apiBase: state.apiBase,
        ...(state.rememberPassword ? { managementKey: state.managementKey } : {}),
        rememberPassword: state.rememberPassword,
        serverVersion: state.serverVersion,
        serverBuildDate: state.serverBuildDate,
        serverRuntimeKind: state.serverRuntimeKind,
      }),
    }
  )
);

// 监听全局未授权事件
if (typeof window !== 'undefined') {
  window.addEventListener('unauthorized', () => {
    useAuthStore.getState().logout();
  });

  window.addEventListener('server-version-update', ((e: CustomEvent) => {
    const detail = e.detail || {};
    const runtimeKind =
      detail.runtimeKind === 'cpa' || detail.runtimeKind === 'home' ? detail.runtimeKind : null;
    useAuthStore
      .getState()
      .updateServerVersion(detail.version || null, detail.buildDate || null, runtimeKind);
  }) as EventListener);

  window.addEventListener('server-plugin-support-update', ((e: CustomEvent) => {
    useAuthStore.getState().updateServerPluginSupport(e.detail?.supportsPlugin === true);
  }) as EventListener);
}
