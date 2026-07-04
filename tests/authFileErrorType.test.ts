import { describe, expect, test } from 'bun:test';
import { classifyAuthFileErrorType } from '../src/features/authFiles/errorType';

describe('classifyAuthFileErrorType', () => {
  test('detects deactivated workspace errors', () => {
    expect(classifyAuthFileErrorType('{"detail":{"code":"deactivated_workspace"}}')).toBe(
      'deactivated_workspace'
    );
  });

  test('keeps existing known error classifications', () => {
    expect(classifyAuthFileErrorType('usage_limit_reached')).toBe('usage_limit');
    expect(classifyAuthFileErrorType('Unauthorized')).toBe('authentication_error');
    expect(classifyAuthFileErrorType('something else')).toBe('other');
  });
});
