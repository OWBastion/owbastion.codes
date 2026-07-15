# Integrations and Workflows

This document describes public contracts and current implementation boundaries.
It intentionally omits credentials, private endpoints, deployment configuration,
and private operational data.

## Implemented platform slice

The current API implements versioned v1 QQ flows:

- authenticated QQBot calls create or update a group-scoped player binding from
  a mutable player name and stable numeric player ID;
- authenticated QQBot calls create a map-completion submission using stable QQ
  group/member and source-message metadata;
- writes require an idempotency key; equal retries replay the original response
  and a changed reuse is rejected;
- D1 stores player accounts, bindings, submissions, attachment metadata,
  idempotency records, audit events, QQ login attempts, and sessions;
- when EVIDENCE_BUCKET is configured, submission creation validates and
  retrieves HTTPS image sources, writes private objects to R2, and records
  content metadata;
- public submission status exposes only the opaque submission ID, map,
  timestamps, and status;
- the Portal can create and poll a one-time QQ login attempt, then display the
  bound player and up to five recent submissions after session verification.

Evidence persistence currently occurs inside submission creation; no Queue or
OCR worker is implemented.

## Submission lifecycle

~~~text
received
→ evidence_pending
  ├→ ocr_pending
  └→ resubmission_required
~~~

received is used when no evidence bucket is configured. With an evidence
bucket, a new submission is evidence_pending during retrieval, becomes
ocr_pending after every attachment is stored, or becomes
resubmission_required for unavailable, unsupported, or invalid-size source
images. evidence_stored is reserved by the current contract but is not written
by the service.

OCR processing, ready_for_review, review decisions, grants, pull requests,
and releases are future states. When those are implemented, only approved may
enter grant processing; rejected and resubmission_required must remain explicit
non-grant outcomes.

## QQBot and login

QQBot is a channel adapter. It sends /绑定, /成就挑战, and /验证 requests to the
API and does not perform OCR, review, title, or GitHub logic.

A Portal login attempt creates a six-character code valid for two minutes.
The user sends /验证 CODE in an enabled QQ group. The API verifies that the
same group-scoped QQ identity has an existing binding before consuming the
code, records the group environment, and issues a 30-day browser session when
the Portal later polls the verified attempt. QQBot replies and recalls the code
message only after a successful verification.

Group access is managed through the Access-protected `/admin` Portal. The Worker
accepts maintainer requests only when the Access email is in `ADMIN_EMAILS`.
QQBot reads the enabled group snapshot with its service token at startup and on
the configured refresh interval; it keeps the last successful snapshot when a
later refresh fails and fails closed before the first successful snapshot.

## Future integrations

OCRKit remains the recognition-only service; future platform orchestration must
persist raw versioned OCR evidence and keep human corrections separate. Bastion
changes must remain reviewable, idempotent, and reconciled through its own CI
and release process. Neither integration is implemented in this repository yet.
