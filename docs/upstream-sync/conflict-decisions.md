# Conflict Decisions

This file records final Ergouzi decisions for CPAMC upstream sync.

Status values:

| Status | Meaning |
|---|---|
| `decided` | Final unless a future upstream change directly conflicts |
| `review` | Needs user or second-reviewer confirmation |
| `deferred` | Intentionally postponed |

## DEC-20260615-001: Maintain CPAMC as an Ergouzi management-console fork

| Field | Value |
|---|---|
| Status | `decided` |
| Area | workflow |
| Upstream base | `729df08` |
| Ergouzi source | `e1589dc` |

Final decision: Ergouzi uses
`aiman-labs/ergouzi-Cli-Proxy-API-Management-Center` as the management-console
fork. Changes are made directly on `main`; upstream is synced periodically but
is not the deployment source.

Review notes: Keep upstream as fetch-only. Do not propose PRs back to CPAMC for
Ergouzi-specific operations.

## DEC-20260615-002: Publish management.html from the Ergouzi fork

| Field | Value |
|---|---|
| Status | `decided` |
| Area | release |
| Upstream base | `729df08` |
| Ergouzi source | `e1589dc` |

Final decision: The CPAMC release workflow remains the path for producing
`management.html`. CLIProxyAPI downloads this asset from the Ergouzi CPAMC
latest release.

Review notes: Any upstream sync touching `.github/workflows/release.yml`,
`vite.config.ts`, or build output paths must preserve the server contract or
update the server fork in the same change set.

## DEC-20260615-003: Preserve filtered auth-file batch disable and page size 100

| Field | Value |
|---|---|
| Status | `decided` |
| Area | auth-files |
| Upstream base | `729df08` |
| Ergouzi source | `e1589dc` |

Final decision: Auth file management keeps Ergouzi's batch-disable operation
for the current filtered result and allows page size up to `100`.

Review notes: This is operational tooling for CPA account-pool management. If
upstream later implements similar batch actions, compare semantics before
replacing Ergouzi behavior.

## DEC-20260615-004: Release asset name must be management.html

| Field | Value |
|---|---|
| Status | `decided` |
| Area | release |
| Upstream base | `729df08` |
| Ergouzi source | `51b3f04` |

Final decision: The release asset consumed by CLIProxyAPI must be named exactly
`management.html`. GitHub release labels are not enough because the server
matches the asset `name` field.

Review notes: Keep `workflow_dispatch` on the release workflow so the tag can
be rebuilt manually when tag push events do not run.

## DEC-20260615-005: Treat account-pool operations as Ergouzi-owned UX

| Field | Value |
|---|---|
| Status | `decided` |
| Area | auth-files / quota |
| Upstream base | `729df08` |
| Ergouzi source | `c79feca` |

Final decision: CPAMC account-pool management UX is an Ergouzi-owned operational
surface. Preserve the CRUD-style filter list pattern: filters narrow the visible
list, batch actions operate on the current filtered scope, and dangerous actions
require second confirmation.

Review notes: Upstream UI changes can be adopted only after checking that they
do not regress filtered batch enable/disable/delete, quota search, quota
credential filters, operation-count labels, or large-list scrolling.

## DEC-20260615-006: CPAMC-only deploy refreshes static asset cache

| Field | Value |
|---|---|
| Status | `decided` |
| Area | deployment |
| Upstream base | `729df08` |
| Ergouzi source | `c79feca` |

Final decision: A CPAMC-only release updates the `management.html` asset and the
production static cache. It does not require a New API deploy, a CLIProxyAPI
image deploy, or a `cli-proxy-api` container restart.

Review notes: If the latest GitHub release is correct but production serves an
old page, refresh `/CLIProxyAPI/static/management.html` in the CPA container and
verify the served SHA-256. Do not change `config.yaml` or restart services just
to pick up a CPAMC UI-only release.

## DEC-20260620-007: Accept upstream Gemini CLI management removal

| Field | Value |
|---|---|
| Status | `decided` |
| Area | quota / oauth / visual-config |
| Upstream base | `v1.17.1` / `ed4124f` |
| Ergouzi source | `4653ae0` |

Final decision: CPAMC adopts upstream `v1.17.1` removal of Gemini CLI
management surfaces. Do not keep Gemini CLI quota cards, OAuth login labels,
visual-config endpoint toggles, quota store fields, or auth-file issue
injection paths when syncing this release.

Review notes: Preserve Ergouzi-owned Codex/Pro quota management and auth-file
batch operation UX while removing Gemini CLI-specific UI and config residues.
If CPA reintroduces Gemini CLI as a supported runtime later, treat it as a new
feature design instead of resurrecting stale pre-`v1.17.1` CPAMC code.

## DEC-20260713-008: Merge v1.18.3 concurrency fixes without replacing Ergouzi operations

| Field | Value |
|---|---|
| Status | `decided` |
| Area | quota / visual-config / providers / plugins |
| Upstream base | `v1.18.3` / `d3df9b07` |
| Ergouzi source | `sync/upstream-v1.18.3` |

Final decision: adopt upstream cache-generation invalidation, dirty-field YAML
writes, targeted provider APIs, and plugin install/config safety fixes while
preserving the Ergouzi-owned operational behavior around them.

Quota refresh keeps Ergouzi search and filters, scoped page/all refresh,
disabled credential refresh, concurrency limit `4`, progressive results, and
auth-file snapshot synchronization. Stale requests may finish, but their quota
state, notifications, and follow-up synchronization are discarded after the
cache generation changes.

Visual-config saves patch only dirty fields against current server YAML.
Ergouzi quota-governor, capacity-alert, and Codex plan-priority fields follow
the same rule, preserving untouched known values and unknown nested keys.

Sponsor provider changes use targeted create, update, and delete APIs. Clearing
a protocol removes only the visible Ergouzi sponsor entry; OpenAI clearing uses
its list index and does not delete hidden same-name providers. Multi-protocol
mutations remain non-transactional, so failures must refresh the snapshot while
preserving the original error.

Plugin installs keep source-aware polling and wait for the first settled store
row even when the backend reports that a restart is required. Official trust
requires both the official source and an official repository.

Review notes: future upstream syncs must retain quota generation tests, visual
config concurrency/unknown-key tests, sponsor mutation recovery, and plugin
trust/version-settling tests. A fully atomic sponsor mutation would require a
new backend transaction or stable-identity API and is deferred beyond this
sync.

## DEC-20260722-009: Keep FennoAI OpenAI configurations visible and editable

| Field | Value |
|---|---|
| Status | `decided` |
| Area | providers / FennoAI |
| Upstream base | `v1.18.5` / `6a6a22af` |
| Ergouzi source | `sync/upstream-v1.18.5` |

Final decision: FennoAI remains a three-protocol provider in CPAMC: OpenAI,
Codex, and Claude. OpenAI-compatible entries named for FennoAI are aggregated
into its resource so operators can view and edit configurations already
supported by the provider form. Preserve each normalized entry's backend
`sourceIndex`, and exclude FennoAI-owned entries from the generic OpenAI group.

Review notes: The upstream release definition and stated fix expose OpenAI, but
the new aggregation test retained the older two-protocol expectation. Keep the
test aligned with the visible form contract and retain malformed-row index and
group-deduplication regressions. If FennoAI OpenAI support is later removed,
remove the protocol, aggregation, persistence path, and tests together.

## DEC-20260727-010: Preserve Ergouzi auth operations and settle manual OAuth refreshes

| Field | Value |
|---|---|
| Status | `decided` |
| Area | auth files / quota refresh |
| Upstream base | `v1.19.3` / `21af5762` |
| Ergouzi source | `sync/upstream-v1.19.3` |

Final decision: Keep Ergouzi's multi-dimensional auth-file filters, page size
`100`, selected/current-filter batch operations, scoped page refresh, and
whole-pool backend Codex quota jobs while adopting upstream's OAuth manual
refresh action.

Manual refresh resolves the provider from the normalized auth file, sends the
backend refresh request, and then polls the auth-file inventory until refresh
state actually changes or a bounded timeout expires. The UI must not present
the PATCH acknowledgement as a completed credential refresh, and an unrelated
timestamp-only update is not sufficient evidence of completion.

Review notes: Provider inference must stay centralized so Codex, Kimi, xAI, and
future OAuth providers use the correct refresh route. Keep the polling bounded
and reuse the latest backend file snapshot rather than introducing a second
front-end quota cache.

## DEC-20260727-011: Preserve Home runtime log compatibility

| Field | Value |
|---|---|
| Status | `decided` |
| Area | logs / Home runtime |
| Upstream base | `v1.19.3` / `21af5762` |
| Ergouzi source | `sync/upstream-v1.19.3` |

Final decision: Keep runtime detection from Home/CPA response headers with the
`/nodes` fallback probe. Only CPA requires `logging-to-file` before loading
logs. Home `{logs: [...]}` responses are normalized into ordered lines,
pagination is completed up to the requested limit, and request-log downloads
retain the record's `home_ip` routing metadata.

Home database logs cannot be cleared from CPAMC, and CPA-only error-log file
operations stay unavailable in Home mode. Preserve the runtime notice,
localized recovery messages, and their responsive styles.

Review notes: Do not infer the file-logging gate from configuration alone.
Removing runtime identity silently disables a supported Home management
surface even when the generic CPAMC build and CPA-only tests pass.

## DEC-20260807-012: Adopt the v1.22.2 redesign without weakening Ergouzi operations

| Field | Value |
|---|---|
| Status | `decided` |
| Area | auth files / quota / config / providers / logs |
| Upstream base | `v1.22.2` / `f60c8ca` |
| Ergouzi source | `sync/upstream-v1.22.0` |

Final decision: adopt the complete upstream `v1.22.2` release, including the
new feature-oriented page structure, provider workbench, configuration editor,
quota timeline, and single-file build changes. Reapply Ergouzi behavior at the
new ownership boundaries instead of retaining the deleted legacy page modules.

The quota page includes disabled credentials, supports page sizes through
`100`, refreshes the current page directly with global concurrency `4`, and
uses the CPA backend job for every Codex credential in a whole-inventory
refresh. Results are published progressively, drained terminal jobs reconcile
the targeted auth snapshots, and quota errors remain available to auth-file
error filtering in the current UI session.

Quota refreshes now reconcile authentication metadata in the background and
merge only the credentials targeted by that refresh. Unchanged snapshots keep
their existing object and list references, so 401 governance and automatic
disablement remain visible without entering whole-inventory loading or
redrawing unrelated cards.

The auth-file page preserves import options, import-time and priority sorting,
error/success-count/Codex-plan filters, quota details, bounded manual-refresh
polling, and page-scoped selected-item operations. Batch status changes exclude
credentials whose manual refresh is active. Search includes operational
metadata but never the backend `account` field because API-key credentials may
store the raw secret there.

Visual configuration keeps quota-governor, capacity-alert, and Codex
plan-priority fields in the new section registry and dirty-field YAML merge.
Provider updates use backend list indexes to disambiguate duplicate identities,
preserve unknown fields, and retain hidden sponsor entries. Home log runtime
support and source-aware plugin polling remain supported.

The release-gate retarget also adopts the Codex timeline lane selection fix and
the complete Infistar provider integration. Infistar-owned OpenAI-compatible
entries are excluded through the same centralized generic-provider classifier
used by existing sponsor providers, preserving the fork's duplicate-identity
and hidden-entry behavior.

Review notes: keep the 1600-credential inventory/concurrency regressions, four
locale key parity, config-field registry parity, provider duplicate-index
tests, Home log compatibility tests, and the release asset contract as gates
for later upstream redesigns.
