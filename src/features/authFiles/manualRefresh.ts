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
