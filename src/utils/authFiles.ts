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
