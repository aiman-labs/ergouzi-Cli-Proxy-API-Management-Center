import { describe, expect, test } from 'bun:test';
import {
  buildFennoAIRaw,
  FENNO_AI_CODEX_BASE_URL,
  FENNO_AI_PROVIDER_NAME,
} from '../src/features/providers/fennoAI';
import { getSponsorProviderDefinition } from '../src/features/providers/sponsorDefinitions';
import { isGenericOpenAIProvider } from '../src/features/providers/useProviderWorkbench';
import { normalizeConfigResponse } from '../src/services/api/transformers';

describe('FennoAI provider aggregation', () => {
  test('keeps supported OpenAI configs in the FennoAI resource', () => {
    const raw = buildFennoAIRaw({
      openaiCompatibility: [
        {
          name: FENNO_AI_PROVIDER_NAME,
          baseUrl: FENNO_AI_CODEX_BASE_URL,
          apiKeyEntries: [{ apiKey: 'openai-key' }],
        },
      ],
      codexApiKeys: [{ apiKey: 'codex-key', baseUrl: FENNO_AI_CODEX_BASE_URL }],
    });

    expect(getSponsorProviderDefinition('fennoAI').protocols).toEqual([
      'openai',
      'codex',
      'claude',
    ]);
    expect(raw.openai.map((item) => item.index)).toEqual([0]);
    expect(raw.codex.map((item) => item.index)).toEqual([0]);
  });

  test('preserves the backend index after normalization drops a leading row', () => {
    const config = normalizeConfigResponse({
      'openai-compatibility': [
        { 'base-url': 'https://invalid.example.com/v1' },
        {
          name: FENNO_AI_PROVIDER_NAME,
          'base-url': FENNO_AI_CODEX_BASE_URL,
          'api-key-entries': [{ 'api-key': 'openai-key' }],
        },
      ],
    });

    expect(config.openaiCompatibility?.map((item) => item.sourceIndex)).toEqual([1]);
    expect(buildFennoAIRaw(config).openai.map((item) => item.index)).toEqual([1]);
  });

  test('does not duplicate FennoAI entries in the generic OpenAI group', () => {
    const entry = {
      name: FENNO_AI_PROVIDER_NAME,
      baseUrl: FENNO_AI_CODEX_BASE_URL,
      apiKeyEntries: [{ apiKey: 'openai-key' }],
    };

    expect(buildFennoAIRaw({ openaiCompatibility: [entry] }).openai).toHaveLength(1);
    expect(isGenericOpenAIProvider(entry)).toBe(false);
  });
});
