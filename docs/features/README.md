# Feature Protection Registry

`registry.json` indexes the requirements, invariants, source surfaces, regression
entrypoints and upstream treatment of customized capabilities. Read its linked
repository documents for the actual design and DEC decisions.

New capabilities and changed business rules use `feature/<topic>` and update an
affected record in the same change. Bounded fixes may use `fix/<topic>` and reuse
an existing identity. Branch/worktree creation, commit, push, PR and merge remain
separately authorized actions. Pure documentation changes need no new feature ID.

```bash
node .github/scripts/feature-contract.mjs --repo .
node .github/scripts/feature-contract.mjs --repo . --base origin/main --branch feature/topic
node .github/scripts/feature-contract.mjs --repo . --upstream-base <previous-official-ref> --upstream-target <target-official-tag>
```

The checker is read-only. It uses cached Git refs and never executes the listed
verification commands. PR ranges start at merge-base; upstream analysis compares
the two explicit upstream endpoints, including forks with snapshot/squash history.
Use the repository's documented baseline exception when one exists.

Every record needs a stable `PREFIX-F001` ID, title/summary, state, origin,
upstream_strategy, nonempty invariants/paths/verification/docs and dependencies
(`[]` when none). States: planned/implemented/retired. Origins:
downstream/hybrid/upstream. Strategies: preserve/reconcile/replace-if-equivalent/drop.
Paths support `*`, `**`, `?`; docs must be existing repository files. Dependencies
name another repository, feature ID and compatibility contract. Keep IDs after
replacement or removal; retirement/drop requires `retirement_decision` pointing
to an existing document. Add new source roots to `source_paths` as they appear.

Initial records are protection seeds from existing code and documents, not a
complete historical feature audit. Expand focused path coverage as work touches
unregistered surfaces. Do not label inherited upstream features as downstream.
`implemented` describes source, not a release or deployment; existing verification
entrypoints do not prove the current candidate passed. Planned items do not
protect implemented code. Review semantic and cross-repository effects even when
no path overlaps. Record migration/compatibility/recovery details in linked design.

Use `ergouzi:feature-workflow` for development and `ergouzi:fork-upstream-sync`
for release-driven integration. The checker and PR workflow are managed copies
from the private workspace skill's `feature-workflow/scripts/install-checker.mjs`;
edit the canonical source and distribute it, avoiding copy drift. Runtime secrets
and private operational facts do not belong in this registry or public PRs.

The PR workflow configuration only becomes runnable after authorized publication.
Required status checks and direct-push protections require repository settings;
local checks alone do not enforce remote branch protection.
