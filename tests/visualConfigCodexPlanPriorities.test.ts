import { describe, expect, test } from 'bun:test';
import { parse as parseYaml } from 'yaml';
import {
  applyVisualConfigValuesToYaml,
  parseVisualConfigValuesFromYaml,
} from '../src/hooks/useVisualConfig';
import { DEFAULT_VISUAL_VALUES } from '../src/types/visualConfig';

describe('visual config Codex plan priority YAML mapping', () => {
  test('loads routing Codex plan priorities from YAML', () => {
    const values = parseVisualConfigValuesFromYaml(`
routing:
  codex-plan-priorities:
    pro: 30
    plus: 20
    team: 10
`);

    expect(values.routingCodexProPlanPriority).toBe('30');
    expect(values.routingCodexPlusPlanPriority).toBe('20');
    expect(values.routingCodexTeamPlanPriority).toBe('10');
  });

  test('writes changed routing Codex plan priorities to YAML', () => {
    const output = applyVisualConfigValuesToYaml(
      '',
      {
        ...DEFAULT_VISUAL_VALUES,
        routingCodexProPlanPriority: '30',
        routingCodexPlusPlanPriority: '20',
        routingCodexTeamPlanPriority: '10',
      },
      new Set([
        'routingCodexProPlanPriority',
        'routingCodexPlusPlanPriority',
        'routingCodexTeamPlanPriority',
      ])
    );
    const parsed = parseYaml(output) as Record<string, unknown>;

    expect(parsed.routing).toEqual({
      'codex-plan-priorities': {
        pro: 30,
        plus: 20,
        team: 10,
      },
    });
  });

  test('removes empty Codex plan priorities without removing other routing settings', () => {
    const output = applyVisualConfigValuesToYaml(
      `
routing:
  strategy: fill-first
  codex-plan-priorities:
    pro: 30
    plus: 20
    team: 10
`,
      {
        ...DEFAULT_VISUAL_VALUES,
        routingStrategy: 'fill-first',
        routingCodexProPlanPriority: '',
        routingCodexPlusPlanPriority: '',
        routingCodexTeamPlanPriority: '',
      },
      new Set([
        'routingCodexProPlanPriority',
        'routingCodexPlusPlanPriority',
        'routingCodexTeamPlanPriority',
      ])
    );
    const parsed = parseYaml(output) as Record<string, unknown>;

    expect(parsed.routing).toEqual({
      strategy: 'fill-first',
    });
  });

  test('does not write decimal Codex plan priorities', () => {
    const output = applyVisualConfigValuesToYaml(
      '',
      {
        ...DEFAULT_VISUAL_VALUES,
        routingCodexProPlanPriority: '1.5',
      },
      new Set(['routingCodexProPlanPriority'])
    );
    const parsed = parseYaml(output) as Record<string, unknown>;

    expect(parsed).toEqual({});
  });

  test('does not write negative Codex plan priorities', () => {
    const output = applyVisualConfigValuesToYaml(
      '',
      {
        ...DEFAULT_VISUAL_VALUES,
        routingCodexProPlanPriority: '-1',
      },
      new Set(['routingCodexProPlanPriority'])
    );
    const parsed = parseYaml(output) as Record<string, unknown>;

    expect(parsed).toEqual({});
  });
});
