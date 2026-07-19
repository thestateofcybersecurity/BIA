import type { Workspace } from './types';
import { deriveAll, computeGaps } from './scoring';
import { MTPD_LABELS, TIER_SHORT } from './constants';

/**
 * Tabletop exercise library. Scenarios are generated from live assessment
 * data: they name the organization's actual critical processes, dependency
 * concentrations, and recovery gaps. See docs/METHODOLOGY.md section 8.
 */

export interface ScenarioPhase {
  title: string;
  narrative: string;
  injects: string[];
  discussion: string[];
  expectedActions: string[];
}

export interface GeneratedScenario {
  id: string;
  title: string;
  category: string;
  duration: string;
  objective: string;
  contextNotes: string[];
  phases: ScenarioPhase[];
  /** Maturity domain ids this exercise evaluates. */
  evaluates: string[];
}

interface Ctx {
  orgName: string;
  tier1: string[];
  tier2: string[];
  topApps: string[];
  topSuppliers: string[];
  topFacilities: string[];
  keyPeople: string[];
  rtoGaps: { process: string; gapHours: number }[];
  shortestMtpd: string | null;
}

function buildCtx(ws: Workspace): Ctx {
  const derived = deriveAll(ws);
  const nameOf = (id: string) => ws.processes.find((p) => p.id === id)?.name ?? 'Unknown process';

  const tier1: string[] = [];
  const tier2: string[] = [];
  let shortest: string | null = null;
  let shortestRank = Infinity;
  const mtpdRank: Record<string, number> = { h4: 0, h24: 1, d3: 2, w1: 3, m1: 4, beyond: 5 };

  derived.forEach((d, id) => {
    if (d.tier === 1) tier1.push(nameOf(id));
    if (d.tier === 2) tier2.push(nameOf(id));
    if (d.mtpd && mtpdRank[d.mtpd] < shortestRank) {
      shortestRank = mtpdRank[d.mtpd];
      shortest = MTPD_LABELS[d.mtpd];
    }
  });

  const count = (pick: (p: Workspace['processes'][number]) => string[]) => {
    const tally = new Map<string, number>();
    for (const p of ws.processes) {
      for (const item of pick(p)) {
        const key = item.trim();
        if (key) tally.set(key, (tally.get(key) ?? 0) + 1);
      }
    }
    return [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);
  };

  const rtoGaps = ws.objectives
    .flatMap((o) => computeGaps(o, derived.get(o.processId)?.mtpd ?? null))
    .filter((g) => g.kind === 'rto')
    .sort((a, b) => b.gapHours - a.gapHours)
    .slice(0, 3)
    .map((g) => ({ process: nameOf(g.processId), gapHours: g.gapHours }));

  return {
    orgName: ws.org?.name || 'the organization',
    tier1,
    tier2,
    topApps: count((p) => p.dependencies.applications),
    topSuppliers: count((p) => p.dependencies.suppliers),
    topFacilities: count((p) => p.dependencies.facilities),
    keyPeople: count((p) => p.dependencies.people),
    rtoGaps,
    shortestMtpd: shortest,
  };
}

const listOr = (items: string[], fallback: string) =>
  items.length ? items.join(', ') : fallback;

function contextNotes(ctx: Ctx): string[] {
  const notes: string[] = [];
  if (ctx.tier1.length) {
    notes.push(`${TIER_SHORT[1]} processes in scope: ${ctx.tier1.join(', ')}.`);
  } else {
    notes.push('No Tier 1 processes identified yet; complete impact assessments to sharpen this exercise.');
  }
  if (ctx.shortestMtpd) notes.push(`Shortest MTPD in the portfolio: ${ctx.shortestMtpd}.`);
  for (const g of ctx.rtoGaps) {
    notes.push(`Known recovery gap: ${g.process} is recoverable ${g.gapHours}h slower than its target RTO. Expect this to surface during the exercise.`);
  }
  return notes;
}

export function generateScenario(ws: Workspace, scenarioId: string): GeneratedScenario | null {
  const ctx = buildCtx(ws);
  const build = BUILDERS[scenarioId];
  return build ? build(ctx) : null;
}

export function listScenarios(): { id: string; title: string; category: string; summary: string }[] {
  return CATALOG;
}

export const CATALOG = [
  { id: 'ransomware', title: 'Ransomware outbreak', category: 'Cyber', summary: 'Encryption of core systems with extortion demand; tests IT DR, crisis comms, and decision authority.' },
  { id: 'cloud-outage', title: 'Cloud / data center outage', category: 'Technology', summary: 'Extended loss of a primary hosting provider or data center region.' },
  { id: 'supplier-failure', title: 'Critical supplier failure', category: 'Third party', summary: 'A key supplier suffers a sudden, extended outage or insolvency.' },
  { id: 'facility-loss', title: 'Facility loss / regional disaster', category: 'Physical', summary: 'A primary site becomes inaccessible after fire, flood, or regional event.' },
  { id: 'workforce', title: 'Workforce disruption', category: 'People', summary: 'A large share of staff is unavailable (illness, industrial action, severe weather).' },
  { id: 'insider', title: 'Insider threat', category: 'Cyber', summary: 'A privileged insider sabotages systems and data before departure.' },
];

type Builder = (ctx: Ctx) => GeneratedScenario;

const BUILDERS: Record<string, Builder> = {
  ransomware: (ctx) => ({
    id: 'ransomware',
    title: 'Ransomware outbreak',
    category: 'Cyber',
    duration: '2 to 3 hours',
    objective: `Exercise ${ctx.orgName}'s ability to sustain critical operations and recover systems when core IT is encrypted and untrusted.`,
    contextNotes: contextNotes(ctx),
    evaluates: ['strategies', 'crisis', 'bia', 'testing'],
    phases: [
      {
        title: 'Phase 1 · Detection (T+0 to T+2h)',
        narrative: `At 06:40, the service desk receives reports that staff cannot log in. Endpoint alerts show mass file encryption in progress. A ransom note demands payment within 72 hours. Early evidence suggests ${listOr(ctx.topApps, 'several core applications')} are affected.`,
        injects: [
          'Backups status is initially unknown; the backup console itself is unreachable.',
          'A journalist emails asking about "reports of an outage".',
        ],
        discussion: [
          'Who declares an incident, and at what point does this become a crisis?',
          'Which systems do you isolate first, and who has authority to disconnect production?',
          `Can ${listOr(ctx.tier1, 'your most critical processes')} run at all without IT? For how long?`,
          'What is your position on paying the ransom, and who decides?',
        ],
        expectedActions: [
          'Incident declared; crisis team activated with defined roles.',
          'Network isolation of affected segments; preservation of forensic evidence.',
          'Out-of-band communications established (assume email is compromised).',
        ],
      },
      {
        title: 'Phase 2 · Impact assessment (T+2h to T+8h)',
        narrative: `Encryption is confirmed across file servers and at least one domain controller. ${ctx.shortestMtpd ? `Your BIA says the most time-sensitive process becomes intolerable after ${ctx.shortestMtpd}.` : 'Recovery prioritization must now be decided under pressure.'} Legal counsel asks whether personal data was exfiltrated.`,
        injects: [
          'The threat actor posts a sample of stolen data to a leak site.',
          'A regulator deadline question is raised: does a 72-hour breach notification clock start now?',
        ],
        discussion: [
          'Which processes get restored first, and does that ordering match the BIA tiers?',
          'What are your regulatory and contractual notification obligations, and who owns them?',
          'How do you validate that backups are clean before restoring?',
        ],
        expectedActions: [
          'Restoration priority list produced from BIA tiers, not from whoever shouts loudest.',
          'Breach counsel and, if held, cyber insurance engaged.',
          'Customer and staff holding statements issued.',
        ],
      },
      {
        title: 'Phase 3 · Continuity and recovery (T+8h to T+72h)',
        narrative: `Restoration begins from backups of unknown integrity. Manual workarounds are needed to keep ${listOr(ctx.tier1, 'critical processes')} minimally operating. ${ctx.rtoGaps.length ? `Known gap: ${ctx.rtoGaps[0].process} cannot be restored within its target RTO under current capability.` : ''}`,
        injects: [
          'A restored server re-encrypts within an hour; the environment is not yet clean.',
          `${listOr(ctx.keyPeople, 'A key administrator')} is unreachable during the critical window.`,
        ],
        discussion: [
          'Do documented interim processes actually exist for the affected processes, and has anyone practiced them?',
          'Are minimum service levels (MBCO) defined so teams know what "good enough" looks like during recovery?',
          'What single points of failure in people or knowledge did this expose?',
        ],
        expectedActions: [
          'Clean-room rebuild sequencing; staged restoration matched to process tiers.',
          'Interim manual procedures activated with clear service-level expectations.',
          'Regular stakeholder updates on a fixed cadence.',
        ],
      },
      {
        title: 'Phase 4 · Post-incident (T+1 week)',
        narrative: 'Systems are restored. Leadership wants to know what it cost, what failed, and what changes now.',
        injects: [],
        discussion: [
          'Does the actual downtime cost match what the BIA predicted? If not, update the BIA.',
          'Which RTO gaps identified in this exercise move onto the remediation register?',
          'What evidence would you need for regulators, insurers, and customers?',
        ],
        expectedActions: [
          'After-action report with owners and dates.',
          'BIA and gap register updated with observed data.',
          'Maturity self-assessment revisited for the domains this exercise stressed.',
        ],
      },
    ],
  }),

  'cloud-outage': (ctx) => ({
    id: 'cloud-outage',
    title: 'Cloud / data center outage',
    category: 'Technology',
    duration: '90 minutes to 2 hours',
    objective: `Test ${ctx.orgName}'s resilience to an extended outage of primary hosting infrastructure, including failover decisions and degraded-mode operations.`,
    contextNotes: contextNotes(ctx),
    evaluates: ['strategies', 'bia', 'risk'],
    phases: [
      {
        title: 'Phase 1 · Outage begins (T+0 to T+1h)',
        narrative: `Your primary hosting provider reports a major incident affecting the region serving ${listOr(ctx.topApps, 'your core applications')}. The provider's status page says "investigating"; no ETA is offered.`,
        injects: [
          'Monitoring shows partial availability: some requests succeed, most fail.',
          'The provider revises its estimate: "several hours, possibly longer."',
        ],
        discussion: [
          'At what point do you invoke failover rather than wait? Who makes that call, using what criteria?',
          'Do you actually know which of your processes depend on this provider? Does it match your dependency mapping?',
          'What does your contract entitle you to, and does it matter right now?',
        ],
        expectedActions: [
          'Decision criteria applied: expected outage duration vs RTO and failover cost.',
          'Dependency map consulted to enumerate affected processes.',
        ],
      },
      {
        title: 'Phase 2 · Degraded operations (T+1h to T+8h)',
        narrative: `The outage continues past the point where ${listOr(ctx.tier1, 'your most critical processes')} can absorb it. Teams request permission to use unofficial workarounds, including personal accounts and local spreadsheets.`,
        injects: [
          'A customer-facing SLA breach is now unavoidable for at least one service.',
          'Shadow-IT workarounds create a data protection question.',
        ],
        discussion: [
          'Which workarounds are pre-approved, and where is the line on improvised ones?',
          'How do you track work performed manually so it can be reconciled later?',
          'Are customers being told something concrete, or "we are monitoring"?',
        ],
        expectedActions: [
          'Interim processes activated with data-handling guardrails.',
          'Backlog and reconciliation tracking started from the first hour of degraded operations.',
        ],
      },
      {
        title: 'Phase 3 · Restoration and lessons (T+8h onward)',
        narrative: 'Service is restored. Data written during the outage window must be reconciled, and leadership asks whether the concentration risk on this provider is acceptable.',
        injects: ['The provider offers service credits that cover a tiny fraction of the estimated loss.'],
        discussion: [
          'Did the observed impact match the BIA downtime cost curve for these processes?',
          'Is single-provider concentration an accepted risk, formally? Should it be?',
          'What would multi-region or multi-provider resilience cost versus this outage?',
        ],
        expectedActions: [
          'Reconciliation completed; incident cost quantified and fed back into the BIA.',
          'Concentration risk decision documented in the risk assessment.',
        ],
      },
    ],
  }),

  'supplier-failure': (ctx) => ({
    id: 'supplier-failure',
    title: 'Critical supplier failure',
    category: 'Third party',
    duration: '90 minutes',
    objective: `Exercise ${ctx.orgName}'s response to the sudden loss of a critical third party, including alternatives, contractual posture, and communication.`,
    contextNotes: contextNotes(ctx),
    evaluates: ['context', 'risk', 'strategies'],
    phases: [
      {
        title: 'Phase 1 · The call (T+0)',
        narrative: `${listOr(ctx.topSuppliers.slice(0, 1), 'Your most depended-upon supplier')} informs you they have suffered a catastrophic incident and cannot deliver for at least three weeks. ${ctx.topSuppliers.length > 1 ? `Note: your dependency map shows ${ctx.topSuppliers.join(' and ')} each support multiple processes.` : ''}`,
        injects: [
          'The supplier stops answering calls; updates now come only from their public statement.',
          'A second-tier supplier offers capacity at a 3x price premium with a 10-day lead time.',
        ],
        discussion: [
          'Which processes stop, and how quickly? Does your dependency mapping answer this in minutes or days?',
          'Do documented alternatives exist for this supplier, and have they ever been validated?',
          'Who is authorized to commit to emergency procurement at premium pricing?',
        ],
        expectedActions: [
          'Affected processes enumerated from the dependency map with time-to-impact estimates.',
          'Alternative sourcing options activated or initiated.',
        ],
      },
      {
        title: 'Phase 2 · Bridging the gap (T+1d to T+3w)',
        narrative: `Inventory and workarounds must bridge until an alternative is operational. ${listOr(ctx.tier1, 'Critical processes')} take priority for the constrained supply.`,
        injects: [
          'A major customer demands a firm recommitment date in writing.',
          'The failed supplier enters insolvency; recovery of tooling, data, or materials held by them is now a legal question.',
        ],
        discussion: [
          'How do you allocate constrained supply across competing internal demands? Who arbitrates?',
          'What data, tooling, or materials of yours does the supplier hold, and can you get them back?',
          'What contractual protections exist, and what should the next contract include?',
        ],
        expectedActions: [
          'Allocation driven by process tiers.',
          'Legal review of supplier contracts and escrow or recovery options.',
          'Customer commitments made only against validated alternative capacity.',
        ],
      },
      {
        title: 'Phase 3 · Structural fixes',
        narrative: 'The immediate crisis passes. Leadership asks how the organization allowed a single supplier to become this critical without a tested alternative.',
        injects: [],
        discussion: [
          'Which other suppliers hold the same concentrated position today?',
          'Should critical-supplier resilience requirements (dual sourcing, escrow, continuity clauses) be standard?',
          'How will third-party continuity be verified rather than assumed?',
        ],
        expectedActions: [
          'Supplier concentration review across the full dependency map.',
          'Third-party continuity requirements added to procurement standards.',
        ],
      },
    ],
  }),

  'facility-loss': (ctx) => ({
    id: 'facility-loss',
    title: 'Facility loss / regional disaster',
    category: 'Physical',
    duration: '2 hours',
    objective: `Test ${ctx.orgName}'s ability to relocate or virtualize operations when a primary site is lost, and to keep people safe while doing it.`,
    contextNotes: contextNotes(ctx),
    evaluates: ['crisis', 'strategies', 'context'],
    phases: [
      {
        title: 'Phase 1 · Life safety (T+0 to T+2h)',
        narrative: `Overnight, a fire severely damages ${listOr(ctx.topFacilities.slice(0, 1), 'your primary facility')}. Emergency services declare the building unsafe for entry for at least two weeks. No staff were on site.`,
        injects: [
          'A staff member posts photos of the burning building on social media before any official statement.',
          'It is unclear whether on-premises servers or paper records survived.',
        ],
        discussion: [
          'How do you account for all staff and communicate before the workday starts?',
          'What operated only from that site? Equipment, records, network gear, anything not replicated?',
          'Who speaks publicly, and what is said in the first hour?',
        ],
        expectedActions: [
          'Staff accounted for; site access controlled; official communication issued quickly.',
          'Site-dependent assets enumerated from the dependency map.',
        ],
      },
      {
        title: 'Phase 2 · Relocation and continuity (T+2h to T+2w)',
        narrative: `Processes anchored to the site must move to remote work, an alternate site, or pause. ${listOr(ctx.tier1, 'Critical processes')} must be running again within their RTOs.`,
        injects: [
          'Insurance requires documentation before any equipment replacement is approved.',
          'A regional internet outage degrades home working for part of the team.',
        ],
        discussion: [
          'Which processes genuinely require physical presence or equipment, and what is the plan for those?',
          'Are alternate work arrangements pre-agreed or improvised?',
          'How are physical records and equipment dependencies recovered or substituted?',
        ],
        expectedActions: [
          'Relocation matched to process tiers and RTOs.',
          'Insurance and asset documentation process started immediately.',
        ],
      },
      {
        title: 'Phase 3 · Sustained operations and return',
        narrative: 'Two weeks in, temporary arrangements are straining. Rebuild or relocate decisions are needed, and staff wellbeing is degrading.',
        injects: ['Key staff report burnout; one resignation letter arrives.'],
        discussion: [
          'What is sustainable for a month versus a week? Where do interim arrangements break?',
          'What criteria drive the rebuild versus permanent relocation decision?',
          'How is the return to normal executed without a second disruption?',
        ],
        expectedActions: [
          'Return-to-normal plan with staged migration.',
          'Staff support measures in place for the sustained period.',
        ],
      },
    ],
  }),

  workforce: (ctx) => ({
    id: 'workforce',
    title: 'Workforce disruption',
    category: 'People',
    duration: '90 minutes',
    objective: `Exercise ${ctx.orgName}'s ability to operate with 40% of staff unavailable for two weeks, exposing single points of knowledge.`,
    contextNotes: contextNotes(ctx),
    evaluates: ['context', 'strategies', 'leadership'],
    phases: [
      {
        title: 'Phase 1 · Rising absence (Day 1 to 3)',
        narrative: `A severe illness wave sweeps the region. Absence hits 25% and is rising. ${listOr(ctx.keyPeople, 'Several named key individuals')} are among those out, with no confirmed return date.`,
        injects: [
          'A critical approval queue stalls because both authorized approvers are out.',
          'Absence reaches 40% by day three.',
        ],
        discussion: [
          'Which processes stop when specific individuals are out? Does the dependency map name them?',
          'Are delegations of authority documented, or does approval power sit with people who are absent?',
          'What work gets consciously dropped first, and who decides?',
        ],
        expectedActions: [
          'Prioritization: staff shifted to Tier 1 processes; deferrable work formally paused.',
          'Emergency delegations enacted from documented succession lists.',
        ],
      },
      {
        title: 'Phase 2 · Sustained shortage (Week 1 to 2)',
        narrative: `Operations run degraded. Cross-training gaps are now visible: some tasks can only be done by people who are unavailable, and written procedures turn out to be thin.`,
        injects: [
          'A returning staff member is immediately overloaded as the only person who can clear a backlog.',
          'A contractor offers surge capacity but needs a week of onboarding and system access.',
        ],
        discussion: [
          'Which single points of knowledge did this expose, and which were already in the dependency map?',
          'Can documented procedures actually be executed by a competent substitute, or do they assume tribal knowledge?',
          'How is workload protected for remaining staff so the disruption does not compound through burnout?',
        ],
        expectedActions: [
          'Backlog triage by process tier.',
          'Substitute execution attempted from documented procedures, gaps recorded.',
        ],
      },
      {
        title: 'Phase 3 · Recovery and hardening',
        narrative: 'Staffing recovers. The exercise closes on structural fixes for the exposed people-dependencies.',
        injects: [],
        discussion: [
          'Which roles need documented deputies or cross-training as a priority?',
          'Should people-dependency concentration be a standing metric in the BIA?',
          'What did this reveal about the accuracy of the dependency map?',
        ],
        expectedActions: [
          'Cross-training plan with named roles and dates.',
          'Dependency map updated with observed single points of knowledge.',
        ],
      },
    ],
  }),

  insider: (ctx) => ({
    id: 'insider',
    title: 'Insider threat',
    category: 'Cyber',
    duration: '2 hours',
    objective: `Test ${ctx.orgName}'s detection, containment, and recovery when a privileged insider deliberately damages systems and data.`,
    contextNotes: contextNotes(ctx),
    evaluates: ['risk', 'strategies', 'documentation'],
    phases: [
      {
        title: 'Phase 1 · Discovery (T+0 to T+4h)',
        narrative: `A senior administrator resigned yesterday after a dispute. This morning, scheduled jobs are failing, several admin accounts are locked out, and backup jobs were silently disabled ten days ago. The administrator had broad access to ${listOr(ctx.topApps, 'core systems')}.`,
        injects: [
          'HR confirms the departure was contentious; legal advises caution in public statements.',
          'A logic bomb is suspected: a script scheduled to run in 48 hours is found on a management server.',
        ],
        discussion: [
          'How quickly can you enumerate and revoke everything this person had access to?',
          'Backups have been compromised for ten days: what is your actual recoverable point, and does it breach RPO commitments?',
          'How do you balance forensic preservation against the urgency of containment?',
        ],
        expectedActions: [
          'Full credential revocation sweep, including service accounts and shared secrets.',
          'Backup integrity verification before any restoration decision.',
          'Legal and HR engaged; evidence handling initiated.',
        ],
      },
      {
        title: 'Phase 2 · Containment and recovery (T+4h to T+3d)',
        narrative: `Damage is broader than first thought: configuration tampering across systems supporting ${listOr(ctx.tier1, 'critical processes')}. Every privileged change from the last month is now suspect.`,
        injects: [
          'Restoring a known-good configuration breaks an undocumented change that production depended on.',
          'A second employee is suspected of assisting; trust inside the response team is strained.',
        ],
        discussion: [
          'How do you establish a trustworthy baseline when the person who documented the environment is the attacker?',
          'What data was this person able to exfiltrate, and what notification duties follow?',
          'Who watches privileged activity normally, and why did disabled backups go unnoticed for ten days?',
        ],
        expectedActions: [
          'Configuration rebuilt from version-controlled sources where they exist.',
          'Exfiltration assessment with legal notification analysis.',
        ],
      },
      {
        title: 'Phase 3 · Post-incident controls',
        narrative: 'Recovery completes. The closing discussion targets the control failures that made one person this dangerous.',
        injects: [],
        discussion: [
          'Which single-administrator dependencies exist right now, and how are they mitigated?',
          'Should backup integrity monitoring and privileged-change review be continuous controls?',
          'How does offboarding change for privileged roles?',
        ],
        expectedActions: [
          'Privileged access review; separation of duties for destructive operations.',
          'Immutable or offline backup tier implemented and monitored.',
        ],
      },
    ],
  }),
};
