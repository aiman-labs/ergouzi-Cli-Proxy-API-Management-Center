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

    expect(resolveCodexPlanFilterValue(file)).toBe('pro20x');
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

    expect(resolveCodexPlanFilterValue(directTokenFile)).toBe('pro20x');
    expect(resolveCodexPlanFilterValue(metadataTokenFile)).toBe('non_pro20x');
    expect(resolveCodexPlanFilterValue(attributesTokenFile)).toBe('pro20x');
  });

  test('uses refreshed quota plan type before auth file metadata', () => {
    const file: AuthFileItem = {
      name: 'random-name.json',
      type: 'codex',
      plan_type: 'free',
    };

    expect(resolveCodexPlanFilterValue(file, 'pro')).toBe('pro20x');
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

    expect(resolveCodexPlanFilterValue(proFile)).toBe('pro20x');
    expect(resolveCodexPlanFilterValue(freeFile)).toBe('non_pro20x');
  });
});
