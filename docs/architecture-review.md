# Architecture review: October 4, 2026

Scope: source review, actual SQL migrations in embedded PostgreSQL with modeled Supabase roles, upload-failure simulations, dependency audit and production build. This is an engineering review, not an independent penetration test. The production account remains signed out, so an actual production file upload/download and delivered verification email are not verified.

## Trust boundaries

| Component | Responsibility | Boundary |
| --- | --- | --- |
| Vercel static React app | Forms, navigation, rendering | Browser input and cached sessions are untrusted; UI controls are not permissions. |
| Supabase Auth | Account identity and verification | Server-validated JWTs feed RLS. Confirm Email must remain enabled. |
| PostgreSQL RLS | Ownership, private reads, public review | Author-only private access; approved public reads; moderators cannot read private submissions. |
| Supabase private Storage bucket | Actual file bytes | Owner paths, immutable uploads, size/count/account limits, signed attachment downloads. |
| Sanity published collection | Curated public content | Asset URLs remain public independently of a document's publication state. Never put private files there. |

## Changes in this PR

| Finding | Correction | Regression coverage |
| --- | --- | --- |
| Deleting submissions resets the live-row daily counter | Separate private event ledger with the same per-author transaction lock | Five create/delete cycles block a sixth attempt; allowance returns after 24 hours. |
| An authenticated role alone does not prove an email was verified | Restrictive policies require confirmed Auth email for writes/uploads | Unconfirmed and email-less accounts cannot create profiles or submit/upload. |
| Binary upload MIME was chosen only by the browser | Bucket accepts application/octet-stream; metadata guard rejects active MIME | Bucket setting and HTML metadata rejection checked; real API enforcement still needs rollout QA. |
| Quota completion skipped when auth.uid() was absent | Quota uses persisted owner and validates size metadata | 20 MB/file, 100 MB/account, 25 objects and JWT-less metadata completion checked. |
| A lost INSERT response can cause deletion of a successfully saved file | Confirm an existing listing; preserve bytes for uncertain outcomes; cleanup only definitive rejections | Lost response, unavailable confirmation, constraint rejection and failed cleanup simulated. |
| Session change can temporarily reuse loaded private results | Bind loaded results and account components to the current user | Source-reviewed session binding; interactive multi-account QA remains pending. |

Existing tests retain coverage for anonymous/other-user/moderator isolation, public review, invalidated approval after visibility changes, owner deletion, unsafe links and idempotent owner import. Embedded tests do not execute the provider's real object service, signed URL expiry, distributed/concurrent requests, email delivery or hosted CSP.

## Remaining priorities

1. **Complete verification email delivery and real account QA.** Configure a sender, verify delivery to a non-organization email, confirm exact redirects, password minimum, Auth rate limits and recovery. Keep signup confirmation enabled. The current UI message alone is not proof an email arrived.
2. **Back up metadata and file bytes separately, with a recovery flow.** Supabase database backups omit Storage objects. Add object backup plus a tested restore procedure. Design a recoverable trash state before physically deleting bytes, and a way to reconcile orphan files from interrupted saves.
3. **Quarantine and scan before public approval.** Have an authenticated server reserve a user-owned object, stream/scan the upload, then mark it eligible for moderation. Only server-owned scan results should authorize public downloads. Moderator approval alone cannot certify a file is safe.
4. **Replace the custom Storage metadata trigger with an upload reservation service.** Supabase advises against altering managed Storage schema. The current trigger reduces quota bypasses but has upgrade/integration risk. A replacement must reserve bytes atomically, prevent direct upload bypass, reconcile failed uploads, and validate actual uploaded size. Avoid a migration that removes enforcement before its replacement works.
5. **Protect moderator accounts and add an audit trail.** Add MFA with server-side assurance checks for moderation and record approval, rejection and visibility events without logging file contents, passwords, tokens or unnecessary personal data.
6. **Improve resource management.** Add editing with re-review on public changes, pagination beyond the current 100-row limit, upload progress/cancellation, and clear recovery for unattached files. Editing must preserve author/file ownership and reset approval for changed public content.
7. **Control abuse and operational cost.** The durable daily limit restricts successful submissions, not repeated upload/delete bandwidth. Add server-enforced rolling upload-byte/request limits and monitored thresholds. Validate real parallel requests against the hosted provider; the embedded suite does not prove concurrency behavior.

## Dependency audit

The audit still reports eight high-severity dependency-chain entries rooted in braces 3.0.3, brought in through Sanity CLI code generation. The official advisory lists no patched version, and the npm registry still returns 3.0.3 as latest at review time. No audit bypass or untrusted patch is introduced. User-controlled code-generation glob patterns are not exposed through the app, but the finding still prevents calling the audit clean. Do not run untrusted code-generation patterns in CI or an administrative shell.

## Rollout

1. Merge the PR, apply `202610040002_security_review.sql` once after `202610040001_private_spaces.sql`, and deploy the frontend. The migration is backward compatible with the currently deployed client, which already sends binary attachments.
2. Check verified owner access to the three private projects, anonymous and other-user denial, public review transitions and bucket restrictions.
3. Using a verified account and a disposable file, test the actual Storage API: upload, owner signed download, anonymous denial, public approval, return to private and expiry of previously issued URLs. Test on a non-production fixture environment where deletion is permitted.
4. Exercise provider metadata completion and parallel quota requests in that environment. Check failed saves do not remove committed objects. Inspect unattached objects if a network test leaves uncertain state.
5. Re-run test/build/audit checks. Audit remains an explicit known failure until an upstream correction is available.

## Primary references

- https://supabase.com/docs/guides/auth/auth-anonymous
- https://supabase.com/docs/guides/auth/general-configuration
- https://supabase.com/docs/guides/storage/buckets/creating-buckets
- https://supabase.com/docs/guides/storage/schema/design
- https://supabase.com/docs/guides/platform/backups
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
