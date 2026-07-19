# BIA · Business Impact Assessment

A standards-based Business Impact Assessment platform for business continuity planning. Version 2 is a full rework: time-phased impact analysis drives MTPD, criticality tiers, recovery objectives, gap tracking, data-driven tabletop exercises, and a fully generated BC plan.

Methodology grounding: ISO 22317, ISO 22301, NIST SP 800-34, and the BCI Good Practice Guidelines. The full methodology, including every formula and threshold, is in [docs/METHODOLOGY.md](docs/METHODOLOGY.md).

## The workflow

1. **Organization profile**: revenue, headcount, and risk appetite calibrate the financial severity bands to your size.
2. **Processes**: catalogue business processes with owners and dependencies across six classes (people, applications, equipment, facilities, suppliers, data) plus upstream process links.
3. **Impact assessment**: rate the impact of disruption at 4 hours, 24 hours, 3 days, 1 week, and 1 month across five categories on an anchored 0-4 scale. MTPD, tier (1 Critical through 4 Deferrable), and priority are derived, never self-declared.
4. **Objectives & gaps**: set target and achievable RTO/RPO/MBCO. RTO targets are validated against MTPD; shortfalls populate a gap register with owners and remediation status.
5. **Recovery workflows**: ordered steps with teams and durations, checked against the RTO target.
6. **Maturity**: a 37-question ISO 22301 self-assessment across eight weighted domains on an anchored 0-5 capability scale, with a radar view and improvement roadmap.
7. **Tabletop exercises**: six scenarios generated from your live data, naming your actual critical processes, dependency concentrations, and known gaps.
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
| `MONGODB_URI` | Persist workspaces in MongoDB (collection `workspaces`) instead of local JSON files |
| `MONGODB_DB` | Database name, defaults to `bia` |
| `BIA_WORKSPACE_ID` | Workspace id used in single-user mode, defaults to `default` |

### Multi-user auth

All data access is scoped by a user id returned from `src/lib/auth.ts`. To go multi-user, wire your identity provider (for example `@auth0/nextjs-auth0`) into `getUserId()` so it returns the session subject; every layer beneath it already isolates workspaces per id.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Recharts · server actions with a pluggable JSON-file/MongoDB store · Zod validation.

## Project layout

```
docs/METHODOLOGY.md        The methodology (source of truth for the scoring engine)
src/lib/domain/            Types, scoring engine, maturity model, scenario library
src/lib/data/              Workspace store (JSON file or MongoDB) and sample data
src/lib/actions.ts         Server actions (all mutations, Zod-validated)
src/app/                   Pages: dashboard, organization, processes, assessments,
                           gaps, recovery, maturity, exercises, report
```
