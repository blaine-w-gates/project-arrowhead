# ADR-002: Tenant Model – Individual-Only MVP

- Status: Accepted
- Date: 2025-10-11

## Context
We need to launch quickly with minimal complexity. Team accounts introduce ownership, roles, and data partitioning complexities.

## Decision
- MVP supports individual users only.
- Projects and subscription state are scoped to the user.
- Team constructs (accounts table, roles, invitations) are deferred to a future epic.

## Consequences
- Faster implementation and simpler data model.
- Future team support will require introducing an `accounts` table and migrating user-owned records to account-owned records.
