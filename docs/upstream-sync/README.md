# Ergouzi CPAMC Upstream Sync

Latest verified lifecycle: `v1.27.0-ergouzi.1` was merged and released on 2026-11-01 (UTC+8); see [lifecycle record](sync-history.md#2026-11-01-v1270-ergouzi1-released). Authorized deployment and stage receipts are separately recorded in private Ops; historical candidate restrictions below are not current lifecycle state.

功能开发先读 [Feature registry](../features/README.md) 和
[功能索引](../features/registry.json)。同步前用两个明确的上游端点运行重叠分析；
功能记录、DEC、保护矩阵与同步历史一起维护。下文旧候选/发布描述保留历史语境，
2026-10-20 本地核验与下方候选描述均为历史快照；最新生命周期见文首记录，生产状态须另外核实。

Lightweight rules for maintaining
`aiman-labs/ergouzi-Cli-Proxy-API-Management-Center` while periodically syncing
`router-for-me/Cli-Proxy-API-Management-Center`.

## Model

| Item | Rule |
|---|---|
| Production line | `main` in the Ergouzi fork |
| Upstream | `router-for-me/Cli-Proxy-API-Management-Center`, fetch-only |
| Default sync style | Review official release delta on `sync/upstream-<version>` from verified product main |
| Temporary branches | Required for each sync; creation and main updates require authorization |
| Decision source | `conflict-decisions.md` |
| History source | `sync-history.md` |

There is no always-on `upstream-sync` branch for now. Create one only if a
future sync becomes large enough to need a pure upstream review base.

## Rules

- Publish `management.html` from this fork.
- Keep this fork public. Production CPA downloads `management.html` from this
  repository's GitHub latest release without a GitHub token.
- Never open pull requests against the upstream repository. All Ergouzi sync PRs
  must target `aiman-labs/ergouzi-Cli-Proxy-API-Management-Center`; use explicit
  commands such as
  `gh pr create -R aiman-labs/ergouzi-Cli-Proxy-API-Management-Center --head aiman-labs:<branch>`
  instead of relying on GitHub CLI auto-detection.
- Keep the single-file Vite build contract unless CLIProxyAPI changes with it.
- Protect Ergouzi auth-file operations and account-pool UX.
- Treat CPAMC-only deployments as static asset refreshes; do not restart New API
  or CLIProxyAPI unless the server fork/config changed.
- Formal Ergouzi CPAMC tags must have GitHub Releases, and the release asset
  must be named exactly `management.html`.
- Preserve plugin-store source awareness in the UI. The same plugin ID can
  appear from official and Ergouzi registries; operators must be able to
  distinguish by source/repository.
- Keep i18n keys aligned across zh-CN, zh-TW, en, and ru.
- Record only non-obvious choices as DEC entries; do not document trivial merges.
- Before closing a sync, run type-check, build, lint, `git diff --check`, and a conflict-marker scan.
- Check the latest upstream release tag at both the start of a sync and again
  immediately before merging the PR. If a newer release appears during review,
  stop and explicitly choose whether to retarget the sync or merge the current
  release with a written follow-up.
- Treat automated PR review as advisory. Fix comments that identify a real
  regression in the management UI, Ergouzi auth-file/account-pool workflows, or
  code just changed by the PR. Do not keep expanding a sync for unrelated
  provider edge cases or unused surfaces; record those as deferred/ignored when
  needed.
- After a sync PR is merged, update local `main` from `origin/main` and verify
  that the local working tree is clean and `HEAD` equals `origin/main`.

## Normal Sync Checklist

1. Fetch `origin` and `upstream`.
2. Check worktree cleanliness.
3. Identify the latest upstream release tag and the previous contained release
   tag. Do not use unreleased upstream commits as the normal sync target.
4. Count merge base, upstream commits, Ergouzi commits, and touched files.
5. Resolve conflicts by behavior, not by blindly choosing one side.
6. Add or update DEC entries for real tradeoffs.
7. Update `sync-history.md` with snapshot and verification.
8. Before merging the PR, re-check the latest upstream release tag and record
   whether the PR is still targeting the latest release.
9. After merging, fast-forward local `main` to `origin/main`.

## Cross-Repo Contract

CLIProxyAPI consumes this repository through:

```yaml
remote-management:
  panel-github-repository: "https://github.com/aiman-labs/ergouzi-Cli-Proxy-API-Management-Center"
```

If upstream changes the release workflow, `vite.config.ts`, or output path,
review the CLIProxyAPI contract at the same time.

## 2026-10-31 release-delta candidate

The current synchronization candidate covers `v1.26.4..v1.27.0` in full.
See the dated sync-history entry and `DEC-20261031-018` for preserved downstream
contracts, exact provenance, validation limits and independent upgrade constraints.
This record does not claim merge, release or deployment.
