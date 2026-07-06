import { describe, expect, test } from 'bun:test';
import { sortAuthFiles } from '../src/features/authFiles/sort';
import type { AuthFileItem } from '../src/types/authFile';

const names = (files: AuthFileItem[]) => files.map((file) => file.name);

describe('sortAuthFiles', () => {
  const files: AuthFileItem[] = [
    { name: 'older.json', type: 'codex', priority: 20, created_at: '2026-07-01T00:00:00Z' },
    { name: 'newer.json', type: 'codex', priority: 10, created_at: '2026-07-03T00:00:00Z' },
    { name: 'middle.json', type: 'codex', priority: 30, created_at: '2026-07-02T00:00:00Z' },
  ];

  test('sorts by import time newest first', () => {
    expect(names(sortAuthFiles(files, 'import_desc'))).toEqual([
      'newer.json',
      'middle.json',
      'older.json',
    ]);
  });

  test('sorts by import time oldest first', () => {
    expect(names(sortAuthFiles(files, 'import_asc'))).toEqual([
      'older.json',
      'middle.json',
      'newer.json',
    ]);
  });

  test('sorts by priority high to low', () => {
    expect(names(sortAuthFiles(files, 'priority_desc'))).toEqual([
      'middle.json',
      'older.json',
      'newer.json',
    ]);
  });

  test('sorts by priority low to high', () => {
    expect(names(sortAuthFiles(files, 'priority_asc'))).toEqual([
      'newer.json',
      'older.json',
      'middle.json',
    ]);
  });

  test('uses newest import time as the priority tie breaker', () => {
    const tied: AuthFileItem[] = [
      { name: 'first.json', priority: 10, created_at: '2026-07-01T00:00:00Z' },
      { name: 'second.json', priority: 10, created_at: '2026-07-02T00:00:00Z' },
    ];

    expect(names(sortAuthFiles(tied, 'priority_desc'))).toEqual(['second.json', 'first.json']);
    expect(names(sortAuthFiles(tied, 'priority_asc'))).toEqual(['second.json', 'first.json']);
  });
});
