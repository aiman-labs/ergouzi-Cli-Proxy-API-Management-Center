export const AUTH_FILES_SORT_MODES = [
  'default',
  'az',
  'import_desc',
  'import_asc',
  'priority_desc',
  'priority_asc',
] as const;
export const AUTH_FILES_HEALTH_FILTERS = ['all', 'normal', 'problem'] as const;
export const AUTH_FILES_ENABLED_FILTERS = ['all', 'enabled', 'disabled'] as const;
export const AUTH_FILES_ERROR_TYPE_FILTERS = [
  'all',
  'usage_limit',
  'authentication_error',
  'deactivated_workspace',
  'other',
] as const;
export const AUTH_FILES_SUCCESS_COUNT_FILTERS = ['all', 'positive', 'zero'] as const;
export const AUTH_FILES_CODEX_PLAN_FILTERS = [
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
] as const;
export const AUTH_FILES_STATUS_FILTER_MODES = ['all', 'enabled', 'disabled', 'problem'] as const;

export type AuthFilesSortMode = (typeof AUTH_FILES_SORT_MODES)[number];
export type AuthFilesHealthFilter = (typeof AUTH_FILES_HEALTH_FILTERS)[number];
export type AuthFilesEnabledFilter = (typeof AUTH_FILES_ENABLED_FILTERS)[number];
export type AuthFilesErrorTypeFilter = (typeof AUTH_FILES_ERROR_TYPE_FILTERS)[number];
export type AuthFilesSuccessCountFilter = (typeof AUTH_FILES_SUCCESS_COUNT_FILTERS)[number];
export type AuthFilesCodexPlanFilter = (typeof AUTH_FILES_CODEX_PLAN_FILTERS)[number];
export type AuthFilesStatusFilterMode = (typeof AUTH_FILES_STATUS_FILTER_MODES)[number];

export type AuthFilesUiState = {
  filter?: string;
  problemOnly?: boolean;
  disabledOnly?: boolean;
  statusFilterMode?: AuthFilesStatusFilterMode;
  healthFilter?: AuthFilesHealthFilter;
  enabledFilter?: AuthFilesEnabledFilter;
  errorTypeFilter?: AuthFilesErrorTypeFilter;
  successCountFilter?: AuthFilesSuccessCountFilter;
  codexPlanFilter?: AuthFilesCodexPlanFilter;
  compactMode?: boolean;
  showQuotaDetails?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
  regularPageSize?: number;
  compactPageSize?: number;
  sortMode?: AuthFilesSortMode;
};

const AUTH_FILES_UI_STATE_KEY = 'authFilesPage.uiState';
const AUTH_FILES_COMPACT_MODE_KEY = 'authFilesPage.compactMode';
const AUTH_FILES_SORT_MODE_SET = new Set<AuthFilesSortMode>(AUTH_FILES_SORT_MODES);
const AUTH_FILES_HEALTH_FILTER_SET = new Set<AuthFilesHealthFilter>(AUTH_FILES_HEALTH_FILTERS);
const AUTH_FILES_ENABLED_FILTER_SET = new Set<AuthFilesEnabledFilter>(AUTH_FILES_ENABLED_FILTERS);
const AUTH_FILES_ERROR_TYPE_FILTER_SET = new Set<AuthFilesErrorTypeFilter>(
  AUTH_FILES_ERROR_TYPE_FILTERS
);
const AUTH_FILES_SUCCESS_COUNT_FILTER_SET = new Set<AuthFilesSuccessCountFilter>(
  AUTH_FILES_SUCCESS_COUNT_FILTERS
);
const AUTH_FILES_CODEX_PLAN_FILTER_SET = new Set<AuthFilesCodexPlanFilter>(
  AUTH_FILES_CODEX_PLAN_FILTERS
);
const AUTH_FILES_STATUS_FILTER_MODE_SET = new Set<AuthFilesStatusFilterMode>(
  AUTH_FILES_STATUS_FILTER_MODES
);

export const isAuthFilesSortMode = (value: unknown): value is AuthFilesSortMode =>
  typeof value === 'string' && AUTH_FILES_SORT_MODE_SET.has(value as AuthFilesSortMode);

export const normalizeAuthFilesSortMode = (value: unknown): AuthFilesSortMode | null => {
  if (isAuthFilesSortMode(value)) return value;
  if (value === 'priority') return 'priority_desc';
  return null;
};

export const isAuthFilesHealthFilter = (value: unknown): value is AuthFilesHealthFilter =>
  typeof value === 'string' && AUTH_FILES_HEALTH_FILTER_SET.has(value as AuthFilesHealthFilter);

export const isAuthFilesEnabledFilter = (value: unknown): value is AuthFilesEnabledFilter =>
  typeof value === 'string' && AUTH_FILES_ENABLED_FILTER_SET.has(value as AuthFilesEnabledFilter);

export const isAuthFilesErrorTypeFilter = (value: unknown): value is AuthFilesErrorTypeFilter =>
  typeof value === 'string' &&
  AUTH_FILES_ERROR_TYPE_FILTER_SET.has(value as AuthFilesErrorTypeFilter);

export const isAuthFilesSuccessCountFilter = (
  value: unknown
): value is AuthFilesSuccessCountFilter =>
  typeof value === 'string' &&
  AUTH_FILES_SUCCESS_COUNT_FILTER_SET.has(value as AuthFilesSuccessCountFilter);

export const isAuthFilesCodexPlanFilter = (value: unknown): value is AuthFilesCodexPlanFilter =>
  typeof value === 'string' &&
  AUTH_FILES_CODEX_PLAN_FILTER_SET.has(value as AuthFilesCodexPlanFilter);

export const isAuthFilesStatusFilterMode = (value: unknown): value is AuthFilesStatusFilterMode =>
  typeof value === 'string' &&
  AUTH_FILES_STATUS_FILTER_MODE_SET.has(value as AuthFilesStatusFilterMode);

export const resolveAuthFilesFilterState = (
  state: AuthFilesUiState
): { healthFilter: AuthFilesHealthFilter; enabledFilter: AuthFilesEnabledFilter } => {
  const legacyMode = state.statusFilterMode as unknown;
  const healthFilter = isAuthFilesHealthFilter(state.healthFilter)
    ? state.healthFilter
    : legacyMode === 'problem' || legacyMode === 'disabledProblem' || state.problemOnly === true
      ? 'problem'
      : 'all';
  const enabledFilter = isAuthFilesEnabledFilter(state.enabledFilter)
    ? state.enabledFilter
    : legacyMode === 'enabled'
      ? 'enabled'
      : legacyMode === 'disabled' || state.disabledOnly === true
        ? 'disabled'
        : 'all';
  return { healthFilter, enabledFilter };
};

const readAuthFilesUiStateFromStorage = (
  storage: Pick<Storage, 'getItem'> | null | undefined
): AuthFilesUiState | null => {
  if (!storage) return null;
  const raw = storage.getItem(AUTH_FILES_UI_STATE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as AuthFilesUiState;
  return parsed && typeof parsed === 'object' ? parsed : null;
};

export const readAuthFilesUiState = (): AuthFilesUiState | null => {
  if (typeof window === 'undefined') return null;
  try {
    return (
      readAuthFilesUiStateFromStorage(window.localStorage) ??
      readAuthFilesUiStateFromStorage(window.sessionStorage)
    );
  } catch {
    return null;
  }
};

export const writeAuthFilesUiState = (state: AuthFilesUiState) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUTH_FILES_UI_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  try {
    window.sessionStorage.removeItem(AUTH_FILES_UI_STATE_KEY);
  } catch {
    // ignore
  }
};

export const readPersistedAuthFilesCompactMode = (): boolean | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_FILES_COMPACT_MODE_KEY);
    if (raw === null) return null;
    return JSON.parse(raw) === true;
  } catch {
    return null;
  }
};

export const writePersistedAuthFilesCompactMode = (compactMode: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUTH_FILES_COMPACT_MODE_KEY, JSON.stringify(compactMode));
  } catch {
    // ignore
  }
};
