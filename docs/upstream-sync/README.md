# Ergouzi CPAMC Upstream Sync

Lightweight rules for maintaining
`aiman-labs/ergouzi-Cli-Proxy-API-Management-Center` while periodically syncing
`router-for-me/Cli-Proxy-API-Management-Center`.

## Model

| Item | Rule |
|---|---|
| Production line | `main` in the Ergouzi fork |
| Upstream | `router-for-me/Cli-Proxy-API-Management-Center`, fetch-only |
| Default sync style | Review and merge/cherry-pick on `main` |
| Temporary branches | Create only for large or risky conflicts |
| Decision source | `conflict-decisions.md` |
| History source | `sync-history.md` |

There is no always-on `upstream-sync` branch for now. Create one only if a
future sync becomes large enough to need a pure upstream review base.

## Rules

- Publish `management.html` from this fork.
- Keep the single-file Vite build contract unless CLIProxyAPI changes with it.
- Protect Ergouzi auth-file operations and account-pool UX.
- Keep i18n keys aligned across zh-CN, zh-TW, en, and ru.
- Record only non-obvious choices as DEC entries; do not document trivial merges.
- Before closing a sync, run type-check, build, lint, `git diff --check`, and a conflict-marker scan.

## Cross-Repo Contract

CLIProxyAPI consumes this repository through:

```yaml
remote-management:
  panel-github-repository: "https://github.com/aiman-labs/ergouzi-Cli-Proxy-API-Management-Center"
```

If upstream changes the release workflow, `vite.config.ts`, or output path,
review the CLIProxyAPI contract at the same time.
