import { describe, expect, test } from 'bun:test';
import type { AuthFileItem } from '../src/types';
import { resolveCodexPlanFilterValue } from '../src/utils/quota/resolvers';

const createJwt = (payload: Record<string, unknown>): string => {
  const encode = (value: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode(payload)}.signature`;
};

describe('resolveCodexPlanFilterValue', () => {
  test('does not infer Pro 20x from the imported filename', () => {
    const file: AuthFileItem = {
      name: 'codex-someone-pro.json',
      type: 'codex',
    };

    expect(resolveCodexPlanFilterValue(file)).toBe('unknown');
  });

  test('does not classify a raw id token string as a plan type', () => {
    const file: AuthFileItem = {
      name: 'codex-account.json',
      type: 'codex',
      id_token: createJwt({ sub: 'account-id' }),
    };

    expect(resolveCodexPlanFilterValue(file)).toBe('unknown');
  });

  test('classifies plan type from decoded id token auth payload', () => {
    const file: AuthFileItem = {
      name: 'codex-account.json',
      type: 'codex',
      id_token: createJwt({
        'https://api.openai.com/auth': {
          plan_type: 'pro',
        },
      }),
    };

    expect(resolveCodexPlanFilterValue(file)).toBe('pro');
  });

  test('classifies ChatGPT-prefixed plan type from decoded token payloads', () => {
    const directTokenFile: AuthFileItem = {
      name: 'direct-token.json',
      type: 'codex',
      id_token: createJwt({
        'https://api.openai.com/auth': {
          chatgpt_plan_type: 'pro',
        },
      }),
    };
    const metadataTokenFile: AuthFileItem = {
      name: 'metadata-token.json',
      type: 'codex',
      metadata: {
        id_token: createJwt({
          'https://api.openai.com/auth': {
            chatgptPlanType: 'free',
          },
        }),
      },
    };
    const attributesTokenFile: AuthFileItem = {
      name: 'attributes-token.json',
      type: 'codex',
      attributes: {
        id_token: createJwt({
          'https://api.openai.com/auth': {
            chatgpt_plan_type: 'pro',
          },
        }),
      },
    };

    expect(resolveCodexPlanFilterValue(directTokenFile)).toBe('pro');
    expect(resolveCodexPlanFilterValue(metadataTokenFile)).toBe('free');
    expect(resolveCodexPlanFilterValue(attributesTokenFile)).toBe('pro');
  });

  test('uses refreshed quota plan type before auth file metadata', () => {
    const file: AuthFileItem = {
      name: 'random-name.json',
      type: 'codex',
      plan_type: 'free',
    };

    expect(resolveCodexPlanFilterValue(file, 'team')).toBe('team');
  });

  test('classifies structured auth file plan type without filename dependency', () => {
    const proFile: AuthFileItem = {
      name: 'anything.json',
      type: 'codex',
      metadata: {
        planType: 'pro',
      },
    };
    const freeFile: AuthFileItem = {
      name: 'anything-else.json',
      type: 'codex',
      attributes: {
        plan_type: 'free',
      },
    };
    const teamFile: AuthFileItem = {
      name: 'team.json',
      type: 'codex',
      id_token: createJwt({
        'https://api.openai.com/auth': {
          plan_type: 'team',
        },
      }),
    };
    const plusFile: AuthFileItem = {
      name: 'plus.json',
      type: 'codex',
      id_token: createJwt({
        'https://api.openai.com/auth': {
          plan_type: 'plus',
        },
      }),
    };
    const proLiteFiles: AuthFileItem[] = ['prolite', 'pro-lite', 'pro_lite'].map((planType) => ({
      name: `${planType}.json`,
      type: 'codex',
      id_token: createJwt({
        'https://api.openai.com/auth': {
          plan_type: planType,
        },
      }),
    }));

    expect(resolveCodexPlanFilterValue(plusFile)).toBe('plus');
    for (const file of proLiteFiles) {
      expect(resolveCodexPlanFilterValue(file)).toBe('pro_lite');
    }
    expect(resolveCodexPlanFilterValue(proFile)).toBe('pro');
    expect(resolveCodexPlanFilterValue(freeFile)).toBe('free');
    expect(resolveCodexPlanFilterValue(teamFile)).toBe('team');
  });

  test('does not collapse unknown plan types into Free or Team', () => {
    const file: AuthFileItem = {
      name: 'enterprise.json',
      type: 'codex',
      id_token: createJwt({
        'https://api.openai.com/auth': {
          plan_type: 'enterprise',
        },
      }),
    };

    expect(resolveCodexPlanFilterValue(file)).toBe('unknown');
  });
});
