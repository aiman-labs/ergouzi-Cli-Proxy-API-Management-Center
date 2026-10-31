# AGENTS.md — Ergouzi CPAMC

Ergouzi fork of `router-for-me/Cli-Proxy-API-Management-Center`, published at
`aiman-labs/ergouzi-Cli-Proxy-API-Management-Center`. React/TypeScript/Vite management frontend, not
the proxy server; its single-file `management.html` is consumed by `ergouzi-CLIProxyAPI`.

## Workflow and Delivery

| Task | Skill, when available |
|---|---|
| Refresh workspace context | `ergouzi:workspace-context-refresh` |
| Upstream sync and baseline decisions | `ergouzi:fork-upstream-sync` |
| Release, deploy, rollback and receipts | `ergouzi:release-manager` |

For authorized Codex PR work, use `ergouzi:github-pr-review-loop` when available. Close only after
latest-head review completes and triage leaves no confirmed P0/P1; do not chase an emoji. There is
no fixed round cap: continue with substantive progress, stop and hand off
repetition/oscillation/stalls, and keep unresolved confirmed P0/P1 blocking.

- Releases use `vX.Y.Z-ergouzi.N` from verified upstream releases/tags; if none exists, record the
  exact upstream commit baseline in `docs/upstream-sync/`.
- Preserve hash routing and single-file deployment: `dist/index.html` is renamed to
  `management.html`. Imports/assets/code splitting must not require extra deployed files. Do not
  edit generated `dist/`.
- Keep `__APP_VERSION__` precedence (`VERSION` → git tag → package version → `dev`). The release
  workflow triggers on `v*` tags.
- A panel-only release must not restart CPA or New API unless their runtime/configuration also
  changed.

## Development and Verification

- Use `bun@1.4.3`, pinned in `package.json`, existing `bun.lock`, and CI's configured Node version; do
  not add another package manager's lockfile.
- `bun install --frozen-lockfile`; `bun run dev`; focused tests with
  `bun test tests/<file>.test.ts`; `bun run verify` runs tests, lint and build. `bun run type-check`
  checks `src`, not `tests`; lint does not enforce zero warnings. Format changed files rather than
  all `src/`.
- Tests use `bun:test` under `tests/`, fixtures/helpers in matching subdirectories. Static React
  markup/source checks do not verify browser interactions; there is no configured DOM harness.
  Follow nearby test patterns rather than introducing a framework by default.
- Code changes need relevant regression tests and `bun run verify`; UI changes also need
  affected-route browser checks with screenshots/notes. Report unavailable backend/browser evidence.
  Docs-only work uses content/link/diff checks.

## API, State and Security

- Use `/v8/management` and v8 config only; no v0 data/login fallbacks. Backend-declared
  plugin/custom extension paths remain exceptions. `src/services/api/legacyBackendProbe.ts` may only
  detect outdated backends after a v8-login 404.
- Before contract changes inspect sibling `../ergouzi-CLIProxyAPI` (if available). Backend source
  owns endpoint/payload/provider/OAuth/auth-file/plugin semantics; report missing evidence rather
  than guessing or editing the backend outside scope.
- Reuse `src/services/api/client.ts` and domain modules for authentication, prefix, normalized
  errors/fields and headers. Preserve `unauthorized`, `server-version-update` and
  `server-plugin-support-update` events and backend capability gates.
- Use `useConfigStore.fetchConfig(forceRefresh?)` full-config TTL/deduplication and existing
  mutation invalidation. Preserve stale-request guards and clear caches on logout/connection
  changes; old responses must never overwrite another session.
- Extend provider `descriptors.ts` / `adapters.ts` in `src/features/providers/`, not scattered
  component conditionals. Keep feature code under `src/features/`, shared UI/hooks/utilities in
  their existing directories; do not migrate unrelated legacy pages.
- Never commit/log real management keys, provider credentials, auth files or secret URLs; redact
  fixtures/screenshots. Preserve remember-password semantics. `secureStorage.ts` is reversible
  obfuscation, not encryption; do not weaken authentication, plugin trust or session isolation.

## UI and Style

- Simplified Chinese responses; English code/comments. Follow existing typed React, `@/` imports,
  SCSS Modules and shared UI/theme tokens. Formatting: 2 spaces, semicolons, single quotes, ES5
  trailing commas, 100 columns; use `unknown` and narrowing at untrusted boundaries.
- Keep changes focused and visually consistent. Update all six locale files in `src/i18n/locales/`,
  including accessible labels; preserve `zh-CN` fallback, keyboard/focus and reduced-motion
  behavior.
- Reuse motion tokens in `src/styles/themes.scss` and helpers in `src/hooks/motion.ts`; Vite already
  injects SCSS variables. Prefer existing abstractions to hard-coded colors/motion or broad visual
  rewrites.
- Use Conventional Commits when authorized. PRs follow `.github/PULL_REQUEST_TEMPLATE.md`, with
  actual verification, relevant backend version/reproduction and UI evidence.
- Shared guidance lives here; synchronize `CLAUDE.md` identically if it exists. Shared rules must
  not depend on that ignored/untracked local file.

## Pull Request Template

- Every PR creation or body edit must use the target repository's applicable PR template
  and contribution requirements. Read the template and fill it directly; do not substitute
  a workspace template or a custom outline.
- Preserve every template heading, field and checklist item. Do not delete, rename, merge
  or simplify them. Fill each item with actual results; use N/A with a reason when inapplicable.
- Check items only when supported by evidence. Never check human confirmation, human
  authorship or maintainer approval on the user's behalf.
- If no applicable template is available, report and resolve the template gap before
  creating the PR; do not bypass it with a free-form body. Choose the matching template
  when multiple templates exist.
- After creation or editing, read back the remote PR body and compare its structure,
  checklist and factual status with the template. A local draft or successful command is insufficient.

## Authorization

- Preserve unrelated changes. Branch/worktree creation and commits each require explicit user
  authorization; push, PRs, comments, merge, release and deployment require their own scoped
  authorization.
- Show the exact file scope before committing. Do not add AI signatures, generated-by markers or AI
  co-author trailers; do not rewrite history without explicit authorization.

## Feature Development and Protection

- For feature work, use `ergouzi:feature-workflow` when available; read `docs/features/README.md`
  and `docs/features/registry.json`.
- New behavior uses an authorized `feature/<topic>` branch; bounded regressions may use
  `fix/<topic>` and reuse the feature ID. Update affected records with invariants, focused paths,
  regression entrypoints, upstream provenance/strategy and cross-repository contracts. Inherited
  upstream behavior is not original downstream work.
- Before a PR, read `.github/PULL_REQUEST_TEMPLATE.md` and run
  `node .github/scripts/feature-contract.mjs --repo . --base <intended-base>`. Pure docs changes
  need no new feature ID; the checker does not replace semantic review or tests.
- Sync uses an authorized `sync/upstream-<version>` from verified product main, never direct
  integration on main. Read `docs/upstream-sync/{README.md,conflict-decisions.md,sync-history.md}`
  and any protection matrix; analyze the explicit upstream baseline-to-target delta against the
  registry, then update DEC/matrix/history with actual results and limitations.
- Feature implementation, release and deployment are separate facts. This guidance grants no Git,
  GitHub, release or production permissions.

## Code Review Rules

- Report only high-confidence P0/P1 defects introduced or materially worsened by this PR: critical
  outages or serious reachable correctness, security, billing, data-integrity or production
  regressions.
- Identify the concrete trigger, affected code path and serious consequence, supported by code,
  focused tests or runtime evidence. Do not invent environmental assumptions; an executable exploit
  is unnecessary when the code proves the failure.
- Exclude P2/P3, style, routine refactors, speculative hardening, unrelated old defects, and missing
  tests/docs or convention violations alone. Return no findings when nothing meets the threshold.
- Required CI, tests, human approvals and merge authorization remain separate requirements.
