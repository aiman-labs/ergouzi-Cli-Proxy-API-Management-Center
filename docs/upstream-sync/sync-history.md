# Sync History

## 2026-08-27 Upstream `v1.22.9` Sync

| Item | Value |
|---|---|
| Ergouzi branch before sync | `0f7b776a` |
| Sync branch | `sync/upstream-v1.22.9` |
| Upstream previous baseline | `v1.22.2` / `f60c8ca` |
| Upstream target release | `v1.22.9` / `d249ff00` |
| Upstream non-merge commits adopted | `9` |
| Upstream changed paths | `30` |
| Upstream release diff | `30 files changed, 438 insertions(+), 75 deletions(-)` |
| Local changed paths before records | `32` |
| Sync status | `local verification passed; commit and PR not yet authorized; not released; not deployed` |

Upstream release themes:

- Temporarily hide selected sponsor cards while keeping their configured
  protocol endpoints reachable through generic provider groups.
- Add the BestProxy configuration sponsor link and APIMart documentation
  assets.
- Normalize auth-file quota typography, correct the Claudeapi.com display
  name, and update the Codex User-Agent value.
- Add Claude and Claude API request fingerprint profiles, replacing the
  deprecated experimental CCH-signing control.

Ergouzi integration:

- Applied the exact binary-safe `v1.22.2..v1.22.9` official release diff. All
  `30` upstream changed paths are represented in the final tree.
- Resolved the sole semantic overlap in the provider workbench by adopting the
  upstream hidden-sponsor routing while preserving Ergouzi's generic OpenAI
  classifier, FennoAI OpenAI support, backend `sourceIndex`, and duplicate-card
  isolation. See `DEC-20260827-013`.
- Added explicit visible/hidden regressions for FennoAI and QiniuCloud OpenAI
  entries.
- Preserved the CPAMC single-file release contract and all existing Ergouzi
  auth-file, quota refresh, provider, configuration, and Home-log tests.
- Adopted the Claude fingerprint-profile form, normalization, serialization,
  table indicator, four-locale copy, deprecated-field cleanup, and focused
  provider API regressions from `v1.22.9`.
- Adapted the new Claude update regression to Ergouzi's index-plus-identity
  provider mutation contract rather than weakening duplicate-record safety.
- Corrected the upstream sponsor spacer from `18px` to the rendered `22px`
  sponsor-row height after browser verification exposed a four-pixel desktop
  field misalignment.
- Normalized newly introduced source comments to English while retaining all
  localized user-facing strings.

Verification:

```bash
bun test tests/fennoProvider.test.ts tests/sponsorCustomEndpoint.test.ts
bun run verify
git diff --cached --check
rg -n '^(<<<<<<<|=======|>>>>>>>)' . --glob '!bun.lock'
```

Result:

- Focused provider tests passed `13/13`; the full suite passed `572/572`
  with `1840` assertions.
- ESLint, TypeScript, and the Vite single-file production build passed.
- `dist/index.html` is the sole production build artifact.
- Playwright verified the configuration and quota pages at `1440x900` and
  `390x844`: the sponsor link is present, desktop fields align exactly, quota
  typography is `11.5px`, document-level horizontal overflow is absent, and
  the final mock session emitted no console errors or warnings.
- A fresh `v1.22.9` Mock CPA session also verified the Claude provider table
  `CLI` fingerprint badge and edit form at desktop and `390x844`. Both
  `Default (caller-owned)` and `Claude Code CLI` options are exposed, the
  configured CLI value is selected, the mobile drawer and selector fit the
  viewport exactly, and the fresh browser session emitted zero errors and zero
  warnings.
- Final screenshots are stored under
  `outputs/CHORE-101/output/playwright/`; generated QA output remains outside
  the repository and is not committed.
- No commit, push, pull request, release, or production deployment has been
  performed for this sync.

## 2026-07-27 Upstream `v1.19.3` Sync

| Item | Value |
|---|---|
| Ergouzi branch before sync | `88025ac4` |
| Sync branch | `sync/upstream-v1.19.3` |
| Upstream previous baseline | `v1.18.5` / `6a6a22af` |
| Upstream target tag | `v1.19.3` |
| Upstream target commit | `21af5762` |
| Upstream non-merge commits adopted | `15` |
| Changed files from `v1.18.5` to `v1.19.3` | `42` |
| Upstream release diff | `42 files changed, 1515 insertions(+), 1940 deletions(-)` |
| Pre-PR latest release recheck | `v1.19.3` |
| Status at handoff | `local verification passed; PR review required; not released; not deployed` |

Upstream release themes:

- Add manual OAuth credential refresh and expand provider/configuration
  management behavior.
- Refresh Kimi assets/theme behavior and simplify visual configuration state.
- Continue provider workbench and localization refinements.

Sync findings:

- Applied the exact binary-safe `v1.18.5..v1.19.3` release diff rather than
  unreleased `upstream/main` drift.
- Preserved Ergouzi's auth-file filters, page size `100`, selected and filtered
  batch operations, scoped refresh, and backend whole-pool quota job UX.
- Adopted manual OAuth refresh, but resolve the normalized provider and poll
  the backend inventory for a real result-state change before updating the
  card. See `DEC-20260727-010`.
- Kept visual-config dirty-field concurrency behavior while removing the
  deprecated `codexIdentityConfuse` control introduced upstream.
- Codex review caught an upstream removal of the Home Logs compatibility
  branch. Runtime headers/probing, Home response normalization and pagination,
  request-log routing metadata, Home-specific controls, styles, and localized
  messages are restored. See `DEC-20260727-011`.
- A follow-up review found that the new collapsed-rail tooltip and auth-file
  badge work had removed visible `nav_meta.*` descriptions from the expanded
  sidebar. The final layout keeps the new rail behavior and badges while
  restoring metadata text for expanded and mobile navigation.
- Follow-up reviews also normalized newly added source comments to English and
  found that manual-refresh polling replaced the complete auth-file inventory
  with a potentially stale list response. Polling now merges only the target
  file into the current inventory, preserving concurrent uploads, deletions,
  and status changes. A transient inventory read failure now consumes one
  bounded polling attempt and retries instead of ending the refresh workflow
  immediately. Files with an active manual refresh are also excluded from
  selected and filtered batch status targets, with a second execution-time
  guard covering confirmation-dialog races. The initial completion snapshot is
  built from the raw inventory item rather than display-only quota errors, so a
  synthetic card message cannot end polling after the first read.

Verification:

```bash
bun run verify
git diff --check
rg -n '^(<<<<<<<|=======|>>>>>>>)' . --glob '!bun.lock'
```

Result:

- All `154` tests passed, including manual-refresh provider resolution,
  target-only stale-response merging, concurrent deletion protection,
  display-only error isolation, batch-status exclusion, result polling,
  timeout, runtime-gating, and Home log normalization regressions.
- ESLint, TypeScript compilation, and the Vite single-file production build
  passed.
- Diff check passed and no conflict markers remain.
- No merge, release, or production deployment has been performed for this
  sync.

## 2026-07-22 Upstream `v1.18.5` Sync

| Item | Value |
|---|---|
| Ergouzi branch before sync | `94e408c` |
| Sync branch | `sync/upstream-v1.18.5` |
| Upstream previous baseline | `v1.18.3` / `d3df9b07` |
| Upstream target tag | `v1.18.5` |
| Upstream target commit | `6a6a22af` |
| Upstream non-merge commits adopted | `17` |
| Changed files from `v1.18.3` to `v1.18.5` | `51` |
| Upstream release diff | `51 files changed, 1698 insertions(+), 486 deletions(-)` |
| Local sync working diff before records | `50 files changed, 1662 insertions(+), 458 deletions(-)` |
| Pre-handoff latest release recheck | `v1.18.5` |
| Status at handoff | `local verification passed; commit and PR not yet authorized; not released; not deployed` |

Upstream release themes:

- Add xAI API-key provider management and Kimi provider configuration,
  resource handling, themes, localization, and domestic/international URLs.
- Block OAuth configuration writes after load failures and isolate inline quota
  responses from stale connection generations.
- Isolate provider recent-usage caches by management connection.
- Preserve custom sponsor endpoints and improve provider mutation safety.

Sync findings:

- Applied the exact binary-safe `v1.18.3..v1.18.5` release diff rather than
  unreleased `upstream/main` drift.
- The provider workbench merge keeps index-targeted Codex mutations and all
  existing sponsor recovery behavior while accepting Kimi and xAI CRUD paths.
- Removed a duplicated `cacheGeneration` declaration introduced by the
  overlapping quota-session patch; the existing generation guard remains
  active for success and error commits.
- The release's FennoAI test still expected only Codex and Claude even though
  its provider definition and release intent expose OpenAI. The final result
  keeps matching OpenAI compatibility configs visible and editable. See
  `DEC-20260722-009`.
- Independent review found two related FennoAI integration defects. The final
  implementation preserves backend `sourceIndex` after normalization drops
  malformed rows and excludes FennoAI-owned entries from the generic OpenAI
  group, preventing wrong-record mutations and duplicate provider cards.

Protected Ergouzi surfaces checked:

- Auth-file filtered/selected batch operations, page size `100`, health,
  enabled, error, plan, and success-count filters remain present.
- Whole-pool Codex quota jobs, scoped page refresh, progressive results,
  auth-file snapshot synchronization, and quota governor settings remain
  present.
- Visual-config dirty-field concurrency guards and unknown-key preservation
  remain covered.
- The release workflow still builds the single-file `management.html` asset.

Verification:

```bash
bun run verify
git diff --check
rg -n '^(<<<<<<<|=======|>>>>>>>)' . --glob '!bun.lock'
```

Result:

- All `133` tests passed, including FennoAI backend-index and grouping
  deduplication regressions added after independent review.
- ESLint, TypeScript compilation, and the Vite single-file production build
  passed.
- `dist/index.html` is `2699.27 kB` (`872.10 kB` gzip).
- Diff check passed and no conflict markers remain.
- No commit, push, pull request, release, or production deployment has been
  performed for this sync.

Closeout recorded 2026-07-23:

- The handoff state above is historical, not the current lifecycle state.
- PR `#23` was merged as `cb84e02`; local `main` and `origin/main` point to
  that merge commit, and tag `v1.18.5-ergouzi.1` points to the same commit.
- Release and production deployment were subsequently completed. Their
  canonical evidence is the private
  [CPA release records](https://github.com/aiman-labs/ergouzi-ops/blob/main/docs/runbooks/cpa-fork-release-records.md),
  section `2026-07-22 CPA v7.2.94-ergouzi.1 + CPAMC v1.18.5-ergouzi.1 联合部署记录`;
  do not duplicate production hashes or paths here.

## 2026-07-13 Upstream `v1.18.3` Sync

| Item | Value |
|---|---|
| Ergouzi branch before sync | `9c9f31c` |
| Sync branch | `sync/upstream-v1.18.3` |
| Upstream previous baseline | `v1.17.14` / `fd22c148` |
| Upstream target tag | `v1.18.3` |
| Upstream target commit | `d3df9b07` |
| Upstream non-merge commits adopted | `21` |
| Changed files from `v1.17.14` to `v1.18.3` | `71` |
| Upstream release diff | `71 files changed, 2535 insertions(+), 1389 deletions(-)` |
| Pre-close latest release recheck | `v1.18.3` |
| Sync status | `PR #20 opened; not released; not deployed` |

Upstream release themes:

- Prevent stale quota requests from repopulating cache after a management
  connection switch.
- Save visual configuration by dirty field against the latest server YAML,
  preserving concurrent and unknown configuration values.
- Replace provider whole-list writes with targeted create, update, and delete
  calls, with sponsor mutation recovery after partial failures.
- Add plugin config PATCH behavior, stricter official-plugin trust checks,
  version-selection support, and improved install-settled polling.
- Improve OAuth excluded-model and alias editors, dashboard empty/error state,
  model alias validation, and xAI `using_api` editing.

Sync findings:

- The fork still does not preserve direct upstream tag ancestry, so the exact
  `v1.17.14..v1.18.3` release diff was applied instead of merging unreleased
  `upstream/main` drift.
- Preserved Ergouzi quota search, filters, scoped refresh, disabled credential
  refresh, bounded concurrency, progressive rendering, and post-refresh auth
  snapshot synchronization while accepting upstream cache-generation guards.
- Adopted upstream dirty-field YAML writes and extended them to Ergouzi quota
  governor, capacity-alert, and Codex plan-priority fields. Targeted saves keep
  known siblings and unknown nested keys.
- Adopted targeted sponsor provider mutations while limiting clear operations
  to the visible Ergouzi entry. OpenAI clearing uses the entry index rather than
  deleting every provider sharing a name.
- Kept source-aware plugin polling and delayed restart-required completion
  until the installed store row has refreshed.
- Conflict decisions are recorded in `DEC-20260713-008`.

Protected Ergouzi surfaces checked:

- Auth-file filtered and selected batch operations, page size `100`, plan,
  health, enabled, error, and success-count filters remain present.
- Quota search, plan/enabled/problem filters, limited-concurrency refresh,
  disabled credential actions, Codex reset-expiry controls, and quota-governor
  configuration remain present.
- Unknown visual-config YAML keys survive targeted saves, including nested
  quota and payload sections.
- The release workflow and single-file `management.html` contract remain
  intact.

Verification:

```bash
bun run verify
git diff --check
rg -n '^(<<<<<<<|=======|>>>>>>>)' . --glob '!bun.lock'
```

Result:

- All `92` tests passed, including quota session isolation, provider mutation
  recovery, plugin trust/versioning, and visual-config concurrency coverage.
- ESLint, TypeScript compilation, and the production single-file build passed.
- `dist/index.html` is `2660.72 kB` (`862.35 kB` gzip).
- Playwright smoke checks rendered the login shell at desktop and `390x844`
  mobile viewports with no browser console errors.
- Authenticated browser workflows were not exercised because this local
  worktree was not connected to a CPA backend or supplied a management key.
- Diff check passed, no `.rej` files remain, and the conflict-marker scan
  returned no matches.
- Pull request
  [#20](https://github.com/aiman-labs/ergouzi-Cli-Proxy-API-Management-Center/pull/20)
  was opened for review. No release or production deployment has been performed.

## 2026-07-10 Upstream `v1.17.14` Sync

| Item | Value |
|---|---|
| Ergouzi branch before sync | `53d14c6` |
| Sync branch | `sync/upstream-v1.17.14` |
| Upstream previous baseline | `v1.17.8` / `e9817a8` |
| Upstream target tag | `v1.17.14` |
| Upstream target commit | `fd22c148` |
| Upstream non-merge commits adopted | `24` |
| Changed files from `v1.17.8` to `v1.17.14` | `97` |
| Local sync diff before records | `95 files changed, 3384 insertions(+), 3375 deletions(-)` |
| Pre-close latest release recheck | `v1.17.14` |
| Sync status | `local sync prepared; not pushed; not released; not deployed` |

Upstream release themes:

- Added ClaudeAPI, Code0, FennoAI, and Qiniu Cloud provider management.
- Added XAI pay-as-you-go and weekly billing quota displays.
- Added GitHub Release version selection for plugin installation.
- Refined provider forms, quick fill, resource status layout, and large-scale
  dead-code, locale, style, store, and API cleanup.

Sync findings:

- The fork does not preserve direct upstream tag ancestry, so the sync adopted
  the `24` non-merge commits in release order.
- Accepted deletion of the unused Antigravity subscription hook; active quota
  loading continues through `quotaConfigs.ts` and the shared API service.
- Preserved auth-file page size `100`, refresh warning behavior, error-type and
  plan filters, import-time and priority sorting, and the card quota display
  switch.
- Rejected upstream quota dead-prop cleanup where those props remain active in
  Ergouzi batch refresh, account enable/disable, disabled-card display,
  per-section filters, bounded scrolling, and Codex reset-expiry controls.
- Accepted truly unused global styles and locale keys while preserving every
  locale key referenced by Ergouzi auth-file and quota workflows.
- Combined upstream plugin Release selection with Ergouzi's install-settled
  polling guard, including normalized installed-version comparison.
- Reused the auth-file module's runtime-only credential helper after upstream
  removed its duplicate quota utility export.

Protected Ergouzi surfaces checked:

- Auth-file filtered and selected batch operations, page size `100`, plan,
  health, enabled, error, and success-count filters remain present.
- Import-time and priority ascending/descending sorting remain present.
- The auth-file card quota display remains disabled by default and available
  through its display switch.
- Quota search, plan/enabled/problem filters, limited-concurrency refresh,
  disabled credential actions, and Codex reset-expiry display switch remain
  present.
- Quota governor plan policies, capacity alerts, and recovery-scan reserve
  remain configurable in the visual editor.
- The single-file `management.html` release contract remains intact.

Verification:

```bash
bun install --frozen-lockfile
bun run type-check
bun run build
bun run lint
git diff --check
rg -n '^(<<<<<<<|=======|>>>>>>>)' .
```

Result:

- Type-check passed.
- Production build passed and generated a single-file `dist/index.html`.
- Lint passed.
- Diff check passed and the conflict-marker scan returned no matches.
- No push, pull request, release, or production deployment has been performed.

## 2026-06-15 Fork Mechanism Baseline

| Item | Value |
|---|---|
| Ergouzi main | `e1589dc` |
| Origin main | `e1589dc` |
| Upstream main | `729df08` |
| Merge base | `729df08` |
| Ergouzi commits since upstream | `1` |
| Upstream commits not in Ergouzi | `0` |
| Changed files vs upstream | `8` |

Changed files:

| File | Reason |
|---|---|
| `README.md` | Record Ergouzi fork and deployment relationship |
| `README_CN.md` | Record Ergouzi fork and deployment relationship |
| `src/features/authFiles/constants.ts` | Increase auth-file page-size limit to `100` |
| `src/pages/AuthFilesPage.tsx` | Add batch disable for current filtered auth-file results |
| `src/i18n/locales/en.json` | Add batch-disable labels |
| `src/i18n/locales/ru.json` | Add batch-disable labels |
| `src/i18n/locales/zh-CN.json` | Add batch-disable labels |
| `src/i18n/locales/zh-TW.json` | Add batch-disable labels |

Decisions created:

| Decision | Summary |
|---|---|
| `DEC-20260615-001` | Maintain CPAMC as an Ergouzi management-console fork |
| `DEC-20260615-002` | Publish `management.html` from the Ergouzi fork |
| `DEC-20260615-003` | Preserve filtered auth-file batch disable and page size `100` |

Verification already run for this baseline:

```bash
bun run type-check
bun run build
bun run lint
git diff --check
```

Known deploy requirement: create a `v*` release so this fork publishes
`management.html`; otherwise CLIProxyAPI cannot download the Ergouzi console
from GitHub latest release.

## 2026-06-15 First Production Fork Deploy

| Item | Value |
|---|---|
| Release | `v1.16.6-ergouzi.1` |
| Asset name | `management.html` |
| Asset sha256 | `2b8f136a0d68c0191ded1afc46c61d073a90be8dfcdb3b70a116690a271ee464` |
| Asset size | `2142329` bytes |
| Deployed through | CLIProxyAPI `v7.2.5-ergouzi.2` |

Findings:

- The first tag push did not create a GitHub Actions run, so `workflow_dispatch`
  was added to the release workflow.
- Manual release upload initially used a local filename as the GitHub asset
  name and only set `management.html` as the label. CLIProxyAPI did not accept
  that shape because it searches for asset name `management.html`.
- The release was corrected by uploading an asset actually named
  `management.html`.

Verification:

```bash
gh release view v1.16.6-ergouzi.1 \
  --repo aiman-labs/ergouzi-Cli-Proxy-API-Management-Center \
  --json assets --jq '.assets[] | [.name,.digest,.size] | @tsv'
```

Production `/management.html` matched the release hash after the server-side
`panel-github-repository` config was pointed to the Ergouzi CPAMC fork and the
CPA container was force-recreated.

## 2026-06-15 Stable CPAMC UI Iteration Line

| Item | Value |
|---|---|
| Ergouzi main | `c79feca` |
| Origin main | `c79feca` |
| Upstream main | `729df08` |
| Merge base | `729df08` |
| Ergouzi commits since upstream | `8` |
| Upstream commits not in Ergouzi | `0` |
| Changed files vs upstream | `26` |
| Latest CPAMC release | `v1.16.6-ergouzi.5` |
| Latest asset | `management.html` |
| Latest asset sha256 | `117a99f9832eb46f7a7d8e538ea933817566d642047e43d38fd25493222c2d12` |
| Latest asset size | `2174480` bytes |

This section is a 2026-06-15 historical baseline. Current production deployment
state is recorded in the 2026-06-18 upstream `v1.16.11` sync section below.

Behavior now treated as Ergouzi-local product surface:

| Area | Behavior |
|---|---|
| Auth files | Current-filter batch enable, disable, and delete with second confirmation for high-risk actions |
| Auth filters | Health and enabled-state selects replace the older problem-only / disabled-only switches |
| Auth page size | Supports up to `100` items per page |
| Quota page | Codex first, newest imported credentials first, per-section credential filter, search box, bounded section scroll |
| Quota refresh | Batch refresh and refresh-all labels show the effective operation counts under current filters |
| UI theme | Controls use active color tokens instead of neutral grey-only switch/button states |

Deployment finding:

- CPAMC-only deployment does not require restarting New API or CLIProxyAPI.
- Production CLIProxyAPI caches the downloaded panel at
  `/CLIProxyAPI/static/management.html`.
- If production serves an older `management.html` after a CPAMC release, back up
  and remove the cached file, then request `/management.html` to trigger a fresh
  latest-release download.
- Verify the served file by SHA-256 against the GitHub release asset and by UI
  markers such as `健康状态`, `启用状态`, and `搜索账号`.

## 2026-06-16 Upstream Plugin And Logs Refresh

| Item | Value |
|---|---|
| Ergouzi main before sync | `7a9b9e1` |
| Upstream previous baseline | `729df08` |
| Upstream target | `b0db1df` |
| Merge base | `729df08` |
| Upstream commits adopted | `4` |
| Merge result | clean merge, staged and verified before commit |

Upstream changes adopted:

| Area | Summary |
|---|---|
| Plugin store | Default source labels, third-party source support, safer install warning copy, repository link display |
| Visual config | `plugins.store-sources` editor support |
| Logs | Incremental fetching supports `cursor` plus legacy `after` fallback |

Protected Ergouzi surfaces checked:

| Area | Result |
|---|---|
| Release contract | No upstream change touched `vite.config.ts`, release workflow, or the `management.html` asset name |
| Auth files | No merge conflict with filtered batch enable/disable/delete, success-count filter, health filter, enabled-state filter, or page size `100` |
| Quota page | No merge conflict with Codex-first quota ordering, quota availability filter, batch refresh counts, search, or bounded section scroll |
| Upstream-sync docs | Preserved Ergouzi local sync records; no new DEC entry was needed |

Verification target before closing:

```bash
bun run type-check
bun run build
bun run lint
git diff --check
git diff --cached --check
rg -n '<<<<<<<|=======|>>>>>>>' .
```

## 2026-06-17 Upstream v1.16.10 Sync

| Item | Value |
|---|---|
| Ergouzi main before sync | `cd9365c` |
| Upstream previous baseline | `b0db1df` |
| Upstream target tag | `v1.16.10` |
| Upstream target commit | `c74fa6d` |
| Merge base | `b0db1df` |
| Upstream commits adopted | `6` |
| Merge result | one conflict in `src/pages/AuthFilesPage.tsx`, resolved by preserving Ergouzi filters and upstream Antigravity subscription loading |

Upstream changes adopted:

| Area | Summary |
|---|---|
| Quota | New quota data structures and UI formatting, including Xai remaining amount and SuperGrok plan resolution |
| Auth files | Antigravity subscription loading and subscription badge styling |
| Plugins | Runtime state polling after plugin changes |
| I18n | New locale strings for quota and Antigravity subscription UI |

Protected Ergouzi surfaces checked:

| Area | Result |
|---|---|
| Release contract | `vite.config.ts` still uses `vite-plugin-singlefile`; release workflow still publishes asset name `management.html` |
| Config panel | Vertical category layout and Codex `quota-auto-disable` visual config fields are still present |
| Auth files | Filtered batch enable/disable/delete, success-count filter, health/enabled filters, and page size `100` were preserved |
| Auth file conflict | `displayPageItems` still injects quota issue status messages, while upstream `useAntigravitySubscriptions(pageItems)` feeds Antigravity cards |
| Quota page | Codex quota behavior remains present while upstream quota formatting updates are adopted |

Verification:

```bash
bun run type-check
bun run build
bun run lint
git diff --check
```

`package.json` has no `test` script in this CPAMC repository, so no automated
unit test command was available for this sync.

## 2026-06-18 Upstream v1.16.11 Sync

| Item | Value |
|---|---|
| Ergouzi main before sync | `cd528c3` |
| Sync branch | `sync/upstream-v1.16.11` |
| Upstream previous baseline | `v1.16.10` / `c74fa6d` |
| Upstream target tag | `v1.16.11` |
| Upstream target commit | `069eaf2` |
| Merge base | `c74fa6d` |
| Upstream commits adopted | `1` |
| Changed files from `v1.16.10` to `v1.16.11` | `11` |
| Pre-merge latest release recheck | `v1.16.11` |
| Sync status | `merged, released, deployed` |
| Ergouzi release tag | `v1.16.11-ergouzi.1` |
| Production asset | `management.html` |
| Production deploy time | `2026-06-18` |

Upstream changes adopted:

| Area | Summary |
|---|---|
| Antigravity quota | Subscription / plan display and localized quota labels |
| Auth files | Upstream removal of Antigravity subscription badge logic from auth-file cards |
| I18n | New Antigravity subscription and quota label strings across zh-CN, zh-TW, en, and ru |

Protected Ergouzi surfaces checked:

| Area | Result |
|---|---|
| Release contract | `vite.config.ts` was not touched; release workflow and `management.html` asset contract remain unchanged |
| Config panel | Vertical category layout and Codex `quota-auto-disable` visual config fields remain present |
| Auth files | Filtered batch enable/disable/delete, success-count filter, error-type filter, health/enabled filters, and page size `100` were preserved |
| Auth file provider detection | Kept Ergouzi provider-first detection via `resolveAuthProvider(file)` in `AuthFileCard` |
| Quota page | Codex quota behavior remains present while upstream Antigravity quota formatting updates are adopted |

Conflict handling:

- `src/components/quota/quotaConfigs.ts`: accepted upstream Antigravity
  subscription display while preserving Ergouzi's no-project-id fallback,
  legacy `payload.models` fallback, and description fallback for reset labels.
- `src/features/authFiles/components/AuthFileCard.tsx`: preserved provider-first
  detection so mixed-shape auth files with `provider: "antigravity"` are still
  recognized correctly.
- `src/pages/AuthFilesPage.tsx`: preserved Ergouzi auth-file filters and quota
  issue status injection; dropped the now-unused Antigravity subscription hook
  after upstream removed the card badge consumer.
- Antigravity-specific automated review comments after this sync should be
  treated as deferred unless they break compilation, tests, or an Ergouzi-owned
  workflow.

Verification:

```bash
bun run type-check
bun run build
bun run lint
git diff --check
git diff --cached --check
rg -n '^(<<<<<<<|=======|>>>>>>>)' .
```

Result:

- `bun run type-check` passed after the worktree merge.
- `bun run build` passed after the worktree merge.
- `bun run lint` passed after the worktree merge.
- `git diff --check` passed.
- `git diff --cached --check` passed.
- Conflict-marker scan returned no matches.
- Released as `v1.16.11-ergouzi.1`.
- GitHub `release.yml` workflow did not auto-run from the tag immediately, so
  it was manually dispatched and completed successfully.
- Release asset:
  - Name: `management.html`
  - Size: `2231405` bytes
  - SHA-256: `281195bb093b86034abec21c4465a79db1e1c6fbcb910934ad9b2089e3aec8a7`
- Production was updated by backing up and deleting the container cached
  `/CLIProxyAPI/static/management.html`, then requesting `/management.html` to
  fetch the latest release asset.
- Post-deploy verification passed:
  - served `/management.html` size is `2231405` bytes
  - served `/management.html` SHA-256 matches the release asset
  - UI markers `健康状态`, `启用状态`, and `搜索账号` are present
- unauthenticated `https://cpa.ergouzi.life/management.html` returns
  Cloudflare Access `302`

## 2026-06-19 Upstream `v1.17.0` Sync

| Item | Value |
|---|---|
| Ergouzi main before sync | `65e4745` |
| Sync branch | `sync/upstream-v1.17.0` |
| Upstream previous baseline | `v1.16.11` / `069eaf2` |
| Upstream target tag | `v1.17.0` |
| Upstream target commit | `32699c9` |
| Upstream commits adopted | `7` |
| Changed files from `v1.16.11` to `v1.17.0` | `8` |
| Pre-merge latest release recheck | `v1.17.0` |
| Sync status | `local worktree branch; not released; not deployed` |

Upstream release commits:

```text
32699c9 Merge pull request #321 from router-for-me/feat/config-editor-simple-full-mode
1a8e059 fix(config): improve handling of jump requests and enhance collapsible component state management
a1d2e11 feat(search): enhance keyboard navigation and highlight for search results
96e41f5 fix(config): jump correctly across horizontally snapped sections
aa114b2 feat: add search index for visual config editor and update i18n translations
b5344a7 refactor(config): flatten advanced section and card-style simple-mode fields
9a154c7 feat(config): add simple/full editor modes and task-oriented sections
```

Sync findings:

- The merge conflicted in `src/components/config/VisualConfigEditor.tsx`
  because Ergouzi previously changed the visual config panel and upstream
  introduced simple/full editor modes plus global config search in the same
  component.
- Resolved the conflict by using upstream `v1.17.0` as the structural base,
  preserving upstream simple/full mode, search index, keyboard navigation, and
  collapsible behavior.
- Kept Ergouzi's preferred visual-config default by opening the upstream
  simple/full editor in `full` mode when the browser has no saved preference.
- Re-applied Ergouzi Codex quota auto-disable controls inside the upstream quota
  section, including enable toggle, interval field, threshold field, validation
  errors, section error count, and search-index entries.

Protected Ergouzi surfaces checked:

| Area | Result |
|---|---|
| Release contract | `management.html` single-file build still succeeds through `vite-plugin-singlefile` |
| Config panel | Upstream simple/full/search behavior is adopted; Ergouzi default remains full left-nav mode, and quota auto-disable controls remain configurable |
| Search | Upstream config search can find Ergouzi quota auto-disable fields |
| Deployment | No production deployment has been performed for this sync |

Verification:

```bash
bun install --frozen-lockfile
bun run type-check
bun run build
bun run lint
git diff --check
git diff --cached --check
rg -n '^(<<<<<<<|=======|>>>>>>>)' .
```

Result:

- `bun install --frozen-lockfile` installed the worktree dependencies without
  changing tracked files.
- `bun run type-check` passed.
- `bun run build` passed and produced a single-file `dist/index.html`.
- `bun run lint` passed.
- `git diff --check` passed.
- `git diff --cached --check` passed.
- Conflict-marker scan returned no matches.
- No release or production deployment has been performed for this sync.

## 2026-08-07 Upstream `v1.22.2` Sync

| Item | Value |
|---|---|
| Ergouzi branch before sync | `5919a8df` |
| Sync branch | `sync/upstream-v1.22.0` |
| Upstream previous baseline | `v1.19.3` / `21af5762` |
| Upstream target release | `v1.22.2` / `f60c8ca` |
| Upstream commits adopted | `77` |
| Upstream changed paths | `260` |
| Final changed paths | `274` |
| CatPaw work | `CHORE-094` |
| Sync status | `prepared for PR; not yet released or deployed` |

Upstream release themes:

- Reorganized the application into feature-owned pages and introduced the new
  auth vault, unified quota grid/timeline, and sectioned configuration editor.
- Expanded provider management, excluded-model controls, plugin resources,
  dashboard telemetry, and single-file build behavior.
- Added provider and quota model support required by CPA releases through
  `v7.2.121`.
- Added the official Codex quota-timeline lane selection correction and the
  complete Infistar provider configuration, branding, persistence, locale, and
  regression-test surface from `v1.22.1..v1.22.2`.

Ergouzi integration:

- Preserved auth import options, advanced error/success/plan filters, quota
  details, manual-refresh settling, and page-scoped selected operations.
- Restored backend Codex whole-inventory refresh jobs, disabled-credential
  governance, page size `100`, progressive bounded direct refresh, and auth
  inventory synchronization.
- Integrated all quota-governor, capacity-alert, and Codex plan-priority fields
  into the new config registry and editor.
- Preserved Home runtime logs, source-aware plugin polling, sponsor protocols,
  duplicate provider index handling, and unknown config fields.
- Verified that all 260 upstream changed paths are represented in the final
  tree; the additional paths are Ergouzi compatibility code, tests, docs, and
  release workflow assets.
- Closed the PR review regressions without changing the established operation
  scopes: auth-file selected actions remain current-page only, so the misleading
  filtered-result selection entry was removed; the unified Codex quota tab now
  restores safe account search, normal/problem and plan filters, per-card status
  toggles, and filtered-result batch enable/disable with concurrency limited to
  four workers.
- Auth-file detail PATCHes now invalidate the edited credential's model cache
  and the shared quota cache before reloading inventory, preventing stale
  derived data after proxy, header, or excluded-model changes.
- Dashboard manual refresh bypasses the short-lived model cache, while its
  auth-file inventory loader rejects superseded or previous-connection
  responses before they can overwrite current health and traffic data.
- Dashboard credential grouping now reuses the centralized auth-provider
  resolver, preserving provider-field precedence and xAI aliases. Provider
  totals, success rates, and sorting are calculated from the same rolling
  buckets as the visible traffic window instead of lifetime counters.
- Dashboard API-key usage deduplication is scoped by provider and, when the
  auth-file response exposes it, base URL. Reusing one key string across
  providers or endpoints no longer hides unrelated credential traffic.
  OpenAI-compatible auth-file provider IDs are also aligned with the usage
  endpoint's compatibility names, preventing duplicate provider rows.
- Auth-file filtered deletion freezes the exact persistent result names at
  confirmation and intersects them with current inventory at execution, so
  hidden, runtime-only, or newly imported credentials cannot be deleted.
- Disabled credentials remain refreshable for operator rechecks, while the
  quota reset control now reflects the existing prohibition on reset writes.
- Page and whole-pool quota refreshes are disabled and guarded while a reset
  write is active, including delayed refresh-all confirmation callbacks.
- Source comments introduced by the new feature-owned modules are normalized
  to English; localized runtime strings, provider names, and locale assertions
  remain unchanged.

Verification:

```bash
bun run verify
git diff --check
rg -n '^(<<<<<<<|=======|>>>>>>>)' .
```

Result:

- `527/527` tests passed, including a 1600-Codex inventory target regression
  and a four-worker concurrency bound.
- ESLint, TypeScript, and the production single-file Vite build passed.
- The build produced `dist/index.html` as the sole release artifact.
- All four locale files contain the same 1880 leaf keys.
- Conflict-marker and rejected-hunk scans returned no matches.
- Release and production deployment remain pending PR acceptance.

## 2026-06-20 Upstream `v1.17.1` Sync

| Item | Value |
|---|---|
| Ergouzi main before sync | `4653ae0` |
| Sync branch | `sync/upstream-v1.17.1` |
| Upstream previous baseline | `v1.17.0` / `32699c9` |
| Upstream target tag | `v1.17.1` |
| Upstream target commit | `ed4124f` |
| Merge base | `32699c9` |
| Upstream commits adopted | `1` |
| Changed files from `v1.17.0` to `v1.17.1` | `30` |
| Sync status | `local worktree branch; not released; not deployed` |

Upstream release commit:

```text
ed4124f refactor: remove Gemini CLI references and related code
```

Sync findings:

- The merge conflicted where Ergouzi had expanded quota management and visual
  config surfaces around Codex account-pool operations.
- Resolved by accepting upstream Gemini CLI removal while preserving Ergouzi
  Codex/Pro quota filters, account search, enabled-state filters, batch refresh
  counts, visual quota-governor settings, and auth-file batch operation UX.
- Removed Gemini CLI quota/OAuth/config i18n residues from all maintained
  locale files so the UI does not advertise removed surfaces.
- Recorded `DEC-20260620-007` to keep future upstream syncs from resurrecting
  pre-`v1.17.1` Gemini CLI management code by accident.

Protected Ergouzi surfaces checked:

| Area | Result |
|---|---|
| Release contract | `management.html` single-file build still succeeds through `vite-plugin-singlefile` |
| Auth files | Filtered batch enable/disable/delete, selected-item operations, health/enabled filters, and page size `100` remain present |
| Quota page | Codex-first ordering, quota search, plan/enabled/problem filters, bounded section scroll, and batch operation counts remain present |
| Config panel | Codex quota governor settings remain configurable in the visual editor |
| Deployment | No production deployment has been performed for this sync |

Verification:

```bash
bun run type-check
bun run build
bun run lint
git diff --check
rg -n '^(<<<<<<<|=======|>>>>>>>)' .
```

Result:

- `bun run type-check` passed.
- `bun run build` passed and produced a single-file `dist/index.html`.
- `bun run lint` passed.
- `git diff --check` passed.
- Conflict-marker scan returned no matches.
- No release or production deployment has been performed for this sync.

## 2026-06-30 Upstream `v1.17.8` Sync

| Item | Value |
|---|---|
| Ergouzi branch before sync | `d5735e6` |
| Sync branch | `sync/upstream-v1.17.8` |
| Upstream previous baseline | `v1.17.7` / `acf432b` |
| Upstream target tag | `v1.17.8` |
| Upstream target commit | `e9817a8` |
| Merge base | `acf432b` |
| Upstream commits adopted | `4` |
| Changed files from `v1.17.7` to `v1.17.8` | `18` |
| Local sync working diff | `18 files changed, 1065 insertions(+), 57 deletions(-)` |
| Pre-PR latest release recheck | `v1.17.8` |
| Sync status | `local sync prepared; not released; not deployed` |

Upstream release themes:

- Added Antigravity client configuration and user agent builder settings.
- Added WebSocket support in the auth-files prefix proxy editor and related
  localization.
- Added plugin store authentication configuration in visual config.
- Improved plugin store authentication handling in `useVisualConfig`.

Sync findings:

- The merge had content conflicts in:
  - `src/features/plugins/PluginStorePage.tsx`
  - `src/hooks/useVisualConfig.ts`
- Resolved `PluginStorePage.tsx` by keeping upstream's versioned install request
  shape and pre-restart install-state wait while preserving Ergouzi's
  `isPluginStoreInstallSettled` helper.
- Resolved `useVisualConfig.ts` by preserving Ergouzi's extracted YAML
  parse/apply helper structure and adding upstream `plugins.store-auth` parsing
  and serialization into those helpers. This avoids regressing the recently
  added Pro/Plus/Team quota policy and capacity alert fields.
- Protected Ergouzi surfaces remain intact after the merge:
  - `management.html` remains the single-file release artifact contract.
  - Auth-file filtered batch actions, selected-item scope, plan filter, quota
    display switch, and page size `100` remain present.
  - Quota page Codex-first ordering, plan/enabled/problem filters, plan-policy
    config, and capacity alert config remain present.
  - Codex quota card reset-credit expiry details remain hidden by default behind
    the display switch.

Verification:

```bash
bun install --frozen-lockfile
bun run type-check
bun run build
bun run lint
git diff --check
rg -n '^(<<<<<<<|=======|>>>>>>>)' .
```

Result:

- `bun install --frozen-lockfile` completed for the isolated worktree.
- `bun run type-check` passed.
- `bun run build` passed and produced a single-file `dist/index.html`.
- `bun run lint` passed.
- `git diff --check` passed.
- Conflict-marker scan returned no matches.
- No release or production deployment has been performed for this sync.

## 2026-06-26 Upstream `v1.17.7` Sync

| Item | Value |
|---|---|
| Ergouzi branch before sync | `138d0a3` |
| Sync branch | `sync/upstream-v1.17.7` |
| Upstream previous baseline | `v1.17.6` / `d7847da` |
| Upstream target tag | `v1.17.7` |
| Upstream target commit | `acf432b` |
| Merge base | `d7847da` |
| Upstream commits adopted | `4` |
| Changed files from `v1.17.6` to `v1.17.7` | `105` |
| Local sync working diff | `97 files changed, 2523 insertions(+), 1341 deletions(-)` |
| Pre-merge latest release recheck | `v1.17.7` |
| Sync status | `local sync prepared; not released; not deployed` |

Upstream release commits:

```text
c37b026 Refactor code for improved readability and consistency
2ec1a71 feat: update AuthFiles status filter modes and localization for improved functionality
213671b Refactor AuthFilesStatusFilterCard and related components for improved styling and functionality
acf432b feat: update trackWrapper styles for improved thumb positioning
```

Sync findings:

- Accepted upstream's shared UI, provider-workbench, API client, i18n bootstrap,
  style, recent-request, quota utility, and layout refinements.
- Accepted the new upstream `AuthFilesStatusFilterCard` source files as unused
  upstream assets, but did not wire them into Ergouzi's auth-file page.
- Resolved conflicts in `AuthFilesPage.tsx`,
  `AuthFilesPage.module.scss`, and `src/features/authFiles/uiState.ts` by
  preserving Ergouzi's current auth-file search and filter model. Upstream
  `v1.17.7` collapses the page around a single status-filter mode, which would
  remove Ergouzi-owned health, enabled, error-type, success-count, Codex plan,
  selected-item, and filtered-result batch-operation surfaces.
- Resolved quota conflicts by preserving Ergouzi's Codex quota card and section
  behavior, including Codex-first ordering, quota search, plan/enabled/problem
  filters, batch operation counts, and the reset-credit expiry display switch.
- Resolved locale conflicts by keeping Ergouzi's richer search placeholders and
  detailed filter labels, while adding upstream's new status-filter translation
  keys so the upstream component files remain internally complete.

Protected Ergouzi surfaces checked:

| Area | Result |
|---|---|
| Release contract | `management.html` single-file build remains the release artifact contract |
| Auth files | Filtered batch enable/disable/delete, selected-item scope, health/enabled/error filters, success-count filter, Codex plan filter, and page size `100` remain present |
| Quota page | Codex-first ordering, account search, plan/enabled/problem filters, bounded section scroll, batch operation counts, and batch refresh remain present |
| Codex quota cards | Reset-credit expiry details remain hidden by default behind the display switch |
| Deployment | No production deployment has been performed for this sync |

Verification:

```bash
bun run type-check
bun run build
bun run lint
git diff --check
rg -n '^(<<<<<<<|=======|>>>>>>>)' .
```

Result:

- `bun run type-check` passed.
- `bun run build` passed and produced a single-file `dist/index.html`.
- `bun run lint` passed.
- `git diff --check` passed.
- Conflict-marker scan returned no matches.
- No release or production deployment has been performed for this sync.

## 2026-06-25 Upstream `v1.17.5` Sync

| Item | Value |
|---|---|
| Ergouzi main before sync | `5dcd268` |
| Sync branch | `sync/upstream-v1.17.5` |
| Upstream previous baseline | `v1.17.1` / `ed4124f` |
| Upstream target tag | `v1.17.5` |
| Upstream target commit | `e144cf3` |
| Merge base | `ed4124f` |
| Upstream commits adopted | `22` |
| Changed files from `v1.17.1` to `v1.17.5` | `49` |
| Sync status | `local worktree branch; not released; not deployed` |

Upstream release themes:

- Added APIKEY.FUN provider management, quick-start UI, sponsor key usage check,
  and related provider workbench refinements.
- Added plugin OAuth support and resource UI refinements.
- Added Codex reset-credit expiry display and GMT+8 expiry label localization.
- Updated quota config builders, quota types, provider logos, dashboard shortcut
  cards, and maintained locale files.

Sync findings:

- The merge applied cleanly with no content conflicts.
- Accepted upstream APIKEY.FUN provider management and plugin OAuth UI changes
  because they do not replace Ergouzi-owned Codex account-pool operations.
- Accepted upstream Codex reset-credit expiry display. It is additive to the
  existing Ergouzi Codex quota cards and does not change batch refresh or
  auto-governor semantics.
- Preserved the CPAMC release asset policy documentation added before this sync.
- No new DEC entry was required because no non-obvious conflict decision was
  made.

Protected Ergouzi surfaces checked:

| Area | Result |
|---|---|
| Release contract | `management.html` single-file build remains the release artifact contract |
| Auth files | Filtered batch enable/disable/delete, selected-item scope, health/enabled/error filters, and page size `100` remain present |
| Quota page | Codex-first ordering, account search, plan/enabled/problem filters, bounded section scroll, batch operation counts, and batch refresh remain present |
| Codex quota cards | Pro 20x / Pro 5x plan labels remain present; upstream reset-credit expiry display is additive |
| Config panel | Codex quota governor settings remain configurable in the visual editor |
| Deployment | No production deployment has been performed for this sync |

Verification:

```bash
bun run type-check
bun run build
bun run lint
git diff --check
rg -n '^(<<<<<<<|=======|>>>>>>>)' .
```

Result:

- `bun run type-check` passed.
- `bun run build` passed and produced a single-file `dist/index.html`.
- `bun run lint` passed.
- `git diff --check` passed.
- Conflict-marker scan returned no matches.
- No release or production deployment has been performed for this sync.

## 2026-06-26 Upstream `v1.17.6` Sync

| Item | Value |
|---|---|
| Ergouzi branch before sync | `bec0dce` |
| Sync branch | `sync/upstream-v1.17.6` |
| Upstream previous baseline | `v1.17.5` / `e144cf3` |
| Upstream target tag | `v1.17.6` |
| Upstream target commit | `d7847da` |
| Merge base | `e144cf3` |
| Upstream commits adopted | `1` |
| Changed files from `v1.17.5` to `v1.17.6` | `1` |
| Local sync working diff | `1 file changed, 11 insertions(+), 2 deletions(-)` |
| Pre-merge latest release recheck | `v1.17.6` |
| Sync status | `local sync prepared; not released; not deployed` |

Upstream release commit:

```text
d7847da feat: enhance plugin normalization to support legacy OAuth providers
```

Sync findings:

- Accepted upstream's legacy OAuth provider normalization in
  `src/services/api/plugins.ts`, which lets older plugin list payloads infer the
  OAuth provider from plugin ID when `supports_oauth` is true and
  `oauth_provider` is absent.
- The tag merge conflicted with Ergouzi's current Codex reset-credit UI changes
  in quota config, reset-credit parsing, and locale files because the previous
  Ergouzi release had already modified those surfaces. The final sync keeps
  Ergouzi's current behavior unchanged:
  - Codex reset consumes the first available reset credit and reports
    `reset_credits_unavailable` when none exists.
  - Codex reset-credit expiry rows remain hidden by default unless
    `showCodexResetCreditExpiries` is enabled.
  - Reset-credit parser still rejects available credits without an ID.
- No new DEC entry was required because the only upstream functional change
  adopted was narrow and the Codex conflict resolution followed the already
  released Ergouzi CPAMC `v1.17.5-ergouzi.2` behavior.

Protected Ergouzi surfaces checked:

| Area | Result |
|---|---|
| Release contract | `management.html` single-file build remains the release artifact contract |
| Auth files | Filtered batch enable/disable/delete, selected-item scope, health/enabled/error filters, and page size `100` remain present |
| Quota page | Codex-first ordering, account search, plan/enabled/problem filters, bounded section scroll, batch operation counts, and batch refresh remain present |
| Codex quota cards | Reset-credit expiry details remain hidden by default behind the display switch |
| Deployment | No production deployment has been performed for this sync |

Verification:

```bash
bun run type-check
bun run build
bun run lint
git diff --check
rg -n '^(<<<<<<<|=======|>>>>>>>)' .
```

Result:

- `bun run type-check` passed.
- `bun run build` passed and produced a single-file `dist/index.html`.
- `bun run lint` passed.
- `git diff --check` passed.
- Conflict-marker scan returned no matches.
- No release or production deployment has been performed for this sync.
