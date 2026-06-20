/**
 * Quota management page - coordinates the three quota sections.
 */

import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { useAuthStore } from '@/stores';
import { authFilesApi } from '@/services/api';
import {
  QuotaSection,
  ANTIGRAVITY_CONFIG,
  CLAUDE_CONFIG,
  CODEX_CONFIG,
  KIMI_CONFIG,
  XAI_CONFIG,
} from '@/components/quota';
import type { AuthFileItem } from '@/types';
import { mergeAuthFileSnapshots } from '@/utils/authFiles';
import styles from './QuotaPage.module.scss';

const QUOTA_PAGE_SIZE_STORAGE_KEY = 'quota-management:page-size';
const DEFAULT_QUOTA_PAGE_SIZE = 12;
const MIN_QUOTA_PAGE_SIZE = 1;
const MAX_QUOTA_PAGE_SIZE = 100;

const clampQuotaPageSize = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_QUOTA_PAGE_SIZE;
  return Math.min(MAX_QUOTA_PAGE_SIZE, Math.max(MIN_QUOTA_PAGE_SIZE, Math.round(value)));
};

const readPersistedQuotaPageSize = () => {
  if (typeof window === 'undefined') return DEFAULT_QUOTA_PAGE_SIZE;
  const raw = window.localStorage.getItem(QUOTA_PAGE_SIZE_STORAGE_KEY);
  if (!raw) return DEFAULT_QUOTA_PAGE_SIZE;
  const parsed = Number(raw);
  return clampQuotaPageSize(parsed);
};

export function QuotaPage() {
  const { t } = useTranslation();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);

  const [files, setFiles] = useState<AuthFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageSize, setPageSize] = useState(readPersistedQuotaPageSize);
  const [pageSizeInput, setPageSizeInput] = useState(String(pageSize));

  const disableControls = connectionStatus !== 'connected';

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await authFilesApi.list();
      setFiles(data?.files || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('notification.refresh_failed');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const syncAuthFilesSnapshot = useCallback(async () => {
    const data = await authFilesApi.list();
    const refreshedFiles = data?.files || [];
    setFiles((currentFiles) => mergeAuthFileSnapshots(currentFiles, refreshedFiles));
  }, []);

  useHeaderRefresh(loadFiles);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    setPageSizeInput(String(pageSize));
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(QUOTA_PAGE_SIZE_STORAGE_KEY, String(pageSize));
    }
  }, [pageSize]);

  const commitPageSizeInput = useCallback(
    (rawValue: string) => {
      const trimmed = rawValue.trim();
      if (!trimmed) {
        setPageSizeInput(String(pageSize));
        return;
      }

      const value = Number(trimmed);
      if (!Number.isFinite(value)) {
        setPageSizeInput(String(pageSize));
        return;
      }

      const next = clampQuotaPageSize(value);
      setPageSize(next);
      setPageSizeInput(String(next));
    },
    [pageSize]
  );

  const handlePageSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.currentTarget.value;
    setPageSizeInput(rawValue);

    const trimmed = rawValue.trim();
    if (!trimmed) return;

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return;

    const rounded = Math.round(parsed);
    if (rounded < MIN_QUOTA_PAGE_SIZE || rounded > MAX_QUOTA_PAGE_SIZE) return;

    setPageSize(rounded);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('quota_management.title')}</h1>
        <p className={styles.description}>{t('quota_management.description')}</p>
      </div>

      <div className={styles.pageControls}>
        <div className={styles.pageSizeControl}>
          <label htmlFor="quota-page-size">{t('quota_management.page_size_label')}</label>
          <input
            id="quota-page-size"
            className={styles.pageSizeSelect}
            type="number"
            min={MIN_QUOTA_PAGE_SIZE}
            max={MAX_QUOTA_PAGE_SIZE}
            step={1}
            value={pageSizeInput}
            onChange={handlePageSizeChange}
            onBlur={(event) => commitPageSizeInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
        </div>
        <div className={styles.statsInfo}>
          {t('quota_management.page_size_hint', {
            min: MIN_QUOTA_PAGE_SIZE,
            max: MAX_QUOTA_PAGE_SIZE,
          })}
        </div>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      <QuotaSection
        config={CODEX_CONFIG}
        files={files}
        loading={loading}
        disabled={disableControls}
        pageSizeOverride={pageSize}
        enableStatusActions
        onFilesChange={setFiles}
        onQuotaRefreshComplete={syncAuthFilesSnapshot}
      />
      <QuotaSection
        config={CLAUDE_CONFIG}
        files={files}
        loading={loading}
        disabled={disableControls}
        pageSizeOverride={pageSize}
      />
      <QuotaSection
        config={ANTIGRAVITY_CONFIG}
        files={files}
        loading={loading}
        disabled={disableControls}
        pageSizeOverride={pageSize}
      />
      <QuotaSection
        config={XAI_CONFIG}
        files={files}
        loading={loading}
        disabled={disableControls}
        pageSizeOverride={pageSize}
      />
      <QuotaSection
        config={KIMI_CONFIG}
        files={files}
        loading={loading}
        disabled={disableControls}
        pageSizeOverride={pageSize}
      />
    </div>
  );
}
