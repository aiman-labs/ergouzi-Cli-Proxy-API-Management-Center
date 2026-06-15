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
