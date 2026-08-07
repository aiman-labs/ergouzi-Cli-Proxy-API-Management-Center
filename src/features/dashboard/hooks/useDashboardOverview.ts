import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authFilesApi } from '@/services/api';
import { useAuthStore, useConfigStore, useModelsStore } from '@/stores';
import { useApiKeysForModels } from '@/hooks/useApiKeysForModels';
import {
  useProviderRecentRequests,
  type ProviderRecentRequests,
} from '@/components/providers/hooks/useProviderRecentRequests';
import {
  mergeRecentRequestBucketGroups,
  normalizeRecentRequestUsageEntry,
  sumRecentRequests,
  type RecentRequestBucket,
} from '@/utils/recentRequests';
import { resolveAuthProvider } from '@/utils/quota';
import type { Config } from '@/types';
import type { AuthFileItem } from '@/types/authFile';
import {
  TRAFFIC_BUCKET_MINUTES,
  type CredentialHealth,
  type DashboardCounts,
  type ProviderTraffic,
  type TrafficWindow,
} from '../types';

const EMPTY_TRAFFIC: TrafficWindow = {
  buckets: [],
  totalSuccess: 0,
  totalFailure: 0,
  total: 0,
  successRate: null,
  peakTotal: 0,
  peakIndex: -1,
  activeBuckets: 0,
  windowMinutes: 0,
};

/** api-key-usage keys are <baseUrl>|<apiKey>; return everything after the first separator. */
const apiKeyFromCompositeKey = (compositeKey: string): string => {
  const separatorIndex = compositeKey.indexOf('|');
  return separatorIndex < 0 ? '' : compositeKey.slice(separatorIndex + 1).trim();
};

export const providerIdOfAuthFile = (file: AuthFileItem): string => {
  const candidate = resolveAuthProvider(file);
  return candidate && candidate !== 'empty' ? candidate : 'unknown';
};

const buildTrafficWindow = (bucketGroups: RecentRequestBucket[][]): TrafficWindow => {
  const buckets = mergeRecentRequestBucketGroups(bucketGroups);
  if (buckets.length === 0) {
    return EMPTY_TRAFFIC;
  }

  let totalSuccess = 0;
  let totalFailure = 0;
  let peakTotal = 0;
  let peakIndex = -1;
  let activeBuckets = 0;

  buckets.forEach((bucket, index) => {
    const bucketTotal = bucket.success + bucket.failed;
    totalSuccess += bucket.success;
    totalFailure += bucket.failed;
    if (bucketTotal > 0) {
      activeBuckets += 1;
    }
    if (bucketTotal > peakTotal) {
      peakTotal = bucketTotal;
      peakIndex = index;
    }
  });

  const total = totalSuccess + totalFailure;

  return {
    buckets,
    totalSuccess,
    totalFailure,
    total,
    successRate: total > 0 ? (totalSuccess / total) * 100 : null,
    peakTotal,
    peakIndex,
    activeBuckets,
    windowMinutes: buckets.length * TRAFFIC_BUCKET_MINUTES,
  };
};

interface ProviderAccumulator {
  credentials: number;
  bucketGroups: RecentRequestBucket[][];
}

const createAccumulator = (): ProviderAccumulator => ({
  credentials: 0,
  bucketGroups: [],
});

export const getProviderKeyCounts = (config: Config) => ({
  gemini: config.geminiApiKeys?.length ?? 0,
  interactions: config.interactionsApiKeys?.length ?? 0,
  codex: config.codexApiKeys?.length ?? 0,
  xai: config.xaiApiKeys?.length ?? 0,
  claude: config.claudeApiKeys?.length ?? 0,
  vertex: config.vertexApiKeys?.length ?? 0,
  openai: config.openaiCompatibility?.length ?? 0,
});

export const buildDashboardTraffic = (
  usageByProvider: ProviderRecentRequests,
  authFiles: AuthFileItem[] | null
): { traffic: TrafficWindow; providers: ProviderTraffic[] } => {
  const accumulators = new Map<string, ProviderAccumulator>();
  const allBucketGroups: RecentRequestBucket[][] = [];
  const apiKeysFromUsage = new Set<string>();

  const accumulatorFor = (providerId: string): ProviderAccumulator => {
    const existing = accumulators.get(providerId);
    if (existing) return existing;
    const created = createAccumulator();
    accumulators.set(providerId, created);
    return created;
  };

  usageByProvider.forEach((entriesByKey, providerId) => {
    const accumulator = accumulatorFor(providerId);
    entriesByKey.forEach((entry, compositeKey) => {
      const apiKey = apiKeyFromCompositeKey(compositeKey);
      if (apiKey) {
        apiKeysFromUsage.add(apiKey);
      }
      accumulator.credentials += 1;
      if (entry.recentRequests.length > 0) {
        accumulator.bucketGroups.push(entry.recentRequests);
        allBucketGroups.push(entry.recentRequests);
      }
    });
  });

  (authFiles ?? []).forEach((file) => {
    const accountType = String(file.account_type ?? '')
      .trim()
      .toLowerCase();
    const account = String(file.account ?? '').trim();
    if (accountType === 'api_key' && account && apiKeysFromUsage.has(account)) {
      return;
    }

    const accumulator = accumulatorFor(providerIdOfAuthFile(file));
    const entry = normalizeRecentRequestUsageEntry(file);
    accumulator.credentials += 1;
    if (entry.recentRequests.length > 0) {
      accumulator.bucketGroups.push(entry.recentRequests);
      allBucketGroups.push(entry.recentRequests);
    }
  });

  const providers = Array.from(accumulators.entries())
    .map(([id, accumulator]) => {
      const buckets = mergeRecentRequestBucketGroups(accumulator.bucketGroups);
      const { success, failure } = sumRecentRequests(buckets);
      const total = success + failure;
      return {
        id,
        credentials: accumulator.credentials,
        success,
        failure,
        total,
        successRate: total > 0 ? (success / total) * 100 : null,
        buckets,
      };
    })
    .sort((a, b) => b.total - a.total || b.credentials - a.credentials || a.id.localeCompare(b.id));

  return {
    traffic: buildTrafficWindow(allBucketGroups),
    providers,
  };
};

/**
 * Aggregate all data required by the dashboard.
 *
 * Traffic has two disjoint sources: api-key-usage for inline API-key credentials
 * and auth-files for file/runtime credentials. Backend classification is exclusive,
 * but plugin credentials could theoretically hit both, so defensively dedupe by
 * account_type + account.
 */
export function useDashboardOverview() {
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const apiBase = useAuthStore((state) => state.apiBase);
  const config = useConfigStore((state) => state.config);
  const fetchConfig = useConfigStore((state) => state.fetchConfig);

  const models = useModelsStore((state) => state.models);
  const modelsLoading = useModelsStore((state) => state.loading);
  const modelsError = useModelsStore((state) => state.error);
  const fetchModelsFromStore = useModelsStore((state) => state.fetchModels);

  const connected = connectionStatus === 'connected';
  const resolveApiKeysForModels = useApiKeysForModels();

  const { usageByProvider, refreshRecentRequests } = useProviderRecentRequests({
    enabled: connected,
  });

  const [authFiles, setAuthFiles] = useState<AuthFileItem[] | null>(null);
  const [authFilesLoading, setAuthFilesLoading] = useState(false);
  const authFilesRequestIdRef = useRef(0);

  const loadAuthFiles = useCallback(async () => {
    if (!connected) return;
    const requestId = ++authFilesRequestIdRef.current;
    setAuthFilesLoading(true);
    try {
      const response = await authFilesApi.list();
      if (requestId !== authFilesRequestIdRef.current) return;
      setAuthFiles(response.files);
    } catch {
      if (requestId !== authFilesRequestIdRef.current) return;
      setAuthFiles(null);
    } finally {
      if (requestId === authFilesRequestIdRef.current) {
        setAuthFilesLoading(false);
      }
    }
  }, [connected]);

  const loadModels = useCallback(
    async (forceRefresh = false) => {
      if (!connected || !apiBase) return;
      try {
        const apiKeys = await resolveApiKeysForModels();
        await fetchModelsFromStore(apiBase, apiKeys[0], forceRefresh);
      } catch {
        // A model-list failure must not block the rest of the dashboard.
      }
    },
    [connected, apiBase, resolveApiKeysForModels, fetchModelsFromStore]
  );

  useEffect(() => {
    if (connected) return;
    authFilesRequestIdRef.current += 1;
    setAuthFiles(null);
    setAuthFilesLoading(false);
  }, [connected, apiBase]);

  useEffect(() => {
    if (!connected) return;
    void fetchConfig().catch(() => undefined);
    void loadAuthFiles();
    void loadModels();
  }, [connected, fetchConfig, loadAuthFiles, loadModels]);

  const refresh = useCallback(async () => {
    if (!connected) return;
    await Promise.allSettled([
      fetchConfig(true),
      loadAuthFiles(),
      loadModels(true),
      refreshRecentRequests(),
    ]);
  }, [connected, fetchConfig, loadAuthFiles, loadModels, refreshRecentRequests]);

  const providerKeyCounts = useMemo(() => (config ? getProviderKeyCounts(config) : null), [config]);

  const { traffic, providers } = useMemo(
    () => buildDashboardTraffic(usageByProvider, authFiles),
    [usageByProvider, authFiles]
  );

  const credentials = useMemo<CredentialHealth | null>(() => {
    if (!authFiles) return null;

    let disabled = 0;
    let unavailable = 0;
    const countsByType = new Map<string, number>();

    authFiles.forEach((file) => {
      if (file.disabled) {
        disabled += 1;
      } else if (file.unavailable) {
        unavailable += 1;
      }
      const type = providerIdOfAuthFile(file);
      countsByType.set(type, (countsByType.get(type) ?? 0) + 1);
    });

    return {
      total: authFiles.length,
      active: authFiles.length - disabled - unavailable,
      disabled,
      unavailable,
      byType: Array.from(countsByType.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type)),
    };
  }, [authFiles]);

  const counts = useMemo<DashboardCounts>(
    () => ({
      managementKeys: config ? (config.apiKeys?.length ?? 0) : null,
      providerKeys: providerKeyCounts
        ? Object.values(providerKeyCounts).reduce((sum, count) => sum + count, 0)
        : null,
      credentials: authFiles ? authFiles.length : null,
      models: modelsLoading || modelsError ? null : models.length,
    }),
    [config, providerKeyCounts, authFiles, models.length, modelsLoading, modelsError]
  );

  return {
    connectionStatus,
    connected,
    config,
    counts,
    providerKeyCounts,
    traffic,
    providers,
    credentials,
    /** Show the initial skeleton while both config and credentials are still pending. */
    initialLoading: connected && !config && authFiles === null,
    authFilesLoading,
    refresh,
  };
}
