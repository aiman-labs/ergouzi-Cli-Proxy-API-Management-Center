import { describe, expect, test } from 'bun:test';
import { parse as parseYaml } from 'yaml';
import {
  applyVisualConfigValuesToYaml,
  getVisualConfigValidationErrors,
  parseVisualConfigValuesFromYaml,
} from '../src/hooks/useVisualConfig';
import { DEFAULT_VISUAL_VALUES } from '../src/types/visualConfig';

describe('visual config quota auto-disable YAML mapping', () => {
  test('loads quota-auto-disable settings from YAML', () => {
    const values = parseVisualConfigValuesFromYaml(`
quota-auto-disable:
  enabled: true
  auto-enable: false
  interval-seconds: 240
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
});
