# BIA · Business Impact Assessment

A standards-based Business Impact Assessment platform for business continuity planning. Version 2 is a full rework: time-phased impact analysis drives MTPD, criticality tiers, recovery objectives, gap tracking, data-driven tabletop exercises, and a fully generated BC plan.

Methodology grounding: ISO 22317, ISO 22301, NIST SP 800-34, and the BCI Good Practice Guidelines. The full methodology, including every formula and threshold, is in [docs/METHODOLOGY.md](docs/METHODOLOGY.md).

## The workflow

1. **Organization profile**: revenue, headcount, and risk appetite calibrate the financial severity bands to your size.
2. **Processes**: catalogue business processes with owners and dependencies across six classes (people, applications, equipment, facilities, suppliers, data) plus upstream process links. A CSV bulk import (with downloadable template) upserts processes by name and can populate impact assessments in the same pass.
3. **Impact assessment**: rate the impact of disruption at 4 hours, 24 hours, 3 days, 1 week, and 1 month across five categories on an anchored 0-4 scale. MTPD, tier (1 Critical through 4 Deferrable), and priority are derived, never self-declared.
4. **Objectives & gaps**: set target and achievable RTO/RPO/MBCO. RTO targets are validated against MTPD; shortfalls populate a gap register with owners and remediation status.
5. **Recovery workflows**: ordered steps with teams and durations, checked against the RTO target.
6. **Maturity**: a 37-question ISO 22301 self-assessment across eight weighted domains on an anchored 0-5 capability scale, with a radar view and improvement roadmap.
7. **Tabletop exercises**: six scenario templates generated from your live data, runnable as live sessions that record the room's responses. With Claude configured, exercises can be AI-tailored to your exact gaps and completed sessions get a structured after-action report (timeline, strengths, gaps, prioritized recommendations, maturity signals).
8. **BC plan report**: a printable plan generated entirely from your data. No boilerplate.

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
| `ANTHROPIC_API_KEY` | Enables Claude-tailored tabletop exercises and AI after-action reports (model: `claude-opus-4-8`); without it those features are hidden |
| `BIA_WORKSPACE_ID` | Workspace id used in demo mode, defaults to `default` |

`DATABASE_URL` and `NEON_AUTH_BASE_URL` come from the Neon integration; add `NEON_AUTH_COOKIE_SECRET` yourself. With both auth variables set, users sign in via `/auth/sign-in` (email and password through Neon Auth) and each user gets an isolated workspace; without them, the app runs in single-workspace demo mode.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Recharts · Neon Postgres + Neon Auth (`@neondatabase/auth`) · server actions with a pluggable JSON-file/Postgres store · Zod validation.

## Project layout

```
docs/METHODOLOGY.md        The methodology (source of truth for the scoring engine)
src/lib/domain/            Types, scoring engine, maturity model, scenario library
src/lib/data/              Workspace store (JSON file or MongoDB) and sample data
src/lib/actions.ts         Server actions (all mutations, Zod-validated)
src/app/                   Pages: dashboard, organization, processes, assessments,
                           gaps, recovery, maturity, exercises, report
```
