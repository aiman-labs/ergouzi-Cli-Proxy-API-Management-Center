import { create } from 'zustand';
import type { CodexQuotaJobStatus } from '@/services/api';

export interface CodexQuotaJobProgress {
  jobId: string | null;
  status: 'idle' | CodexQuotaJobStatus | 'error';
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  nextSeq: number;
  error: string;
}

export const IDLE_CODEX_QUOTA_JOB_PROGRESS: CodexQuotaJobProgress = {
  jobId: null,
  status: 'idle',
  total: 0,
  completed: 0,
  succeeded: 0,
  failed: 0,
  nextSeq: 0,
  error: '',
};

export interface CodexQuotaInventorySyncContext {
  jobId: string;
  targetNames: string[];
}

interface CodexQuotaJobStoreState {
  progress: CodexQuotaJobProgress;
  starting: boolean;
  active: boolean;
  inventorySyncContext: CodexQuotaInventorySyncContext | null;
  setProgress: (
    updater:
      | CodexQuotaJobProgress
      | ((current: CodexQuotaJobProgress) => CodexQuotaJobProgress)
  ) => void;
  setStarting: (starting: boolean) => void;
  setActive: (active: boolean) => void;
  setInventorySyncContext: (context: CodexQuotaInventorySyncContext) => void;
  clearInventorySyncContext: (jobId: string) => void;
  reset: () => void;
}

export const useCodexQuotaJobStore = create<CodexQuotaJobStoreState>((set) => ({
  progress: IDLE_CODEX_QUOTA_JOB_PROGRESS,
  starting: false,
  active: false,
  inventorySyncContext: null,
  setProgress: (updater) =>
    set((state) => ({
      progress: typeof updater === 'function' ? updater(state.progress) : updater,
    })),
  setStarting: (starting) => set({ starting }),
  setActive: (active) => set({ active }),
  setInventorySyncContext: (inventorySyncContext) => set({ inventorySyncContext }),
  clearInventorySyncContext: (jobId) =>
    set((state) =>
      state.inventorySyncContext?.jobId === jobId ? { inventorySyncContext: null } : {}
    ),
  reset: () =>
    set({
      progress: IDLE_CODEX_QUOTA_JOB_PROGRESS,
      starting: false,
      active: false,
      inventorySyncContext: null,
    }),
}));
