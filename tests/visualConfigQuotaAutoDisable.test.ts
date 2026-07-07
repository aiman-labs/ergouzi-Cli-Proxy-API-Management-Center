import { describe, expect, test } from 'bun:test';
import { parse as parseYaml } from 'yaml';
import {
  applyVisualConfigValuesToYaml,
  getVisualConfigValidationErrors,
  parseVisualConfigValuesFromYaml,
} from '../src/hooks/useVisualConfig';
import { searchConfigFields } from '../src/components/config/configSearchIndex';
import { DEFAULT_VISUAL_VALUES } from '../src/types/visualConfig';

describe('visual config quota auto-disable YAML mapping', () => {
  test('uses scan control defaults when YAML omits them', () => {
    const values = parseVisualConfigValuesFromYaml('');

    expect(values.quotaAutoDisableMaxScanPerRun).toBe('120');
    expect(values.quotaAutoDisableProbeTimeoutSeconds).toBe('15');
    expect(values.quotaAutoDisableSampleFreshnessSeconds).toBe('7200');
    expect(values.quotaAutoDisableAccountErrorBackoffSeconds).toBe('21600');
    expect(values.quotaAutoDisableTransientErrorBackoffSeconds).toBe('600');
    expect(values.quotaAutoDisableMinCapacityCoveragePercent).toBe('80');
  });

  test('loads quota-auto-disable settings from YAML', () => {
    const values = parseVisualConfigValuesFromYaml(`
quota-auto-disable:
  enabled: true
  auto-enable: false
  interval-seconds: 240
  max-scan-per-run: 160
  probe-timeout-seconds: 20
  sample-freshness-seconds: 7200
  account-error-backoff-seconds: 28800
  transient-error-backoff-seconds: 900
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
    expect(values.quotaAutoDisableIntervalSeconds).toBe('240');
    expect(values.quotaAutoDisableMaxScanPerRun).toBe('160');
    expect(values.quotaAutoDisableProbeTimeoutSeconds).toBe('20');
    expect(values.quotaAutoDisableSampleFreshnessSeconds).toBe('7200');
    expect(values.quotaAutoDisableAccountErrorBackoffSeconds).toBe('28800');
    expect(values.quotaAutoDisableTransientErrorBackoffSeconds).toBe('900');
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
        quotaAutoDisableIntervalSeconds: '180',
        quotaAutoDisableMaxScanPerRun: '160',
        quotaAutoDisableProbeTimeoutSeconds: '20',
        quotaAutoDisableSampleFreshnessSeconds: '7200',
        quotaAutoDisableAccountErrorBackoffSeconds: '28800',
        quotaAutoDisableTransientErrorBackoffSeconds: '900',
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
        'quotaAutoDisableIntervalSeconds',
        'quotaAutoDisableMaxScanPerRun',
        'quotaAutoDisableProbeTimeoutSeconds',
        'quotaAutoDisableSampleFreshnessSeconds',
        'quotaAutoDisableAccountErrorBackoffSeconds',
        'quotaAutoDisableTransientErrorBackoffSeconds',
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
      'interval-seconds': 180,
      'max-scan-per-run': 160,
      'probe-timeout-seconds': 20,
      'sample-freshness-seconds': 7200,
      'account-error-backoff-seconds': 28800,
      'transient-error-backoff-seconds': 900,
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
  interval-seconds: 240
  threshold-percent: 5
  five-hour-threshold-percent: 5
  weekly-threshold-percent: 3
  resume-five-hour-threshold-percent: 10
  resume-weekly-threshold-percent: 6
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
        quotaAutoDisableIntervalSeconds: '200',
      },
      new Set(['quotaAutoDisableIntervalSeconds'])
    );
    const parsed = parseYaml(output) as Record<string, Record<string, unknown>>;
    const quotaAutoDisable = parsed['quota-auto-disable'];

    expect(quotaAutoDisable['interval-seconds']).toBe(200);
    expect(quotaAutoDisable['pro-only']).toBeUndefined();
    expect(quotaAutoDisable['threshold-percent']).toBeUndefined();
    expect(quotaAutoDisable['five-hour-threshold-percent']).toBeUndefined();
    expect(quotaAutoDisable['weekly-threshold-percent']).toBeUndefined();
    expect(quotaAutoDisable['resume-five-hour-threshold-percent']).toBeUndefined();
    expect(quotaAutoDisable['resume-weekly-threshold-percent']).toBeUndefined();
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
      quotaAutoDisableIntervalSeconds: '0',
    });

    expect(errors.quotaAutoDisableIntervalSeconds).toBe('positive_integer');
  });

  test('rejects invalid quota auto-disable scan controls', () => {
    const errors = getVisualConfigValidationErrors({
      ...DEFAULT_VISUAL_VALUES,
      quotaAutoDisableMaxScanPerRun: '0',
      quotaAutoDisableProbeTimeoutSeconds: '',
      quotaAutoDisableSampleFreshnessSeconds: '-1',
      quotaAutoDisableAccountErrorBackoffSeconds: '1.5',
      quotaAutoDisableTransientErrorBackoffSeconds: 'soon',
      quotaAutoDisableMinCapacityCoveragePercent: '101',
    });

    expect(errors.quotaAutoDisableMaxScanPerRun).toBe('positive_integer');
    expect(errors.quotaAutoDisableProbeTimeoutSeconds).toBe('positive_integer');
    expect(errors.quotaAutoDisableSampleFreshnessSeconds).toBe('positive_integer');
    expect(errors.quotaAutoDisableAccountErrorBackoffSeconds).toBe('positive_integer');
    expect(errors.quotaAutoDisableTransientErrorBackoffSeconds).toBe('positive_integer');
    expect(errors.quotaAutoDisableMinCapacityCoveragePercent).toBe('percent_range');
  });

  test('indexes quota auto-disable scan controls for visual config search', () => {
    const translate = (key: string) => key;
    const expected = new Map([
      ['max-scan-per-run', 'quotaAutoDisableMaxScanPerRun'],
      ['probe-timeout-seconds', 'quotaAutoDisableProbeTimeoutSeconds'],
      ['sample-freshness-seconds', 'quotaAutoDisableSampleFreshnessSeconds'],
      ['account-error-backoff-seconds', 'quotaAutoDisableAccountErrorBackoffSeconds'],
      ['transient-error-backoff-seconds', 'quotaAutoDisableTransientErrorBackoffSeconds'],
      ['min-capacity-coverage-percent', 'quotaAutoDisableMinCapacityCoveragePercent'],
    ]);

    for (const [query, fieldId] of expected) {
      const result = searchConfigFields(query, translate).find((entry) => entry.fieldId === fieldId);
      expect(result?.sectionId).toBe('quota');
    }
  });
});
