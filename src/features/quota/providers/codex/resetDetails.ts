import type { CodexQuotaState } from '@/types';
import { normalizeAuthIndex } from '@/utils/authIndex';
import type { QuotaFileEntry } from '../../logic';
import type { CodexResetCreditsData } from './data';

const getCredentialFingerprint = (entry: QuotaFileEntry): string =>
  JSON.stringify([
    entry.file.name,
    normalizeAuthIndex(entry.file.authIndex ?? entry.file['auth_index']) ?? '',
  ]);

export const collectCodexResetDetailTargets = (
  entries: QuotaFileEntry[],
  quota: Record<string, CodexQuotaState>,
  inFlight: ReadonlySet<string>
): QuotaFileEntry[] =>
  entries.filter((entry) => {
    if (entry.type !== 'codex' || inFlight.has(entry.file.name)) return false;
    const state = quota[entry.file.name];
    return state?.status === 'success' && state.rateLimitResetCreditsLoaded !== true;
  });

export const mergeCodexResetCreditDetails = (
  current: CodexQuotaState | undefined,
  expected: CodexQuotaState,
  details: CodexResetCreditsData
): CodexQuotaState | null => {
  if (!current || current !== expected || current.status !== 'success') return null;
  const detailCount = details.credits.length > 0 ? details.credits.length : null;
  return {
    ...current,
    rateLimitResetCreditsAvailableCount:
      details.availableCount ?? detailCount ?? current.rateLimitResetCreditsAvailableCount,
    rateLimitResetCreditsApplicableAvailableCount:
      details.applicableAvailableCount ?? current.rateLimitResetCreditsApplicableAvailableCount,
    rateLimitResetCredits: details.credits,
    rateLimitResetCreditsLoaded: true,
    rateLimitResetCreditsError: details.error,
  };
};

type ResetDetailCommit = {
  name: string;
  expected: CodexQuotaState;
  details: CodexResetCreditsData;
  cacheGeneration: number;
};

type ResetDetailSchedulerContext = {
  enabled: boolean;
  entries: QuotaFileEntry[];
  quota: Record<string, CodexQuotaState>;
  cacheGeneration?: number;
  fetchDetails: (entry: QuotaFileEntry) => Promise<CodexResetCreditsData>;
  commitDetails: (result: ResetDetailCommit) => void;
};

export class CodexResetDetailScheduler {
  private context: ResetDetailSchedulerContext | null = null;
  private readonly inFlight = new Set<string>();
  private readonly completed = new Map<string, CodexQuotaState>();
  private active = 0;
  private idleResolvers: Array<() => void> = [];

  constructor(private readonly concurrency: number) {}

  sync(context: ResetDetailSchedulerContext): void {
    this.context = context;
    this.pump();
  }

  pause(): void {
    if (this.context) this.context = { ...this.context, enabled: false };
    this.resolveIdleIfSettled();
  }

  dispose(): void {
    this.context = null;
    this.resolveIdleIfSettled();
  }

  whenIdle(): Promise<void> {
    if (this.active === 0 && !this.nextTarget()) return Promise.resolve();
    return new Promise((resolve) => this.idleResolvers.push(resolve));
  }

  private nextTarget(): { entry: QuotaFileEntry; quota: CodexQuotaState } | null {
    const context = this.context;
    if (!context?.enabled) return null;

    for (const entry of context.entries) {
      const fingerprint = getCredentialFingerprint(entry);
      if (entry.type !== 'codex' || this.inFlight.has(fingerprint)) continue;
      const quota = context.quota[entry.file.name];
      if (
        quota?.status === 'success' &&
        quota.rateLimitResetCreditsLoaded !== true &&
        this.completed.get(fingerprint) !== quota
      ) {
        return { entry, quota };
      }
    }
    return null;
  }

  private pump(): void {
    const limit = Math.max(1, Math.floor(this.concurrency));
    while (this.active < limit) {
      const target = this.nextTarget();
      const context = this.context;
      if (!target || !context) break;

      const name = target.entry.file.name;
      const fingerprint = getCredentialFingerprint(target.entry);
      const cacheGeneration = context.cacheGeneration ?? 0;
      this.inFlight.add(fingerprint);
      this.active += 1;

      void context
        .fetchDetails(target.entry)
        .then((details) => {
          const latest = this.context;
          const stillVisible = latest?.entries.some(
            (entry) => entry.type === 'codex' && getCredentialFingerprint(entry) === fingerprint
          );
          if (!latest?.enabled || !stillVisible) return;
          this.completed.set(fingerprint, target.quota);
          latest.commitDetails({
            name,
            expected: target.quota,
            details,
            cacheGeneration,
          });
        })
        .catch(() => undefined)
        .finally(() => {
          this.inFlight.delete(fingerprint);
          this.active -= 1;
          this.pump();
          this.resolveIdleIfSettled();
        });
    }
    this.resolveIdleIfSettled();
  }

  private resolveIdleIfSettled(): void {
    if (this.active > 0 || this.nextTarget()) return;
    const resolvers = this.idleResolvers;
    this.idleResolvers = [];
    resolvers.forEach((resolve) => resolve());
  }
}
