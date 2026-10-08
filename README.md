# BIA · Business Impact Assessment

A standards-based Business Impact Assessment platform for business continuity planning. Version 2 is a full rework: time-phased impact analysis drives MTPD, criticality tiers, recovery objectives, gap tracking, data-driven tabletop exercises, and a fully generated BC plan.

Methodology grounding: ISO 22317, ISO 22301, NIST SP 800-34, and the BCI Good Practice Guidelines. The full methodology, including every formula and threshold, is in [docs/METHODOLOGY.md](docs/METHODOLOGY.md).

## The workflow

1. **Organization profile**: revenue, headcount, and risk appetite calibrate the financial severity bands to your size.
2. **Processes**: catalogue business processes with owners and dependencies across six classes (people, applications, equipment, facilities, suppliers, data) plus upstream process links. A bulk import accepts Excel workbooks or CSV (with downloadable templates; the Excel one includes a column-reference sheet for process owners), upserts processes by name, and can populate impact assessments in the same pass.
3. **Impact assessment**: rate the impact of disruption at 4 hours, 24 hours, 3 days, 1 week, and 1 month across five categories on an anchored 0-4 scale. MTPD, tier (1 Critical through 4 Deferrable), and priority are derived, never self-declared. Assessments can be delegated: a signed, expiring, revocable link lets the named process owner complete their own process without an account, and a complete submission records their sign-off.
4. **Risk register**: the companion to the BIA (ISO 22301 cl. 8.2). Register threats with an anchored likelihood; impact is inherited from the criticality tier of the processes each threat would disrupt, never entered twice. Scores band into a matrix, treatments follow ISO 31000, and shared dependencies are flagged as correlated exposure.
5. **Objectives & gaps**: set target and achievable RTO/RPO/MBCO. RTO targets are validated against MTPD; shortfalls populate a gap register with owners, chosen continuity strategy, cost, and due date, priced against the exposure the shortfall carries.
6. **Recovery workflows**: ordered steps with teams and durations, checked against the RTO target. With Claude configured, a workflow can be drafted from the process's objectives, dependencies, resource profile, gaps, and registered threats, returning its sequencing rationale, assumptions, and a verdict on whether the sequence fits the RTO; drafts load into the editor for review and are never saved automatically.
7. **Inherited requirements**: applications, suppliers, and upstream processes each inherit the strictest objectives of everything downstream of them, with conflicts and circular dependencies reported.
8. **Activation & communications**: declaration criteria, response team roster with contacts and deputies, and a communications plan by audience, so the generated document is usable during an incident.
9. **Maturity**: a 46-question ISO 22301 self-assessment across eight weighted domains on an anchored 0-5 capability scale, with a radar view and improvement roadmap. Where the workspace holds evidence for a practice, the level your data demonstrates is shown beside the question, and ratings sitting two or more levels above it are flagged in the app and the report.
10. **Tabletop exercises**: six scenario templates generated from your live data, runnable as live sessions that record the room's responses. With Claude configured, exercises can be AI-tailored to your exact gaps and completed sessions get a structured after-action report (timeline, strengths, gaps, prioritized recommendations, maturity signals).
11. **BC plan report**: a printable plan generated entirely from your data. No boilerplate.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without any configuration the app runs in single-workspace demo mode and stores data as JSON under `./data/` (gitignored). Use "Load sample data" on the Organization page to explore with Lakeside Mutual, a fictional $180M insurer assessed end to end.

## Configuration

| Variable | Effect |
|---|---|
| `DATABASE_URL` | Persist workspaces in Neon Postgres (table `workspaces`, one JSONB row per user) instead of local JSON files |
| `NEON_AUTH_BASE_URL` | Neon Auth server URL, provisioned by the Neon integration on Vercel |
| `NEON_AUTH_COOKIE_SECRET` | Cookie signing secret you generate (`openssl rand -base64 32`), 32+ characters |
| `ANTHROPIC_API_KEY` | Enables Claude-tailored tabletop exercises, AI after-action reports, and recovery workflow drafting (model: `claude-opus-4-8`); without it those features are hidden |
| `RESEND_API_KEY` | Enables email notifications via Resend: sign-off requests when an assessment becomes complete, after-action report announcements, and weekly review reminders; without it no emails are sent |
| `EMAIL_FROM` | Sender for notification emails, defaults to `BIA <bia@cybersecurityalphabetsoup.com>` (the domain must be verified in Resend) |
| `CRON_SECRET` | Bearer token guarding `/api/cron/review-reminders`; Vercel Cron sends it automatically once set. The weekly reminder job (Mondays 13:00 UTC, see `vercel.json`) refuses to run without it |
| `CONTRIBUTION_SECRET` | Dedicated signing key for delegated assessment links (`/contribute/<token>`), generate with `openssl rand -base64 32`. Falls back to `NEON_AUTH_COOKIE_SECRET` with a startup warning, since reusing the session key for public bearer links means one leak compromises both. Changing the key invalidates outstanding links. Without either, the request-from-owner feature is hidden |
| `EMAIL_DAILY_CAP` | Outbound emails each organization may send per rolling day across invitations, assessment requests, and notifications; defaults to `50`. The counter lives in the `usage_events` table so it holds across serverless instances |
| `HEALTH_DETAIL_TOKEN` | Bearer token that unlocks the configuration presence flags on `/api/health`; without it (or without the header) the route answers `{"ok":true}` only |
| `NEXT_PUBLIC_APP_URL` | Canonical base URL, defaults to `https://bia.cybersecurityalphabetsoup.com`. Used for links inside emails, and requests that arrive on a `*.vercel.app` alias are redirected (308) to this host so the Cloudflare layer cannot be bypassed |
| `BIA_WORKSPACE_ID` | Workspace id used in demo mode, defaults to `default` |

Rate limits that need no configuration: PDF report export is limited to 3 per user per minute, and CSV/Excel and JSON workspace imports to 5 per user per minute; JSON imports are validated against the same schemas as the editing forms and capped at 5 MB.

Multi-tenancy: the organization is the tenant. The first person to sign in from a verified work domain claims it and becomes owner; later arrivals from that domain join automatically at the lowest role. Owners can rename the organization, claim further domains by publishing a DNS TXT record, and invite people outside their domains by email at a chosen role. Every capability maps to a minimum role in `src/lib/domain/authz.ts`, mutations are gated by it, and data a role cannot read is stripped server-side rather than hidden in the UI. Membership and role changes, domain claims, and workspace mutations are written to an append-only audit trail visible on People & access.

Notification emails go to each user's Neon Auth account email and respect the per-workspace preferences on the Organization page. In demo mode (no auth) there is no recipient, so nothing is sent.

`DATABASE_URL` and `NEON_AUTH_BASE_URL` come from the Neon integration; add `NEON_AUTH_COOKIE_SECRET` yourself. With both auth variables set, users sign in via `/auth/sign-in` (email and password through Neon Auth) and each user gets an isolated workspace; without them, the app runs in single-workspace demo mode.

### Neon Auth settings that the code relies on

Neon Auth is managed Better Auth, so these live in the Neon console (project > Auth > Settings), not in the repo:

- **Verify at sign-up: on.** Email verification is off by default in Neon Auth. The app refuses to let an unverified account accept an invitation, consume a remembered invitation after sign-up, claim a work domain, act as the owner of a process by email match, invite people, or send any email, so with verification off those features are unavailable to new accounts. Turning it on means a session is only issued once the address is confirmed. Accounts created before the switch keep `emailVerified = false` until they verify; Neon's "send verification email" flow covers them.
- **Sign-up rate limiting.** Public sign-up is open and the app has no CAPTCHA, so enable Neon's rate limits on the sign-up and sign-in endpoints (or put Cloudflare Turnstile in front of `/auth/sign-in`) to blunt account flooding.
- **Trusted origins** should list only `https://bia.cybersecurityalphabetsoup.com`.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Recharts · Neon Postgres + Neon Auth (`@neondatabase/auth`) · server actions with a pluggable JSON-file/Postgres store · Zod validation.

`npm run lint`, `npm run typecheck`, and `npm test` (vitest, tests under `tests/`) are the checks to run before a pull request; `npm run build` must also pass.

## Project layout

```
docs/METHODOLOGY.md        The methodology (source of truth for the scoring engine)
src/lib/domain/            Types, scoring engine, maturity model, scenario library
src/lib/data/              Workspace store (JSON file or Neon Postgres) and sample data
src/lib/actions.ts         Server actions (all mutations, Zod-validated)
src/lib/contribution/      Signed links for delegated assessment collection
src/lib/email/             Resend notification layer and templates
src/lib/pdf/               The official BC plan PDF document
src/app/                   Pages: dashboard, organization, processes, assessments,
                           risks, gaps, recovery, requirements, activation,
                           maturity, exercises, report, and the public
                           /contribute route
```
