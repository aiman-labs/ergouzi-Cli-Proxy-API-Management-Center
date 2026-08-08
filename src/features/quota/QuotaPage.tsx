/**
 * Quota page: provider tabs and a unified card grid.
 *
 * Preserved behavior contracts:
 * - Click to load: cards mount idle and query upstream only on explicit refresh.
 * - cacheGeneration isolates sessions and request ids deduplicate batch loads.
 * - Provider quota caches are pruned after the credential inventory changes.
 * - This page exclusively owns the single useHeaderRefresh slot.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { authFilesApi } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { IconSearch } from '@/components/ui/icons';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { useNow } from '@/hooks/useNow';
import { useRevealGroup } from '@/hooks/motion';
import {
  captureQuotaCacheGeneration,
  commitIfQuotaCacheCurrent,
  useAuthStore,
  useQuotaStore,
  useThemeStore,
} from '@/stores';
import { useNotificationStore } from '@/stores/useNotificationStore';
import type { AuthFileItem, ResolvedTheme } from '@/types';
import { mergeTargetedAuthFileSnapshots } from '@/utils/authFiles';
import {
  AuthFileSnapshotGuard,
  syncTargetedAuthFileSnapshots,
} from '@/utils/authFileSnapshotGuard';
import type { CodexPlanFilterValue } from '@/utils/quota';
import { runLimitedBatch } from '@/utils/runLimitedBatch';
import { ProviderTabs } from '@/features/authFiles/components/ProviderTabs';
import { QuotaHeader } from './components/QuotaHeader';
import { QuotaCard } from './components/QuotaCard';
import { QuotaTimeline } from './components/QuotaTimeline';
import {
  CARD_ENTRANCE_BUDGET_MS,
  DEFAULT_QUOTA_PAGE_SIZE,
  MAX_QUOTA_PAGE_SIZE,
  MIN_QUOTA_PAGE_SIZE,
  QUOTA_SORT_MODES,
  QUOTA_TAB_ORDER,
  clampQuotaPageSize,
  type QuotaSortMode,
  type QuotaTabId,
} from './constants';
import {
  buildTabCounts,
  classifyQuotaFiles,
  filterQuotaEntries,
  filterEntriesByTab,
  getCodexStatusTargetNames,
  isCodexStatusMutable,
  isQuotaBulkRefreshDisabled,
  paginate,
  sortQuotaEntries,
  type QuotaEnabledFilter,
  type QuotaFileEntry,
  type QuotaIssueFilter,
} from './logic';
import { nextRecoveryMs } from './resetSchedule';
import { QUOTA_ADAPTERS, getQuotaSetter, type QuotaCardState } from './providers';
import type { QuotaProviderType } from './providers/types';
import { useQuotaActions } from './hooks/useQuotaActions';
import { useQuotaBatchLoader } from './hooks/useQuotaBatchLoader';
import { useCodexQuotaRefreshJob } from '@/components/quota/useCodexQuotaRefreshJob';
import { readQuotaUiState, writeQuotaUiState } from './uiState';
import { fetchCodexResetCreditDetails } from './providers/codex/data';
import {
  CodexResetDetailScheduler,
  mergeCodexResetCreditDetails,
  shouldLoadCodexResetDetails,
} from './providers/codex/resetDetails';
import styles from './QuotaPage.module.scss';

const targetedAuthFileSyncs = new Map<string, Promise<boolean>>();

const TAB_IDS: string[] = ['all', ...QUOTA_TAB_ORDER];
const SKELETON_CARD_COUNT = 6;
const QUOTA_PAGE_SIZE_STORAGE_KEY = 'quota-management:page-size';
const STATUS_BATCH_CONCURRENCY = 4;
const CODEX_PLAN_FILTER_VALUES: CodexPlanFilterValue[] = [
  'all',
  'plus',
  'pro',
  'pro_lite',
  'team',
  'bug_team',
  'k12_team',
  'regular_team',
  'free',
  'unknown',
];

const readPersistedQuotaPageSize = (): number => {
  if (typeof window === 'undefined') return DEFAULT_QUOTA_PAGE_SIZE;
  const raw = window.localStorage.getItem(QUOTA_PAGE_SIZE_STORAGE_KEY);
  return raw ? clampQuotaPageSize(Number(raw)) : DEFAULT_QUOTA_PAGE_SIZE;
};

/**
 * Timeline lane names must match card titles. Cards use file names, so this is
 * intentionally an identity function kept at module scope for stable memo deps.
 */
const displayNameFor = (name: string) => name;

export function QuotaPage() {
  const { t } = useTranslation();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const resolvedTheme: ResolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const showNotification = useNotificationStore((state) => state.showNotification);
  const showConfirmation = useNotificationStore((state) => state.showConfirmation);

  const [files, setFiles] = useState<AuthFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<QuotaTabId>(() => readQuotaUiState()?.tab ?? 'all');
  const [sortMode, setSortMode] = useState<QuotaSortMode>(
    () => readQuotaUiState()?.sortMode ?? 'default'
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(readPersistedQuotaPageSize);
  const [pageSizeInput, setPageSizeInput] = useState(String(pageSize));
  const [searchQuery, setSearchQuery] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<QuotaEnabledFilter>('all');
  const [issueFilter, setIssueFilter] = useState<QuotaIssueFilter>('all');
  const [codexPlanFilter, setCodexPlanFilter] = useState<CodexPlanFilterValue>('all');
  const [showCodexResetCreditExpiries, setShowCodexResetCreditExpiries] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>({});
  const [batchStatusUpdating, setBatchStatusUpdating] = useState(false);
  const [authSnapshotGuard] = useState(() => new AuthFileSnapshotGuard());
  const activeInventoryLoadsRef = useRef(0);
  // Stagger header and tab reveals by 70ms: title, metadata, actions, then tabs.
  const revealRef = useRevealGroup<HTMLDivElement>();

  const disableControls = connectionStatus !== 'connected';

  /* ---------- Credential inventory ---------- */

  const loadFiles = useCallback(async () => {
    const request = authSnapshotGuard.beginAll();
    activeInventoryLoadsRef.current += 1;
    setLoading(true);
    setError('');
    try {
      const data = await authFilesApi.list();
      if (authSnapshotGuard.settleAll(request)) setFiles(data?.files || []);
    } catch (err: unknown) {
      if (authSnapshotGuard.isLatestAll(request)) {
        const message = err instanceof Error ? err.message : t('notification.refresh_failed');
        setError(message);
      }
    } finally {
      activeInventoryLoadsRef.current = Math.max(0, activeInventoryLoadsRef.current - 1);
      if (activeInventoryLoadsRef.current === 0) setLoading(false);
    }
  }, [authSnapshotGuard, t]);

  const syncAuthFileSnapshots = useCallback(async (names: string[]): Promise<boolean> => {
    const targetNames = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
    if (targetNames.length === 0) return true;
    const cacheGeneration = captureQuotaCacheGeneration();
    return syncTargetedAuthFileSnapshots({
      targetNames,
      guard: authSnapshotGuard,
      load: authFilesApi.list,
      apply: (data, applyNames) =>
        commitIfQuotaCacheCurrent(cacheGeneration, () => {
          setFiles((current) =>
            mergeTargetedAuthFileSnapshots(current, data?.files || [], applyNames)
          );
        }),
    });
  }, [authSnapshotGuard]);

  const syncAuthFileSnapshotsForJob = useCallback(
    (jobId: string, names: string[]): Promise<boolean> => {
      const existing = targetedAuthFileSyncs.get(jobId);
      if (existing) return existing;

      const pending = syncAuthFileSnapshots(names).finally(() => {
        if (targetedAuthFileSyncs.get(jobId) === pending) targetedAuthFileSyncs.delete(jobId);
      });
      targetedAuthFileSyncs.set(jobId, pending);
      return pending;
    },
    [syncAuthFileSnapshots]
  );

  useHeaderRefresh(loadFiles);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  /* ---------- Quota cache ----------
   * Declare before classification because recovery sorting reads this state. */

  const antigravityQuota = useQuotaStore((state) => state.antigravityQuota);
  const claudeQuota = useQuotaStore((state) => state.claudeQuota);
  const codexQuota = useQuotaStore((state) => state.codexQuota);
  const setCodexQuota = useQuotaStore((state) => state.setCodexQuota);
  const kimiQuota = useQuotaStore((state) => state.kimiQuota);
  const xaiQuota = useQuotaStore((state) => state.xaiQuota);

  const quotaByType = useMemo<Record<QuotaProviderType, Record<string, QuotaCardState>>>(
    () =>
      ({
        antigravity: antigravityQuota,
        claude: claudeQuota,
        codex: codexQuota,
        kimi: kimiQuota,
        xai: xaiQuota,
      }) as unknown as Record<QuotaProviderType, Record<string, QuotaCardState>>,
    [antigravityQuota, claudeQuota, codexQuota, kimiQuota, xaiQuota]
  );

  const getQuota = useCallback(
    (entry: QuotaFileEntry): QuotaCardState | undefined => quotaByType[entry.type][entry.file.name],
    [quotaByType]
  );

  /* ---------- Classification / filtering / sorting / pagination ---------- */

  // Subscribe to the minute clock only for recovery sorting. Otherwise pageItems
  // would change identity every minute and repeatedly wake the refresh-all effect.
  const tick = useNow(sortMode !== 'default');
  const sortNow = sortMode === 'default' ? 0 : tick;

  const entries = useMemo(() => classifyQuotaFiles(files), [files]);
  const tabCounts = useMemo(() => buildTabCounts(entries), [entries]);
  const tabEntries = useMemo(() => filterEntriesByTab(entries, tab), [entries, tab]);
  const filteredEntries = useMemo(
    () =>
      filterQuotaEntries(tabEntries, {
        searchQuery,
        enabledFilter,
        issueFilter,
        codexPlanFilter: tab === 'codex' ? codexPlanFilter : 'all',
        quotaFor: getQuota,
      }),
    [codexPlanFilter, enabledFilter, getQuota, issueFilter, searchQuery, tab, tabEntries]
  );

  const resolveNextRecovery = useCallback(
    (entry: QuotaFileEntry) => nextRecoveryMs(entry.type, getQuota(entry), sortNow),
    [getQuota, sortNow]
  );
  // Sort before pagination so recovery order is global rather than page-local.
  const sortedEntries = useMemo(
    () => sortQuotaEntries(filteredEntries, sortMode, resolveNextRecovery),
    [filteredEntries, sortMode, resolveNextRecovery]
  );

  const { pageItems, currentPage, totalPages } = useMemo(
    () => paginate(sortedEntries, page, pageSize),
    [pageSize, sortedEntries, page]
  );

  useEffect(() => {
    setPageSizeInput(String(pageSize));
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(QUOTA_PAGE_SIZE_STORAGE_KEY, String(pageSize));
    }
  }, [pageSize]);

  const commitPageSizeInput = useCallback(
    (rawValue: string) => {
      const value = Number(rawValue.trim());
      if (!rawValue.trim() || !Number.isFinite(value)) {
        setPageSizeInput(String(pageSize));
        return;
      }
      const next = clampQuotaPageSize(value);
      setPageSize(next);
      setPageSizeInput(String(next));
      setPage(1);
    },
    [pageSize]
  );

  const handlePageSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.currentTarget.value;
    setPageSizeInput(raw);
    const value = Number(raw);
    if (!raw.trim() || !Number.isFinite(value)) return;
    const rounded = Math.round(value);
    if (clampQuotaPageSize(rounded) !== rounded) return;
    setPageSize(rounded);
    setPage(1);
  }, []);

  const handleTabChange = useCallback((next: string) => {
    setTab(next as QuotaTabId);
    setPage(1);
    writeQuotaUiState({ tab: next as QuotaTabId });
  }, []);

  const handleSortModeChange = useCallback((next: string) => {
    setSortMode(next as QuotaSortMode);
    setPage(1);
    writeQuotaUiState({ sortMode: next as QuotaSortMode });
  }, []);

  const sortOptions = useMemo(
    () =>
      QUOTA_SORT_MODES.map((mode) => ({ value: mode, label: t(`quota_management.sort_${mode}`) })),
    [t]
  );
  const enabledFilterOptions = useMemo(
    () =>
      ['all', 'enabled', 'disabled'].map((value) => ({
        value,
        label: t(`quota_management.enabled_filter_${value}`),
      })),
    [t]
  );
  const issueFilterOptions = useMemo(
    () =>
      ['all', 'normal', 'problem'].map((value) => ({
        value,
        label: t(`quota_management.filter_${value}_credentials`),
      })),
    [t]
  );
  const codexPlanFilterOptions = useMemo(
    () =>
      CODEX_PLAN_FILTER_VALUES.map((value) => ({
        value,
        label: t(`quota_management.codex_plan_filter_${value}`),
      })),
    [t]
  );

  const { loadedCount, attentionCount } = useMemo(() => {
    let loaded = 0;
    let attention = 0;
    entries.forEach((entry) => {
      const status = quotaByType[entry.type][entry.file.name]?.status;
      if (status === 'success') loaded += 1;
      else if (status === 'error') attention += 1;
    });
    return { loadedCount: loaded, attentionCount: attention };
  }, [entries, quotaByType]);

  // Once inventory settles, keep only credentials that still exist in each provider cache.
  useEffect(() => {
    if (loading) return;
    const survivorsByType = new Map<QuotaProviderType, Set<string>>(
      QUOTA_TAB_ORDER.map((type) => [type, new Set<string>()])
    );
    entries.forEach((entry) => survivorsByType.get(entry.type)?.add(entry.file.name));

    QUOTA_TAB_ORDER.forEach((type) => {
      const survivors = survivorsByType.get(type) ?? new Set<string>();
      const setQuota = getQuotaSetter(QUOTA_ADAPTERS[type]);
      setQuota((prev) => {
        const staleKeys = Object.keys(prev).filter((name) => !survivors.has(name));
        if (staleKeys.length === 0) return prev;
        const next = { ...prev };
        staleKeys.forEach((name) => delete next[name]);
        return next;
      });
    });
  }, [entries, loading]);

  /* ---------- Loading and actions ---------- */

  const { batchLoading, loadQuota } = useQuotaBatchLoader();
  const { resettingQuotaName, refreshQuota, resetQuota } = useQuotaActions(disableControls);
  const {
    progress: codexJobProgress,
    isActive: codexJobActive,
    inventorySyncContext,
    clearInventorySyncContext,
    start: startCodexJob,
    cancel: cancelCodexJob,
  } = useCodexQuotaRefreshJob();
  const [resetCreditDetailsScheduler] = useState(() => new CodexResetDetailScheduler(4));

  useEffect(() => {
    if (!inventorySyncContext || !codexJobProgress.jobId || codexJobActive) return;
    if (inventorySyncContext.jobId !== codexJobProgress.jobId) return;
    if (
      codexJobProgress.status !== 'completed' &&
      codexJobProgress.status !== 'cancelled' &&
      codexJobProgress.status !== 'error'
    ) {
      return;
    }

    void syncAuthFileSnapshotsForJob(
      inventorySyncContext.jobId,
      inventorySyncContext.targetNames
    ).then((synced) => {
      if (synced) clearInventorySyncContext(inventorySyncContext.jobId);
    });
  }, [
    clearInventorySyncContext,
    codexJobActive,
    codexJobProgress.jobId,
    codexJobProgress.status,
    inventorySyncContext,
    syncAuthFileSnapshotsForJob,
  ]);

  useEffect(() => {
    resetCreditDetailsScheduler.sync({
      enabled: shouldLoadCodexResetDetails(showCodexResetCreditExpiries, pageItems),
      entries: pageItems,
      quota: codexQuota,
      cacheGeneration: captureQuotaCacheGeneration(),
      fetchDetails: async (entry) => {
        try {
          return await fetchCodexResetCreditDetails(entry.file, t);
        } catch (error: unknown) {
          return {
            availableCount: null,
            applicableAvailableCount: null,
            credits: [],
            error: error instanceof Error ? error.message : t('common.unknown_error'),
          };
        }
      },
      commitDetails: ({ name, expected, details, cacheGeneration }) => {
        commitIfQuotaCacheCurrent(cacheGeneration, () => {
          setCodexQuota((current) => {
            const merged = mergeCodexResetCreditDetails(current[name], expected, details);
            return merged ? { ...current, [name]: merged } : current;
          });
        });
      },
    });
    return () => resetCreditDetailsScheduler.pause();
  }, [
    codexQuota,
    pageItems,
    resetCreditDetailsScheduler,
    setCodexQuota,
    showCodexResetCreditExpiries,
    t,
    tab,
  ]);

  const pendingStatusNames = useMemo(
    () => new Set(Object.keys(statusUpdating).filter((name) => statusUpdating[name] === true)),
    [statusUpdating]
  );
  const quotaLoading = useMemo(
    () => entries.some((entry) => getQuota(entry)?.status === 'loading'),
    [entries, getQuota]
  );
  const statusActionBusy = batchStatusUpdating || pendingStatusNames.size > 0;
  const refreshControlsDisabled = isQuotaBulkRefreshDisabled(
    disableControls || loading,
    codexJobActive,
    statusActionBusy,
    resettingQuotaName
  );
  const refreshControlsDisabledRef = useRef(refreshControlsDisabled);
  useEffect(() => {
    refreshControlsDisabledRef.current = refreshControlsDisabled;
  }, [refreshControlsDisabled]);
  const statusControlsDisabled =
    disableControls ||
    loading ||
    batchLoading ||
    codexJobActive ||
    resettingQuotaName !== null ||
    quotaLoading ||
    statusActionBusy;
  const filteredEnableTargetNames = useMemo(
    () =>
      tab === 'codex' ? getCodexStatusTargetNames(filteredEntries, true, pendingStatusNames) : [],
    [filteredEntries, pendingStatusNames, tab]
  );
  const filteredDisableTargetNames = useMemo(
    () =>
      tab === 'codex' ? getCodexStatusTargetNames(filteredEntries, false, pendingStatusNames) : [],
    [filteredEntries, pendingStatusNames, tab]
  );

  const handleStatusToggle = useCallback(
    async (entry: QuotaFileEntry, enabled: boolean) => {
      if (!isCodexStatusMutable(entry) || statusControlsDisabled) return;
      const name = entry.file.name;
      if (statusUpdating[name] === true) return;

      setStatusUpdating((prev) => ({ ...prev, [name]: true }));
      try {
        const result = await authFilesApi.setStatus(name, !enabled);
        authSnapshotGuard.markTargetsMutated([name]);
        setFiles((current) =>
          current.map((file) =>
            file.name === name ? { ...file, disabled: result.disabled } : file
          )
        );
        showNotification(
          enabled
            ? t('auth_files.status_enabled_success', { name })
            : t('auth_files.status_disabled_success', { name }),
          'success'
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('common.unknown_error');
        showNotification(`${t('notification.update_failed')}: ${message}`, 'error');
      } finally {
        setStatusUpdating((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }
    },
    [authSnapshotGuard, showNotification, statusControlsDisabled, statusUpdating, t]
  );

  const executeBatchStatus = useCallback(
    async (enabled: boolean) => {
      if (statusControlsDisabled || tab !== 'codex') return;
      const names = enabled ? filteredEnableTargetNames : filteredDisableTargetNames;
      if (names.length === 0) return;

      setBatchStatusUpdating(true);
      setStatusUpdating((prev) => {
        const next = { ...prev };
        names.forEach((name) => {
          next[name] = true;
        });
        return next;
      });

      try {
        const results = await runLimitedBatch({
          items: names,
          concurrency: STATUS_BATCH_CONCURRENCY,
          worker: async (name) => {
            try {
              const result = await authFilesApi.setStatus(name, !enabled);
              return { name, disabled: result.disabled, ok: true as const };
            } catch {
              return { name, disabled: !enabled, ok: false as const };
            }
          },
        });
        const confirmed = new Map(
          results.filter((result) => result.ok).map((result) => [result.name, result.disabled])
        );
        authSnapshotGuard.markTargetsMutated(confirmed.keys());
        setFiles((current) =>
          current.map((file) =>
            confirmed.has(file.name) ? { ...file, disabled: confirmed.get(file.name) } : file
          )
        );
        const success = confirmed.size;
        const failed = results.length - success;
        showNotification(
          failed === 0
            ? t('auth_files.batch_status_success', { count: success })
            : t('auth_files.batch_status_partial', { success, failed }),
          failed === 0 ? 'success' : 'warning'
        );
      } finally {
        setBatchStatusUpdating(false);
        setStatusUpdating((prev) => {
          const next = { ...prev };
          names.forEach((name) => delete next[name]);
          return next;
        });
      }
    },
    [
      filteredDisableTargetNames,
      filteredEnableTargetNames,
      authSnapshotGuard,
      showNotification,
      statusControlsDisabled,
      t,
      tab,
    ]
  );

  const confirmBatchStatus = useCallback(
    (enabled: boolean) => {
      const names = enabled ? filteredEnableTargetNames : filteredDisableTargetNames;
      if (names.length === 0) return;
      showConfirmation({
        title: t(
          enabled
            ? 'auth_files.batch_enable_confirm_title'
            : 'auth_files.batch_disable_confirm_title'
        ),
        message: t(
          enabled
            ? 'auth_files.batch_enable_confirm_message'
            : 'auth_files.batch_disable_confirm_message',
          { count: names.length, scope: t('auth_files.scope_filtered_result') }
        ),
        confirmText: t(
          enabled
            ? 'auth_files.batch_enable_confirm_button'
            : 'auth_files.batch_disable_confirm_button'
        ),
        variant: enabled ? 'primary' : 'danger',
        onConfirm: () => executeBatchStatus(enabled),
      });
    },
    [executeBatchStatus, filteredDisableTargetNames, filteredEnableTargetNames, showConfirmation, t]
  );

  const handleRefreshPage = useCallback(async () => {
    if (refreshControlsDisabledRef.current) return;
    await loadQuota(pageItems);
    await syncAuthFileSnapshots(pageItems.map((entry) => entry.file.name));
  }, [loadQuota, pageItems, syncAuthFileSnapshots]);

  const handleQuotaRefresh = useCallback(
    async (entry: QuotaFileEntry) => {
      await refreshQuota(entry.file, QUOTA_ADAPTERS[entry.type]);
      await syncAuthFileSnapshots([entry.file.name]);
    },
    [refreshQuota, syncAuthFileSnapshots]
  );

  const executeRefreshAll = useCallback(async () => {
    if (refreshControlsDisabledRef.current) return;
    const codexTargets = entries
      .filter((entry) => entry.type === 'codex')
      .map((entry) => entry.file);
    const directTargets = entries.filter((entry) => entry.type !== 'codex');

    try {
      await Promise.all([
        codexTargets.length > 0 ? startCodexJob(codexTargets) : Promise.resolve(),
        (async () => {
          if (directTargets.length === 0) return;
          await loadQuota(directTargets);
          await syncAuthFileSnapshots(directTargets.map((entry) => entry.file.name));
        })(),
      ]);
    } catch (err: unknown) {
      showNotification(
        err instanceof Error ? err.message : t('notification.refresh_failed'),
        'error'
      );
    }
  }, [entries, loadQuota, showNotification, startCodexJob, syncAuthFileSnapshots, t]);

  const handleRefreshAll = useCallback(() => {
    if (refreshControlsDisabledRef.current || entries.length === 0) return;
    showConfirmation({
      title: t('quota_management.refresh_all_confirm_title'),
      message: t('quota_management.refresh_all_confirm_message', { count: entries.length }),
      confirmText: t('quota_management.refresh_all_confirm_button'),
      variant: 'primary',
      onConfirm: executeRefreshAll,
    });
  }, [entries.length, executeRefreshAll, showConfirmation, t]);

  const canUseActions = !statusControlsDisabled;

  /* ---------- One-time first-load card reveal ----------
   * Flip cardsAnimated after the first data render. Mounted cards capture their
   * delay once; cards mounted by later tabs, pages, or refreshes receive null. */

  const [cardsAnimated, setCardsAnimated] = useState(false);
  const enableCardEntrance = !cardsAnimated && !loading && pageItems.length > 0;
  useEffect(() => {
    if (enableCardEntrance) {
      setCardsAnimated(true);
    }
  }, [enableCardEntrance]);
  const cardEntranceDelay = (index: number): number | null => {
    if (!enableCardEntrance) return null;
    if (pageItems.length <= 1) return 0;
    return Math.round((index / (pageItems.length - 1)) * CARD_ENTRANCE_BUDGET_MS);
  };

  /* ---------- Render ---------- */

  const isEmpty = !loading && filteredEntries.length === 0;

  return (
    <div className={styles.page} ref={revealRef}>
      <QuotaHeader
        totalCount={entries.length}
        loadedCount={loadedCount}
        attentionCount={attentionCount}
        refreshing={loading || batchLoading}
        jobActive={codexJobActive}
        progress={codexJobProgress}
        disableControls={refreshControlsDisabled}
        onRefreshPage={() => void handleRefreshPage()}
        onRefreshAll={handleRefreshAll}
        onCancel={() => void cancelCodexJob()}
      />

      <section className={styles.workbench}>
        <div className={styles.tabsRow} data-reveal>
          <ProviderTabs
            types={TAB_IDS}
            counts={tabCounts}
            active={tab}
            resolvedTheme={resolvedTheme}
            onChange={handleTabChange}
          />
          <div className={styles.controls}>
            <div className={styles.search}>
              <Input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.currentTarget.value);
                  setPage(1);
                }}
                placeholder={t('quota_management.search_placeholder')}
                aria-label={t('quota_management.search_label')}
                rightElement={<IconSearch className={styles.searchIcon} size={16} />}
              />
            </div>
            <Select
              value={issueFilter}
              options={issueFilterOptions}
              onChange={(value) => {
                setIssueFilter(value as QuotaIssueFilter);
                setPage(1);
              }}
              ariaLabel={t('quota_management.credential_filter_label')}
              size="sm"
            />
            {tab === 'codex' && (
              <Select
                value={codexPlanFilter}
                options={codexPlanFilterOptions}
                onChange={(value) => {
                  setCodexPlanFilter(value as CodexPlanFilterValue);
                  setPage(1);
                }}
                ariaLabel={t('quota_management.codex_plan_filter_label')}
                size="sm"
              />
            )}
            <Select
              value={enabledFilter}
              options={enabledFilterOptions}
              onChange={(value) => {
                setEnabledFilter(value as QuotaEnabledFilter);
                setPage(1);
              }}
              ariaLabel={t('quota_management.enabled_filter_label')}
              size="sm"
            />
            <Select
              value={sortMode}
              options={sortOptions}
              onChange={handleSortModeChange}
              ariaLabel={t('quota_management.sort_label')}
              size="sm"
            />
            <label className={styles.pageSizeControl}>
              <span>{t('quota_management.page_size_label')}</span>
              <input
                type="number"
                min={MIN_QUOTA_PAGE_SIZE}
                max={MAX_QUOTA_PAGE_SIZE}
                value={pageSizeInput}
                onChange={handlePageSizeChange}
                onBlur={(event) => commitPageSizeInput(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitPageSizeInput(event.currentTarget.value);
                }}
              />
            </label>
          </div>
        </div>

        {tab === 'codex' && (
          <div className={styles.statusActions} data-reveal>
            <span>
              {t('quota_management.scope_summary', {
                filtered: filteredEntries.length,
                page: pageItems.length,
              })}
            </span>
            <div className={styles.statusActionButtons}>
              <ToggleSwitch
                checked={showCodexResetCreditExpiries}
                onChange={setShowCodexResetCreditExpiries}
                disabled={disableControls}
                label={t('quota_management.show_codex_reset_expiry')}
                ariaLabel={t('quota_management.show_codex_reset_expiry')}
              />
              <Button
                size="sm"
                onClick={() => confirmBatchStatus(true)}
                disabled={statusControlsDisabled || filteredEnableTargetNames.length === 0}
                loading={batchStatusUpdating}
              >
                {t('quota_management.batch_enable_filtered_count', {
                  count: filteredEnableTargetNames.length,
                })}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => confirmBatchStatus(false)}
                disabled={statusControlsDisabled || filteredDisableTargetNames.length === 0}
                loading={batchStatusUpdating}
              >
                {t('quota_management.batch_disable_filtered_count', {
                  count: filteredDisableTargetNames.length,
                })}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}

        <div className={styles.gridViewport}>
          {loading ? (
            <div className={styles.grid} aria-hidden="true">
              {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
                <Skeleton key={index} height={168} rounded={14} />
              ))}
            </div>
          ) : isEmpty ? (
            <EmptyState
              title={
                tab === 'all'
                  ? t('quota_management.empty_title')
                  : t(`${QUOTA_ADAPTERS[tab].i18nPrefix}.empty_title`)
              }
              description={
                tab === 'all'
                  ? t('quota_management.empty_desc')
                  : t(`${QUOTA_ADAPTERS[tab].i18nPrefix}.empty_desc`)
              }
              action={
                tab === 'all' ? undefined : (
                  <Button variant="secondary" size="sm" onClick={() => handleTabChange('all')}>
                    {t('auth_files.filter_all')}
                  </Button>
                )
              }
            />
          ) : (
            <div className={styles.grid}>
              {pageItems.map((entry, index) => (
                <QuotaCard
                  key={`${entry.type}:${entry.file.name}`}
                  entry={entry}
                  quota={getQuota(entry)}
                  resolvedTheme={resolvedTheme}
                  canRefresh={canUseActions && statusUpdating[entry.file.name] !== true}
                  resetting={resettingQuotaName === entry.file.name}
                  canSetStatus={canUseActions && statusUpdating[entry.file.name] !== true}
                  statusUpdating={statusUpdating[entry.file.name] === true}
                  showCodexResetCreditExpiries={
                    entry.type === 'codex' && showCodexResetCreditExpiries
                  }
                  entranceDelayMs={cardEntranceDelay(index)}
                  onRefresh={() => void handleQuotaRefresh(entry)}
                  onReset={() => resetQuota(entry.file, QUOTA_ADAPTERS[entry.type])}
                  onStatusChange={
                    isCodexStatusMutable(entry)
                      ? (enabled) => void handleStatusToggle(entry, enabled)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>

        {!loading && filteredEntries.length > pageSize && (
          <div className={styles.pagination}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            >
              {t('auth_files.pagination_prev')}
            </Button>
            <div className={styles.pageInfo}>
              {t('auth_files.pagination_info', {
                current: currentPage,
                total: totalPages,
                count: filteredEntries.length,
              })}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
            >
              {t('auth_files.pagination_next')}
            </Button>
          </div>
        )}

        <QuotaTimeline
          entries={pageItems}
          quotaFor={getQuota}
          displayNameFor={displayNameFor}
          resolvedTheme={resolvedTheme}
          showCodexResetCreditExpiries={showCodexResetCreditExpiries}
        />
      </section>
    </div>
  );
}
