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
