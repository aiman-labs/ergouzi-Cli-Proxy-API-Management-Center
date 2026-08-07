import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useInterval } from '@/hooks/useInterval';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { useRevealOnScroll } from '@/hooks/motion';
import { usePageTransitionLayer } from '@/components/common/PageTransitionLayer';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { copyToClipboard } from '@/utils/clipboard';
import {
  clampCardPageSize,
  getTypeLabel,
  isRuntimeOnlyAuthFile,
  normalizeProviderKey,
  type ResolvedTheme,
} from '@/features/authFiles/constants';
import { AuthFileCard } from '@/features/authFiles/components/AuthFileCard';
import { AuthFileDetailsSheet } from '@/features/authFiles/components/AuthFileDetailsSheet';
import { AuthFileModelsModal } from '@/features/authFiles/components/AuthFileModelsModal';
import { AuthFilesImportOptionsModal } from '@/features/authFiles/components/AuthFilesImportOptionsModal';
import { AuthFilesToolbar } from '@/features/authFiles/components/AuthFilesToolbar';
import { BatchActionBar } from '@/features/authFiles/components/BatchActionBar';
import { OAuthExcludedCard } from '@/features/authFiles/components/OAuthExcludedCard';
import { OAuthModelAliasCard } from '@/features/authFiles/components/OAuthModelAliasCard';
import { ProviderTabs } from '@/features/authFiles/components/ProviderTabs';
import { VaultHeader } from '@/features/authFiles/components/VaultHeader';
import { VaultPulse } from '@/features/authFiles/components/VaultPulse';
import { invalidateAuthFileDerivedCaches } from '@/features/authFiles/cacheInvalidation';
import {
  buildWildcardSearch,
  matchesAuthFileSearch,
  resolveAuthFileDeleteTargets,
  sortAuthFiles,
} from '@/features/authFiles/logic';
import { useAuthFilesData } from '@/features/authFiles/hooks/useAuthFilesData';
import { useAuthFilesModels } from '@/features/authFiles/hooks/useAuthFilesModels';
import { useAuthFilesOauth } from '@/features/authFiles/hooks/useAuthFilesOauth';
import { useAuthFilesPrefixProxyEditor } from '@/features/authFiles/hooks/useAuthFilesPrefixProxyEditor';
import { useAuthFilesStatusBarCache } from '@/features/authFiles/hooks/useAuthFilesStatusBarCache';
import {
  isAuthFilesStatusFilterMode,
  isAuthFilesSortMode,
  isAuthFilesErrorTypeFilter,
  isAuthFilesSuccessCountFilter,
  isAuthFilesCodexPlanFilter,
  normalizeAuthFilesSortMode,
  readAuthFilesUiState,
  readPersistedAuthFilesCompactMode,
  writeAuthFilesUiState,
  writePersistedAuthFilesCompactMode,
  type AuthFilesStatusFilterMode,
  type AuthFilesSortMode,
  type AuthFilesErrorTypeFilter,
  type AuthFilesSuccessCountFilter,
  type AuthFilesCodexPlanFilter,
} from '@/features/authFiles/uiState';
import { useAuthStore, useNotificationStore, useQuotaStore, useThemeStore } from '@/stores';
import type { AuthFileItem } from '@/types';
import { classifyAuthFileErrorType, resolveAuthFileProblemMessage } from './errorType';
import { filterAuthFilesBySuccessCount } from './successFilter';
import { isCodexFile, matchesCodexPlanFilterValue } from '@/utils/quota';
import { getManualRefreshSafeStatusTargetNames } from './manualRefresh';
import styles from './AuthFilesPage.module.scss';

const DEFAULT_REGULAR_PAGE_SIZE = 9;
const DEFAULT_COMPACT_PAGE_SIZE = 12;
const SKELETON_CARD_COUNT = 6;
/** Total first-paint card entrance budget, aligned with useRevealGroup. */
const CARD_ENTRANCE_BUDGET_MS = 360;

const resolveStatusFilterMode = (
  problemOnly: boolean,
  disabledOnly: boolean
): AuthFilesStatusFilterMode => {
  if (problemOnly) return 'problem';
  if (disabledOnly) return 'disabled';
  return 'all';
};

const normalizePersistedStatusFilterMode = (value: unknown): AuthFilesStatusFilterMode | null => {
  if (value === 'disabledProblem') return 'problem';
  return isAuthFilesStatusFilterMode(value) ? value : null;
};

export function AuthFilesPage() {
  const { t } = useTranslation();
  const showNotification = useNotificationStore((state) => state.showNotification);
  const showConfirmation = useNotificationStore((state) => state.showConfirmation);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const antigravityQuota = useQuotaStore((state) => state.antigravityQuota);
  const claudeQuota = useQuotaStore((state) => state.claudeQuota);
  const codexQuota = useQuotaStore((state) => state.codexQuota);
  const kimiQuota = useQuotaStore((state) => state.kimiQuota);
  const xaiQuota = useQuotaStore((state) => state.xaiQuota);
  const resolvedTheme: ResolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const pageTransitionLayer = usePageTransitionLayer();
  const isCurrentLayer = pageTransitionLayer ? pageTransitionLayer.status === 'current' : true;
  const navigate = useNavigate();

  const [filter, setFilter] = useState<'all' | string>('all');
  const [statusFilterMode, setStatusFilterMode] = useState<AuthFilesStatusFilterMode>('all');
  const [errorTypeFilter, setErrorTypeFilter] = useState<AuthFilesErrorTypeFilter>('all');
  const [successCountFilter, setSuccessCountFilter] = useState<AuthFilesSuccessCountFilter>('all');
  const [codexPlanFilter, setCodexPlanFilter] = useState<AuthFilesCodexPlanFilter>('all');
  const [compactMode, setCompactMode] = useState(false);
  const [showQuotaDetails, setShowQuotaDetails] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSizeByMode, setPageSizeByMode] = useState({
    regular: DEFAULT_REGULAR_PAGE_SIZE,
    compact: DEFAULT_COMPACT_PAGE_SIZE,
  });
  const [pageSizeInput, setPageSizeInput] = useState('9');
  const [viewMode, setViewMode] = useState<'diagram' | 'list'>('list');
  const [sortMode, setSortMode] = useState<AuthFilesSortMode>('default');
  const [uiStateHydrated, setUiStateHydrated] = useState(false);

  const {
    modelsModalOpen,
    modelsLoading,
    modelsList,
    modelsFileName,
    modelsFileType,
    modelsError,
    showModels,
    closeModelsModal,
    invalidateModels,
  } = useAuthFilesModels();

  const invalidateDerivedCaches = useCallback(
    (names?: string[]) => invalidateAuthFileDerivedCaches(invalidateModels, names),
    [invalidateModels]
  );

  const {
    files,
    selectedFiles,
    loading,
    refreshing,
    error,
    uploading,
    deleting,
    deletingAll,
    statusUpdating,
    manualRefreshing,
    batchStatusUpdating,
    importOptionsOpen,
    fileInputRef,
    loadFiles,
    handleUploadClick,
    handleImportOptionsClose,
    handleImportFileSelect,
    handleFileChange,
    handleDelete,
    handleDeleteAll,
    handleDownload,
    handleManualRefresh,
    handleStatusToggle,
    toggleSelect,
    selectAllVisible,
    invertVisibleSelection,
    deselectAll,
    batchDownload,
    batchSetStatus,
    batchDelete,
  } = useAuthFilesData({ onFilesMutated: invalidateDerivedCaches });

  const statusBarCache = useAuthFilesStatusBarCache(files);

  const {
    excluded,
    excludedError,
    modelAlias,
    modelAliasError,
    allProviderModels,
    loadExcluded,
    loadModelAlias,
    deleteExcluded,
    deleteModelAlias,
    handleMappingUpdate,
    handleDeleteLink,
    handleToggleFork,
    handleRenameAlias,
    handleDeleteAlias,
  } = useAuthFilesOauth({ viewMode, files });

  const {
    prefixProxyEditor,
    prefixProxyUpdatedText,
    prefixProxyDirty,
    openPrefixProxyEditor,
    closePrefixProxyEditor,
    handlePrefixProxyChange,
    handlePrefixProxySave,
  } = useAuthFilesPrefixProxyEditor({
    disableControls: connectionStatus !== 'connected',
    loadFiles,
    onFileMutated: (name) => invalidateDerivedCaches([name]),
  });

  const disableControls = connectionStatus !== 'connected';
  const normalizedFilter = normalizeProviderKey(String(filter));
  const pageSize = compactMode ? pageSizeByMode.compact : pageSizeByMode.regular;
  const problemOnly = statusFilterMode === 'problem';
  const disabledOnly = statusFilterMode === 'disabled';
  const enabledOnly = statusFilterMode === 'enabled';

  /* ---------- uiState hydration and persistence (legacy localStorage key/shape) ---------- */

  useEffect(() => {
    const persistedCompactMode = readPersistedAuthFilesCompactMode();
    if (typeof persistedCompactMode === 'boolean') {
      setCompactMode(persistedCompactMode);
    }

    const persisted = readAuthFilesUiState();
    if (persisted) {
      if (typeof persisted.filter === 'string' && persisted.filter.trim()) {
        setFilter(normalizeProviderKey(persisted.filter));
      }
      const persistedStatusFilterMode = normalizePersistedStatusFilterMode(
        persisted.statusFilterMode
      );
      if (persistedStatusFilterMode) {
        setStatusFilterMode(persistedStatusFilterMode);
      } else if (
        typeof persisted.problemOnly === 'boolean' ||
        typeof persisted.disabledOnly === 'boolean'
      ) {
        setStatusFilterMode(
          resolveStatusFilterMode(persisted.problemOnly === true, persisted.disabledOnly === true)
        );
      }
      if (typeof persistedCompactMode !== 'boolean' && typeof persisted.compactMode === 'boolean') {
        setCompactMode(persisted.compactMode);
      }
      if (typeof persisted.showQuotaDetails === 'boolean') {
        setShowQuotaDetails(persisted.showQuotaDetails);
      }
      if (isAuthFilesErrorTypeFilter(persisted.errorTypeFilter)) {
        setErrorTypeFilter(persisted.errorTypeFilter);
      }
      if (isAuthFilesSuccessCountFilter(persisted.successCountFilter)) {
        setSuccessCountFilter(persisted.successCountFilter);
      }
      if (isAuthFilesCodexPlanFilter(persisted.codexPlanFilter)) {
        setCodexPlanFilter(persisted.codexPlanFilter);
      }
      if (typeof persisted.search === 'string') {
        setSearch(persisted.search);
      }
      if (typeof persisted.page === 'number' && Number.isFinite(persisted.page)) {
        setPage(Math.max(1, Math.round(persisted.page)));
      }
      const legacyPageSize =
        typeof persisted.pageSize === 'number' && Number.isFinite(persisted.pageSize)
          ? clampCardPageSize(persisted.pageSize)
          : null;
      const regularPageSize =
        typeof persisted.regularPageSize === 'number' && Number.isFinite(persisted.regularPageSize)
          ? clampCardPageSize(persisted.regularPageSize)
          : (legacyPageSize ?? DEFAULT_REGULAR_PAGE_SIZE);
      const compactPageSize =
        typeof persisted.compactPageSize === 'number' && Number.isFinite(persisted.compactPageSize)
          ? clampCardPageSize(persisted.compactPageSize)
          : (legacyPageSize ?? DEFAULT_COMPACT_PAGE_SIZE);
      setPageSizeByMode({
        regular: regularPageSize,
        compact: compactPageSize,
      });
      const persistedSortMode = normalizeAuthFilesSortMode(persisted.sortMode);
      if (persistedSortMode) {
        setSortMode(persistedSortMode);
      }
    }

    setUiStateHydrated(true);
  }, []);

  useEffect(() => {
    if (!uiStateHydrated) return;

    writeAuthFilesUiState({
      filter,
      statusFilterMode,
      problemOnly,
      disabledOnly,
      compactMode,
      showQuotaDetails,
      errorTypeFilter,
      successCountFilter,
      codexPlanFilter,
      search,
      page,
      pageSize,
      regularPageSize: pageSizeByMode.regular,
      compactPageSize: pageSizeByMode.compact,
      sortMode,
    });
    writePersistedAuthFilesCompactMode(compactMode);
  }, [
    compactMode,
    codexPlanFilter,
    disabledOnly,
    errorTypeFilter,
    filter,
    page,
    pageSize,
    pageSizeByMode,
    problemOnly,
    search,
    showQuotaDetails,
    sortMode,
    statusFilterMode,
    successCountFilter,
    uiStateHydrated,
  ]);

  useEffect(() => {
    setPageSizeInput(String(pageSize));
  }, [pageSize]);

  const setCurrentModePageSize = useCallback(
    (next: number) => {
      setPageSizeByMode((current) =>
        compactMode ? { ...current, compact: next } : { ...current, regular: next }
      );
    },
    [compactMode]
  );

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

      const next = clampCardPageSize(value);
      setCurrentModePageSize(next);
      setPageSizeInput(String(next));
      setPage(1);
    },
    [pageSize, setCurrentModePageSize]
  );

  const handlePageSizeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.currentTarget.value;
      setPageSizeInput(rawValue);

      const trimmed = rawValue.trim();
      if (!trimmed) return;

      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) return;

      const rounded = Math.round(parsed);
      // Reject out-of-range values instead of silently changing the user's input.
      if (clampCardPageSize(rounded) !== rounded) return;

      setCurrentModePageSize(rounded);
      setPage(1);
    },
    [setCurrentModePageSize]
  );

  const handleSortModeChange = useCallback(
    (value: string) => {
      if (!isAuthFilesSortMode(value) || value === sortMode) return;
      setSortMode(value);
      setPage(1);
    },
    [sortMode]
  );

  const handleStatusFilterModeChange = useCallback((nextMode: AuthFilesStatusFilterMode) => {
    setStatusFilterMode(nextMode);
    setPage(1);
  }, []);

  /* ---------- Data loading: foreground once, background afterward ---------- */

  const initialLoadDoneRef = useRef(false);

  const handleHeaderRefresh = useCallback(async () => {
    await Promise.all([loadFiles({ background: true }), loadExcluded(), loadModelAlias()]);
  }, [loadFiles, loadExcluded, loadModelAlias]);

  useHeaderRefresh(handleHeaderRefresh);

  useEffect(() => {
    if (!isCurrentLayer) return;
    void loadFiles(initialLoadDoneRef.current ? { background: true } : undefined);
    initialLoadDoneRef.current = true;
    loadExcluded();
    loadModelAlias();
  }, [isCurrentLayer, loadFiles, loadExcluded, loadModelAlias]);

  useInterval(
    () => {
      void loadFiles({ background: true }).catch(() => {});
    },
    isCurrentLayer ? 240_000 : null
  );

  /* ---------- Filtering, sorting, and pagination ---------- */

  const quotaIssueByName = useMemo(() => {
    const result: Record<string, string> = {};
    [antigravityQuota, claudeQuota, codexQuota, kimiQuota, xaiQuota].forEach((quotaMap) => {
      Object.entries(quotaMap).forEach(([name, quota]) => {
        if (quota.status === 'error' && quota.error) result[name] = quota.error;
      });
    });
    return result;
  }, [antigravityQuota, claudeQuota, codexQuota, kimiQuota, xaiQuota]);

  const getProblemMessage = useCallback(
    (file: AuthFileItem) => resolveAuthFileProblemMessage(file, quotaIssueByName[file.name]),
    [quotaIssueByName]
  );

  const existingTypes = useMemo(() => {
    const types = new Set<string>(['all']);
    files.forEach((file) => {
      const type = normalizeProviderKey(String(file.type ?? file.provider ?? ''));
      if (type) types.add(type);
    });
    return Array.from(types);
  }, [files]);

  const filesMatchingStatusFilters = useMemo(
    () =>
      files.filter((file) => {
        if (enabledOnly && file.disabled === true) return false;
        if (disabledOnly && file.disabled !== true) return false;
        if (problemOnly && !getProblemMessage(file)) return false;
        if (
          errorTypeFilter !== 'all' &&
          classifyAuthFileErrorType(getProblemMessage(file)) !== errorTypeFilter
        ) {
          return false;
        }
        if (
          codexPlanFilter !== 'all' &&
          (!isCodexFile(file) ||
            !matchesCodexPlanFilterValue(file, codexPlanFilter, codexQuota[file.name]?.planType))
        ) {
          return false;
        }
        return true;
      }),
    [
      codexPlanFilter,
      codexQuota,
      disabledOnly,
      enabledOnly,
      errorTypeFilter,
      files,
      getProblemMessage,
      problemOnly,
    ]
  );

  const statusFilterOptions = useMemo(
    () =>
      [
        { value: 'all', label: t('auth_files.problem_filter_all') },
        { value: 'enabled', label: t('auth_files.problem_filter_enabled') },
        { value: 'disabled', label: t('auth_files.problem_filter_disabled') },
        { value: 'problem', label: t('auth_files.problem_filter_problem') },
      ] satisfies Array<{ value: AuthFilesStatusFilterMode; label: string }>,
    [t]
  );

  const sortOptions = useMemo(
    () => [
      { value: 'default', label: t('auth_files.sort_default') },
      { value: 'az', label: t('auth_files.sort_az') },
      { value: 'import_desc', label: t('auth_files.sort_import_desc') },
      { value: 'import_asc', label: t('auth_files.sort_import_asc') },
      { value: 'priority_desc', label: t('auth_files.sort_priority_desc') },
      { value: 'priority_asc', label: t('auth_files.sort_priority_asc') },
    ],
    [t]
  );

  const errorTypeOptions = useMemo(
    () =>
      ['all', 'usage_limit', 'authentication_error', 'deactivated_workspace', 'other'].map(
        (value) => ({ value, label: t(`auth_files.error_type_filter_${value}`) })
      ),
    [t]
  );
  const successCountOptions = useMemo(
    () =>
      ['all', 'positive', 'zero'].map((value) => ({
        value,
        label: t(`auth_files.success_count_filter_${value}`),
      })),
    [t]
  );
  const codexPlanOptions = useMemo(
    () =>
      [
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
      ].map((value) => ({ value, label: t(`auth_files.codex_plan_filter_${value}`) })),
    [t]
  );

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: filesMatchingStatusFilters.length };
    filesMatchingStatusFilters.forEach((file) => {
      const type = normalizeProviderKey(String(file.type ?? file.provider ?? ''));
      if (!type) return;
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [filesMatchingStatusFilters]);

  const normalizedSearch = search.trim();
  const wildcardSearch = useMemo(() => buildWildcardSearch(normalizedSearch), [normalizedSearch]);

  const filtered = useMemo(() => {
    const searchMatched = filesMatchingStatusFilters.filter((item) => {
      const type = normalizeProviderKey(String(item.type ?? item.provider ?? ''));
      const matchType = normalizedFilter === 'all' || type === normalizedFilter;
      return matchType && matchesAuthFileSearch(item, normalizedSearch, wildcardSearch);
    });
    return filterAuthFilesBySuccessCount(searchMatched, successCountFilter);
  }, [
    filesMatchingStatusFilters,
    normalizedFilter,
    normalizedSearch,
    successCountFilter,
    wildcardSearch,
  ]);

  const hasActiveDeleteFilters =
    normalizedFilter !== 'all' ||
    statusFilterMode !== 'all' ||
    errorTypeFilter !== 'all' ||
    successCountFilter !== 'all' ||
    codexPlanFilter !== 'all' ||
    normalizedSearch.length > 0;
  const filteredDeleteTargetNames = useMemo(
    () =>
      resolveAuthFileDeleteTargets(
        filtered,
        filtered.map((file) => file.name)
      ),
    [filtered]
  );

  const sorted = useMemo(() => sortAuthFiles(filtered, sortMode), [filtered, sortMode]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = useMemo(() => sorted.slice(start, start + pageSize), [pageSize, sorted, start]);
  const displayPageItems = useMemo(
    () =>
      pageItems.map((file) => {
        const quotaIssue = quotaIssueByName[file.name];
        return quotaIssue && !resolveAuthFileProblemMessage(file)
          ? { ...file, status_message: quotaIssue }
          : file;
      }),
    [pageItems, quotaIssueByName]
  );
  const selectablePageItems = useMemo(
    () => pageItems.filter((file) => !isRuntimeOnlyAuthFile(file)),
    [pageItems]
  );
  const selectedPageNames = useMemo(
    () =>
      selectablePageItems.filter((file) => selectedFiles.has(file.name)).map((file) => file.name),
    [selectablePageItems, selectedFiles]
  );
  const selectedHasStatusUpdating = useMemo(
    () => selectedPageNames.some((name) => statusUpdating[name] === true),
    [selectedPageNames, statusUpdating]
  );
  const batchStatusButtonsDisabled =
    disableControls ||
    selectedPageNames.length === 0 ||
    batchStatusUpdating ||
    selectedHasStatusUpdating;

  const confirmBatchStatus = useCallback(
    (enabled: boolean) => {
      const targetNames = getManualRefreshSafeStatusTargetNames(
        pageItems.filter((file) => selectedFiles.has(file.name)),
        manualRefreshing,
        !enabled
      );
      if (targetNames.length === 0) return;
      const scope = t('auth_files.scope_selected_page_items');
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
          { count: targetNames.length, scope }
        ),
        confirmText: t(
          enabled
            ? 'auth_files.batch_enable_confirm_button'
            : 'auth_files.batch_disable_confirm_button'
        ),
        variant: enabled ? 'primary' : 'danger',
        onConfirm: () => batchSetStatus(targetNames, enabled),
      });
    },
    [batchSetStatus, manualRefreshing, pageItems, selectedFiles, showConfirmation, t]
  );

  /* ---------- Header telemetry ---------- */

  const activeCount = useMemo(() => files.filter((file) => file.disabled !== true).length, [files]);
  const problemCount = useMemo(
    () => files.filter((file) => file.disabled !== true && Boolean(getProblemMessage(file))).length,
    [files, getProblemMessage]
  );

  /* ---------- One-time first-paint card entrance ---------- */

  const [cardsAnimated, setCardsAnimated] = useState(false);
  const enableCardEntrance = !cardsAnimated && isCurrentLayer && !loading && pageItems.length > 0;
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

  /* ---------- Miscellaneous ---------- */

  const copyTextWithNotification = useCallback(
    async (text: string) => {
      const copied = await copyToClipboard(text);
      showNotification(
        copied
          ? t('notification.link_copied', { defaultValue: 'Copied to clipboard' })
          : t('notification.copy_failed', { defaultValue: 'Copy failed' }),
        copied ? 'success' : 'error'
      );
    },
    [showNotification, t]
  );

  const openExcludedEditor = useCallback(
    (provider?: string) => {
      const providerValue = (provider || (filter !== 'all' ? String(filter) : '')).trim();
      const params = new URLSearchParams();
      if (providerValue) {
        params.set('provider', providerValue);
      }
      const nextSearch = params.toString();
      navigate(`/auth-files/oauth-excluded${nextSearch ? `?${nextSearch}` : ''}`, {
        state: { fromAuthFiles: true },
      });
    },
    [filter, navigate]
  );

  const openModelAliasEditor = useCallback(
    (provider?: string) => {
      const providerValue = (provider || (filter !== 'all' ? String(filter) : '')).trim();
      const params = new URLSearchParams();
      if (providerValue) {
        params.set('provider', providerValue);
      }
      const nextSearch = params.toString();
      navigate(`/auth-files/oauth-model-alias${nextSearch ? `?${nextSearch}` : ''}`, {
        state: { fromAuthFiles: true },
      });
    },
    [filter, navigate]
  );

  const clearFilters = useCallback(() => {
    setFilter('all');
    setStatusFilterMode('all');
    setErrorTypeFilter('all');
    setSuccessCountFilter('all');
    setCodexPlanFilter('all');
    setSearch('');
    setPage(1);
  }, []);

  const deleteAllButtonLabel = (() => {
    if (
      normalizedSearch.length > 0 ||
      errorTypeFilter !== 'all' ||
      successCountFilter !== 'all' ||
      codexPlanFilter !== 'all'
    ) {
      return t('auth_files.delete_filtered_result_button');
    }
    if (enabledOnly || disabledOnly) {
      return t('auth_files.delete_filtered_result_button');
    }
    if (problemOnly) {
      return normalizedFilter === 'all'
        ? t('auth_files.delete_problem_button')
        : t('auth_files.delete_problem_button_with_type', {
            type: getTypeLabel(t, normalizedFilter),
          });
    }
    return normalizedFilter === 'all'
      ? t('auth_files.delete_all_button')
      : `${t('common.delete')} ${getTypeLabel(t, normalizedFilter)}`;
  })();

  const oauthSectionRef = useRevealOnScroll<HTMLDivElement>();

  const isFirstRunEmpty = !loading && files.length === 0 && !error;
  const isNoResults = !loading && files.length > 0 && pageItems.length === 0;

  const gridClasses = [
    styles.grid,
    compactMode ? styles.gridCompact : '',
    showQuotaDetails ? styles.gridQuota : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.page}>
      <VaultHeader
        totalCount={files.length}
        activeCount={activeCount}
        problemCount={problemCount}
        loading={loading}
        refreshing={refreshing}
        uploading={uploading}
        disableControls={disableControls}
        onUpload={handleUploadClick}
        onRefresh={() => void handleHeaderRefresh()}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <VaultPulse files={files} statusBarCache={statusBarCache} />

      <section className={styles.workbench} aria-label={t('auth_files.title_section')}>
        <ProviderTabs
          types={existingTypes}
          counts={typeCounts}
          active={normalizedFilter}
          resolvedTheme={resolvedTheme}
          onChange={(type) => {
            setFilter(type);
            setPage(1);
          }}
        />

        <AuthFilesToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          statusFilterMode={statusFilterMode}
          statusFilterOptions={statusFilterOptions}
          onStatusFilterChange={handleStatusFilterModeChange}
          sortMode={sortMode}
          sortOptions={sortOptions}
          onSortModeChange={handleSortModeChange}
          pageSizeInput={pageSizeInput}
          onPageSizeInputChange={handlePageSizeChange}
          onPageSizeCommit={commitPageSizeInput}
          compactMode={compactMode}
          onCompactModeChange={setCompactMode}
          showQuotaDetails={showQuotaDetails}
          onShowQuotaDetailsChange={setShowQuotaDetails}
          deleteLabel={deleteAllButtonLabel}
          deleteDisabled={
            disableControls ||
            loading ||
            deletingAll ||
            (hasActiveDeleteFilters ? filteredDeleteTargetNames.length === 0 : files.length === 0)
          }
          deleteLoading={deletingAll}
          onDelete={() =>
            handleDeleteAll({
              filter,
              problemOnly,
              disabledOnly,
              enabledOnly,
              targetNames: hasActiveDeleteFilters ? filteredDeleteTargetNames : undefined,
              onResetFilterToAll: () => setFilter('all'),
              onResetProblemOnly: () => setStatusFilterMode('all'),
              onResetDisabledOnly: () => setStatusFilterMode('all'),
              onResetEnabledOnly: () => setStatusFilterMode('all'),
            })
          }
        />

        <div className={styles.advancedFilters}>
          <Select
            value={errorTypeFilter}
            options={errorTypeOptions}
            onChange={(value) => {
              if (isAuthFilesErrorTypeFilter(value)) setErrorTypeFilter(value);
              setPage(1);
            }}
            ariaLabel={t('auth_files.error_type_filter_label')}
            size="sm"
          />
          <Select
            value={successCountFilter}
            options={successCountOptions}
            onChange={(value) => {
              if (isAuthFilesSuccessCountFilter(value)) setSuccessCountFilter(value);
              setPage(1);
            }}
            ariaLabel={t('auth_files.success_count_filter_label')}
            size="sm"
          />
          <Select
            value={codexPlanFilter}
            options={codexPlanOptions}
            onChange={(value) => {
              if (isAuthFilesCodexPlanFilter(value)) setCodexPlanFilter(value);
              setPage(1);
            }}
            ariaLabel={t('auth_files.codex_plan_filter_label')}
            size="sm"
          />
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className={gridClasses} aria-hidden="true">
            {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
              <Skeleton key={index} height={206} rounded={14} />
            ))}
          </div>
        ) : isFirstRunEmpty ? (
          <EmptyState
            title={t('auth_files.empty_title')}
            description={t('auth_files.empty_desc')}
            action={
              <div className={styles.emptyActions}>
                <Button
                  size="sm"
                  onClick={handleUploadClick}
                  disabled={disableControls || uploading}
                >
                  {t('auth_files.upload_button')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/oauth')}>
                  {t('auth_files.empty_oauth_link')}
                </Button>
              </div>
            }
          />
        ) : isNoResults ? (
          <EmptyState
            title={t('auth_files.search_empty_title')}
            description={t('auth_files.search_empty_desc')}
            action={
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                {t('auth_files.no_results_clear')}
              </Button>
            }
          />
        ) : (
          <div className={gridClasses}>
            {displayPageItems.map((file, index) => (
              <AuthFileCard
                key={file.name}
                file={file}
                compact={compactMode}
                selected={selectedFiles.has(file.name)}
                resolvedTheme={resolvedTheme}
                disableControls={disableControls}
                deleting={deleting}
                statusUpdating={statusUpdating}
                manualRefreshing={manualRefreshing}
                showQuotaDetails={showQuotaDetails}
                statusBarCache={statusBarCache}
                entranceDelayMs={cardEntranceDelay(index)}
                onShowModels={showModels}
                onDownload={handleDownload}
                onManualRefresh={handleManualRefresh}
                onOpenPrefixProxyEditor={openPrefixProxyEditor}
                onDelete={handleDelete}
                onToggleStatus={handleStatusToggle}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        )}

        {!loading && sorted.length > pageSize && (
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
                count: sorted.length,
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
      </section>

      <AuthFilesImportOptionsModal
        open={importOptionsOpen}
        uploading={uploading}
        disableControls={disableControls}
        onClose={handleImportOptionsClose}
        onSelectFiles={handleImportFileSelect}
      />

      <div className={styles.configGrid} ref={oauthSectionRef}>
        <OAuthExcludedCard
          disableControls={disableControls}
          excludedError={excludedError}
          excluded={excluded}
          onRetry={loadExcluded}
          onAdd={() => openExcludedEditor()}
          onEdit={openExcludedEditor}
          onDelete={deleteExcluded}
        />

        <OAuthModelAliasCard
          disableControls={disableControls}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onRetry={loadModelAlias}
          onAdd={() => openModelAliasEditor()}
          onEditProvider={openModelAliasEditor}
          onDeleteProvider={deleteModelAlias}
          modelAliasError={modelAliasError}
          modelAlias={modelAlias}
          allProviderModels={allProviderModels}
          onUpdate={handleMappingUpdate}
          onDeleteLink={handleDeleteLink}
          onToggleFork={handleToggleFork}
          onRenameAlias={handleRenameAlias}
          onDeleteAlias={handleDeleteAlias}
        />
      </div>

      <AuthFileModelsModal
        open={modelsModalOpen}
        fileName={modelsFileName}
        fileType={modelsFileType}
        loading={modelsLoading}
        error={modelsError}
        models={modelsList}
        excluded={excluded}
        onClose={closeModelsModal}
        onCopyText={copyTextWithNotification}
      />

      <AuthFileDetailsSheet
        disableControls={disableControls}
        editor={prefixProxyEditor}
        updatedText={prefixProxyUpdatedText}
        dirty={prefixProxyDirty}
        onClose={closePrefixProxyEditor}
        onCopyText={copyTextWithNotification}
        onSave={handlePrefixProxySave}
        onChange={handlePrefixProxyChange}
      />

      <BatchActionBar
        selectionCount={selectedPageNames.length}
        selectablePageCount={selectablePageItems.length}
        disableControls={disableControls}
        batchStatusDisabled={batchStatusButtonsDisabled}
        onSelectPage={() => selectAllVisible(pageItems)}
        onInvertPage={() => invertVisibleSelection(pageItems)}
        onDeselectAll={deselectAll}
        onDownload={() => void batchDownload(selectedPageNames)}
        onEnable={() => confirmBatchStatus(true)}
        onDisable={() => confirmBatchStatus(false)}
        onDelete={() =>
          batchDelete(selectedPageNames, {
            title: t('auth_files.batch_delete_filtered_title'),
            message: t('auth_files.batch_delete_scope_confirm_message', {
              count: selectedPageNames.length,
              scope: t('auth_files.scope_selected_page_items'),
            }),
            confirmText: t('auth_files.batch_delete_confirm_button'),
          })
        }
      />
    </div>
  );
}
