import type { ServerRuntimeKind } from '@/types';

export const requiresFileLogging = (
  runtimeKind: ServerRuntimeKind,
  loggingToFileEnabled: boolean
): boolean => runtimeKind === 'cpa' && !loggingToFileEnabled;
