import type { ComponentType } from 'react';
import {
  IconCode,
  IconKey,
  IconNetwork,
  IconSatellite,
  IconScrollText,
  IconShield,
  IconSlidersHorizontal,
  IconTimer,
  type IconProps,
} from '@/components/ui/icons';
import type { VisualConfigFieldPath } from '@/types/visualConfig';
import type { VisualSectionId } from './searchIndex';

/** Editing mode: visual form or YAML source. */
export type ConfigEditorMode = 'visual' | 'source';

/** Top tabs: `common`, the successor to simple mode, plus seven canonical sections. */
export type ConfigTabId = 'common' | VisualSectionId;

export const CONFIG_SECTION_IDS = [
  'connectivity',
  'network',
  'logging',
  'quota',
  'streaming',
  'advanced',
  'payload',
] as const satisfies readonly VisualSectionId[];

export const CONFIG_TAB_IDS: readonly ConfigTabId[] = ['common', ...CONFIG_SECTION_IDS];

/** Section numbers 01-07; the common alias view has no number. */
export const SECTION_INDEX_LABELS: Record<VisualSectionId, string> = {
  connectivity: '01',
  network: '02',
  logging: '03',
  quota: '04',
  streaming: '05',
  advanced: '06',
  payload: '07',
};

export const CONFIG_TAB_ICONS: Record<ConfigTabId, ComponentType<IconProps>> = {
  common: IconSlidersHorizontal,
  connectivity: IconKey,
  network: IconNetwork,
  logging: IconScrollText,
  quota: IconTimer,
  streaming: IconSatellite,
  advanced: IconShield,
  payload: IconCode,
};

/** Eight common fields shared with canonical sections through fields/sharedFields.tsx. */
export const COMMON_FIELD_IDS = [
  'host',
  'port',
  'apiKeys',
  'proxyUrl',
  'debug',
  'loggingToFile',
  'quotaSwitchProject',
  'quotaSwitchPreviewModel',
] as const;

/**
 * Validation field paths owned by each section, used to bucket tab error badges.
 * Payload validation uses the separate hasPayloadValidationErrors flag.
 */
export const SECTION_VALIDATION_FIELDS: Record<VisualSectionId, readonly VisualConfigFieldPath[]> =
  {
    connectivity: ['port'],
    network: [
      'requestRetry',
      'maxRetryCredentials',
      'maxRetryInterval',
      'authAutoRefreshWorkers',
      'routingCodexProPlanPriority',
      'routingCodexPlusPlanPriority',
      'routingCodexTeamPlanPriority',
    ],
    logging: ['errorLogsMaxFiles', 'logsMaxTotalSizeMb', 'redisUsageQueueRetentionSeconds'],
    quota: [
      'quotaAutoDisableScanIntervalSeconds',
      'quotaAutoDisableScanConcurrency',
      'quotaAutoDisableScanRateLimitPerSecond',
      'quotaAutoDisableProbeTimeoutSeconds',
      'quotaAutoDisableMinCapacityCoveragePercent',
      'quotaAutoDisableProPlanThresholdPercent',
      'quotaAutoDisableProPlanResumeThresholdPercent',
      'quotaAutoDisablePlusPlanThresholdPercent',
      'quotaAutoDisablePlusPlanResumeThresholdPercent',
      'quotaAutoDisableTeamPlanThresholdPercent',
      'quotaAutoDisableTeamPlanResumeThresholdPercent',
      'quotaCapacityProFiveHourThreshold',
      'quotaCapacityProWeeklyThreshold',
      'quotaCapacityPlusFiveHourThreshold',
      'quotaCapacityPlusWeeklyThreshold',
      'quotaCapacityTeamFiveHourThreshold',
      'quotaCapacityTeamWeeklyThreshold',
    ],
    streaming: [
      'streaming.keepaliveSeconds',
      'streaming.bootstrapRetries',
      'streaming.nonstreamKeepaliveInterval',
    ],
    advanced: [],
    payload: [],
  };

/**
 * Maps fieldId to useVisualConfig dirtyFields keys, using dotted leaves for streaming.
 * It matches the 58 search-index entries one-to-one; configFieldParity tests enforce
 * parity across the index, this table, and section JSX.
 */
export const FIELD_VALUE_KEYS: Record<string, readonly string[]> = {
  // ── connectivity ──────────────────────────────────────────────────────────
  host: ['host'],
  port: ['port'],
  authDir: ['authDir'],
  apiKeys: ['apiKeysText'],
  tlsEnable: ['tlsEnable'],
  tlsCert: ['tlsCert'],
  tlsKey: ['tlsKey'],
  rmAllowRemote: ['rmAllowRemote'],
  rmDisableControlPanel: ['rmDisableControlPanel'],
  rmDisableAutoUpdatePanel: ['rmDisableAutoUpdatePanel'],
  rmSecretKey: ['rmSecretKey'],
  rmPanelRepo: ['rmPanelRepo'],
  // ── network ───────────────────────────────────────────────────────────────
  proxyUrl: ['proxyUrl'],
  requestRetry: ['requestRetry'],
  maxRetryCredentials: ['maxRetryCredentials'],
  maxRetryInterval: ['maxRetryInterval'],
  authAutoRefreshWorkers: ['authAutoRefreshWorkers'],
  routingStrategy: ['routingStrategy'],
  routingCodexProPlanPriority: ['routingCodexProPlanPriority'],
  routingCodexPlusPlanPriority: ['routingCodexPlusPlanPriority'],
  routingCodexTeamPlanPriority: ['routingCodexTeamPlanPriority'],
  disableImageGeneration: ['disableImageGeneration'],
  gptImage2BaseModel: ['gptImage2BaseModel'],
  routingSessionAffinityTTL: ['routingSessionAffinityTTL'],
  forceModelPrefix: ['forceModelPrefix'],
  passthroughHeaders: ['passthroughHeaders'],
  disableCooling: ['disableCooling'],
  routingSessionAffinity: ['routingSessionAffinity'],
  wsAuth: ['wsAuth'],
  // ── logging ───────────────────────────────────────────────────────────────
  debug: ['debug'],
  commercialMode: ['commercialMode'],
  loggingToFile: ['loggingToFile'],
  logsMaxTotalSizeMb: ['logsMaxTotalSizeMb'],
  errorLogsMaxFiles: ['errorLogsMaxFiles'],
  redisUsageQueueRetentionSeconds: ['redisUsageQueueRetentionSeconds'],
  usageStatisticsEnabled: ['usageStatisticsEnabled'],
  // ── quota ─────────────────────────────────────────────────────────────────
  quotaSwitchProject: ['quotaSwitchProject'],
  quotaSwitchPreviewModel: ['quotaSwitchPreviewModel'],
  quotaAntigravityCredits: ['quotaAntigravityCredits'],
  quotaAutoDisableEnabled: ['quotaAutoDisableEnabled'],
  quotaAutoDisableAutoEnable: ['quotaAutoDisableAutoEnable'],
  quotaAutoDisableScanIntervalSeconds: ['quotaAutoDisableScanIntervalSeconds'],
  quotaAutoDisableScanConcurrency: ['quotaAutoDisableScanConcurrency'],
  quotaAutoDisableScanRateLimitPerSecond: ['quotaAutoDisableScanRateLimitPerSecond'],
  quotaAutoDisableProbeTimeoutSeconds: ['quotaAutoDisableProbeTimeoutSeconds'],
  quotaAutoDisableMinCapacityCoveragePercent: ['quotaAutoDisableMinCapacityCoveragePercent'],
  quotaAutoDisableProPlanEnabled: ['quotaAutoDisableProPlanEnabled'],
  quotaAutoDisableProPlanThresholdPercent: ['quotaAutoDisableProPlanThresholdPercent'],
  quotaAutoDisableProPlanResumeThresholdPercent: ['quotaAutoDisableProPlanResumeThresholdPercent'],
  quotaAutoDisablePlusPlanEnabled: ['quotaAutoDisablePlusPlanEnabled'],
  quotaAutoDisablePlusPlanThresholdPercent: ['quotaAutoDisablePlusPlanThresholdPercent'],
  quotaAutoDisablePlusPlanResumeThresholdPercent: [
    'quotaAutoDisablePlusPlanResumeThresholdPercent',
  ],
  quotaAutoDisableTeamPlanEnabled: ['quotaAutoDisableTeamPlanEnabled'],
  quotaAutoDisableTeamPlanThresholdPercent: ['quotaAutoDisableTeamPlanThresholdPercent'],
  quotaAutoDisableTeamPlanResumeThresholdPercent: [
    'quotaAutoDisableTeamPlanResumeThresholdPercent',
  ],
  quotaAutoDisableProFiveHourCapacityAlertThreshold: [
    'quotaAutoDisableProFiveHourCapacityAlertThreshold',
  ],
  quotaCapacityAlertsEnabled: ['quotaCapacityAlertsEnabled'],
  quotaCapacitySnapshotsIncluded: ['quotaCapacitySnapshotsIncluded'],
  quotaCapacityProFiveHourThreshold: ['quotaCapacityProFiveHourThreshold'],
  quotaCapacityProWeeklyThreshold: ['quotaCapacityProWeeklyThreshold'],
  quotaCapacityPlusFiveHourThreshold: ['quotaCapacityPlusFiveHourThreshold'],
  quotaCapacityPlusWeeklyThreshold: ['quotaCapacityPlusWeeklyThreshold'],
  quotaCapacityTeamFiveHourThreshold: ['quotaCapacityTeamFiveHourThreshold'],
  quotaCapacityTeamWeeklyThreshold: ['quotaCapacityTeamWeeklyThreshold'],
  // ── streaming ─────────────────────────────────────────────────────────────
  streamingKeepaliveSeconds: ['streaming.keepaliveSeconds'],
  streamingBootstrapRetries: ['streaming.bootstrapRetries'],
  streamingNonstreamKeepalive: ['streaming.nonstreamKeepaliveInterval'],
  // ── advanced ──────────────────────────────────────────────────────────────
  pluginsEnabled: ['pluginsEnabled'],
  pluginStoreSources: ['pluginStoreSources'],
  pluginStoreAuth: ['pluginStoreAuth'],
  antigravitySignatureCacheEnabled: ['antigravitySignatureCacheEnabled'],
  antigravitySignatureBypassStrict: ['antigravitySignatureBypassStrict'],
  claudeHeaderUserAgent: ['claudeHeaderUserAgent'],
  claudeHeaderPackageVersion: ['claudeHeaderPackageVersion'],
  claudeHeaderRuntimeVersion: ['claudeHeaderRuntimeVersion'],
  claudeHeaderOs: ['claudeHeaderOs'],
  claudeHeaderArch: ['claudeHeaderArch'],
  claudeHeaderTimeout: ['claudeHeaderTimeout'],
  claudeHeaderStabilizeDeviceProfile: ['claudeHeaderStabilizeDeviceProfile'],
  codexHeaderUserAgent: ['codexHeaderUserAgent'],
  codexHeaderBetaFeatures: ['codexHeaderBetaFeatures'],
  // ── payload ───────────────────────────────────────────────────────────────
  payloadDefaultRules: ['payloadDefaultRules'],
  payloadDefaultRawRules: ['payloadDefaultRawRules'],
  payloadOverrideRules: ['payloadOverrideRules'],
  payloadOverrideRawRules: ['payloadOverrideRawRules'],
  payloadFilterRules: ['payloadFilterRules'],
};

/** Shared tab and tabpanel DOM ID generator for consistent ARIA relationships. */
export const configTabDomId = (id: ConfigTabId) => `config-tab-${id}`;
export const configPanelDomId = (id: ConfigTabId) => `config-panel-${id}`;

/** localStorage keys: mode retains the old visual/source key while section is new. */
export const CONFIG_MODE_STORAGE_KEY = 'config-management:tab';
export const CONFIG_SECTION_STORAGE_KEY = 'config-management:section';
/** Persisted key from the removed simple/full mode axis, cleared on mount. */
export const LEGACY_EDITOR_MODE_STORAGE_KEY = 'config-management:editor-mode';
