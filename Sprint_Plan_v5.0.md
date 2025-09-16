Sprint Plan v5.0: Operation: Launchpad
Version: 5.0


Date: September 10, 2025


Epic: Operation: Launchpad — Activate the user-acquisition funnel from content discovery to email onboarding


Objective: With the Control Panel epic complete and operations stable, shift to external activation. Connect the Lead Magnet to our ESP (ConvertKit), finalize pillar content, and prepare for a public launch with an automated onboarding sequence.


1) Grounding & Dependencies
Current State Summary
- Email capture: `client/src/components/LeadMagnetForm.tsx` posts to Cloudflare Pages Function `functions/api/lead-magnet.ts`, which writes to Supabase via REST. No ESP wiring exists yet.
- Content: Three pillar posts are published in `website-integration/ArrowheadSolution/content/blog/` (HSE Guide, High-Performance Teams, Strategic Planning Mistakes). Drafts remain excluded by frontmatter `published: false`.
- Onboarding: "Endeavour Cycle" is referenced in copy but not implemented in an ESP sequence.

Critical External Dependency (BLOCKER)
- ConvertKit credentials required before Sprint 1 implementation can start:
  - CONVERTKIT_API_KEY
  - CONVERTKIT_FORM_ID (we will subscribe to a Form; not a Sequence)
  - Optional: Tag ID (for segmenting), retained for future iteration

Decisions Ratified (to incorporate)
- Subscribe Target: Form (not Sequence) for ConvertKit automations flexibility.
- Opt-in Policy at Launch: Single Opt-In to minimize friction; include a feature flag to switch to Double Opt-In later.
- Data Mapping: Capture `email` only for this epic. (Add `first_name` in a later iteration.)
- Failure Semantics: On ConvertKit API failure, return success to the user, log the failure, and flag the Supabase record for future retry/sync.
- Data Backfill: Defer. Track as a post-launch backlog item.

Engineering Guardrails (to implement)
- Feature flags & env:
  - CONVERTKIT_ENABLED=true|false (gate external calls)
  - CONVERTKIT_API_KEY, CONVERTKIT_FORM_ID (required when enabled)
  - CONVERTKIT_BASE_URL=https://api.convertkit.com/v3 (overrideable for tests)
  - CONVERTKIT_TIMEOUT_MS=4000 (tunable)
  - CONVERTKIT_DOUBLE_OPT_IN=true|false (launch value: false)
- Testability hooks:
  - Allow overriding `CONVERTKIT_BASE_URL` in CI/E2E to a mock server.
  - Return a debug indicator (e.g., `convertkit_called: true/false`) in non-prod or when an E2E header is present, without leaking secrets.
- Observability & idempotency:
  - Structured logs with redaction.
  - Treat duplicates as success (idempotent boundary) and align with Supabase "ignore-duplicates" policy already in place.


2) Organized & Prioritized Backlog (with Estimates)
High, Medium — ConvertKit API integration in `functions/api/lead-magnet.ts` (Form subscribe)

High, Small — Feature flags + secrets wiring (Cloudflare Pages env per environment)

High, Small — Add E2E test: mock ConvertKit via BASE_URL override; assert UI success + backend call path

High, Small — Content finalization pass on 3 pillars (SEO/meta, links, CTAs)

Medium, Small — Docs: Update `docs/lead-magnet-api.md` to include ConvertKit wiring and flags

Medium, Small — Observability: redact logs; expose minimal debug for E2E

Medium, Small — Supabase flag for retry: mark failed ConvertKit syncs (e.g., `needs_sync=true`) via table or metadata

Low, Small — Post-launch: backfill existing Supabase leads to ConvertKit safely (one-time job)


3) Sprint Breakdown
Sprint 1 — Integration & Automation (3–5 days)
Scope
- ConvertKit API Integration
  - Update `website-integration/ArrowheadSolution/functions/api/lead-magnet.ts` to subscribe emails to ConvertKit Form.
  - Use `CONVERTKIT_API_KEY` and `CONVERTKIT_FORM_ID`. Keep `CONVERTKIT_BASE_URL` overrideable for testing.
  - Respect `CONVERTKIT_ENABLED` and `CONVERTKIT_DOUBLE_OPT_IN` flags.
  - On upstream failure: return success to UI, log error, and flag Supabase record for later retry (e.g., add `needs_sync=true`).
  - Timeouts and retries: set `CONVERTKIT_TIMEOUT_MS`; no infinite loops.
  - Security: do not expose secrets to the client; CORS enforcement remains as-is.
- Feature Flags & Secrets Management
  - Configure Cloudflare Pages environment variables for preview/prod.
  - Document operational toggles (enable/disable ConvertKit; switch opt-in policy).
- E2E Test Hardening
  - Add Playwright E2E that fills the Lead Magnet form and verifies the function calls a mocked ConvertKit endpoint via `CONVERTKIT_BASE_URL` override; UI sees success.
- Content Finalization
  - SEO and copy pass for the 3 pillar posts. Confirm frontmatter fields and internal links/CTAs pointing to `/lead-magnet`.

Deliverables
- Patched Cloudflare Function with feature flags and robust error handling.
- Playwright E2E passing with ConvertKit mocked.
- Updated `docs/lead-magnet-api.md` documenting flags and behavior.
- Reviewed pillar content with SEO/CTA updates.

Acceptance
- Subscribing through the Lead Magnet returns 200 and writes to Supabase; when ConvertKit is enabled and healthy, a call is made to the Form subscribe endpoint.
- When ConvertKit is disabled or fails, UI still reports success; the event is logged and flagged for retry.
- E2E can assert the mocked ConvertKit path was exercised (no real API hits in CI).
- Pillar posts validated and ready for promotion.

Sprint 2 — Pre-Launch & Activation (4–6 days)
Scope
- Onboarding Sequence Definition (ConvertKit)
  - Author the 7-part "Endeavour Cycle" sequence content in ConvertKit.
  - Configure automation to enroll new Form subscribers into the sequence (respecting current opt-in policy).
  - QA in a staging/test list before enabling in production.
- Pre-Launch Checklist (Old Architect directive)
  - Credentials: ConvertKit keys & IDs recorded in secure ops runbook.
  - Deliverability: SPF/DKIM/DMARC for sending domain verified.
  - Privacy/Compliance: consent copy under form; Privacy Policy link; unsubscribe instructions.
  - Analytics: confirm events for subscribe conversions.
  - Site polish: nav/footer links, sitemap/rss reflect latest; social sharing meta.
  - Incident readiness: minimal runbook entry for ESP outages and manual resend.
  - Dry runs: test submit on mobile/desktop; ensure CAPTCHA (Turnstile) behavior acceptable.
- Go-Live Activation
  - Enable ConvertKit flags in production; confirm sequence enrollment.
  - Publish promotional CTAs across the site and sharing channels.
  - Monitor first 24–48 hours with dashboards and alerting.

Deliverables
- Live ConvertKit sequence for Endeavour Cycle with automation from Form.
- Completed pre-launch checklist artifact (`docs/pre-launch-checklist.md`).
- Activation completed with monitoring in place.

Acceptance
- New subscribers are automatically enrolled into the Endeavour Cycle.
- Checklist signed off; site and email sending pass deliverability checks.
- Initial activation metrics visible (subs, delivery, open/click where available).


4) Risks & Mitigations
- Missing credentials (BLOCKER): surfaced early; track as a dependency and proceed with feature-flagged code paths.
- Deliverability: mitigate with DKIM/SPF/DMARC and Single Opt-In at launch.
- Vendor outages: degrade gracefully (user still sees success) and flag for retry.
- Privacy/compliance: include consent notice under the form; ensure unsubscribe in sequence.


5) Definition of Done (Epic)
- Lead Magnet submits to ConvertKit Form behind flags with robust error handling.
- Three pillar posts finalized and promoted.
- Endeavour Cycle implemented in ConvertKit and automatically triggered.
- E2E tests cover form submission + mocked ConvertKit path.
- Pre-Launch checklist approved; site goes live.


6) Backlog (Post-Launch)
- Backfill historical Supabase leads into ConvertKit safely (one-off job with idempotent checks).
- Add `first_name` field to Lead Magnet + mapping to ConvertKit.
- Add admin retry/sync endpoint and dashboard chip for failed ESP syncs.
- Expand analytics: attribution and funnel dashboards.

## Pre-Launch Checklist (Marketing Readiness)

- [ ] Domain authentication: SPF, DKIM, DMARC configured for the sending domain in MailerLite and DNS is propagated.
- [ ] From address and sender profile configured in MailerLite; test deliverability to seed inboxes.
- [ ] Double opt-in policy explicitly set in MailerLite per launch plan (current: Single Opt-In; verify welcome timing).
- [ ] "Endeavour Cycle" automation enabled and set to trigger on join to the correct group.
- [ ] Seed list test: 3–5 internal addresses receive Email #1 promptly; confirm formatting on desktop/mobile.
- [ ] Privacy/Compliance: consent copy under lead magnet form; Privacy Policy and Unsubscribe links verified in footer and email templates.
- [ ] Accessibility: form labels, focus order, color contrast; keyboard flow validated.
- [ ] Nav/footer polish: ensure links correct; RSS/Sitemap present and up-to-date.
- [ ] Analytics: subscribe conversion event tracked; UTMs set on primary CTAs; verify dashboards.
- [ ] CAPTCHA posture: Turnstile behavior acceptable; no excessive false positives.
- [ ] Ops hygiene: remove unused `CONVERTKIT_*` secrets from all Cloudflare environments.
- [ ] Feature flags: `MAILERLITE_ENABLED=true`; `MAILERLITE_DIAG_VERIFY=true` on Preview; set to `false` on Production after 48h observation window.
- [ ] Observability: Daily Health Check workflow enabled; Cloudflare secrets configured (CF_API_TOKEN, CF_ACCOUNT_ID).
- [ ] Runbook: include steps to rotate MailerLite API key and toggle flags safely.
- [ ] Rollback plan: documented steps to disable MailerLite calls (`MAILERLITE_ENABLED=false`) while keeping user-facing POSTs green.
