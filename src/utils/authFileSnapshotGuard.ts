export interface AuthFileSnapshotRequest {
  id: number;
  globalMutationVersion: number;
  targetMutationVersions: Array<[name: string, version: number]>;
}

export interface AuthFileSnapshotDecision {
  applyNames: string[];
  retryNames: string[];
}

export interface AuthFileInventoryRequest {
  id: number;
  targetMutationVersion: number;
}

export class AuthFileSnapshotGuard {
  private nextRequestId = 0;
  private globalMutationVersion = 0;
  private readonly targetMutationVersions = new Map<string, number>();
  private readonly latestRequestByTarget = new Map<string, number>();
  private latestInventoryRequestId = 0;
  private latestCommittedRequestId = 0;
  private latestCommittedInventoryRequestId = 0;
  private targetMutationVersion = 0;

  begin(targetNames: Iterable<string>): AuthFileSnapshotRequest {
    const id = ++this.nextRequestId;
    const targetMutationVersions: Array<[string, number]> = [];

    for (const name of targetNames) {
      this.latestRequestByTarget.set(name, id);
      targetMutationVersions.push([name, this.targetMutationVersions.get(name) ?? 0]);
    }

    return {
      id,
      globalMutationVersion: this.globalMutationVersion,
      targetMutationVersions,
    };
  }

  beginAll(): AuthFileInventoryRequest {
    const request = {
      id: ++this.nextRequestId,
      targetMutationVersion: this.targetMutationVersion,
    };
    this.latestInventoryRequestId = request.id;
    return request;
  }

  markTargetsMutated(targetNames: Iterable<string>): void {
    let changed = false;
    for (const name of targetNames) {
      changed = true;
      this.targetMutationVersions.set(name, (this.targetMutationVersions.get(name) ?? 0) + 1);
    }
    if (changed) this.targetMutationVersion += 1;
  }

  markAllMutated(): void {
    this.globalMutationVersion += 1;
  }

  settleAll(request: AuthFileInventoryRequest): boolean {
    if (
      this.latestInventoryRequestId !== request.id ||
      this.latestCommittedRequestId > request.id ||
      this.targetMutationVersion !== request.targetMutationVersion
    ) {
      return false;
    }

    this.latestCommittedRequestId = request.id;
    this.latestCommittedInventoryRequestId = request.id;
    this.markAllMutated();
    return true;
  }

  isLatestAll(request: AuthFileInventoryRequest): boolean {
    return this.latestInventoryRequestId === request.id;
  }

  cancel(request: AuthFileSnapshotRequest): void {
    for (const [name] of request.targetMutationVersions) {
      if (this.latestRequestByTarget.get(name) === request.id) {
        this.latestRequestByTarget.delete(name);
      }
    }
  }

  settle(request: AuthFileSnapshotRequest): AuthFileSnapshotDecision {
    const applyNames: string[] = [];
    const retryNames: string[] = [];

    for (const [name, mutationVersion] of request.targetMutationVersions) {
      if (this.latestRequestByTarget.get(name) !== request.id) continue;
      this.latestRequestByTarget.delete(name);

      if (this.latestCommittedInventoryRequestId > request.id) continue;

      if (this.latestCommittedRequestId > request.id) {
        retryNames.push(name);
        continue;
      }

      if (
        this.globalMutationVersion !== request.globalMutationVersion ||
        (this.targetMutationVersions.get(name) ?? 0) !== mutationVersion
      ) {
        retryNames.push(name);
        continue;
      }
      applyNames.push(name);
    }

    if (applyNames.length > 0) {
      this.latestCommittedRequestId = Math.max(this.latestCommittedRequestId, request.id);
    }

    return { applyNames, retryNames };
  }
}

interface TargetedAuthFileSnapshotSyncOptions<TSnapshot> {
  targetNames: Iterable<string>;
  guard: AuthFileSnapshotGuard;
  load: () => Promise<TSnapshot>;
  apply: (snapshot: TSnapshot, applyNames: string[]) => boolean;
  maxAttempts?: number;
}

export async function syncTargetedAuthFileSnapshots<TSnapshot>({
  targetNames,
  guard,
  load,
  apply,
  maxAttempts = 3,
}: TargetedAuthFileSnapshotSyncOptions<TSnapshot>): Promise<boolean> {
  let pendingNames = Array.from(new Set(targetNames));

  for (let attempt = 0; attempt < maxAttempts && pendingNames.length > 0; attempt += 1) {
    const request = guard.begin(pendingNames);
    try {
      const snapshot = await load();
      const decision = guard.settle(request);
      if (decision.applyNames.length > 0 && !apply(snapshot, decision.applyNames)) return true;
      pendingNames = decision.retryNames;
    } catch {
      guard.cancel(request);
    }
  }

  return pendingNames.length === 0;
}
