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
  pro-only: false
  interval-seconds: 240
  five-hour-threshold-percent: 5
  weekly-threshold-percent: 2
  resume-five-hour-threshold-percent: 12
  resume-weekly-threshold-percent: 8
  pro-five-hour-capacity-alert-threshold: 0.75
`);

    expect(values.quotaAutoDisableEnabled).toBe(true);
    expect(values.quotaAutoDisableAutoEnable).toBe(false);
    expect(values.quotaAutoDisableProOnly).toBe(false);
    expect(values.quotaAutoDisableIntervalSeconds).toBe('240');
    expect(values.quotaAutoDisableThresholdPercent).toBe('5');
    expect(values.quotaAutoDisableWeeklyThresholdPercent).toBe('2');
    expect(values.quotaAutoDisableResumeFiveHourThresholdPercent).toBe('12');
    expect(values.quotaAutoDisableResumeWeeklyThresholdPercent).toBe('8');
    expect(values.quotaAutoDisableProFiveHourCapacityAlertThreshold).toBe('0.75');
  });

  test('writes changed quota-auto-disable settings to YAML', () => {
    const output = applyVisualConfigValuesToYaml(
      '',
      {
        ...DEFAULT_VISUAL_VALUES,
        quotaAutoDisableEnabled: true,
        quotaAutoDisableAutoEnable: false,
        quotaAutoDisableProOnly: false,
        quotaAutoDisableIntervalSeconds: '180',
        quotaAutoDisableThresholdPercent: '3',
        quotaAutoDisableWeeklyThresholdPercent: '2',
        quotaAutoDisableResumeFiveHourThresholdPercent: '12',
        quotaAutoDisableResumeWeeklyThresholdPercent: '8',
        quotaAutoDisableProFiveHourCapacityAlertThreshold: '0.75',
      },
      new Set([
        'quotaAutoDisableEnabled',
        'quotaAutoDisableAutoEnable',
        'quotaAutoDisableProOnly',
        'quotaAutoDisableIntervalSeconds',
        'quotaAutoDisableThresholdPercent',
        'quotaAutoDisableWeeklyThresholdPercent',
        'quotaAutoDisableResumeFiveHourThresholdPercent',
        'quotaAutoDisableResumeWeeklyThresholdPercent',
        'quotaAutoDisableProFiveHourCapacityAlertThreshold',
      ])
    );
    const parsed = parseYaml(output) as Record<string, unknown>;

    expect(parsed['quota-auto-disable']).toEqual({
      enabled: true,
      'auto-enable': false,
      'pro-only': false,
      'interval-seconds': 180,
      'five-hour-threshold-percent': 3,
      'threshold-percent': 3,
      'weekly-threshold-percent': 2,
      'resume-five-hour-threshold-percent': 12,
      'resume-weekly-threshold-percent': 8,
      'pro-five-hour-capacity-alert-threshold': 0.75,
    });
  });

  test('does not create quota-auto-disable during unrelated visual saves', () => {
    const output = applyVisualConfigValuesToYaml('', DEFAULT_VISUAL_VALUES, new Set());
    const parsed = (parseYaml(output) ?? {}) as Record<string, unknown>;

    expect(parsed['quota-auto-disable']).toBeUndefined();
  });

  test('rejects zero quota auto-disable polling interval', () => {
    const errors = getVisualConfigValidationErrors({
      ...DEFAULT_VISUAL_VALUES,
      quotaAutoDisableIntervalSeconds: '0',
    });

    expect(errors.quotaAutoDisableIntervalSeconds).toBe('positive_integer');
  });
});
