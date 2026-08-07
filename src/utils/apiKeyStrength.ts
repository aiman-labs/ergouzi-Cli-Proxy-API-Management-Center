/**
 * API key strength assessment.
 *
 * Model: character-set entropy times predictability discount, mapped to four tiers.
 * The UI consumes only tier and segments, so scoring changes remain isolated.
 */

export type ApiKeyStrengthTier = 'weak' | 'fair' | 'good' | 'strong';

export interface ApiKeyStrength {
  tier: ApiKeyStrengthTier;
  /** Number of lit segments from 0-4; zero means empty input. */
  segments: number;
  /** Estimated entropy floored to whole bits. */
  bits: number;
}

/** Tiers from weak to strong; index equals lit segments minus one. */
const TIER_ORDER: readonly ApiKeyStrengthTier[] = ['weak', 'fair', 'good', 'strong'];

export const API_KEY_STRENGTH_SEGMENTS = TIER_ORDER.length;

// Character-set size matches the 94 visible ASCII characters accepted by isValidApiKeyCharset.
const CHARSET_CLASSES: readonly { pattern: RegExp; size: number }[] = [
  { pattern: /[a-z]/, size: 26 },
  { pattern: /[A-Z]/, size: 26 },
  { pattern: /[0-9]/, size: 10 },
  { pattern: /[^a-zA-Z0-9]/, size: 32 },
];

/** Obvious password fragments that sharply reduce the score. */
const GUESSABLE_TOKENS: readonly string[] = [
  'password',
  'passwd',
  '123456',
  'qwerty',
  'admin',
  'secret',
  'apikey',
  'api-key',
  'letmein',
  'changeme',
  'iloveyou',
  'default',
  'test',
  'demo',
];

// Repeated and sequential characters add little guessing cost, so count only residual value.
const REPEAT_WEIGHT = 0.25;
const SEQUENCE_WEIGHT = 0.35;
const GUESSABLE_FACTOR = 0.4;

// Entropy thresholds in bits: random 48-char base62 is about 285 bits; 32-char hex is 128 bits.
const BITS_FOR_FAIR = 40;
const BITS_FOR_GOOD = 64;
const BITS_FOR_STRONG = 96;

// Length caps prevent short strings from reaching high tiers despite estimated entropy.
const LENGTH_CAPS: readonly { below: number; tier: ApiKeyStrengthTier }[] = [
  { below: 8, tier: 'weak' },
  { below: 16, tier: 'fair' },
  { below: 24, tier: 'good' },
];

/** Length overstates entropy when character variety is too low, such as 32 identical characters. */
const MIN_UNIQUE_FOR_FAIR = 5;

/**
 * Effective length discounts repeated characters and ascending or descending sequences.
 * Random strings are mostly unaffected while patterned strings shrink substantially.
 */
function effectiveLength(key: string): number {
  let total = 0;
  let sequenceRun = 1;

  for (let index = 0; index < key.length; index += 1) {
    const code = key.charCodeAt(index);
    const previous = index > 0 ? key.charCodeAt(index - 1) : Number.NaN;

    if (code === previous) {
      total += REPEAT_WEIGHT;
      sequenceRun = 1;
      continue;
    }

    const delta = code - previous;
    if (delta === 1 || delta === -1) {
      sequenceRun += 1;
      // The first two characters still add information; predictability starts with the third.
      total += sequenceRun >= 3 ? SEQUENCE_WEIGHT : 1;
      continue;
    }

    sequenceRun = 1;
    total += 1;
  }

  return total;
}

/**
 * Minimum period length: `deadbeefdeadbeef` gives 8 and `abcabca` gives 3; otherwise full length.
 * Uses (s + s).indexOf(s, 1), which also detects a partial final repetition.
 */
function smallestPeriod(key: string): number {
  const period = `${key}${key}`.indexOf(key, 1);
  return period > 0 && period < key.length ? period : key.length;
}

function charsetSize(key: string): number {
  return CHARSET_CLASSES.reduce(
    (size, charClass) => (charClass.pattern.test(key) ? size + charClass.size : size),
    0
  );
}

function tierForBits(bits: number): ApiKeyStrengthTier {
  if (bits >= BITS_FOR_STRONG) return 'strong';
  if (bits >= BITS_FOR_GOOD) return 'good';
  if (bits >= BITS_FOR_FAIR) return 'fair';
  return 'weak';
}

function capTier(tier: ApiKeyStrengthTier, cap: ApiKeyStrengthTier): ApiKeyStrengthTier {
  return TIER_ORDER.indexOf(tier) <= TIER_ORDER.indexOf(cap) ? tier : cap;
}

/**
 * Assess a user-defined API key for guidance only, without affecting save validation.
 */
export function evaluateApiKeyStrength(rawKey: string): ApiKeyStrength {
  const key = rawKey.trim();
  if (!key) return { tier: 'weak', segments: 0, bits: 0 };

  const pool = charsetSize(key);
  const lowerCased = key.toLowerCase();
  const guessable = GUESSABLE_TOKENS.some((token) => lowerCased.includes(token));
  // A periodic string costs roughly one period to guess; repeated portions add residual value.
  const period = smallestPeriod(key);
  const length = effectiveLength(key.slice(0, period)) + (key.length - period) * REPEAT_WEIGHT;
  const bits = Math.floor(length * Math.log2(pool) * (guessable ? GUESSABLE_FACTOR : 1));

  let tier = tierForBits(bits);
  for (const { below, tier: cap } of LENGTH_CAPS) {
    if (key.length < below) tier = capTier(tier, cap);
  }
  if (new Set(key).size < MIN_UNIQUE_FOR_FAIR) tier = capTier(tier, 'weak');

  return { tier, segments: TIER_ORDER.indexOf(tier) + 1, bits };
}
