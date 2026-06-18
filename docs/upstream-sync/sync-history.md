# Sync History

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
| Sync status | `merged into worktree branch, not deployed` |

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
- No production deployment has been performed for this sync.
