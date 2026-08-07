import { describe, expect, test } from 'bun:test';
import { parse as parseYaml } from 'yaml';
import {
  applyVisualConfigValuesToYaml,
  getVisualConfigValidationErrors,
  parseVisualConfigValuesFromYaml,
} from '../src/hooks/useVisualConfig';
import { searchConfigFields } from '../src/features/config/searchIndex';
import { DEFAULT_VISUAL_VALUES } from '../src/types/visualConfig';

describe('visual config quota auto-disable YAML mapping', () => {
  test('uses scan control defaults when YAML omits them', () => {
    const values = parseVisualConfigValuesFromYaml('');

    expect(values.quotaAutoDisableScanIntervalSeconds).toBe('600');
    expect(values.quotaAutoDisableScanConcurrency).toBe('20');
    expect(values.quotaAutoDisableScanRateLimitPerSecond).toBe('0');
    expect(values.quotaAutoDisableProbeTimeoutSeconds).toBe('15');
    expect(values.quotaAutoDisableMinCapacityCoveragePercent).toBe('80');
  });

  test('exposes only supported quota auto-disable fields', () => {
    const fieldNames = Object.keys(DEFAULT_VISUAL_VALUES)
      .filter((fieldName) => fieldName.startsWith('quotaAutoDisable'))
      .sort();

    expect(fieldNames).toEqual(
      [
        'quotaAutoDisableAutoEnable',
        'quotaAutoDisableEnabled',
        'quotaAutoDisableMinCapacityCoveragePercent',
        'quotaAutoDisablePlusPlanEnabled',
        'quotaAutoDisablePlusPlanResumeThresholdPercent',
        'quotaAutoDisablePlusPlanThresholdPercent',
        'quotaAutoDisableProFiveHourCapacityAlertThreshold',
        'quotaAutoDisableProPlanEnabled',
        'quotaAutoDisableProPlanResumeThresholdPercent',
        'quotaAutoDisableProPlanThresholdPercent',
        'quotaAutoDisableProbeTimeoutSeconds',
        'quotaAutoDisableScanConcurrency',
        'quotaAutoDisableScanIntervalSeconds',
        'quotaAutoDisableScanRateLimitPerSecond',
        'quotaAutoDisableTeamPlanEnabled',
        'quotaAutoDisableTeamPlanResumeThresholdPercent',
        'quotaAutoDisableTeamPlanThresholdPercent',
      ].sort()
    );
  });

  test('loads quota-auto-disable settings from YAML', () => {
    const values = parseVisualConfigValuesFromYaml(`
quota-auto-disable:
  enabled: true
  auto-enable: false
  scan-interval-seconds: 240
  scan-concurrency: 16
  scan-rate-limit-per-second: 8
  probe-timeout-seconds: 20
  min-capacity-coverage-percent: 75
  plan-policies:
    pro:
      enabled: true
      threshold-percent: 5
      resume-threshold-percent: 12
    plus:
      enabled: false
      threshold-percent: 4
      resume-threshold-percent: 8
    team:
      enabled: true
      threshold-percent: 3
      resume-threshold-percent: 6
      require-five-hour-window: true
      require-weekly-window: true
  pro-five-hour-capacity-alert-threshold: 0.75
`);

    expect(values.quotaAutoDisableEnabled).toBe(true);
    expect(values.quotaAutoDisableAutoEnable).toBe(false);
    expect(values.quotaAutoDisableScanIntervalSeconds).toBe('240');
    expect(values.quotaAutoDisableScanConcurrency).toBe('16');
    expect(values.quotaAutoDisableScanRateLimitPerSecond).toBe('8');
    expect(values.quotaAutoDisableProbeTimeoutSeconds).toBe('20');
    expect(values.quotaAutoDisableMinCapacityCoveragePercent).toBe('75');
    expect(values.quotaAutoDisableProPlanEnabled).toBe(true);
    expect(values.quotaAutoDisableProPlanThresholdPercent).toBe('5');
    expect(values.quotaAutoDisableProPlanResumeThresholdPercent).toBe('12');
    expect(values.quotaAutoDisablePlusPlanEnabled).toBe(false);
    expect(values.quotaAutoDisablePlusPlanThresholdPercent).toBe('4');
    expect(values.quotaAutoDisablePlusPlanResumeThresholdPercent).toBe('8');
    expect(values.quotaAutoDisableTeamPlanEnabled).toBe(true);
    expect(values.quotaAutoDisableTeamPlanThresholdPercent).toBe('3');
    expect(values.quotaAutoDisableTeamPlanResumeThresholdPercent).toBe('6');
    expect(values.quotaAutoDisableProFiveHourCapacityAlertThreshold).toBe('0.75');
  });

  test('writes changed quota-auto-disable settings to YAML', () => {
    const output = applyVisualConfigValuesToYaml(
      '',
      {
        ...DEFAULT_VISUAL_VALUES,
        quotaAutoDisableEnabled: true,
        quotaAutoDisableAutoEnable: false,
        quotaAutoDisableScanIntervalSeconds: '600',
        quotaAutoDisableScanConcurrency: '16',
        quotaAutoDisableScanRateLimitPerSecond: '8',
        quotaAutoDisableProbeTimeoutSeconds: '20',
        quotaAutoDisableMinCapacityCoveragePercent: '75',
        quotaAutoDisableProPlanEnabled: true,
        quotaAutoDisableProPlanThresholdPercent: '5',
        quotaAutoDisableProPlanResumeThresholdPercent: '10',
        quotaAutoDisablePlusPlanEnabled: true,
        quotaAutoDisablePlusPlanThresholdPercent: '4',
        quotaAutoDisablePlusPlanResumeThresholdPercent: '8',
        quotaAutoDisableTeamPlanEnabled: true,
        quotaAutoDisableTeamPlanThresholdPercent: '3',
        quotaAutoDisableTeamPlanResumeThresholdPercent: '6',
        quotaAutoDisableProFiveHourCapacityAlertThreshold: '0.75',
      },
      new Set([
        'quotaAutoDisableEnabled',
        'quotaAutoDisableAutoEnable',
        'quotaAutoDisableScanIntervalSeconds',
        'quotaAutoDisableScanConcurrency',
        'quotaAutoDisableScanRateLimitPerSecond',
        'quotaAutoDisableProbeTimeoutSeconds',
        'quotaAutoDisableMinCapacityCoveragePercent',
        'quotaAutoDisableProPlanEnabled',
        'quotaAutoDisableProPlanThresholdPercent',
        'quotaAutoDisableProPlanResumeThresholdPercent',
        'quotaAutoDisablePlusPlanEnabled',
        'quotaAutoDisablePlusPlanThresholdPercent',
        'quotaAutoDisablePlusPlanResumeThresholdPercent',
        'quotaAutoDisableTeamPlanEnabled',
        'quotaAutoDisableTeamPlanThresholdPercent',
        'quotaAutoDisableTeamPlanResumeThresholdPercent',
        'quotaAutoDisableProFiveHourCapacityAlertThreshold',
      ])
    );
    const parsed = parseYaml(output) as Record<string, unknown>;

    expect(parsed['quota-auto-disable']).toEqual({
      enabled: true,
      'auto-enable': false,
      'scan-interval-seconds': 600,
      'scan-concurrency': 16,
      'scan-rate-limit-per-second': 8,
      'probe-timeout-seconds': 20,
      'min-capacity-coverage-percent': 75,
      'plan-policies': {
        pro: {
          enabled: true,
          'threshold-percent': 5,
          'resume-threshold-percent': 10,
        },
        plus: {
          enabled: true,
          'threshold-percent': 4,
          'resume-threshold-percent': 8,
        },
        team: {
          enabled: true,
          'threshold-percent': 3,
          'resume-threshold-percent': 6,
          'require-five-hour-window': true,
          'require-weekly-window': true,
        },
      },
      'pro-five-hour-capacity-alert-threshold': 0.75,
    });
  });

  test('removes legacy top-level quota-auto-disable thresholds when saving', () => {
    const output = applyVisualConfigValuesToYaml(
      `
quota-auto-disable:
  enabled: true
  auto-enable: true
  pro-only: true
  scan-interval-seconds: 240
  threshold-percent: 5
  five-hour-threshold-percent: 5
  weekly-threshold-percent: 3
  resume-five-hour-threshold-percent: 10
  resume-weekly-threshold-percent: 6
  interval-seconds: 180
  max-scan-per-run: 100
  auto-enable-scan-reserve: 100
  sample-freshness-seconds: 7200
  account-error-backoff-seconds: 21600
  transient-error-backoff-seconds: 600
  plan-policies:
    pro:
      enabled: true
      threshold-percent: 5
      resume-threshold-percent: 10
`,
      {
        ...DEFAULT_VISUAL_VALUES,
        quotaAutoDisableEnabled: true,
        quotaAutoDisableAutoEnable: true,
        quotaAutoDisableScanIntervalSeconds: '200',
      },
      new Set(['quotaAutoDisableScanIntervalSeconds'])
    );
    const parsed = parseYaml(output) as Record<string, Record<string, unknown>>;
    const quotaAutoDisable = parsed['quota-auto-disable'];

    expect(quotaAutoDisable['scan-interval-seconds']).toBe(200);
    expect(quotaAutoDisable['pro-only']).toBeUndefined();
    expect(quotaAutoDisable['threshold-percent']).toBeUndefined();
    expect(quotaAutoDisable['five-hour-threshold-percent']).toBeUndefined();
    expect(quotaAutoDisable['weekly-threshold-percent']).toBeUndefined();
    expect(quotaAutoDisable['resume-five-hour-threshold-percent']).toBeUndefined();
    expect(quotaAutoDisable['resume-weekly-threshold-percent']).toBeUndefined();
    expect(quotaAutoDisable['interval-seconds']).toBeUndefined();
    expect(quotaAutoDisable['max-scan-per-run']).toBeUndefined();
    expect(quotaAutoDisable['auto-enable-scan-reserve']).toBeUndefined();
    expect(quotaAutoDisable['sample-freshness-seconds']).toBeUndefined();
    expect(quotaAutoDisable['account-error-backoff-seconds']).toBeUndefined();
    expect(quotaAutoDisable['transient-error-backoff-seconds']).toBeUndefined();
    expect(quotaAutoDisable['plan-policies']).toEqual({
      pro: {
        enabled: true,
        'threshold-percent': 5,
        'resume-threshold-percent': 10,
      },
    });
  });

  test('does not create quota-auto-disable during unrelated visual saves', () => {
    const output = applyVisualConfigValuesToYaml('', DEFAULT_VISUAL_VALUES, new Set());
    const parsed = (parseYaml(output) ?? {}) as Record<string, unknown>;

    expect(parsed['quota-auto-disable']).toBeUndefined();
  });

  test('preserves omitted quota scan controls during unrelated visual saves', () => {
    const output = applyVisualConfigValuesToYaml(
      `
quota-auto-disable:
  enabled: true
  auto-enable: true
  scan-interval-seconds: 300
`,
      {
        ...DEFAULT_VISUAL_VALUES,
        quotaAutoDisableEnabled: true,
        quotaAutoDisableAutoEnable: true,
        quotaAutoDisableScanIntervalSeconds: '300',
        port: '9090',
      },
      new Set(['port'])
    );
    const parsed = parseYaml(output) as Record<string, Record<string, unknown>>;
    const quotaAutoDisable = parsed['quota-auto-disable'];

    expect(quotaAutoDisable).toEqual({
      enabled: true,
      'auto-enable': true,
      'scan-interval-seconds': 300,
    });
  });

  test('allows clearing optional quota scan controls', () => {
    const values = {
      ...DEFAULT_VISUAL_VALUES,
      quotaAutoDisableEnabled: true,
      quotaAutoDisableAutoEnable: true,
      quotaAutoDisableScanIntervalSeconds: '300',
      quotaAutoDisableScanConcurrency: '',
      quotaAutoDisableScanRateLimitPerSecond: '',
      quotaAutoDisableProbeTimeoutSeconds: '',
      quotaAutoDisableMinCapacityCoveragePercent: '',
    };
    const errors = getVisualConfigValidationErrors(values);

    expect(errors.quotaAutoDisableScanConcurrency).toBeUndefined();
    expect(errors.quotaAutoDisableScanRateLimitPerSecond).toBeUndefined();
    expect(errors.quotaAutoDisableProbeTimeoutSeconds).toBeUndefined();
    expect(errors.quotaAutoDisableMinCapacityCoveragePercent).toBeUndefined();

    const output = applyVisualConfigValuesToYaml(
      `
quota-auto-disable:
  enabled: true
  auto-enable: true
  scan-interval-seconds: 300
  scan-concurrency: 16
  scan-rate-limit-per-second: 8
  probe-timeout-seconds: 20
  min-capacity-coverage-percent: 75
`,
      values,
      new Set([
        'quotaAutoDisableScanConcurrency',
        'quotaAutoDisableScanRateLimitPerSecond',
        'quotaAutoDisableProbeTimeoutSeconds',
        'quotaAutoDisableMinCapacityCoveragePercent',
      ])
    );
    const parsed = parseYaml(output) as Record<string, Record<string, unknown>>;
    const quotaAutoDisable = parsed['quota-auto-disable'];

    expect(quotaAutoDisable).toEqual({
      enabled: true,
      'auto-enable': true,
      'scan-interval-seconds': 300,
    });
  });

  test('writes capacity alert settings to the new nested YAML structure', () => {
    const output = applyVisualConfigValuesToYaml(
      '',
      {
        ...DEFAULT_VISUAL_VALUES,
        quotaAutoDisableEnabled: true,
        quotaCapacityAlertsEnabled: true,
        quotaCapacitySnapshotsIncluded: true,
        quotaCapacityProFiveHourThreshold: '0.6',
        quotaCapacityProWeeklyThreshold: '1.2',
        quotaCapacityPlusFiveHourThreshold: '0.4',
        quotaCapacityPlusWeeklyThreshold: '0.8',
        quotaCapacityTeamFiveHourThreshold: '0.3',
        quotaCapacityTeamWeeklyThreshold: '1.5',
      },
      new Set([
        'quotaAutoDisableEnabled',
        'quotaCapacityAlertsEnabled',
        'quotaCapacitySnapshotsIncluded',
        'quotaCapacityProFiveHourThreshold',
        'quotaCapacityProWeeklyThreshold',
        'quotaCapacityPlusFiveHourThreshold',
        'quotaCapacityPlusWeeklyThreshold',
        'quotaCapacityTeamFiveHourThreshold',
        'quotaCapacityTeamWeeklyThreshold',
      ])
    );
    const parsed = parseYaml(output) as Record<string, Record<string, unknown>>;
    const quotaAutoDisable = parsed['quota-auto-disable'];

    expect(quotaAutoDisable['capacity-alerts']).toEqual({
      enabled: true,
      'include-snapshots': true,
      plans: {
        pro: {
          'five-hour-threshold-equivalent': 0.6,
          'weekly-threshold-equivalent': 1.2,
        },
        plus: {
          'five-hour-threshold-equivalent': 0.4,
          'weekly-threshold-equivalent': 0.8,
        },
        team: {
          'five-hour-threshold-equivalent': 0.3,
          'weekly-threshold-equivalent': 1.5,
        },
      },
    });
    expect(quotaAutoDisable['pro-five-hour-capacity-alert-threshold']).toBeUndefined();
  });

  test('rejects zero quota auto-disable polling interval', () => {
    const errors = getVisualConfigValidationErrors({
      ...DEFAULT_VISUAL_VALUES,
      quotaAutoDisableScanIntervalSeconds: '0',
    });

    expect(errors.quotaAutoDisableScanIntervalSeconds).toBe('positive_integer');
  });

  test('rejects invalid quota auto-disable scan controls', () => {
    const errors = getVisualConfigValidationErrors({
      ...DEFAULT_VISUAL_VALUES,
      quotaAutoDisableScanConcurrency: '0',
      quotaAutoDisableScanRateLimitPerSecond: '-1',
      quotaAutoDisableProbeTimeoutSeconds: 'soon',
      quotaAutoDisableMinCapacityCoveragePercent: '101',
    });

    expect(errors.quotaAutoDisableScanConcurrency).toBe('positive_integer');
    expect(errors.quotaAutoDisableScanRateLimitPerSecond).toBe('non_negative_integer');
    expect(errors.quotaAutoDisableProbeTimeoutSeconds).toBe('positive_integer');
    expect(errors.quotaAutoDisableMinCapacityCoveragePercent).toBe('percent_range');
  });

  test('indexes quota auto-disable scan controls for visual config search', () => {
    const translate = (key: string) => key;
    const expected = new Map([
      ['scan-interval-seconds', 'quotaAutoDisableScanIntervalSeconds'],
      ['scan-concurrency', 'quotaAutoDisableScanConcurrency'],
      ['scan-rate-limit-per-second', 'quotaAutoDisableScanRateLimitPerSecond'],
      ['probe-timeout-seconds', 'quotaAutoDisableProbeTimeoutSeconds'],
      ['min-capacity-coverage-percent', 'quotaAutoDisableMinCapacityCoveragePercent'],
    ]);

    for (const [query, fieldId] of expected) {
      const result = searchConfigFields(query, translate).find((entry) => entry.fieldId === fieldId);
      expect(result?.sectionId).toBe('quota');
    }
  });
});
