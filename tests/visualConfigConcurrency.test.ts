import { describe, expect, test } from 'bun:test';
import { createElement, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse as parseYaml } from 'yaml';
import {
  applyVisualConfigValuesToYaml,
  parseVisualConfigValuesFromYaml,
  useVisualConfig,
} from '../src/hooks/useVisualConfig';
import { DEFAULT_VISUAL_VALUES } from '../src/types/visualConfig';

describe('visual config concurrency', () => {
  test('only applies dirty visual fields to the latest server YAML', () => {
    function Harness() {
      const visualConfig = useVisualConfig();
      const [phase, setPhase] = useState(0);

      if (phase === 0) {
        visualConfig.loadVisualValuesFromYaml(
          'requests:\n  proxy-url: http://old-proxy.example\nobservability:\n  logs:\n    debug: false\n'
        );
        setPhase(1);
      } else if (phase === 1) {
        visualConfig.setVisualValues({ proxyUrl: 'http://localhost:8080' });
        setPhase(2);
      } else {
        return createElement(
          'pre',
          null,
          visualConfig.applyVisualChangesToYaml(
            'requests:\n  proxy-url: http://old-proxy.example\nobservability:\n  logs:\n    debug: true\n'
          )
        );
      }

      return null;
    }

    const markup = renderToStaticMarkup(createElement(Harness));
    const merged = markup.slice('<pre>'.length, -'</pre>'.length);

    expect(parseYaml(merged)).toEqual({
      observability: { logs: { debug: true } },
      requests: { 'proxy-url': 'http://localhost:8080' },
    });
  });

  test('preserves quota siblings and unknown nested keys during a targeted save', () => {
    const output = applyVisualConfigValuesToYaml(
      `
quota-auto-disable:
  enabled: true
  scan-interval-seconds: 300
  scan-concurrency: 12
  future-control: keep-me
  plan-policies:
    pro:
      enabled: true
      threshold-percent: 5
      future-policy-field: keep-me-too
`,
      {
        ...DEFAULT_VISUAL_VALUES,
        quotaAutoDisableScanIntervalSeconds: '240',
      },
      new Set(['quotaAutoDisableScanIntervalSeconds'])
    );
    const parsed = parseYaml(output) as Record<string, Record<string, unknown>>;

    expect(parsed['quota-auto-disable']).toEqual({
      enabled: true,
      'scan-interval-seconds': 240,
      'scan-concurrency': 12,
      'future-control': 'keep-me',
      'plan-policies': {
        pro: {
          enabled: true,
          'threshold-percent': 5,
          'future-policy-field': 'keep-me-too',
        },
      },
    });
  });

  test('preserves untouched payload subsections during a targeted save', () => {
    const currentYaml = `
config-version: 8
requests:
  payload:
    default:
      - models:
          - name: old-default
        params:
          temperature: 0.5
    override:
      - models:
          - name: keep-override
        params:
          temperature: 0.8
    future-subsection:
      enabled: true
`;
    const values = parseVisualConfigValuesFromYaml(currentYaml);
    values.payloadDefaultRules = [];

    const output = applyVisualConfigValuesToYaml(
      currentYaml,
      values,
      new Set(['payloadDefaultRules'])
    );
    const parsed = parseYaml(output) as Record<string, Record<string, unknown>>;

    expect(parsed.requests.payload.default).toBeUndefined();
    expect(parsed.requests.payload.override).toEqual([
      {
        models: [{ name: 'keep-override' }],
        params: { temperature: 0.8 },
      },
    ]);
    expect(parsed.requests.payload['future-subsection']).toEqual({ enabled: true });
  });
});
