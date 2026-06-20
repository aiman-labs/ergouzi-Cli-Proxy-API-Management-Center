# AGENTS.md — Ergouzi CPAMC

This repository is the Ergouzi fork of the CLI Proxy API Management Center. It
builds the single-file `management.html` asset used by Ergouzi CPA.

## Repository Role

- Upstream: `router-for-me/Cli-Proxy-API-Management-Center`
- Ergouzi fork: `aiman-labs/ergouzi-Cli-Proxy-API-Management-Center`
- Release artifact: `management.html`
- Production consumer: `ergouzi-CLIProxyAPI`

CPAMC-only releases update the management panel asset. They should not restart
New API or CPA runtime unless the server fork or production configuration also
changed.

## Ergouzi Workflow Skills

- When the user says `刷新 Ergouzi 工作上下文`,
  `同步二狗工作流上下文`, `Ergouzi context refresh`, or asks a thread to
  catch up with recent Ergouzi repo/workflow changes, use
  `ergouzi:workspace-context-refresh` before continuing.
- For upstream synchronization, baseline selection, conflict DEC records, and
  sync PR preparation, use `ergouzi:fork-upstream-sync` first.
- For CPAMC release, tag, `management.html` asset publication, production panel
  cache refresh, rollback, and verification, use `ergouzi:cpa-release-manager`.
- For GitHub PRs that rely on Codex automated review, use
  `ergouzi:github-pr-review-loop`. Treat `👀` as review in progress and `👍` or
  "Didn't find any major issues" as the accepted signal for the latest commit.
- Ergouzi CPAMC releases use upstream release/tag baselines with
  `vX.Y.Z-ergouzi.N` tags when an upstream version exists. If upstream has no
  release/tag, record the upstream commit baseline in `docs/upstream-sync/`.

## Commands

```bash
bun install --frozen-lockfile
bun run type-check
bun run build
bun run lint
```

The production release asset must be named exactly `management.html`.

## Working Rules

- Default response language is Simplified Chinese; code and comments use
  English.
- Keep UI changes consistent with the existing management-console design.
- Prefer focused UX changes over broad visual rewrites.
- Do not commit management keys, auth files, production URLs with secrets, or
  local-only credential notes.
- Before committing, show the exact staged file scope.
- Do not add AI signatures, generated-by footers, or AI co-author trailers.
