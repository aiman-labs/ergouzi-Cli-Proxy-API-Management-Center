/** Mixed-provider quota loader with bounded concurrency and session guards. */

import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { captureQuotaCacheGeneration, commitIfQuotaCacheCurrent } from '@/stores';
import { getStatusFromError } from '@/utils/quota';
import { runLimitedBatch } from '@/utils/runLimitedBatch';
import type { QuotaFileEntry } from '../logic';
import { QUOTA_ADAPTERS, getQuotaSetter } from '../providers';
import type { QuotaProviderType } from '../providers/types';

interface BatchFetchResult {
  name: string;
  type: QuotaProviderType;
  status: 'success' | 'error';
  data?: unknown;
  error?: string;
  errorStatus?: number;
}

export const QUOTA_BATCH_CONCURRENCY = 4;

export function useQuotaBatchLoader() {
  const { t } = useTranslation();
  const [batchLoading, setBatchLoading] = useState(false);
  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadQuota = useCallback(
    async (targets: QuotaFileEntry[]) => {
      if (loadingRef.current) return;
      if (targets.length === 0) return;
      loadingRef.current = true;
      const requestId = ++requestIdRef.current;
      const cacheGeneration = captureQuotaCacheGeneration();
      setBatchLoading(true);

      try {
        const groups = new Map<QuotaProviderType, QuotaFileEntry[]>();
        targets.forEach((entry) =>
          groups.set(entry.type, [...(groups.get(entry.type) ?? []), entry])
        );
        groups.forEach((entries, type) => {
          const adapter = QUOTA_ADAPTERS[type];
          const setQuota = getQuotaSetter(adapter);
          commitIfQuotaCacheCurrent(cacheGeneration, () => {
            setQuota((prev) => {
              const nextState = { ...prev };
              entries.forEach(({ file }) => {
                nextState[file.name] = adapter.buildLoadingState();
              });
              return nextState;
            });
          });
        });

        await runLimitedBatch({
          items: targets,
          concurrency: QUOTA_BATCH_CONCURRENCY,
          worker: async ({ file, type }): Promise<BatchFetchResult> => {
            const adapter = QUOTA_ADAPTERS[type];
            try {
              const data = await adapter.fetchQuota(file, t);
              return { name: file.name, type, status: 'success', data };
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : t('common.unknown_error');
              return {
                name: file.name,
                type,
                status: 'error',
                error: message,
                errorStatus: getStatusFromError(err),
              };
            }
          },
          onResult: (result) => {
            if (requestId !== requestIdRef.current) return;
            const adapter = QUOTA_ADAPTERS[result.type];
            const setQuota = getQuotaSetter(adapter);
            commitIfQuotaCacheCurrent(cacheGeneration, () => {
              setQuota((prev) => ({
                ...prev,
                [result.name]:
                  result.status === 'success'
                    ? adapter.buildSuccessState(result.data)
                    : adapter.buildErrorState(
                        result.error || t('common.unknown_error'),
                        result.errorStatus
                      ),
              }));
            });
          },
        });
      } finally {
        if (requestId === requestIdRef.current) {
          setBatchLoading(false);
          loadingRef.current = false;
        }
      }
    },
    [t]
  );

  return { batchLoading, loadQuota };
}
