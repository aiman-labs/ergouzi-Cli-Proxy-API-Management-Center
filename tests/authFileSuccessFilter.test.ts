import { describe, expect, test } from 'bun:test';
import { filterAuthFilesBySuccessCount } from '../src/features/authFiles/successFilter';
import type { AuthFileItem } from '../src/types/authFile';

describe('filterAuthFilesBySuccessCount', () => {
  const files: AuthFileItem[] = [
    { name: 'zero-number.json', success: 0 },
    { name: 'positive-number.json', success: 2 },
    { name: 'positive-string.json', success: '3' },
    { name: 'missing-success.json' },
  ];

  test('keeps every auth file when the filter is all', () => {
    expect(filterAuthFilesBySuccessCount(files, 'all').map((file) => file.name)).toEqual([
      'zero-number.json',
      'positive-number.json',
      'positive-string.json',
      'missing-success.json',
    ]);
  });

  test('keeps only auth files with success greater than zero', () => {
    expect(filterAuthFilesBySuccessCount(files, 'positive').map((file) => file.name)).toEqual([
      'positive-number.json',
      'positive-string.json',
    ]);
  });

  test('keeps only auth files with zero success', () => {
    expect(filterAuthFilesBySuccessCount(files, 'zero').map((file) => file.name)).toEqual([
      'zero-number.json',
      'missing-success.json',
    ]);
  });
});
