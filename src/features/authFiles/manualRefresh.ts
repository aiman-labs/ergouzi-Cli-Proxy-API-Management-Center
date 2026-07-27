import type { AuthFileItem } from '@/types';

export const MANUAL_REFRESH_POLL_INTERVAL_MS = 750;
export const MANUAL_REFRESH_POLL_ATTEMPTS = 20;

export const getManualRefreshSnapshot = (file: AuthFileItem): string =>
  JSON.stringify([
    file['last_refresh'] ?? file.lastRefresh ?? null,
    file.status ?? null,
    file['status_message'] ?? file.statusMessage ?? null,
    file.unavailable ?? null,
  ]);

export const mergeManualRefreshResult = (
  currentFiles: AuthFileItem[],
  refreshedFiles: AuthFileItem[],
  targetName: string
): AuthFileItem[] => {
  const refreshedTarget = refreshedFiles.find((file) => file.name === targetName);
  if (!refreshedTarget || !currentFiles.some((file) => file.name === targetName)) {
    return currentFiles;
  }

  return currentFiles.map((file) => (file.name === targetName ? refreshedTarget : file));
};
