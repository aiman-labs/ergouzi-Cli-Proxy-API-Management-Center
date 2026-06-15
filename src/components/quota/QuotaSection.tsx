/**
 * Generic quota section component.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useNotificationStore, useQuotaStore, useThemeStore } from '@/stores';
import type { AuthFileItem, ResolvedTheme } from '@/types';
import { getStatusFromError, isDisabledAuthFile } from '@/utils/quota';
import { getAuthFileStatusMessage } from '@/features/authFiles/constants';
import { QuotaCard } from './QuotaCard';
import type { QuotaStatusState } from './QuotaCard';
import { useQuotaLoader } from './useQuotaLoader';
import type { QuotaConfig } from './quotaConfigs';
import { useGridColumns } from './useGridColumns';
import { IconRefreshCw } from '@/components/ui/icons';
import styles from '@/pages/QuotaPage.module.scss';

type QuotaUpdater<T> = T | ((prev: T) => T);

type QuotaSetter<T> = (updater: QuotaUpdater<T>) => void;

type ViewMode = 'paged' | 'all';
type IssueFilter = 'all' | 'normal' | 'problem';

const MAX_ITEMS_PER_PAGE = 25;
const MAX_SHOW_ALL_THRESHOLD = 30;
const HEALTHY_STATUS_MESSAGES = new Set(['ok', 'healthy', 'ready', 'success', 'available']);

const getModifiedTime = (file: AuthFileItem): number | null => {
  const raw = file.modified ?? file['mtime'] ?? file['modified_at'] ?? file['updated_at'];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) return numeric;
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const sortByNewestImport = (files: AuthFileItem[]) =>
  files
    .map((file, index) => ({ file, index, modified: getModifiedTime(file) }))
    .sort((a, b) => {
      if (a.modified !== null && b.modified !== null && a.modified !== b.modified) {
        return b.modified - a.modified;
      }
      if (a.modified !== null && b.modified === null) return -1;
      if (a.modified === null && b.modified !== null) return 1;
      return a.index - b.index;
    })
    .map((entry) => entry.file);

interface QuotaPaginationState<T> {
  pageSize: number;
  totalPages: number;
  currentPage: number;
  pageItems: T[];
  setPageSize: (size: number) => void;
  goToPrev: () => void;
  goToNext: () => void;
  loading: boolean;
  loadingScope: 'page' | 'all' | null;
  setLoading: (loading: boolean, scope?: 'page' | 'all' | null) => void;
}

const useQuotaPagination = <T,>(items: T[], defaultPageSize = 6): QuotaPaginationState<T> => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [loading, setLoadingState] = useState(false);
  const [loadingScope, setLoadingScope] = useState<'page' | 'all' | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / pageSize)),
    [items.length, pageSize]
  );

  const currentPage = useMemo(() => Math.min(page, totalPages), [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const goToPrev = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  const setLoading = useCallback((isLoading: boolean, scope?: 'page' | 'all' | null) => {
    setLoadingState(isLoading);
    setLoadingScope(isLoading ? (scope ?? null) : null);
  }, []);

  return {
    pageSize,
    totalPages,
    currentPage,
    pageItems,
    setPageSize,
    goToPrev,
    goToNext,
    loading,
    loadingScope,
    setLoading,
  };
};

interface QuotaSectionProps<TState extends QuotaStatusState, TData> {
  config: QuotaConfig<TState, TData>;
  files: AuthFileItem[];
  loading: boolean;
  disabled: boolean;
  pageSizeOverride?: number;
}

export function QuotaSection<TState extends QuotaStatusState, TData>({
  config,
  files,
  loading,
  disabled,
  pageSizeOverride,
}: QuotaSectionProps<TState, TData>) {
  const { t } = useTranslation();
  const resolvedTheme: ResolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const showNotification = useNotificationStore((state) => state.showNotification);
  const showConfirmation = useNotificationStore((state) => state.showConfirmation);
  const setQuota = useQuotaStore((state) => state[config.storeSetter]) as QuotaSetter<
    Record<string, TState>
  >;

  /* Removed useRef */
  const [columns, gridRef] = useGridColumns(380); // Min card width 380px matches SCSS
  const [viewMode, setViewMode] = useState<ViewMode>('paged');
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('all');
  const [showTooManyWarning, setShowTooManyWarning] = useState(false);
  const [resettingQuotaName, setResettingQuotaName] = useState<string | null>(null);

  const providerFiles = useMemo(
    () => sortByNewestImport(files.filter((file) => config.filterFn(file))),
    [files, config]
  );

  const { quota, loadQuota } = useQuotaLoader(config);

  const hasProblem = useCallback(
    (file: AuthFileItem): boolean => {
      if (file.unavailable === true) return true;

      const rawStatus = typeof file.status === 'string' ? file.status.trim().toLowerCase() : '';
      if (rawStatus && !HEALTHY_STATUS_MESSAGES.has(rawStatus) && rawStatus !== 'disabled') {
        return true;
      }

      const statusMessage = getAuthFileStatusMessage(file);
      if (statusMessage && !HEALTHY_STATUS_MESSAGES.has(statusMessage.toLowerCase())) {
        return true;
      }

      return quota[file.name]?.status === 'error';
    },
    [quota]
  );

  const filteredFiles = useMemo(
    () =>
      providerFiles.filter((file) => {
        if (issueFilter === 'all') return true;
        const problem = hasProblem(file);
        return issueFilter === 'problem' ? problem : !problem;
      }),
    [hasProblem, issueFilter, providerFiles]
  );
  const showAllAllowed = filteredFiles.length <= MAX_SHOW_ALL_THRESHOLD;
  const effectiveViewMode: ViewMode = viewMode === 'all' && !showAllAllowed ? 'paged' : viewMode;

  const {
    pageSize,
    totalPages,
    currentPage,
    pageItems,
    setPageSize,
    goToPrev,
    goToNext,
    loading: sectionLoading,
    loadingScope,
    setLoading,
  } = useQuotaPagination(filteredFiles);

  useEffect(() => {
    if (showAllAllowed) return;
    if (viewMode !== 'all') return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setViewMode('paged');
      setShowTooManyWarning(true);
    });

    return () => {
      cancelled = true;
    };
  }, [showAllAllowed, viewMode]);

  // Update page size based on view mode and columns
  useEffect(() => {
    if (effectiveViewMode === 'all') {
      setPageSize(Math.max(1, filteredFiles.length));
    } else {
      // Paged mode: 3 rows * columns, capped to avoid oversized pages.
      setPageSize(pageSizeOverride ?? Math.min(columns * 3, MAX_ITEMS_PER_PAGE));
    }
  }, [effectiveViewMode, columns, filteredFiles.length, pageSizeOverride, setPageSize]);

  const refreshQuotaTargets = useCallback(
    (targets: AuthFileItem[], scope: 'page' | 'all') => {
      if (targets.length === 0) return;
      loadQuota(targets, scope, setLoading);
    },
    [loadQuota, setLoading]
  );

  const handleRefreshCurrentPage = useCallback(() => {
    refreshQuotaTargets(pageItems, 'page');
  }, [pageItems, refreshQuotaTargets]);

  const handleRefreshAll = useCallback(() => {
    if (filteredFiles.length === 0) return;

    showConfirmation({
      title: t('quota_management.refresh_all_confirm_title'),
      message: t('quota_management.refresh_all_confirm_message', {
        count: filteredFiles.length,
      }),
      confirmText: t('quota_management.refresh_all_confirm_button'),
      variant: 'primary',
      onConfirm: () => refreshQuotaTargets(filteredFiles, 'all'),
    });
  }, [filteredFiles, refreshQuotaTargets, showConfirmation, t]);

  useEffect(() => {
    if (loading) return;
    if (providerFiles.length === 0) {
      setQuota({});
      return;
    }
    setQuota((prev) => {
      const nextState: Record<string, TState> = {};
      providerFiles.forEach((file) => {
        const cached = prev[file.name];
        if (cached) {
          nextState[file.name] = cached;
        }
      });
      return nextState;
    });
  }, [providerFiles, loading, setQuota]);

  const refreshQuotaForFile = useCallback(
    async (file: AuthFileItem) => {
      if (disabled) return;
      if (quota[file.name]?.status === 'loading') return;

      setQuota((prev) => ({
        ...prev,
        [file.name]: config.buildLoadingState(),
      }));

      try {
        const data = await config.fetchQuota(file, t);
        setQuota((prev) => ({
          ...prev,
          [file.name]: config.buildSuccessState(data),
        }));
        showNotification(t('auth_files.quota_refresh_success', { name: file.name }), 'success');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('common.unknown_error');
        const status = getStatusFromError(err);
        setQuota((prev) => ({
          ...prev,
          [file.name]: config.buildErrorState(message, status),
        }));
        showNotification(
          t('auth_files.quota_refresh_failed', { name: file.name, message }),
          'error'
        );
      }
    },
    [config, disabled, quota, setQuota, showNotification, t]
  );

  const resetQuotaForFile = useCallback(
    (file: AuthFileItem) => {
      const resetQuota = config.resetQuota;
      if (!resetQuota) return;
      if (disabled || file.disabled) return;
      if (quota[file.name]?.status === 'loading') return;
      if (resettingQuotaName === file.name) return;

      showConfirmation({
        title: t('codex_quota.reset_confirm_title'),
        message: t('codex_quota.reset_confirm_message', { name: file.name }),
        confirmText: t('codex_quota.reset_confirm_button'),
        variant: 'primary',
        onConfirm: async () => {
          setResettingQuotaName(file.name);
          try {
            const data = await resetQuota(file, t);
            setQuota((prev) => ({
              ...prev,
              [file.name]: config.buildSuccessState(data),
            }));
            showNotification(t('codex_quota.reset_success', { name: file.name }), 'success');
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : t('common.unknown_error');
            showNotification(t('codex_quota.reset_failed', { name: file.name, message }), 'error');
          } finally {
            setResettingQuotaName((current) => (current === file.name ? null : current));
          }
        },
      });
    },
    [config, disabled, quota, resettingQuotaName, setQuota, showConfirmation, showNotification, t]
  );

  const titleNode = (
    <div className={styles.titleWrapper}>
      <span>{t(`${config.i18nPrefix}.title`)}</span>
      {providerFiles.length > 0 && (
        <span className={styles.countBadge}>
          {issueFilter === 'all'
            ? filteredFiles.length
            : `${filteredFiles.length}/${providerFiles.length}`}
        </span>
      )}
    </div>
  );

  const isRefreshing = sectionLoading || loading;
  const isRefreshingPage = sectionLoading && loadingScope === 'page';
  const isRefreshingAll = sectionLoading && loadingScope === 'all';
  const currentPageRefreshableCount = pageItems.length;
  const currentPageDisabledCount = pageItems.filter((file) => isDisabledAuthFile(file)).length;
  const filteredDisabledCount = filteredFiles.filter((file) => isDisabledAuthFile(file)).length;

  return (
    <Card title={titleNode}>
      <div className={styles.quotaCrudToolbar}>
        <div className={styles.quotaFilterBar}>
          <label className={styles.sectionFilter}>
            <span>{t('quota_management.credential_filter_label')}</span>
            <select
              className={styles.sectionFilterSelect}
              value={issueFilter}
              onChange={(event) => setIssueFilter(event.currentTarget.value as IssueFilter)}
              aria-label={t('quota_management.credential_filter_label')}
            >
              <option value="all">{t('quota_management.filter_all_credentials')}</option>
              <option value="normal">{t('quota_management.filter_normal_credentials')}</option>
              <option value="problem">{t('quota_management.filter_problem_credentials')}</option>
            </select>
          </label>
          <div className={styles.viewModeToggle}>
            <Button
              variant="secondary"
              size="sm"
              className={`${styles.viewModeButton} ${
                effectiveViewMode === 'paged' ? styles.viewModeButtonActive : ''
              }`}
              onClick={() => setViewMode('paged')}
            >
              {t('auth_files.view_mode_paged')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className={`${styles.viewModeButton} ${
                effectiveViewMode === 'all' ? styles.viewModeButtonActive : ''
              }`}
              onClick={() => {
                if (filteredFiles.length > MAX_SHOW_ALL_THRESHOLD) {
                  setShowTooManyWarning(true);
                } else {
                  setViewMode('all');
                }
              }}
            >
              {t('auth_files.view_mode_all')}
            </Button>
          </div>
        </div>
        <div className={styles.quotaBatchBar}>
          <div className={styles.sectionScopeSummary}>
            <strong>{t('quota_management.batch_actions_label')}</strong>
            <span>
              {t('quota_management.scope_summary', {
                filtered: filteredFiles.length,
                page: pageItems.length,
              })}
            </span>
            {(currentPageDisabledCount > 0 || filteredDisabledCount > 0) && (
              <span>
                {t('quota_management.scope_disabled_summary', {
                  pageDisabled: currentPageDisabledCount,
                  totalDisabled: filteredDisabledCount,
                })}
              </span>
            )}
          </div>
          <div className={styles.batchActions}>
          <Button
            variant="secondary"
            size="sm"
            className={styles.refreshScopeButton}
            onClick={handleRefreshCurrentPage}
            disabled={disabled || isRefreshing || currentPageRefreshableCount === 0}
            loading={isRefreshingPage}
            title={t('quota_management.batch_refresh_credentials', {
              count: currentPageRefreshableCount,
            })}
            aria-label={t('quota_management.batch_refresh_credentials', {
              count: currentPageRefreshableCount,
            })}
          >
            {!isRefreshingPage && <IconRefreshCw size={16} />}
            {t('quota_management.batch_refresh_count', {
              count: currentPageRefreshableCount,
            })}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className={styles.refreshAllButton}
            onClick={handleRefreshAll}
            disabled={disabled || isRefreshing || filteredFiles.length === 0}
            loading={isRefreshingAll}
            title={t('quota_management.refresh_all_credentials_count', {
              count: filteredFiles.length,
            })}
            aria-label={t('quota_management.refresh_all_credentials_count', {
              count: filteredFiles.length,
            })}
          >
            {!isRefreshingAll && <IconRefreshCw size={16} />}
            {t('quota_management.refresh_all_credentials_count', {
              count: filteredFiles.length,
            })}
          </Button>
        </div>
        </div>
      </div>
      <div className={styles.sectionScrollBody}>
        {filteredFiles.length === 0 ? (
          <EmptyState
            title={
              issueFilter === 'problem' && providerFiles.length > 0
                ? t('quota_management.no_problem_title')
                : issueFilter === 'normal' && providerFiles.length > 0
                  ? t('quota_management.no_normal_title')
                  : t(`${config.i18nPrefix}.empty_title`)
            }
            description={
              issueFilter === 'problem' && providerFiles.length > 0
                ? t('quota_management.no_problem_desc')
                : issueFilter === 'normal' && providerFiles.length > 0
                  ? t('quota_management.no_normal_desc')
                  : t(`${config.i18nPrefix}.empty_desc`)
            }
          />
        ) : (
          <>
            <div ref={gridRef} className={config.gridClassName}>
              {pageItems.map((item) => {
                const itemQuota = quota[item.name];
                const isResettingQuota = resettingQuotaName === item.name;
                const canRefreshQuotaAction = !disabled && itemQuota?.status !== 'loading';
                const canResetQuotaAction = canRefreshQuotaAction && !item.disabled;
                const showResetQuotaAction =
                  itemQuota !== undefined && Boolean(config.canResetQuota?.(itemQuota));
                const resetQuotaAction =
                  config.resetQuota && showResetQuotaAction ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className={styles.quotaResetCreditButton}
                      onClick={() => resetQuotaForFile(item)}
                      disabled={!canResetQuotaAction || isResettingQuota}
                      loading={isResettingQuota}
                      title={t('codex_quota.reset_button')}
                      aria-label={t('codex_quota.reset_button')}
                    >
                      {!isResettingQuota && <IconRefreshCw size={14} />}
                      {t('codex_quota.reset_button')}
                    </Button>
                  ) : undefined;

                return (
                  <QuotaCard
                    key={item.name}
                    item={item}
                    quota={itemQuota}
                    resolvedTheme={resolvedTheme}
                    i18nPrefix={config.i18nPrefix}
                    cardIdleMessageKey={config.cardIdleMessageKey}
                    cardClassName={config.cardClassName}
                    defaultType={config.type}
                    canRefresh={canRefreshQuotaAction && !isResettingQuota}
                    onRefresh={() => void refreshQuotaForFile(item)}
                    resetQuotaAction={resetQuotaAction}
                    renderQuotaItems={config.renderQuotaItems}
                  />
                );
              })}
            </div>
            {filteredFiles.length > pageSize && effectiveViewMode === 'paged' && (
              <div className={styles.pagination}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={goToPrev}
                  disabled={currentPage <= 1}
                >
                  {t('auth_files.pagination_prev')}
                </Button>
                <div className={styles.pageInfo}>
                  {t('auth_files.pagination_info', {
                    current: currentPage,
                    total: totalPages,
                    count: filteredFiles.length,
                  })}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={goToNext}
                  disabled={currentPage >= totalPages}
                >
                  {t('auth_files.pagination_next')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      {showTooManyWarning && (
        <div className={styles.warningOverlay} onClick={() => setShowTooManyWarning(false)}>
          <div className={styles.warningModal} onClick={(e) => e.stopPropagation()}>
            <p>{t('auth_files.too_many_files_warning')}</p>
            <Button variant="primary" size="sm" onClick={() => setShowTooManyWarning(false)}>
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
