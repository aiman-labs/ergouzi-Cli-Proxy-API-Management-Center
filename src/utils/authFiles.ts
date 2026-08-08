import type { AuthFileItem } from '@/types';

export function mergeAuthFileSnapshots(
  currentFiles: AuthFileItem[],
  refreshedFiles: AuthFileItem[]
): AuthFileItem[] {
  const refreshedByName = new Map(refreshedFiles.map((file) => [file.name, file]));
  const mergedNames = new Set<string>();
  const mergedFiles: AuthFileItem[] = [];

  currentFiles.forEach((file) => {
    const refreshed = refreshedByName.get(file.name);
    if (!refreshed) return;
    mergedNames.add(file.name);
    mergedFiles.push(refreshed);
  });

  refreshedFiles.forEach((file) => {
    if (mergedNames.has(file.name)) return;
    mergedFiles.push(file);
  });

  return mergedFiles;
}

export function mergeTargetedAuthFileSnapshots(
  currentFiles: AuthFileItem[],
  refreshedFiles: AuthFileItem[],
  targetNames: Iterable<string>,
  options: { inventoryInitialized?: boolean } = {}
): AuthFileItem[] {
  if (options.inventoryInitialized === false) return refreshedFiles;

  const targets = new Set(targetNames);
  if (targets.size === 0) return currentFiles;

  const refreshedByName = new Map(refreshedFiles.map((file) => [file.name, file]));
  let changed = false;
  const mergedFiles: AuthFileItem[] = [];

  currentFiles.forEach((file) => {
    if (!targets.has(file.name)) {
      mergedFiles.push(file);
      return;
    }

    const refreshed = refreshedByName.get(file.name);
    if (!refreshed) {
      changed = true;
      return;
    }
    if (JSON.stringify(file) === JSON.stringify(refreshed)) {
      mergedFiles.push(file);
      return;
    }

    changed = true;
    mergedFiles.push(refreshed);
  });

  return changed ? mergedFiles : currentFiles;
}
