import type { AuthFileItem } from '@/types';

/** Runtime actions must not share pending state across same-name credentials. */
export const getAuthFileRefreshKey = (file: AuthFileItem): string =>
  JSON.stringify([file.name, String(file.authIndex ?? '').trim()]);
export const MANUAL_REFRESH_POLL_INTERVAL_MS = 750;
export const MANUAL_REFRESH_POLL_ATTEMPTS = 20;

export const getManualRefreshSnapshot = (file: AuthFileItem): string =>
  JSON.stringify([
    file['last_refresh'] ?? file.lastRefresh ?? null,
    file.status ?? null,
    file['status_message'] ?? file.statusMessage ?? null,
    file.unavailable ?? null,
  ]);

export const getManualRefreshInventorySnapshot = (
  files: AuthFileItem[],
  displayedFile: AuthFileItem
): string =>
  getManualRefreshSnapshot(
    files.find((file) => getAuthFileRefreshKey(file) === getAuthFileRefreshKey(displayedFile)) ?? displayedFile
  );

export const mergeManualRefreshResult = (
  currentFiles: AuthFileItem[],
  refreshedFiles: AuthFileItem[],
  targetName: string,
  targetKey?: string
): AuthFileItem[] => {
  const matches = (file: AuthFileItem) => file.name === targetName && (!targetKey || getAuthFileRefreshKey(file) === targetKey);
  const refreshedTarget = refreshedFiles.find(matches);
  if (!refreshedTarget || !currentFiles.some(matches)) {
    return currentFiles;
  }

  return currentFiles.map((file) => (matches(file) ? refreshedTarget : file));
};

export const getManualRefreshSafeStatusTargetNames = (
  files: AuthFileItem[],
  manualRefreshing: Record<string, boolean>,
  targetDisabled: boolean
): string[] =>
  files
    .filter(
      (file) =>
        manualRefreshing[getAuthFileRefreshKey(file)] !== true && manualRefreshing[file.name] !== true && (file.disabled === true) === targetDisabled
    )
    .map((file) => file.name);
