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
