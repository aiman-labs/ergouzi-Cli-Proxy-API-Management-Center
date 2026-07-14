import { describe, expect, test } from 'bun:test';
import {
  classifyAuthFileErrorType,
  resolveAuthFileProblemMessage,
} from '../src/features/authFiles/errorType';

describe('classifyAuthFileErrorType', () => {
  test('detects deactivated workspace errors', () => {
    expect(classifyAuthFileErrorType('{"detail":{"code":"deactivated_workspace"}}')).toBe(
      'deactivated_workspace'
    );
    expect(classifyAuthFileErrorType('Deactivated Workspace')).toBe('deactivated_workspace');
    expect(classifyAuthFileErrorType('deactivated-workspace')).toBe('deactivated_workspace');
    expect(classifyAuthFileErrorType('Deactive Workspace')).toBe('deactivated_workspace');
  });

  test('keeps existing known error classifications', () => {
    expect(classifyAuthFileErrorType('usage_limit_reached')).toBe('usage_limit');
    expect(classifyAuthFileErrorType('Unauthorized')).toBe('authentication_error');
    expect(classifyAuthFileErrorType('token_revoked')).toBe('authentication_error');
    expect(classifyAuthFileErrorType('token-invalidated')).toBe('authentication_error');
    expect(classifyAuthFileErrorType('tokenrevoked')).toBe('other');
    expect(classifyAuthFileErrorType('something else')).toBe('other');
  });

  test('uses current-session quota errors only when canonical status is empty', () => {
    const quotaError = '401 upstream returned status 401: deactivated_workspace';
    const fallback = resolveAuthFileProblemMessage({ name: 'quota-only.json' }, quotaError);
    expect(fallback).toBe(quotaError);
    expect(classifyAuthFileErrorType(fallback)).toBe('deactivated_workspace');

    expect(
      resolveAuthFileProblemMessage(
        { name: 'runtime.json', status_message: 'runtime unauthorized' },
        quotaError
      )
    ).toBe('runtime unauthorized');
  });
});
