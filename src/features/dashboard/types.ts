import type { RecentRequestBucket } from '@/utils/recentRequests';

/** Minutes per statistics bucket; backend uses 20 fixed 10-minute buckets. */
export const TRAFFIC_BUCKET_MINUTES = 10;

/** Aggregated traffic window. */
export interface TrafficWindow {
  buckets: RecentRequestBucket[];
  totalSuccess: number;
  totalFailure: number;
  total: number;
  /** 0-100; null when the window has no requests. */
  successRate: number | null;
  /** Maximum requests in one bucket, used by the chart y-axis. */
  peakTotal: number;
  /** Peak bucket index, or -1 when no data exists. */
  peakIndex: number;
  /** Number of buckets containing requests. */
  activeBuckets: number;
  /** Window span in minutes. */
  windowMinutes: number;
}

/** Traffic slice for one provider. */
export interface ProviderTraffic {
  id: string;
  credentials: number;
  success: number;
  failure: number;
  total: number;
  successRate: number | null;
  buckets: RecentRequestBucket[];
}

/** Credential health summary. */
export interface CredentialHealth {
  total: number;
  active: number;
  disabled: number;
  unavailable: number;
  /** Credential counts by provider type, sorted descending. */
  byType: Array<{ type: string; count: number }>;
}

/** Raw values for the top KPI cards. */
export interface DashboardCounts {
  managementKeys: number | null;
  providerKeys: number | null;
  credentials: number | null;
  models: number | null;
}
