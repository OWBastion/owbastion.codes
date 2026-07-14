# Data and Security Boundaries

## Data ownership

| Store | Current responsibility |
| --- | --- |
| D1 | QQ bindings, player accounts, submissions, attachment metadata, idempotency records, audit events, login attempts, and sessions |
| R2 | Private submission evidence when the EVIDENCE_BUCKET binding is configured |
| Bastion Git and snapshots | Released game content and version history |

Queues, KV-backed rate limits, OCR artifacts, corrections, decisions, grants,
drafts, and delivery state are planned platform capabilities, not implemented
storage surfaces in this repository.

## Implemented service boundary

QQBot service calls require the configured QQBOT_API_TOKEN and channel:write
role. Binding, submission, and QQ login verification writes require an
idempotency key and record an audit event. The current authenticator does not
issue a maintainer identity, so the maintainer-protected group-access route is
not operational until a maintainer authentication flow is added.

When EVIDENCE_BUCKET is bound, the API accepts only HTTPS attachment sources,
rejects local and link-local targets, requires an image content type, limits
the downloaded body to 10 MiB, hashes the bytes, and stores them under a
submission-scoped private R2 key. It does not expose object keys, source URLs,
or QQ OpenIDs from public status and player endpoints.

## Private login and player data

QQ login codes, attempt tokens, session tokens, group OpenIDs, and member
OpenIDs are private. The database stores hashes of the short-lived attempt
token and code. Login attempts expire after two minutes; a verified browser
session expires after 30 days. The Portal receives a session cookie only after
the platform verifies a code from an enabled group with an existing group-scoped
binding.

GET /v1/me returns only the authenticated player's name, numeric player ID,
binding status, and up to five recent player-facing submissions. QQ identities,
evidence objects, source URLs, and audit payloads do not cross the API boundary.

## Public-repository policy

The repository is public. Do not commit credentials, tokens, production
endpoints, private identifiers, user screenshots, internal risk signals, signed
URLs, or copied private logs. Public documentation should describe contracts
and boundaries without exposing operational access details.
