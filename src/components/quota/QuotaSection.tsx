/**
 * Generic quota section component.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { authFilesApi } from '@/services/api';
import { useNotificationStore, useQuotaStore, useThemeStore } from '@/stores';
import type { AuthFileItem, ResolvedTheme } from '@/types';
import { getStatusFromError, isDisabledAuthFile, isRuntimeOnlyAuthFile } from '@/utils/quota';
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
type QuotaFilterValue = IssueFilter | string;

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

const searchableAuthFileText = (file: AuthFileItem): string =>
  [
    file.name,
    file.type,
    file.provider,
    file.note,
    file.authIndex,
    file['auth_index'],
    file['email'],
    file['account'],
    file['username'],
    file['user'],
    file['path'],
    file.status,
    file.statusMessage,
    file['status_message'],
  ]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).toLowerCase())
    .join('\n');

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
  enableStatusActions?: boolean;
  onFilesChange?: (updater: (files: AuthFileItem[]) => AuthFileItem[]) => void;
}

export function QuotaSection<TState extends QuotaStatusState, TData>({
  config,
  files,
  loading,
  disabled,
  pageSizeOverride,
  enableStatusActions = false,
  onFilesChange,
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
  const [issueFilter, setIssueFilter] = useState<QuotaFilterValue>('all');
  const [planFilter, setPlanFilter] = useState<QuotaFilterValue>('all');
  const [enabledFilter, setEnabledFilter] = useState<QuotaFilterValue>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTooManyWarning, setShowTooManyWarning] = useState(false);
  const [resettingQuotaName, setResettingQuotaName] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>({});
  const [batchStatusUpdating, setBatchStatusUpdating] = useState(false);

  const providerFiles = useMemo(
    () => sortByNewestImport(files.filter((file) => config.filterFn(file))),
    [files, config]
  );

  const { quota, loadQuota } = useQuotaLoader(config);
  const configuredFilterOptionValues = useMemo(
    () => new Set((config.quotaFilterOptions ?? []).map((option) => option.value)),
    [config.quotaFilterOptions]
  );
  const configuredPlanFilterOptionValues = useMemo(
    () => new Set((config.planFilterOptions ?? []).map((option) => option.value)),
    [config.planFilterOptions]
  );
  const configuredEnabledFilterOptionValues = useMemo(
    () => new Set((config.enabledFilterOptions ?? []).map((option) => option.value)),
    [config.enabledFilterOptions]
  );

  useEffect(() => {
    if (!config.quotaFilterOptions) return;
    if (configuredFilterOptionValues.has(issueFilter)) return;
    setIssueFilter('all');
  }, [config.quotaFilterOptions, configuredFilterOptionValues, issueFilter]);

  useEffect(() => {
    if (!config.planFilterOptions) return;
    if (configuredPlanFilterOptionValues.has(planFilter)) return;
    setPlanFilter('all');
  }, [config.planFilterOptions, configuredPlanFilterOptionValues, planFilter]);

  useEffect(() => {
    if (!config.enabledFilterOptions) return;
    if (configuredEnabledFilterOptionValues.has(enabledFilter)) return;
    setEnabledFilter('all');
  }, [config.enabledFilterOptions, configuredEnabledFilterOptionValues, enabledFilter]);

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
        const normalizedSearchQuery = searchQuery.trim().toLowerCase();
        if (
          normalizedSearchQuery &&
          !searchableAuthFileText(file).includes(normalizedSearchQuery)
        ) {
          return false;
        }

        if (config.quotaFilterOptions) {
          const option = config.quotaFilterOptions.find((item) => item.value === issueFilter);
          if (option && !option.matches({ file, quota: quota[file.name] })) return false;
        } else if (issueFilter !== 'all') {
          const problem = hasProblem(file);
          if (issueFilter === 'problem' ? !problem : problem) return false;
        }

        if (config.planFilterOptions) {
          const option = config.planFilterOptions.find((item) => item.value === planFilter);
          if (option && !option.matches({ file, quota: quota[file.name] })) return false;
        }

        if (config.enabledFilterOptions) {
          const option = config.enabledFilterOptions.find((item) => item.value === enabledFilter);
          if (option && !option.matches({ file, quota: quota[file.name] })) return false;
        }

        return true;
      }),
    [
      config.enabledFilterOptions,
      config.planFilterOptions,
      config.quotaFilterOptions,
      enabledFilter,
      hasProblem,
      issueFilter,
      planFilter,
      providerFiles,
      quota,
      searchQuery,
    ]
  );
  const hasActiveSearch = searchQuery.trim().length > 0;
  const hasActivePlanFilter = planFilter !== 'all';
  const hasActiveEnabledFilter = enabledFilter !== 'all';
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

  const statusActionsEnabled = enableStatusActions && Boolean(onFilesChange);

  const updateFilesDisabledState = useCallback(
    (names: string[], nextDisabled: boolean) => {
      if (!onFilesChange) return;
      const targetNames = new Set(names);
      onFilesChange((currentFiles) =>
        currentFiles.map((file) =>
          targetNames.has(file.name) ? { ...file, disabled: nextDisabled } : file
        )
      );
    },
    [onFilesChange]
  );

  const handleStatusToggle = useCallback(
    async (file: AuthFileItem, enabled: boolean) => {
      if (!statusActionsEnabled) return;
      if (disabled || loading) return;

      const name = file.name;
      const nextDisabled = !enabled;
      const previousDisabled = file.disabled === true;
      if (nextDisabled === previousDisabled) return;
      if (statusUpdating[name] === true) return;

      setStatusUpdating((prev) => ({ ...prev, [name]: true }));
      updateFilesDisabledState([name], nextDisabled);

      try {
        const result = await authFilesApi.setStatus(name, nextDisabled);
        updateFilesDisabledState([name], result.disabled);
        showNotification(
          enabled
            ? t('auth_files.status_enabled_success', { name })
            : t('auth_files.status_disabled_success', { name }),
          'success'
        );
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : '';
        updateFilesDisabledState([name], previousDisabled);
        showNotification(`${t('notification.update_failed')}: ${errorMessage}`, 'error');
      } finally {
        setStatusUpdating((prev) => {
          if (!prev[name]) return prev;
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }
    },
    [
      disabled,
      loading,
      showNotification,
      statusActionsEnabled,
      statusUpdating,
      t,
      updateFilesDisabledState,
    ]
  );

  const titleNode = (
    <div className={styles.titleWrapper}>
      <span>{t(`${config.i18nPrefix}.title`)}</span>
      {providerFiles.length > 0 && (
        <span className={styles.countBadge}>
          {issueFilter === 'all' &&
          !hasActiveSearch &&
          !hasActivePlanFilter &&
          !hasActiveEnabledFilter
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
  const filteredEnableTargetNames = useMemo(
    () =>
      statusActionsEnabled
        ? filteredFiles
            .filter(
              (file) =>
                !isRuntimeOnlyAuthFile(file) &&
                file.disabled === true &&
                statusUpdating[file.name] !== true
            )
            .map((file) => file.name)
        : [],
    [filteredFiles, statusActionsEnabled, statusUpdating]
  );
  const filteredDisableTargetNames = useMemo(
    () =>
      statusActionsEnabled
        ? filteredFiles
            .filter(
              (file) =>
                !isRuntimeOnlyAuthFile(file) &&
                file.disabled !== true &&
                statusUpdating[file.name] !== true
            )
            .map((file) => file.name)
        : [],
    [filteredFiles, statusActionsEnabled, statusUpdating]
  );
  const statusActionBusy =
    batchStatusUpdating || Object.values(statusUpdating).some((value) => value === true);
  const filterOptions = config.quotaFilterOptions
    ? config.quotaFilterOptions.map((option) => ({
        value: option.value,
        label: t(option.labelKey),
      }))
    : [
        { value: 'all', label: t('quota_management.filter_all_credentials') },
        { value: 'normal', label: t('quota_management.filter_normal_credentials') },
        { value: 'problem', label: t('quota_management.filter_problem_credentials') },
      ];
  const planFilterOptions = config.planFilterOptions?.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));
  const enabledFilterOptions = config.enabledFilterOptions?.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));
  const activeQuotaFilter = config.quotaFilterOptions?.find(
    (option) => option.value === issueFilter
  );
  const activePlanFilter = config.planFilterOptions?.find((option) => option.value === planFilter);
  const activeEnabledFilter = config.enabledFilterOptions?.find(
    (option) => option.value === enabledFilter
  );
  const activeConfiguredFilter =
    activeEnabledFilter && enabledFilter !== 'all'
      ? activeEnabledFilter
      : activePlanFilter && planFilter !== 'all'
        ? activePlanFilter
        : activeQuotaFilter && issueFilter !== 'all'
          ? activeQuotaFilter
          : (activeQuotaFilter ?? activePlanFilter ?? activeEnabledFilter);
  const hasActiveConfiguredFilter = Boolean(
    (activeEnabledFilter && enabledFilter !== 'all') ||
      (activePlanFilter && planFilter !== 'all') ||
      (activeQuotaFilter && issueFilter !== 'all')
  );

  const batchSetFilteredStatus = useCallback(
    (enabled: boolean) => {
      if (!statusActionsEnabled) return;
      if (disabled || loading || batchStatusUpdating) return;

      const targetNames = enabled ? filteredEnableTargetNames : filteredDisableTargetNames;
      const uniqueNames = Array.from(new Set(targetNames));
      if (uniqueNames.length === 0) return;

      showConfirmation({
        title: enabled
          ? t('auth_files.batch_enable_confirm_title')
          : t('auth_files.batch_disable_confirm_title'),
        message: (
          <>
            <p>
              {enabled
                ? t('auth_files.batch_enable_confirm_message', {
                    count: uniqueNames.length,
                    scope: t('auth_files.scope_filtered_result'),
                  })
                : t('auth_files.batch_disable_confirm_message', {
                    count: uniqueNames.length,
                    scope: t('auth_files.scope_filtered_result'),
                  })}
            </p>
            <p>{t('auth_files.batch_scope_confirm_hint', { scope: t('auth_files.scope_filtered_result') })}</p>
          </>
        ),
        variant: enabled ? 'primary' : 'danger',
        confirmText: enabled
          ? t('auth_files.batch_enable_confirm_button')
          : t('auth_files.batch_disable_confirm_button'),
        onConfirm: async () => {
          const originalDisabled = new Map(
            files
              .filter((file) => uniqueNames.includes(file.name))
              .map((file) => [file.name, file.disabled === true])
          );
          const targetNameList = Array.from(originalDisabled.keys());
          if (targetNameList.length === 0) return;

          const nextDisabled = !enabled;
          setBatchStatusUpdating(true);
          setStatusUpdating((prev) => {
            const next = { ...prev };
            targetNameList.forEach((name) => {
              next[name] = true;
            });
            return next;
          });
          updateFilesDisabledState(targetNameList, nextDisabled);

          try {
            const results = await Promise.allSettled(
              targetNameList.map((name) => authFilesApi.setStatus(name, nextDisabled))
            );

            let successCount = 0;
            let failCount = 0;
            const failedNames = new Set<string>();
            const confirmedDisabled = new Map<string, boolean>();

            results.forEach((result, index) => {
              const name = targetNameList[index];
              if (result.status === 'fulfilled') {
                successCount++;
                confirmedDisabled.set(name, result.value.disabled);
              } else {
                failCount++;
                failedNames.add(name);
              }
            });

            if (onFilesChange) {
              onFilesChange((currentFiles) =>
                currentFiles.map((file) => {
                  if (failedNames.has(file.name)) {
                    return { ...file, disabled: originalDisabled.get(file.name) === true };
                  }
                  if (confirmedDisabled.has(file.name)) {
                    return { ...file, disabled: confirmedDisabled.get(file.name) };
                  }
                  return file;
                })
              );
            }

            if (failCount === 0) {
              showNotification(
                t('auth_files.batch_status_success', { count: successCount }),
                'success'
              );
            } else {
              showNotification(
                t('auth_files.batch_status_partial', { success: successCount, failed: failCount }),
                'warning'
              );
            }
          } finally {
            setBatchStatusUpdating(false);
            setStatusUpdating((prev) => {
              const next = { ...prev };
              targetNameList.forEach((name) => {
                delete next[name];
              });
              return next;
            });
          }
        },
      });
    },
    [
      batchStatusUpdating,
      disabled,
      files,
      filteredDisableTargetNames,
      filteredEnableTargetNames,
      loading,
      onFilesChange,
      showConfirmation,
      showNotification,
      statusActionsEnabled,
      t,
      updateFilesDisabledState,
    ]
  );

  return (
    <Card title={titleNode}>
      <div className={styles.quotaCrudToolbar}>
        <div className={styles.quotaFilterBar}>
          <label className={styles.sectionSearch}>
            <span>{t('quota_management.search_label')}</span>
            <input
              className={styles.sectionSearchInput}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.currentTarget.value)}
              placeholder={t('quota_management.search_placeholder')}
              aria-label={t('quota_management.search_label')}
            />
          </label>
          <label className={styles.sectionFilter}>
            <span>
              {t(config.quotaFilterLabelKey ?? 'quota_management.credential_filter_label')}
            </span>
            <select
              className={styles.sectionFilterSelect}
              value={issueFilter}
              onChange={(event) => setIssueFilter(event.currentTarget.value)}
              aria-label={t(
                config.quotaFilterLabelKey ?? 'quota_management.credential_filter_label'
              )}
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {planFilterOptions && (
            <label className={styles.sectionFilter}>
              <span>{t(config.planFilterLabelKey ?? 'quota_management.plan_filter_label')}</span>
              <select
                className={styles.sectionFilterSelect}
                value={planFilter}
                onChange={(event) => setPlanFilter(event.currentTarget.value)}
                aria-label={t(config.planFilterLabelKey ?? 'quota_management.plan_filter_label')}
              >
                {planFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {enabledFilterOptions && (
            <label className={styles.sectionFilter}>
              <span>
                {t(config.enabledFilterLabelKey ?? 'quota_management.enabled_filter_label')}
              </span>
              <select
                className={styles.sectionFilterSelect}
                value={enabledFilter}
                onChange={(event) => setEnabledFilter(event.currentTarget.value)}
                aria-label={t(
                  config.enabledFilterLabelKey ?? 'quota_management.enabled_filter_label'
                )}
              >
                {enabledFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
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
            {statusActionsEnabled && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className={styles.quotaStatusBatchButton}
                  onClick={() => batchSetFilteredStatus(true)}
                  disabled={
                    disabled ||
                    loading ||
                    statusActionBusy ||
                    filteredEnableTargetNames.length === 0
                  }
                  loading={batchStatusUpdating}
                  title={t('quota_management.batch_enable_filtered_credentials', {
                    count: filteredEnableTargetNames.length,
                  })}
                  aria-label={t('quota_management.batch_enable_filtered_credentials', {
                    count: filteredEnableTargetNames.length,
                  })}
                >
                  {t('quota_management.batch_enable_filtered_count', {
                    count: filteredEnableTargetNames.length,
                  })}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className={styles.quotaStatusBatchButton}
                  onClick={() => batchSetFilteredStatus(false)}
                  disabled={
                    disabled ||
                    loading ||
                    statusActionBusy ||
                    filteredDisableTargetNames.length === 0
                  }
                  loading={batchStatusUpdating}
                  title={t('quota_management.batch_disable_filtered_credentials', {
                    count: filteredDisableTargetNames.length,
                  })}
                  aria-label={t('quota_management.batch_disable_filtered_credentials', {
                    count: filteredDisableTargetNames.length,
                  })}
                >
                  {t('quota_management.batch_disable_filtered_count', {
                    count: filteredDisableTargetNames.length,
                  })}
                </Button>
              </>
            )}
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
              hasActiveSearch && providerFiles.length > 0
                ? t('quota_management.no_search_title')
                : activeConfiguredFilter && hasActiveConfiguredFilter && providerFiles.length > 0
                  ? t(activeConfiguredFilter.emptyTitleKey)
                  : issueFilter === 'problem' && providerFiles.length > 0
                    ? t('quota_management.no_problem_title')
                    : issueFilter === 'normal' && providerFiles.length > 0
                      ? t('quota_management.no_normal_title')
                      : t(`${config.i18nPrefix}.empty_title`)
            }
            description={
              hasActiveSearch && providerFiles.length > 0
                ? t('quota_management.no_search_desc')
                : activeConfiguredFilter && hasActiveConfiguredFilter && providerFiles.length > 0
                  ? t(activeConfiguredFilter.emptyDescKey)
                  : issueFilter === 'problem' && providerFiles.length > 0
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
                const statusAction =
                  statusActionsEnabled && !isRuntimeOnlyAuthFile(item) ? (
                  <div className={styles.quotaStatusToggle}>
                    <ToggleSwitch
                      checked={item.disabled !== true}
                      onChange={(enabled) => void handleStatusToggle(item, enabled)}
                      disabled={
                        disabled ||
                        loading ||
                        batchStatusUpdating ||
                        statusUpdating[item.name] === true
                      }
                      label={t('auth_files.status_toggle_label')}
                      ariaLabel={t('auth_files.status_toggle_label')}
                    />
                  </div>
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
                    statusAction={statusAction}
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
