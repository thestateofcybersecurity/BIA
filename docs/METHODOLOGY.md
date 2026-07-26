# BIA Methodology (v2)

This document defines the assessment methodology implemented by the app. It replaces the v1 approach and is the single source of truth: the scoring engine in `src/lib/domain/` implements exactly what is written here.

Grounding: ISO 22317 (Business Impact Analysis), ISO 22301 (Business Continuity Management Systems), NIST SP 800-34 (Contingency Planning), and the BCI Good Practice Guidelines. The methodology borrows the time-phased impact model from ISO 22317 and the maturity structure from ISO 22301 clauses.

## What changed from v1, and why

| v1 problem | v2 approach |
|---|---|
| Financial impact scored by exact-match against a fixed dollar ladder (any other value scored 0) | Continuous banding scaled to the organization's size, from the org profile |
| Fixed dollar thresholds assumed one company size | Thresholds derived from annual revenue and risk appetite |
| Criticality was circular: a self-declared rating multiplied the score that determined the tier | Tier is derived from the Maximum Tolerable Period of Disruption (MTPD), which is derived from time-phased impact ratings |
| Single point-in-time impact rating | Impact rated across five time horizons; disruption impact grows with time and the methodology captures that curve |
| Three conflicting tier vocabularies (Tier 0-3, Gold/Silver/Bronze, Mission Critical 1-3) | One vocabulary: Tier 1 Critical, Tier 2 Essential, Tier 3 Important, Tier 4 Deferrable |
| Overall score range (0 to ~5.2) misaligned with tier thresholds (top threshold 2.0), so almost everything ranked top tier | Priority score 0-100 with documented formula, used for ranking only, never for tiering |
| RTO/RPO recorded but never validated or connected to impact data | RTO must not exceed MTPD; gaps between required and achievable are first-class objects with owners and remediation status |
| Maturity: 37 questions on an unanchored 0-10 scale, flat average | Same coverage reorganized into 8 ISO 22301 domains on an anchored 0-5 capability scale with weighted rollup |
| BC plan was ~90% hardcoded boilerplate for a fictional company | Report generated entirely from assessment data and the org profile |

## 1. Organization profile

Captured once, edited in Settings. Drives all financial banding.

- Annual revenue (R) and employee count
- Industry and regulatory context (informs report language and scenario selection)
- Risk appetite: Conservative, Moderate, or Aggressive
- Currency

## 2. Process inventory

Each business process records: name, description, owner, department, users served, peak periods, and dependencies in six classes:

- People (key roles, single points of knowledge)
- Applications and IT services
- Equipment and devices
- Facilities and locations
- Suppliers and third parties
- Data and records

plus upstream process dependencies (other processes this one cannot run without). One naming convention everywhere.

## 3. Time-phased impact assessment

For each process, impact is rated at five horizons: **4 hours, 24 hours, 3 days, 1 week, 1 month** of full disruption, across five categories:

| Category | What it covers |
|---|---|
| Financial | Lost revenue, lost productivity, increased operating cost, penalties (entered as a cumulative currency estimate per horizon) |
| Operational | Ability to deliver products and services, backlog accumulation, workaround viability |
| Customers and reputation | Customer harm, attrition risk, brand and partner confidence |
| Legal, regulatory and contractual | Breach of law, regulation, or contract; reporting obligations |
| Health and safety | Risk of harm to people |

### Severity scale (0-4)

Every rating uses the same anchored scale:

| Level | Label | Meaning |
|---|---|---|
| 0 | Negligible | No meaningful impact |
| 1 | Minor | Absorbed by normal operations |
| 2 | Moderate | Noticeable degradation, manageable with effort |
| 3 | Major | Serious damage, senior management attention required |
| 4 | Severe | Intolerable; threatens viability, safety, or license to operate |

Each category in the app carries level descriptors written for that category (for example, Health and safety level 3 is "some risk of serious harm"), so assessors pick a described condition, not a bare number.

### Financial banding

The assessor enters an estimated cumulative loss per horizon. Severity is computed from thresholds expressed as a share of annual revenue R, scaled by risk appetite (Conservative 0.5x, Moderate 1x, Aggressive 2x):

| Severity | Cumulative loss (Moderate appetite) |
|---|---|
| 0 | under 0.01% of R |
| 1 | 0.01% to 0.05% of R |
| 2 | 0.05% to 0.25% of R |
| 3 | 0.25% to 1% of R |
| 4 | 1% of R or more |

Example, R = $100M: level 2 spans $50k to $250k, level 4 begins at $1M. The same bands rescale automatically for a $5M or a $5B organization.

Ratings must be non-decreasing over time (impact of disruption never shrinks as the outage continues); the app enforces this.

## 4. Derived outcomes

### MTPD (Maximum Tolerable Period of Disruption)

MTPD is the earliest horizon at which **any** category reaches severity 4. If no category ever reaches 4, MTPD is "beyond 1 month". The assessor may override MTPD with a written justification; overrides are flagged in the report.

### Criticality tier

| Tier | Name | MTPD |
|---|---|---|
| 1 | Critical | 24 hours or less |
| 2 | Essential | up to 3 days |
| 3 | Important | up to 1 month |
| 4 | Deferrable | beyond 1 month |

### Priority score (0-100)

Used only to rank processes within and across tiers, never to assign tiers:

`priority = 60 x timeCriticality + 40 x magnitude`

- timeCriticality: MTPD at 4h = 1.0, 24h = 0.8, 3d = 0.6, 1w = 0.4, 1mo = 0.25, beyond = 0.1
- magnitude: mean of each category's peak severity across horizons, divided by 4

### Cost of downtime curve

The cumulative financial estimates per horizon form a downtime cost curve per process, aggregated on the dashboard and in the report.

## 5. Recovery objectives and gap analysis

Per process:

- **RTO (target)**: how quickly the process must be restored.
- **WRT (Work Recovery Time)**: how long backlog catch-up takes after systems are restored. Validation: RTO + WRT must fit inside the MTPD with a buffer (at most 80% of MTPD combined), because the MTPD bounds the return to normal service, not just restored systems.
- **RPO (target)**: maximum tolerable data loss, guided by a data-loss tolerance question.
- **MBCO**: minimum acceptable service level (% of normal output) during recovery.
- **Achievable RTO / RPO**: what current capability can actually deliver.

**Gap = achievable minus target.** Any positive gap creates an entry in the gap register with a severity, owner, remediation action, chosen continuity strategy, estimated cost, target close date, and status. RTO gap severity rates against MTPD headroom: high when achievable recovery lands beyond the MTPD, medium when it lands inside the 20% buffer zone, low otherwise. RPO gaps, and RTO gaps where no MTPD has been derived yet, rate on the size of the shortfall relative to the target: high at 3x the target or more, medium at 1x or more, low otherwise. The gap register is the primary output driving investment decisions.

### Continuity strategy and the investment case (ISO 22301 cl. 8.3)

Identifying a gap is not the same as deciding how to close it. Each gap records the **strategy** that closes it, chosen from the standard options: manual workaround, alternate site or workspace, standby system or replication, third-party or outsourced service, additional capacity, improved data protection, or an explicit decision to accept the risk.

Each gap is also priced from data the assessment already holds. **Exposure** is the additional loss from restoring at the achievable time instead of the target: the downtime cost curve is read at both times and the difference taken. Between assessed horizons the curve is interpolated linearly; before the first horizon it runs from zero; beyond the last assessed horizon it is held flat rather than extrapolated, since nothing in the assessment supports a claim about that region. RPO gaps are data loss rather than downtime, so the curve cannot price them and they are reported as not costed instead of guessed.

Placing the remediation cost beside the exposure makes the investment case explicit: spending less than a single occurrence costs is straightforward to defend, and spending more requires an argument about event frequency or about the non-financial impacts (safety, licence to operate) that the financial curve does not capture. The comparison is per occurrence, not annualised, because the BIA deliberately does not estimate likelihood; that is the risk assessment's job.

### Delegated data collection

Workshops with the process owner give the best calibration, but an inventory of any size outgrows them. A coordinator can instead request an assessment from the named owner, who receives a personal link that opens exactly one process and nothing else in the workspace: no navigation, no other process, no gap register, and no financial profile beyond the severity bands needed to answer the questions.

The link authenticates by an HMAC-signed token rather than a session. It carries only the workspace, process, and request ids; it is verified against a server secret with a constant-time comparison, so a token altered to point at another process or another workspace fails; it expires after 30 days; and it is checked against a request record the coordinator can revoke at any time. Because the token is a bearer credential delivered by email, revocation and expiry are what bound it, exactly as with any emailed link.

The contributor sees the rating grid but not the governance controls: MTPD override and sign-off stay with the coordinator. A complete submission from the invited owner does record their sign-off, since that is precisely what owner sign-off means; an incomplete one leaves the assessment pending.

### Governance

Each completed assessment carries an owner sign-off (name and date); any edit to the assessment clears the sign-off and it must be re-approved. Assessments are due for review 12 months after their last approval or edit (ISO 22301 review cadence); overdue assessments are flagged in the app.

## 6. Recovery workflows and resource requirements

Ordered recovery steps per process, each with responsible team, dependencies (same six classes), alternate staff, and estimated duration. The sum of step durations is compared to the target RTO; if the critical path exceeds RTO the app flags it.

Each process also carries a **recovery resource profile** (ISO 22317 resource requirements at time of recovery): the minimum staff, workstations or equipment, and facility seats needed at each of the five horizons, plus the vital records and data sets the process cannot operate without. This is what alternate-site sizing and surge planning must actually provide.

## 7. Dependency requirement roll-down

The BIA handed down to IT and third-party management, fully derived (nothing entered separately):

- Each **application** inherits the strictest (lowest) RTO and RPO targets of every process that depends on it, plus their highest criticality tier. An application supporting a Tier 1 process must itself be recoverable inside that process's targets.
- Each **supplier** inherits the highest criticality of the processes it supports, and the roll-down shows concentration: a supplier appearing under many processes is a single point of failure.
- Each **upstream process** inherits from every process downstream of it, followed transitively through the chain: a process must be at least as critical, and recover at least as fast, as everything that cannot run without it. Where a process's own tier, RTO, or RPO is weaker than what its dependants require, the conflict is reported as a finding rather than silently tolerated, because the downstream target is unachievable while the upstream one stands.

Circular process dependencies are detected and reported: if A cannot run without B and B cannot run without A, neither can be restored first and the recovery sequence is undefined. Traversal is cycle-safe, so a loop produces a finding instead of a hang.

Application and supplier dependencies are matched by name (case-insensitive), which is why consistent dependency naming in the process inventory matters; process links are matched by id, so they are exact.

## 8. Plan activation and communications

Everything above establishes how bad a disruption would be and how fast recovery must happen. This section is the operational half of the plan (NIST SP 800-34 notification and activation phase), without which the analysis cannot be executed during an incident:

- **Activation criteria** at three levels (Monitor, Partial, Full), each stated as an observable condition rather than a judgement, with the role authorised to declare it. The MTPD values derived in section 4 are the natural source of these thresholds: the tolerance already documented is the trigger.
- **Command and authority**: who declares, who stands down, the primary and alternate command locations, and the standing response bridge.
- **Response team roster**: role, named primary with out-of-hours contact details, and a named deputy for every role, because a roster with a single name per role fails whenever that person is unreachable.
- **Communications plan** by audience (staff, customers, regulators, suppliers, board, media), each with channel, timing, accountable owner, and the key message. Timing is expressed against obligations where they exist, such as a regulator's reporting clock, not against intentions.
- **Process owner directory**, derived from the process inventory and ordered by criticality, so the people accountable for each process are reachable without a second document.

All of it is printed into the BC plan report, which is what makes the generated document usable at 2am rather than only at audit time.

## 9. Maturity assessment

The 37-question ISO 22301 self-assessment is retained for coverage but restructured:

- **8 domains** mapped to ISO 22301 clauses: Context and Scope (cl. 4), Leadership and Policy (cl. 5), Risk Assessment (cl. 6/8.2), Business Impact Analysis (cl. 8.2), Continuity Strategies and Plans (cl. 8.3/8.4), Crisis Management and Communications (cl. 8.4), Exercising and Testing (cl. 8.5), Documentation and Improvement (cl. 7/10)
- **Anchored 0-5 capability scale** (CMMI style): 0 Not performed, 1 Initial (ad hoc), 2 Repeatable (inconsistent), 3 Defined (documented and communicated), 4 Managed (measured and reviewed), 5 Optimized (continuously improved). Every question shows the anchor text.
- Domain score = mean of its questions. Overall score = weighted mean of domains (BIA and Strategies weighted 1.5x, others 1x, weights configurable in code).
- Output: radar chart by domain, weakest-domain callouts, and a suggested roadmap (lowest domains first).

## 10. Tabletop exercises

A curated library covers six scenario types: ransomware, cloud or data center outage, critical supplier failure, facility loss or regional disaster, workforce disruption, and insider threat. Each template is generated from live assessment data: it names the organization's actual Tier 1 processes, injects real RTO gaps and dependency concentrations, and structures the exercise as phases with discussion questions and evaluation criteria mapped to maturity domains.

Any scenario can be run as a **live session**: the facilitator steps through the phases, records the room's answer to every discussion question, and captures observation notes. With Claude configured (`ANTHROPIC_API_KEY`), two AI capabilities layer on top:

- **Tailored generation**: Claude designs a bespoke exercise from the full workspace (org profile, tiered processes with MTPD and RTO data, dependency inventories, gap register, maturity scores) plus an optional facilitator focus. There is no intake form; the assessment data is the intake. Injects are written to collide with documented recovery gaps, and discussion weight goes to the weakest maturity domains.
- **After-action report**: on completion, Claude writes a structured report (executive summary, phase timeline, strengths, gaps, prioritized recommendations with owners, follow-ups, and maturity signals) judged against the organization's own BIA: responses that contradict documented MTPDs, objectives, or gaps are called out, and unanswered questions are treated as findings. Maturity signals map observations onto the eight assessment domains as evidence for the next self-assessment update.

Structured outputs are schema-validated at the boundary; a refusal or malformed response is surfaced to the facilitator, never silently stored. Without an API key, the template library and live sessions work fully; only generation and the AI report are disabled.

## 11. Business continuity plan report

Generated fully from data, printable to PDF from the browser:

1. Executive summary (tier counts, aggregate downtime cost exposure, top gaps)
2. Scope and organization profile
3. Methodology summary
4. Process inventory and dependency map
5. BIA results: tiering table with owner sign-off status, MTPD overrides with justifications
6. Recovery objectives (including WRT) and gap register
7. Plan activation, response team roster, communications, and the process owner directory
8. Recovery workflows and resource requirements
9. Dependency recovery requirements (application, supplier, and process-chain roll-down)
10. Tabletop exercise program
11. Maturity results and roadmap

Nothing in the report is boilerplate about a fictional company; every table and number traces to entered data.
