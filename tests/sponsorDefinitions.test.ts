import { describe, expect, test } from 'bun:test';
import { getSponsorProviderDefinition } from '../src/features/providers/sponsorDefinitions';

describe('FennoAI sponsor definition', () => {
  test('keeps recognized OpenAI-compatible entries editable', () => {
    const definition = getSponsorProviderDefinition('fennoAI');

    expect(definition.protocols).toContain('openai');
  });
});
