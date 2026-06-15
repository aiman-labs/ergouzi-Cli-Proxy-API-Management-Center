import {
  useCallback,
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { animate } from 'motion/mini';
import type { AnimationPlaybackControlsWithThen } from 'motion-dom';
import { useInterval } from '@/hooks/useInterval';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { useActionBarHeightVar } from '@/hooks/useActionBarHeightVar';
import { usePageTransitionLayer } from '@/components/common/PageTransitionLayer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { IconFilterAll, IconSearch } from '@/components/ui/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { copyToClipboard } from '@/utils/clipboard';
import {
  MAX_CARD_PAGE_SIZE,
  MIN_CARD_PAGE_SIZE,
  QUOTA_PROVIDER_TYPES,
  clampCardPageSize,
  getAuthFileIcon,
  getAuthFileStatusMessage,
  getTypeColor,
  getTypeLabel,
  isRuntimeOnlyAuthFile,
  normalizeProviderKey,
  parsePriorityValue,
  type QuotaProviderType,
  type ResolvedTheme,
} from '@/features/authFiles/constants';
import { AuthFileCard } from '@/features/authFiles/components/AuthFileCard';
import { AuthFileModelsModal } from '@/features/authFiles/components/AuthFileModelsModal';
import { AuthFilesPrefixProxyEditorModal } from '@/features/authFiles/components/AuthFilesPrefixProxyEditorModal';
import { OAuthExcludedCard } from '@/features/authFiles/components/OAuthExcludedCard';
import { OAuthModelAliasCard } from '@/features/authFiles/components/OAuthModelAliasCard';
import { useAuthFilesData } from '@/features/authFiles/hooks/useAuthFilesData';
import { useAuthFilesModels } from '@/features/authFiles/hooks/useAuthFilesModels';
import { useAuthFilesOauth } from '@/features/authFiles/hooks/useAuthFilesOauth';
import { useAuthFilesPrefixProxyEditor } from '@/features/authFiles/hooks/useAuthFilesPrefixProxyEditor';
import { useAuthFilesStatusBarCache } from '@/features/authFiles/hooks/useAuthFilesStatusBarCache';
import {
  isAuthFilesEnabledFilter,
  isAuthFilesHealthFilter,
  isAuthFilesSortMode,
  readAuthFilesUiState,
  readPersistedAuthFilesCompactMode,
  writeAuthFilesUiState,
  writePersistedAuthFilesCompactMode,
  type AuthFilesEnabledFilter,
  type AuthFilesHealthFilter,
  type AuthFilesSortMode,
} from '@/features/authFiles/uiState';
import { useAuthStore, useNotificationStore, useQuotaStore, useThemeStore } from '@/stores';
import type { AuthFileItem } from '@/types/authFile';
import styles from './AuthFilesPage.module.scss';

const easePower3Out = (progress: number) => 1 - (1 - progress) ** 4;
const easePower2In = (progress: number) => progress ** 3;
const BATCH_BAR_BASE_TRANSFORM = 'translateX(-50%)';
const BATCH_BAR_HIDDEN_TRANSFORM = 'translateX(-50%) translateY(56px)';
const DEFAULT_REGULAR_PAGE_SIZE = 9;
const DEFAULT_COMPACT_PAGE_SIZE = 12;

type QuotaIssueState = {
  status?: string;
  error?: string;
  errorStatus?: number;
};

const escapeWildcardSearchSegment = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildWildcardSearch = (value: string): RegExp | null => {
  if (!value.includes('*')) return null;
  const pattern = value.split('*').map(escapeWildcardSearchSegment).join('.*');
  return new RegExp(pattern, 'i');
};

export function AuthFilesPage() {
  const { t } = useTranslation();
  const showNotification = useNotificationStore((state) => state.showNotification);
  const showConfirmation = useNotificationStore((state) => state.showConfirmation);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const resolvedTheme: ResolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const antigravityQuota = useQuotaStore((state) => state.antigravityQuota);
  const claudeQuota = useQuotaStore((state) => state.claudeQuota);
  const codexQuota = useQuotaStore((state) => state.codexQuota);
  const geminiCliQuota = useQuotaStore((state) => state.geminiCliQuota);
  const kimiQuota = useQuotaStore((state) => state.kimiQuota);
  const xaiQuota = useQuotaStore((state) => state.xaiQuota);
  const pageTransitionLayer = usePageTransitionLayer();
  const isCurrentLayer = pageTransitionLayer ? pageTransitionLayer.status === 'current' : true;
  const navigate = useNavigate();

  const [filter, setFilter] = useState<'all' | string>('all');
  const [healthFilter, setHealthFilter] = useState<AuthFilesHealthFilter>('all');
  const [enabledFilter, setEnabledFilter] = useState<AuthFilesEnabledFilter>('all');
  const [compactMode, setCompactMode] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSizeByMode, setPageSizeByMode] = useState({
    regular: DEFAULT_REGULAR_PAGE_SIZE,
    compact: DEFAULT_COMPACT_PAGE_SIZE,
  });
  const [pageSizeInput, setPageSizeInput] = useState('9');
  const [viewMode, setViewMode] = useState<'diagram' | 'list'>('list');
  const [sortMode, setSortMode] = useState<AuthFilesSortMode>('default');
  const [batchActionBarVisible, setBatchActionBarVisible] = useState(false);
  const [uiStateHydrated, setUiStateHydrated] = useState(false);
  const floatingBatchActionsRef = useRef<HTMLDivElement>(null);
  const batchActionAnimationRef = useRef<AnimationPlaybackControlsWithThen | null>(null);
  const previousSelectionCountRef = useRef(0);
  const selectionCountRef = useRef(0);

  const {
    files,
    selectedFiles,
    loading,
    error,
    uploading,
    deleting,
    statusUpdating,
    batchStatusUpdating,
    fileInputRef,
    loadFiles,
    handleUploadClick,
    handleFileChange,
    handleDelete,
    handleDownload,
    handleStatusToggle,
    toggleSelect,
    selectAllVisible,
    invertVisibleSelection,
    deselectAll,
    batchDownload,
    batchSetStatus,
    batchDelete,
  } = useAuthFilesData();

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
    modelsModalOpen,
    modelsLoading,
    modelsList,
    modelsFileName,
    modelsFileType,
    modelsError,
    showModels,
    closeModelsModal,
  } = useAuthFilesModels();

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
  });

  const disableControls = connectionStatus !== 'connected';
  const normalizedFilter = normalizeProviderKey(String(filter));
  const quotaFilterType: QuotaProviderType | null = QUOTA_PROVIDER_TYPES.has(
    normalizedFilter as QuotaProviderType
  )
    ? (normalizedFilter as QuotaProviderType)
    : null;
  const pageSize = compactMode ? pageSizeByMode.compact : pageSizeByMode.regular;

  const quotaIssueByName = useMemo(() => {
    const issues = new Map<string, string>();
    const appendIssues = (quotaMap: Record<string, QuotaIssueState>) => {
      Object.entries(quotaMap).forEach(([name, quotaState]) => {
        if (quotaState.status !== 'error') return;
        const message = String(quotaState.error ?? '').trim();
        const status = quotaState.errorStatus;
        const text = status ? `${status} ${message || t('common.unknown_error')}` : message;
        if (text) {
          issues.set(name, text);
        }
      });
    };

    appendIssues(antigravityQuota);
    appendIssues(claudeQuota);
    appendIssues(codexQuota);
    appendIssues(geminiCliQuota);
    appendIssues(kimiQuota);
    appendIssues(xaiQuota);
    return issues;
  }, [antigravityQuota, claudeQuota, codexQuota, geminiCliQuota, kimiQuota, t, xaiQuota]);

  const getFileProblemMessage = useCallback(
    (file: AuthFileItem) => getAuthFileStatusMessage(file) || quotaIssueByName.get(file.name) || '',
    [quotaIssueByName]
  );

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
      if (isAuthFilesHealthFilter(persisted.healthFilter)) {
        setHealthFilter(persisted.healthFilter);
      } else if (typeof persisted.problemOnly === 'boolean') {
        setHealthFilter(persisted.problemOnly ? 'problem' : 'all');
      }
      if (isAuthFilesEnabledFilter(persisted.enabledFilter)) {
        setEnabledFilter(persisted.enabledFilter);
      } else if (typeof persisted.disabledOnly === 'boolean') {
        setEnabledFilter(persisted.disabledOnly ? 'disabled' : 'all');
      }
      if (typeof persistedCompactMode !== 'boolean' && typeof persisted.compactMode === 'boolean') {
        setCompactMode(persisted.compactMode);
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
      if (isAuthFilesSortMode(persisted.sortMode)) {
        setSortMode(persisted.sortMode);
      }
    }

    setUiStateHydrated(true);
  }, []);

  useEffect(() => {
    if (!uiStateHydrated) return;

    writeAuthFilesUiState({
      filter,
      healthFilter,
      enabledFilter,
      compactMode,
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
    enabledFilter,
    filter,
    healthFilter,
    page,
    pageSize,
    pageSizeByMode,
    search,
    sortMode,
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

  const commitPageSizeInput = (rawValue: string) => {
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
  };

  const handlePageSizeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.currentTarget.value;
    setPageSizeInput(rawValue);

    const trimmed = rawValue.trim();
    if (!trimmed) return;

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return;

    const rounded = Math.round(parsed);
    if (rounded < MIN_CARD_PAGE_SIZE || rounded > MAX_CARD_PAGE_SIZE) return;

    setCurrentModePageSize(rounded);
    setPage(1);
  };

  const handleSortModeChange = useCallback(
    (value: string) => {
      if (!isAuthFilesSortMode(value) || value === sortMode) return;
      setSortMode(value);
      setPage(1);
    },
    [sortMode]
  );

  const handleHeaderRefresh = useCallback(async () => {
    await Promise.all([loadFiles(), loadExcluded(), loadModelAlias()]);
  }, [loadFiles, loadExcluded, loadModelAlias]);

  useHeaderRefresh(handleHeaderRefresh);

  useEffect(() => {
    if (!isCurrentLayer) return;
    loadFiles();
    loadExcluded();
    loadModelAlias();
  }, [isCurrentLayer, loadFiles, loadExcluded, loadModelAlias]);

  useInterval(
    () => {
      void loadFiles().catch(() => {});
    },
    isCurrentLayer ? 240_000 : null
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
        const hasProblem = Boolean(getFileProblemMessage(file));
        if (healthFilter === 'problem' && !hasProblem) return false;
        if (healthFilter === 'normal' && hasProblem) return false;
        if (enabledFilter === 'disabled' && file.disabled !== true) return false;
        if (enabledFilter === 'enabled' && file.disabled === true) return false;
        return true;
      }),
    [enabledFilter, files, getFileProblemMessage, healthFilter]
  );

  const sortOptions = useMemo(
    () => [
      { value: 'default', label: t('auth_files.sort_default') },
      { value: 'az', label: t('auth_files.sort_az') },
      { value: 'priority', label: t('auth_files.sort_priority') },
    ],
    [t]
  );
  const healthFilterOptions = useMemo(
    () => [
      { value: 'all', label: t('auth_files.health_filter_all') },
      { value: 'normal', label: t('auth_files.health_filter_normal') },
      { value: 'problem', label: t('auth_files.health_filter_problem') },
    ],
    [t]
  );
  const enabledFilterOptions = useMemo(
    () => [
      { value: 'all', label: t('auth_files.enabled_filter_all') },
      { value: 'enabled', label: t('auth_files.enabled_filter_enabled') },
      { value: 'disabled', label: t('auth_files.enabled_filter_disabled') },
    ],
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
    const normalizedTerm = normalizedSearch.toLowerCase();

    return filesMatchingStatusFilters.filter((item) => {
      const type = normalizeProviderKey(String(item.type ?? item.provider ?? ''));
      const matchType = normalizedFilter === 'all' || type === normalizedFilter;
      const matchSearch =
        !normalizedSearch ||
        [item.name, item.type, item.provider].some((value) => {
          const content = (value || '').toString();
          return wildcardSearch
            ? wildcardSearch.test(content)
            : content.toLowerCase().includes(normalizedTerm);
        });
      return matchType && matchSearch;
    });
  }, [filesMatchingStatusFilters, normalizedFilter, normalizedSearch, wildcardSearch]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sortMode === 'default') {
      copy.sort((a, b) => {
        const providerA = normalizeProviderKey(String(a.provider ?? a.type ?? 'unknown'));
        const providerB = normalizeProviderKey(String(b.provider ?? b.type ?? 'unknown'));
        const providerCompare = providerA.localeCompare(providerB);
        if (providerCompare !== 0) return providerCompare;
        return a.name.localeCompare(b.name);
      });
    } else if (sortMode === 'az') {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'priority') {
      copy.sort((a, b) => {
        const pa = parsePriorityValue(a.priority) ?? 0;
        const pb = parsePriorityValue(b.priority) ?? 0;
        return pb - pa; // 高优先级排前面
      });
    }
    return copy;
  }, [filtered, sortMode]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = sorted.slice(start, start + pageSize);
  const displayPageItems = useMemo(
    () =>
      pageItems.map((file) => {
        if (getAuthFileStatusMessage(file)) return file;
        const quotaIssue = quotaIssueByName.get(file.name);
        if (!quotaIssue) return file;
        return {
          ...file,
          status_message: quotaIssue,
          statusMessage: quotaIssue,
        };
      }),
    [pageItems, quotaIssueByName]
  );
  const selectablePageItems = useMemo(
    () => pageItems.filter((file) => !isRuntimeOnlyAuthFile(file)),
    [pageItems]
  );
  const selectableFilteredItems = useMemo(
    () => sorted.filter((file) => !isRuntimeOnlyAuthFile(file)),
    [sorted]
  );
  const filteredEnableTargetNames = useMemo(
    () => selectableFilteredItems.filter((file) => file.disabled === true).map((file) => file.name),
    [selectableFilteredItems]
  );
  const filteredDisableTargetNames = useMemo(
    () => selectableFilteredItems.filter((file) => file.disabled !== true).map((file) => file.name),
    [selectableFilteredItems]
  );
  const filteredDeleteTargetNames = useMemo(
    () => selectableFilteredItems.map((file) => file.name),
    [selectableFilteredItems]
  );
  const selectedPageItems = useMemo(
    () => selectablePageItems.filter((file) => selectedFiles.has(file.name)),
    [selectablePageItems, selectedFiles]
  );
  const selectedPageNames = useMemo(
    () => selectedPageItems.map((file) => file.name),
    [selectedPageItems]
  );
  const selectedPageEnableTargetNames = useMemo(
    () => selectedPageItems.filter((file) => file.disabled === true).map((file) => file.name),
    [selectedPageItems]
  );
  const selectedPageDisableTargetNames = useMemo(
    () => selectedPageItems.filter((file) => file.disabled !== true).map((file) => file.name),
    [selectedPageItems]
  );
  const selectedPageCount = selectedPageNames.length;
  const selectedPageHasStatusUpdating = useMemo(
    () => selectedPageNames.some((name) => statusUpdating[name] === true),
    [selectedPageNames, statusUpdating]
  );
  const filteredHasStatusUpdating = useMemo(
    () =>
      [...filteredEnableTargetNames, ...filteredDisableTargetNames].some(
        (name) => statusUpdating[name] === true
      ),
    [filteredDisableTargetNames, filteredEnableTargetNames, statusUpdating]
  );
  const batchStatusButtonsDisabled =
    disableControls ||
    selectedPageCount === 0 ||
    batchStatusUpdating ||
    selectedPageHasStatusUpdating;
  const filteredStatusButtonsDisabled =
    disableControls || loading || batchStatusUpdating || filteredHasStatusUpdating;

  const confirmBatchStatus = useCallback(
    (names: string[], enabled: boolean, scopeLabel: string) => {
      const uniqueNames = Array.from(new Set(names));
      if (uniqueNames.length === 0) return;

      showConfirmation({
        title: enabled
          ? t('auth_files.batch_enable_confirm_title')
          : t('auth_files.batch_disable_confirm_title'),
        message: (
          <div className={styles.confirmBody}>
            <p>
              {enabled
                ? t('auth_files.batch_enable_confirm_message', {
                    count: uniqueNames.length,
                    scope: scopeLabel,
                  })
                : t('auth_files.batch_disable_confirm_message', {
                    count: uniqueNames.length,
                    scope: scopeLabel,
                  })}
            </p>
            <p className={styles.confirmMeta}>
              {t('auth_files.batch_scope_confirm_hint', { scope: scopeLabel })}
            </p>
          </div>
        ),
        variant: enabled ? 'primary' : 'danger',
        confirmText: enabled
          ? t('auth_files.batch_enable_confirm_button')
          : t('auth_files.batch_disable_confirm_button'),
        onConfirm: () => {
          void batchSetStatus(uniqueNames, enabled);
        },
      });
    },
    [batchSetStatus, showConfirmation, t]
  );

  const confirmBatchDelete = useCallback(
    (names: string[], scopeLabel: string) => {
      const uniqueNames = Array.from(new Set(names));
      if (uniqueNames.length === 0) return;

      batchDelete(uniqueNames, {
        title: t('auth_files.batch_delete_filtered_title'),
        message: (
          <div className={styles.confirmBody}>
            <p>
              {t('auth_files.batch_delete_scope_confirm_message', {
                count: uniqueNames.length,
                scope: scopeLabel,
              })}
            </p>
            <p className={styles.confirmMeta}>{t('auth_files.batch_delete_confirm_hint')}</p>
          </div>
        ),
        confirmText: t('auth_files.batch_delete_confirm_button'),
      });
    },
    [batchDelete, t]
  );

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

  useActionBarHeightVar(
    floatingBatchActionsRef,
    '--auth-files-action-bar-height',
    batchActionBarVisible
  );

  useEffect(() => {
    selectionCountRef.current = selectedPageCount;
    if (selectedPageCount > 0) {
      setBatchActionBarVisible(true);
    }
  }, [selectedPageCount]);

  useLayoutEffect(() => {
    if (!batchActionBarVisible) return;
    const currentCount = selectedPageCount;
    const previousCount = previousSelectionCountRef.current;
    const actionsEl = floatingBatchActionsRef.current;
    if (!actionsEl) return;

    batchActionAnimationRef.current?.stop();
    batchActionAnimationRef.current = null;

    if (currentCount > 0 && previousCount === 0) {
      batchActionAnimationRef.current = animate(
        actionsEl,
        {
          transform: [BATCH_BAR_HIDDEN_TRANSFORM, BATCH_BAR_BASE_TRANSFORM],
          opacity: [0, 1],
        },
        {
          duration: 0.28,
          ease: easePower3Out,
          onComplete: () => {
            actionsEl.style.transform = BATCH_BAR_BASE_TRANSFORM;
            actionsEl.style.opacity = '1';
          },
        }
      );
    } else if (currentCount === 0 && previousCount > 0) {
      batchActionAnimationRef.current = animate(
        actionsEl,
        {
          transform: [BATCH_BAR_BASE_TRANSFORM, BATCH_BAR_HIDDEN_TRANSFORM],
          opacity: [1, 0],
        },
        {
          duration: 0.22,
          ease: easePower2In,
          onComplete: () => {
            if (selectionCountRef.current === 0) {
              setBatchActionBarVisible(false);
            }
          },
        }
      );
    }

    previousSelectionCountRef.current = currentCount;
  }, [batchActionBarVisible, selectedPageCount]);

  useEffect(
    () => () => {
      batchActionAnimationRef.current?.stop();
      batchActionAnimationRef.current = null;
    },
    []
  );

  const renderFilterTags = () => (
    <div className={styles.filterRail}>
      <div className={styles.filterTags}>
        {existingTypes.map((type) => {
          const isActive = normalizedFilter === type;
          const iconSrc = getAuthFileIcon(type, resolvedTheme);
          const color =
            type === 'all'
              ? { bg: 'var(--primary-color)', text: 'var(--primary-color)' }
              : getTypeColor(type, resolvedTheme);
          const buttonStyle = {
            '--filter-color': color.text,
            '--filter-surface': color.bg,
            '--filter-active-text': resolvedTheme === 'dark' ? '#111827' : '#ffffff',
          } as CSSProperties;

          return (
            <button
              key={type}
              className={`${styles.filterTag} ${isActive ? styles.filterTagActive : ''}`}
              style={buttonStyle}
              onClick={() => {
                setFilter(type);
                setPage(1);
              }}
            >
              <span className={styles.filterTagLabel}>
                {type === 'all' ? (
                  <span className={`${styles.filterTagIconWrap} ${styles.filterAllIconWrap}`}>
                    <IconFilterAll className={styles.filterAllIcon} size={16} />
                  </span>
                ) : (
                  <span className={styles.filterTagIconWrap}>
                    {iconSrc ? (
                      <img src={iconSrc} alt="" className={styles.filterTagIcon} />
                    ) : (
                      <span className={styles.filterTagIconFallback}>
                        {getTypeLabel(t, type).slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </span>
                )}
                <span className={styles.filterTagText}>{getTypeLabel(t, type)}</span>
              </span>
              <span className={styles.filterTagCount}>{typeCounts[type] ?? 0}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const titleNode = (
    <div className={styles.titleWrapper}>
      <span>{t('auth_files.title_section')}</span>
      {files.length > 0 && <span className={styles.countBadge}>{files.length}</span>}
    </div>
  );

  const filteredScopeLabel = t('auth_files.scope_filtered_result');
  const selectedPageScopeLabel = t('auth_files.scope_selected_page_items');

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('auth_files.title')}</h1>
        <p className={styles.description}>{t('auth_files.description')}</p>
      </div>

      <Card
        title={titleNode}
        extra={
          <div className={styles.headerActions}>
            <Button variant="secondary" size="sm" onClick={handleHeaderRefresh} disabled={loading}>
              {t('common.refresh')}
            </Button>
            <Button
              size="sm"
              onClick={handleUploadClick}
              disabled={disableControls || uploading}
              loading={uploading}
            >
              {t('auth_files.upload_button')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
        }
      >
        {error && <div className={styles.errorBox}>{error}</div>}

        <div className={styles.filterSection}>
          {renderFilterTags()}

          <div className={styles.filterContent}>
            <div className={styles.filterControlsPanel}>
              <div className={styles.filterControls}>
                <div className={`${styles.filterItem} ${styles.filterSearchItem}`}>
                  <label>{t('auth_files.search_label')}</label>
                  <Input
                    className={styles.searchInput}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder={t('auth_files.search_placeholder')}
                    rightElement={<IconSearch className={styles.searchIcon} size={18} />}
                  />
                </div>
                <div className={styles.filterItem}>
                  <label>{t('auth_files.page_size_label')}</label>
                  <input
                    className={styles.pageSizeSelect}
                    type="number"
                    min={MIN_CARD_PAGE_SIZE}
                    max={MAX_CARD_PAGE_SIZE}
                    step={1}
                    value={pageSizeInput}
                    onChange={handlePageSizeChange}
                    onBlur={(e) => commitPageSizeInput(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                  />
                </div>
                <div className={styles.filterItem}>
                  <label>{t('auth_files.sort_label')}</label>
                  <Select
                    className={styles.sortSelect}
                    value={sortMode}
                    options={sortOptions}
                    onChange={handleSortModeChange}
                    ariaLabel={t('auth_files.sort_label')}
                    fullWidth
                  />
                </div>
                <div className={styles.filterItem}>
                  <label>{t('auth_files.health_filter_label')}</label>
                  <Select
                    value={healthFilter}
                    options={healthFilterOptions}
                    onChange={(value) => {
                      setHealthFilter(value as AuthFilesHealthFilter);
                      setPage(1);
                    }}
                    ariaLabel={t('auth_files.health_filter_label')}
                    fullWidth
                  />
                </div>
                <div className={styles.filterItem}>
                  <label>{t('auth_files.enabled_filter_label')}</label>
                  <Select
                    value={enabledFilter}
                    options={enabledFilterOptions}
                    onChange={(value) => {
                      setEnabledFilter(value as AuthFilesEnabledFilter);
                      setPage(1);
                    }}
                    ariaLabel={t('auth_files.enabled_filter_label')}
                    fullWidth
                  />
                </div>
                <div className={`${styles.filterItem} ${styles.filterToggleItem}`}>
                  <label>{t('auth_files.display_options_label')}</label>
                  <div className={styles.filterToggleGroup}>
                    <div className={styles.filterToggleCard}>
                      <ToggleSwitch
                        checked={compactMode}
                        onChange={(value) => setCompactMode(value)}
                        ariaLabel={t('auth_files.compact_mode_label')}
                        label={
                          <span className={styles.filterToggleLabel}>
                            {t('auth_files.compact_mode_label')}
                          </span>
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.bulkScopePanel}>
              <div className={`${styles.bulkScopeGroup} ${styles.bulkScopeGroupSelected}`}>
                <div className={styles.bulkScopeInfo}>
                  <span className={styles.bulkScopeTitle}>
                    {t('auth_files.bulk_selected_title')}
                  </span>
                  <span>
                    {t('auth_files.bulk_selected_desc', {
                      selected: selectedPageCount,
                      page: selectablePageItems.length,
                    })}
                  </span>
                </div>
                <div className={styles.bulkScopeActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void batchDownload(selectedPageNames)}
                    disabled={disableControls || selectedPageCount === 0}
                  >
                    {t('auth_files.batch_download_count', { count: selectedPageCount })}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      confirmBatchStatus(
                        selectedPageEnableTargetNames,
                        true,
                        selectedPageScopeLabel
                      )
                    }
                    disabled={
                      batchStatusButtonsDisabled || selectedPageEnableTargetNames.length === 0
                    }
                    loading={batchStatusUpdating && selectedPageEnableTargetNames.length > 0}
                  >
                    {t('auth_files.batch_enable_count', {
                      count: selectedPageEnableTargetNames.length,
                    })}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      confirmBatchStatus(
                        selectedPageDisableTargetNames,
                        false,
                        selectedPageScopeLabel
                      )
                    }
                    disabled={
                      batchStatusButtonsDisabled || selectedPageDisableTargetNames.length === 0
                    }
                    loading={batchStatusUpdating && selectedPageDisableTargetNames.length > 0}
                  >
                    {t('auth_files.batch_disable_count', {
                      count: selectedPageDisableTargetNames.length,
                    })}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => confirmBatchDelete(selectedPageNames, selectedPageScopeLabel)}
                    disabled={disableControls || selectedPageCount === 0}
                  >
                    {t('auth_files.batch_delete_count', { count: selectedPageCount })}
                  </Button>
                </div>
              </div>

              <div className={styles.bulkScopeGroup}>
                <div className={styles.bulkScopeInfo}>
                  <span className={styles.bulkScopeTitle}>
                    {t('auth_files.bulk_filtered_title')}
                  </span>
                  <span>
                    {t('auth_files.bulk_filtered_desc', {
                      count: selectableFilteredItems.length,
                    })}
                  </span>
                </div>
                <div className={styles.bulkScopeActions}>
                  <Button
                    size="sm"
                    onClick={() =>
                      confirmBatchStatus(filteredEnableTargetNames, true, filteredScopeLabel)
                    }
                    disabled={
                      filteredStatusButtonsDisabled || filteredEnableTargetNames.length === 0
                    }
                    loading={batchStatusUpdating && filteredEnableTargetNames.length > 0}
                  >
                    {t('auth_files.batch_enable_filtered_button', {
                      count: filteredEnableTargetNames.length,
                    })}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      confirmBatchStatus(filteredDisableTargetNames, false, filteredScopeLabel)
                    }
                    disabled={
                      filteredStatusButtonsDisabled || filteredDisableTargetNames.length === 0
                    }
                    loading={batchStatusUpdating && filteredDisableTargetNames.length > 0}
                  >
                    {t('auth_files.batch_disable_filtered_button', {
                      count: filteredDisableTargetNames.length,
                    })}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      confirmBatchDelete(filteredDeleteTargetNames, filteredScopeLabel)
                    }
                    disabled={disableControls || loading || filteredDeleteTargetNames.length === 0}
                  >
                    {t('auth_files.delete_filtered_result_button', {
                      count: filteredDeleteTargetNames.length,
                    })}
                  </Button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className={styles.hint}>{t('common.loading')}</div>
            ) : pageItems.length === 0 ? (
              <EmptyState
                title={t('auth_files.search_empty_title')}
                description={t('auth_files.search_empty_desc')}
              />
            ) : (
              <div
                className={`${styles.fileGrid} ${quotaFilterType ? styles.fileGridQuotaManaged : ''} ${compactMode ? styles.fileGridCompact : ''}`}
              >
                {displayPageItems.map((file) => (
                  <AuthFileCard
                    key={file.name}
                    file={file}
                    compact={compactMode}
                    selected={selectedFiles.has(file.name)}
                    resolvedTheme={resolvedTheme}
                    disableControls={disableControls}
                    deleting={deleting}
                    statusUpdating={statusUpdating}
                    quotaFilterType={quotaFilterType}
                    statusBarCache={statusBarCache}
                    onShowModels={showModels}
                    onDownload={handleDownload}
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
          </div>
        </div>
      </Card>

      <OAuthExcludedCard
        disableControls={disableControls}
        excludedError={excludedError}
        excluded={excluded}
        onAdd={() => openExcludedEditor()}
        onEdit={openExcludedEditor}
        onDelete={deleteExcluded}
      />

      <OAuthModelAliasCard
        disableControls={disableControls}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
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

      <AuthFilesPrefixProxyEditorModal
        disableControls={disableControls}
        editor={prefixProxyEditor}
        updatedText={prefixProxyUpdatedText}
        dirty={prefixProxyDirty}
        onClose={closePrefixProxyEditor}
        onCopyText={copyTextWithNotification}
        onSave={handlePrefixProxySave}
        onChange={handlePrefixProxyChange}
      />

      {batchActionBarVisible && typeof document !== 'undefined'
        ? createPortal(
            <div className={styles.batchActionContainer} ref={floatingBatchActionsRef}>
              <div className={styles.batchActionBar}>
                <div className={styles.batchActionLeft}>
                  <span className={styles.batchSelectionText}>
                    {t('auth_files.batch_selected_page', { count: selectedPageCount })}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => selectAllVisible(pageItems)}
                    disabled={selectablePageItems.length === 0}
                  >
                    {t('auth_files.batch_select_page')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => invertVisibleSelection(pageItems)}
                    disabled={selectablePageItems.length === 0}
                  >
                    {t('auth_files.batch_invert_page')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    {t('auth_files.batch_deselect')}
                  </Button>
                </div>
                <div className={styles.batchActionRight}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void batchDownload(selectedPageNames)}
                    disabled={disableControls || selectedPageCount === 0}
                  >
                    {t('auth_files.batch_download_count', { count: selectedPageCount })}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      confirmBatchStatus(
                        selectedPageEnableTargetNames,
                        true,
                        selectedPageScopeLabel
                      )
                    }
                    disabled={
                      batchStatusButtonsDisabled || selectedPageEnableTargetNames.length === 0
                    }
                  >
                    {t('auth_files.batch_enable_count', {
                      count: selectedPageEnableTargetNames.length,
                    })}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      confirmBatchStatus(
                        selectedPageDisableTargetNames,
                        false,
                        selectedPageScopeLabel
                      )
                    }
                    disabled={
                      batchStatusButtonsDisabled || selectedPageDisableTargetNames.length === 0
                    }
                  >
                    {t('auth_files.batch_disable_count', {
                      count: selectedPageDisableTargetNames.length,
                    })}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => confirmBatchDelete(selectedPageNames, selectedPageScopeLabel)}
                    disabled={disableControls || selectedPageCount === 0}
                  >
                    {t('auth_files.batch_delete_count', { count: selectedPageCount })}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
