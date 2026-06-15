import type { AuthFileItem } from '@/types/authFile';
import { normalizeUsageTotal } from '@/utils/recentRequests';
import type { AuthFilesSuccessCountFilter } from '@/features/authFiles/uiState';

export const getAuthFileSuccessCount = (file: AuthFileItem): number =>
  normalizeUsageTotal(file.success);

export const filterAuthFilesBySuccessCount = (
  files: AuthFileItem[],
  filter: AuthFilesSuccessCountFilter
): AuthFileItem[] => {
  if (filter === 'all') return files;
  return files.filter((file) => {
    const successCount = getAuthFileSuccessCount(file);
    return filter === 'positive' ? successCount > 0 : successCount === 0;
  });
};
