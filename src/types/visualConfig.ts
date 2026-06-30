export type PayloadParamValueType = 'string' | 'number' | 'boolean' | 'json';
export type DisableImageGenerationMode = 'false' | 'true' | 'chat';
export type PayloadParamValidationErrorCode =
  | 'payload_invalid_number'
  | 'payload_invalid_boolean'
  | 'payload_invalid_json';

export type VisualConfigFieldPath =
  | 'port'
  | 'errorLogsMaxFiles'
  | 'logsMaxTotalSizeMb'
  | 'redisUsageQueueRetentionSeconds'
  | 'requestRetry'
  | 'maxRetryCredentials'
  | 'maxRetryInterval'
  | 'authAutoRefreshWorkers'
  | 'quotaAutoDisableIntervalSeconds'
  | 'quotaAutoDisableThresholdPercent'
  | 'quotaAutoDisableWeeklyThresholdPercent'
  | 'quotaAutoDisableResumeFiveHourThresholdPercent'
  | 'quotaAutoDisableResumeWeeklyThresholdPercent'
  | 'quotaAutoDisableProPlanThresholdPercent'
  | 'quotaAutoDisableProPlanResumeThresholdPercent'
  | 'quotaAutoDisablePlusPlanThresholdPercent'
  | 'quotaAutoDisablePlusPlanResumeThresholdPercent'
  | 'quotaAutoDisableTeamPlanThresholdPercent'
  | 'quotaAutoDisableTeamPlanResumeThresholdPercent'
  | 'quotaAutoDisableProFiveHourCapacityAlertThreshold'
  | 'quotaCapacityAlertsEnabled'
  | 'quotaCapacitySnapshotsIncluded'
  | 'quotaCapacityProFiveHourThreshold'
  | 'quotaCapacityProWeeklyThreshold'
  | 'quotaCapacityPlusFiveHourThreshold'
  | 'quotaCapacityPlusWeeklyThreshold'
  | 'quotaCapacityTeamFiveHourThreshold'
  | 'quotaCapacityTeamWeeklyThreshold'
  | 'streaming.keepaliveSeconds'
  | 'streaming.bootstrapRetries'
  | 'streaming.nonstreamKeepaliveInterval';

export type VisualConfigValidationErrorCode =
  | 'port_range'
  | 'non_negative_integer'
  | 'non_negative_number'
  | 'positive_integer'
  | 'percent_range';

export type VisualConfigValidationErrors = Partial<
  Record<VisualConfigFieldPath, VisualConfigValidationErrorCode>
>;

export type PayloadParamEntry = {
  id: string;
  path: string;
  valueType: PayloadParamValueType;
  value: string;
};

export type PayloadHeaderEntry = {
  id: string;
  name: string;
  value: string;
};

export type PayloadModelEntry = {
  id: string;
  name: string;
  protocol?: string;
  fromProtocol?: string;
  headers?: PayloadHeaderEntry[];
  match?: PayloadParamEntry[];
  notMatch?: PayloadParamEntry[];
  exist?: string[];
  notExist?: string[];
};

export type PayloadRule = {
  id: string;
  models: PayloadModelEntry[];
  params: PayloadParamEntry[];
};

export type PayloadFilterRule = {
  id: string;
  models: PayloadModelEntry[];
  params: string[];
};

export interface StreamingConfig {
  keepaliveSeconds: string;
  bootstrapRetries: string;
  nonstreamKeepaliveInterval: string;
}

export type VisualConfigValues = {
  host: string;
  port: string;
  tlsEnable: boolean;
  tlsCert: string;
  tlsKey: string;
  rmAllowRemote: boolean;
  rmSecretKey: string;
  rmDisableControlPanel: boolean;
  rmDisableAutoUpdatePanel: boolean;
  rmPanelRepo: string;
  authDir: string;
  apiKeysText: string;
  pluginsEnabled: boolean;
  pluginStoreSources: string[];
  debug: boolean;
  commercialMode: boolean;
  loggingToFile: boolean;
  logsMaxTotalSizeMb: string;
  errorLogsMaxFiles: string;
  usageStatisticsEnabled: boolean;
  redisUsageQueueRetentionSeconds: string;
  proxyUrl: string;
  forceModelPrefix: boolean;
  passthroughHeaders: boolean;
  requestRetry: string;
  maxRetryCredentials: string;
  maxRetryInterval: string;
  disableCooling: boolean;
  disableImageGeneration: DisableImageGenerationMode;
  gptImage2BaseModel: string;
  authAutoRefreshWorkers: string;
  quotaSwitchProject: boolean;
  quotaSwitchPreviewModel: boolean;
  quotaAntigravityCredits: boolean;
  quotaAutoDisableEnabled: boolean;
  quotaAutoDisableAutoEnable: boolean;
  quotaAutoDisableProOnly: boolean;
  quotaAutoDisableIntervalSeconds: string;
  quotaAutoDisableThresholdPercent: string;
  quotaAutoDisableWeeklyThresholdPercent: string;
  quotaAutoDisableResumeFiveHourThresholdPercent: string;
  quotaAutoDisableResumeWeeklyThresholdPercent: string;
  quotaAutoDisableProPlanEnabled: boolean;
  quotaAutoDisableProPlanThresholdPercent: string;
  quotaAutoDisableProPlanResumeThresholdPercent: string;
  quotaAutoDisablePlusPlanEnabled: boolean;
  quotaAutoDisablePlusPlanThresholdPercent: string;
  quotaAutoDisablePlusPlanResumeThresholdPercent: string;
  quotaAutoDisableTeamPlanEnabled: boolean;
  quotaAutoDisableTeamPlanThresholdPercent: string;
  quotaAutoDisableTeamPlanResumeThresholdPercent: string;
  quotaAutoDisableProFiveHourCapacityAlertThreshold: string;
  quotaCapacityAlertsEnabled: boolean;
  quotaCapacitySnapshotsIncluded: boolean;
  quotaCapacityProFiveHourThreshold: string;
  quotaCapacityProWeeklyThreshold: string;
  quotaCapacityPlusFiveHourThreshold: string;
  quotaCapacityPlusWeeklyThreshold: string;
  quotaCapacityTeamFiveHourThreshold: string;
  quotaCapacityTeamWeeklyThreshold: string;
  routingStrategy: 'round-robin' | 'fill-first';
  routingSessionAffinity: boolean;
  routingSessionAffinityTTL: string;
  wsAuth: boolean;
  antigravitySignatureCacheEnabled: boolean;
  antigravitySignatureBypassStrict: boolean;
  claudeHeaderUserAgent: string;
  claudeHeaderPackageVersion: string;
  claudeHeaderRuntimeVersion: string;
  claudeHeaderOs: string;
  claudeHeaderArch: string;
  claudeHeaderTimeout: string;
  claudeHeaderStabilizeDeviceProfile: boolean;
  codexHeaderUserAgent: string;
  codexHeaderBetaFeatures: string;
  codexIdentityConfuse: boolean;
  payloadDefaultRules: PayloadRule[];
  payloadDefaultRawRules: PayloadRule[];
  payloadOverrideRules: PayloadRule[];
  payloadOverrideRawRules: PayloadRule[];
  payloadFilterRules: PayloadFilterRule[];
  streaming: StreamingConfig;
};

export const makeClientId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

export const DEFAULT_VISUAL_VALUES: VisualConfigValues = {
  host: '',
  port: '',
  tlsEnable: false,
  tlsCert: '',
  tlsKey: '',
  rmAllowRemote: false,
  rmSecretKey: '',
  rmDisableControlPanel: false,
  rmDisableAutoUpdatePanel: false,
  rmPanelRepo: '',
  authDir: '',
  apiKeysText: '',
  pluginsEnabled: false,
  pluginStoreSources: [],
  debug: false,
  commercialMode: false,
  loggingToFile: false,
  logsMaxTotalSizeMb: '',
  errorLogsMaxFiles: '',
  usageStatisticsEnabled: false,
  redisUsageQueueRetentionSeconds: '',
  proxyUrl: '',
  forceModelPrefix: false,
  passthroughHeaders: false,
  requestRetry: '',
  maxRetryCredentials: '',
  maxRetryInterval: '',
  disableCooling: false,
  disableImageGeneration: 'false',
  gptImage2BaseModel: '',
  authAutoRefreshWorkers: '',
  quotaSwitchProject: true,
  quotaSwitchPreviewModel: true,
  quotaAntigravityCredits: false,
  quotaAutoDisableEnabled: false,
  quotaAutoDisableAutoEnable: true,
  quotaAutoDisableProOnly: true,
  quotaAutoDisableIntervalSeconds: '300',
  quotaAutoDisableThresholdPercent: '5',
  quotaAutoDisableWeeklyThresholdPercent: '3',
  quotaAutoDisableResumeFiveHourThresholdPercent: '10',
  quotaAutoDisableResumeWeeklyThresholdPercent: '6',
  quotaAutoDisableProPlanEnabled: true,
  quotaAutoDisableProPlanThresholdPercent: '5',
  quotaAutoDisableProPlanResumeThresholdPercent: '10',
  quotaAutoDisablePlusPlanEnabled: true,
  quotaAutoDisablePlusPlanThresholdPercent: '4',
  quotaAutoDisablePlusPlanResumeThresholdPercent: '8',
  quotaAutoDisableTeamPlanEnabled: true,
  quotaAutoDisableTeamPlanThresholdPercent: '3',
  quotaAutoDisableTeamPlanResumeThresholdPercent: '6',
  quotaAutoDisableProFiveHourCapacityAlertThreshold: '0',
  quotaCapacityAlertsEnabled: false,
  quotaCapacitySnapshotsIncluded: true,
  quotaCapacityProFiveHourThreshold: '0',
  quotaCapacityProWeeklyThreshold: '0',
  quotaCapacityPlusFiveHourThreshold: '0',
  quotaCapacityPlusWeeklyThreshold: '0',
  quotaCapacityTeamFiveHourThreshold: '0',
  quotaCapacityTeamWeeklyThreshold: '0',
  routingStrategy: 'round-robin',
  routingSessionAffinity: false,
  routingSessionAffinityTTL: '',
  wsAuth: false,
  antigravitySignatureCacheEnabled: true,
  antigravitySignatureBypassStrict: false,
  claudeHeaderUserAgent: '',
  claudeHeaderPackageVersion: '',
  claudeHeaderRuntimeVersion: '',
  claudeHeaderOs: '',
  claudeHeaderArch: '',
  claudeHeaderTimeout: '',
  claudeHeaderStabilizeDeviceProfile: false,
  codexHeaderUserAgent: '',
  codexHeaderBetaFeatures: '',
  codexIdentityConfuse: false,
  payloadDefaultRules: [],
  payloadDefaultRawRules: [],
  payloadOverrideRules: [],
  payloadOverrideRawRules: [],
  payloadFilterRules: [],
  streaming: {
    keepaliveSeconds: '',
    bootstrapRetries: '',
    nonstreamKeepaliveInterval: '',
  },
};
