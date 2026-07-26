import type { Workspace, MaturityLevel, MaturityAssessment } from './types';
import { deriveAll, computeGaps, isReviewDue, isAssessmentComplete } from './scoring';
import { processChainRequirements, rollDownRequirements } from './rolldown';
import { deriveRisks, riskConcentration } from './risk';
import { DEPENDENCY_CLASSES } from './constants';
import { MATURITY_DOMAINS } from './maturity';

/**
 * Evidence for the maturity self-assessment.
 *
 * A self-assessment is only as honest as the person filling it in, and the
 * usual failure is a program that rates itself Defined on practices it has
 * never actually performed. Where the workspace holds data bearing on a
 * practice, this derives the level that data demonstrates, so a rating can
 * be checked rather than taken on trust.
 *
 * Two deliberate limits. The evidenced level is a floor, not a verdict: the
 * app cannot see training records, board minutes, or documents kept
 * elsewhere, so a higher rating may be perfectly legitimate. And level 5
 * (Optimized) is never evidenced from data, because continuous improvement
 * is a judgement about how an organization behaves over time.
 */

export interface QuestionEvidence {
  /** Highest level this workspace's data demonstrates. */
  supported: MaturityLevel;
  /** What the data actually shows, stated plainly. */
  detail: string;
}

/** A rating this far above the evidence is worth a second look. */
export const OVERCLAIM_MARGIN = 2;

function coverageLevel(done: number, total: number, ceiling: MaturityLevel = 3): MaturityLevel {
  if (total === 0) return 0;
  if (done === 0) return 0;
  const ratio = done / total;
  if (ratio >= 1) return ceiling;
  if (ratio >= 0.6) return 2;
  return 1;
}

function monthsSince(iso: string, now: Date): number {
  const then = new Date(iso).getTime();
  return (now.getTime() - then) / (1000 * 60 * 60 * 24 * 30.44);
}

export function maturityEvidence(
  ws: Workspace,
  now = new Date()
): Record<string, QuestionEvidence> {
  const out: Record<string, QuestionEvidence> = {};
  const derived = deriveAll(ws);
  const processes = ws.processes;
  const total = processes.length;

  // ---- Context ----
  const withDeps = processes.filter((p) =>
    DEPENDENCY_CLASSES.some((c) => p.dependencies[c].length > 0)
  ).length;
  out.dependencies = {
    supported: coverageLevel(withDeps, total),
    detail: `${withDeps} of ${total} processes have dependencies recorded.`,
  };

  // ---- Business impact analysis ----
  const complete = ws.assessments.filter(isAssessmentComplete);
  const completeIds = new Set(complete.map((a) => a.processId));
  const completeCount = processes.filter((p) => completeIds.has(p.id)).length;

  out.biaProcess = {
    supported: total === 0 ? 0 : completeCount === 0 ? 1 : ws.org ? 3 : 2,
    detail:
      total === 0
        ? 'No processes catalogued yet.'
        : completeCount === 0
          ? 'Processes exist but no assessment has been completed against the method.'
          : ws.org
            ? 'The documented time-phased method is in use, calibrated to the organization profile.'
            : 'Assessments exist but the organization profile is missing, so financial severity cannot be derived.',
  };

  out.biaConducted = {
    supported: coverageLevel(completeCount, total),
    detail: `${completeCount} of ${total} processes have a complete impact assessment.`,
  };

  const withObjectives = ws.objectives.filter(
    (o) => o.rtoTargetHours != null && o.rpoTargetHours != null
  ).length;
  out.rtosRposDefined = {
    supported: coverageLevel(withObjectives, total),
    detail: `${withObjectives} of ${total} processes have both an RTO and an RPO target set.`,
  };

  const approved = complete.filter((a) => a.approvedBy).length;
  out.biaSignOff = {
    // Sign-off plus enforced re-approval on edit is a managed control, so
    // full coverage can evidence level 4.
    supported: complete.length === 0 ? 0 : coverageLevel(approved, complete.length, 4),
    detail:
      complete.length === 0
        ? 'No completed assessments to approve yet.'
        : `${approved} of ${complete.length} completed assessments carry owner sign-off.`,
  };

  const current = complete.filter((a) => !isReviewDue(a, now)).length;
  out.biaReviewed = {
    supported:
      complete.length === 0
        ? 0
        : current === complete.length && approved === complete.length
          ? 4
          : coverageLevel(current, complete.length, 3),
    detail:
      complete.length === 0
        ? 'No completed assessments to review yet.'
        : `${current} of ${complete.length} assessments are inside the 12 month review window` +
          (approved === complete.length ? ' and all are signed off.' : '.'),
  };

  // ---- Risk assessment ----
  const risks = deriveRisks(ws);
  const withTreatment = risks.filter((r) => r.risk.treatment != null).length;
  out.riskManagement = {
    supported: coverageLevel(withTreatment, risks.length),
    detail:
      risks.length === 0
        ? 'No risks registered.'
        : `${withTreatment} of ${risks.length} registered risks carry a treatment decision.`,
  };

  const scorable = risks.filter((r) => r.score != null && r.risk.likelihoodRationale.trim()).length;
  out.riskAssessment = {
    supported: coverageLevel(scorable, risks.length),
    detail:
      risks.length === 0
        ? 'No risks registered.'
        : `${scorable} of ${risks.length} risks are rated against assessed processes with a stated rationale.`,
  };

  const tier1 = processes.filter((p) => derived.get(p.id)?.tier === 1);
  const tier1Covered = tier1.filter((p) =>
    ws.risks.some((r) => r.processIds.includes(p.id))
  ).length;
  out.riskCoverage = {
    supported: tier1.length === 0 ? 0 : coverageLevel(tier1Covered, tier1.length),
    detail:
      tier1.length === 0
        ? 'No Tier 1 processes identified yet.'
        : `${tier1Covered} of ${tier1.length} Tier 1 processes have at least one registered threat.`,
  };

  const owned = risks.filter(
    (r) =>
      r.risk.treatment != null &&
      r.risk.owner.trim() !== '' &&
      (r.risk.targetDate != null || r.risk.treatment === 'accept')
  ).length;
  out.riskTreatmentOwnership = {
    supported: coverageLevel(owned, risks.length),
    detail:
      risks.length === 0
        ? 'No risks registered.'
        : `${owned} of ${risks.length} risks have a treatment, a named owner, and a target date or a recorded acceptance.`,
  };

  const withDependencies = risks.filter((r) => r.risk.dependencies.length > 0).length;
  const shared = riskConcentration(ws).length;
  out.riskConcentration = {
    supported: coverageLevel(withDependencies, risks.length),
    detail:
      risks.length === 0
        ? 'No risks registered.'
        : `${withDependencies} of ${risks.length} risks name the dependencies they attack` +
          (shared > 0
            ? `; ${shared} ${shared === 1 ? 'dependency sits' : 'dependencies sit'} behind more than one risk.`
            : '; no shared dependency has surfaced yet.'),
  };

  // ---- Strategies ----
  const gaps = ws.objectives.flatMap((o) =>
    computeGaps(o, derived.get(o.processId)?.mtpd ?? null)
  );
  const remFor = (processId: string, kind: 'rto' | 'rpo') =>
    ws.remediations.find((r) => r.processId === processId && r.kind === kind);
  const gapsWithStrategy = gaps.filter((g) => remFor(g.processId, g.kind)?.strategy != null).length;
  out.strategySelection = {
    supported: gaps.length === 0 ? 0 : coverageLevel(gapsWithStrategy, gaps.length),
    detail:
      gaps.length === 0
        ? 'No recovery gaps on the register, so no strategy decisions are outstanding.'
        : `${gapsWithStrategy} of ${gaps.length} gaps name the continuity strategy that closes them.`,
  };

  const gapsCosted = gaps.filter((g) => {
    const rem = remFor(g.processId, g.kind);
    return rem?.estimatedCost != null && rem.targetDate != null;
  }).length;
  out.strategyInvestmentCase = {
    supported: gaps.length === 0 ? 0 : coverageLevel(gapsCosted, gaps.length),
    detail:
      gaps.length === 0
        ? 'No recovery gaps to fund.'
        : `${gapsCosted} of ${gaps.length} gaps carry both an estimated cost and a target date.`,
  };

  const chain = processChainRequirements(ws);
  const conflicts = chain.reduce((n, r) => n + r.findings.length, 0);
  const rollDown = rollDownRequirements(ws);
  const rolled = rollDown.applications.length + rollDown.suppliers.length;
  out.dependencyRequirements = {
    supported: rolled === 0 ? 0 : conflicts === 0 ? 3 : 2,
    detail:
      rolled === 0
        ? 'No application or supplier dependencies recorded, so nothing rolls down.'
        : `Requirements roll down to ${rolled} applications and suppliers` +
          (conflicts === 0
            ? ' with no unresolved conflicts in the process chain.'
            : `, but ${conflicts} ${conflicts === 1 ? 'conflict in the process chain remains' : 'conflicts in the process chain remain'} unresolved.`),
  };

  const withProfiles = processes.filter((p) =>
    ws.resourceProfiles.some((rp) => rp.processId === p.id)
  ).length;
  out.incidentResponseResources = {
    supported: coverageLevel(withProfiles, total),
    detail: `${withProfiles} of ${total} processes have a recovery resource profile (staff, equipment, seats, vital records).`,
  };

  // ---- Crisis management ----
  const plan = ws.plan;
  const triggers = plan?.triggers ?? [];
  const completeTriggers = triggers.filter(
    (t) => t.condition.trim() !== '' && t.authority.trim() !== ''
  );
  const levelsCovered = new Set(completeTriggers.map((t) => t.level)).size;
  out.activationCriteria = {
    supported: levelsCovered === 0 ? 0 : levelsCovered >= 3 ? 3 : 2,
    detail:
      levelsCovered === 0
        ? 'No activation criteria recorded.'
        : `${completeTriggers.length} criteria with a stated condition and declaring authority, covering ${levelsCovered} of 3 activation levels.`,
  };

  const team = plan?.team ?? [];
  const staffed = team.filter(
    (m) => m.name.trim() !== '' && m.phone.trim() !== '' && m.deputy.trim() !== ''
  ).length;
  out.responseTeamRoster = {
    supported: team.length === 0 ? 0 : coverageLevel(staffed, team.length),
    detail:
      team.length === 0
        ? 'No response team roster recorded.'
        : `${staffed} of ${team.length} roles have a named primary, a contact number, and a deputy.`,
  };

  const comms = plan?.communications ?? [];
  const commsComplete = comms.filter(
    (c) =>
      c.audience.trim() !== '' &&
      c.channel.trim() !== '' &&
      c.timing.trim() !== '' &&
      c.owner.trim() !== ''
  ).length;
  out.crisisCommunication = {
    supported: comms.length === 0 ? 0 : coverageLevel(commsComplete, comms.length),
    detail:
      comms.length === 0
        ? 'No communications plan recorded.'
        : `${commsComplete} of ${comms.length} audiences have a channel, timing, and named owner.`,
  };

  // ---- Exercising ----
  const completed = ws.exercises.filter((e) => e.status === 'completed');
  const recent = completed.filter((e) => monthsSince(e.updatedAt, now) <= 12);
  const documented = completed.filter((e) => e.report != null).length;

  out.bcTesting = {
    supported:
      completed.length === 0 ? (ws.exercises.length > 0 ? 1 : 0) : completed.length >= 2 ? 3 : 2,
    detail:
      ws.exercises.length === 0
        ? 'No exercises run.'
        : `${completed.length} exercise${completed.length === 1 ? '' : 's'} completed out of ${ws.exercises.length} started.`,
  };

  out.testDocumentation = {
    supported: completed.length === 0 ? 0 : coverageLevel(documented, completed.length, 4),
    detail:
      completed.length === 0
        ? 'No completed exercises to document.'
        : `${documented} of ${completed.length} completed exercises have an after-action report.`,
  };

  out.annualTesting = {
    supported: recent.length > 0 ? 4 : completed.length > 0 ? 2 : 0,
    detail:
      completed.length === 0
        ? 'No exercise has been completed.'
        : recent.length > 0
          ? `${recent.length} exercise${recent.length === 1 ? '' : 's'} completed within the last 12 months.`
          : 'The most recent completed exercise is more than 12 months old.',
  };

  out.crisisTesting = {
    supported: recent.length > 0 ? 3 : completed.length > 0 ? 2 : 0,
    detail:
      completed.length === 0
        ? 'No exercise has validated the crisis response.'
        : recent.length > 0
          ? 'Crisis response has been exercised within the last 12 months.'
          : 'Crisis response was last exercised more than 12 months ago.',
  };

  return out;
}

export interface EvidenceDiscrepancy {
  questionId: string;
  label: string;
  domainName: string;
  answered: MaturityLevel;
  supported: MaturityLevel;
  detail: string;
}

/** Ratings sitting well above what the workspace demonstrates. */
export function overclaims(
  ws: Workspace,
  assessment: MaturityAssessment | null,
  now = new Date()
): EvidenceDiscrepancy[] {
  const evidence = maturityEvidence(ws, now);
  const answers = assessment?.answers ?? {};
  const rows: EvidenceDiscrepancy[] = [];

  for (const domain of MATURITY_DOMAINS) {
    for (const q of domain.questions) {
      const answered = answers[q.id];
      const ev = evidence[q.id];
      if (answered == null || !ev) continue;
      if (answered - ev.supported >= OVERCLAIM_MARGIN) {
        rows.push({
          questionId: q.id,
          label: q.label,
          domainName: domain.name,
          answered,
          supported: ev.supported,
          detail: ev.detail,
        });
      }
    }
  }

  return rows.sort((a, b) => b.answered - b.supported - (a.answered - a.supported));
}
