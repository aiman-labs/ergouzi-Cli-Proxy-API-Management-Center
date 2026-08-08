export interface AuthFileSnapshotRequest {
  id: number;
  globalMutationVersion: number;
  targetMutationVersions: Array<[name: string, version: number]>;
}

export interface AuthFileSnapshotDecision {
  applyNames: string[];
  retryNames: string[];
}

export class AuthFileSnapshotGuard {
  private nextRequestId = 0;
  private globalMutationVersion = 0;
  private readonly targetMutationVersions = new Map<string, number>();
  private readonly latestRequestByTarget = new Map<string, number>();

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

  markTargetsMutated(targetNames: Iterable<string>): void {
    for (const name of targetNames) {
      this.targetMutationVersions.set(name, (this.targetMutationVersions.get(name) ?? 0) + 1);
    }
  }

  markAllMutated(): void {
    this.globalMutationVersion += 1;
  }

  settle(request: AuthFileSnapshotRequest): AuthFileSnapshotDecision {
    const applyNames: string[] = [];
    const retryNames: string[] = [];

    for (const [name, mutationVersion] of request.targetMutationVersions) {
      if (this.latestRequestByTarget.get(name) !== request.id) continue;
      this.latestRequestByTarget.delete(name);

      if (
        this.globalMutationVersion !== request.globalMutationVersion ||
        (this.targetMutationVersions.get(name) ?? 0) !== mutationVersion
      ) {
        retryNames.push(name);
        continue;
      }
      applyNames.push(name);
    }

    return { applyNames, retryNames };
  }
}
