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
  interval-seconds: 240
  threshold-percent: 5
`);

    expect(values.quotaAutoDisableEnabled).toBe(true);
    expect(values.quotaAutoDisableIntervalSeconds).toBe('240');
    expect(values.quotaAutoDisableThresholdPercent).toBe('5');
  });

  test('writes changed quota-auto-disable settings to YAML', () => {
    const output = applyVisualConfigValuesToYaml(
      '',
      {
        ...DEFAULT_VISUAL_VALUES,
        quotaAutoDisableEnabled: true,
        quotaAutoDisableIntervalSeconds: '180',
        quotaAutoDisableThresholdPercent: '3',
      },
      new Set([
        'quotaAutoDisableEnabled',
        'quotaAutoDisableIntervalSeconds',
        'quotaAutoDisableThresholdPercent',
      ])
    );
    const parsed = parseYaml(output) as Record<string, unknown>;

    expect(parsed['quota-auto-disable']).toEqual({
      enabled: true,
      'interval-seconds': 180,
      'threshold-percent': 3,
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
