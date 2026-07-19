import type { MaturityAssessment, MaturityLevel } from './types';

/**
 * ISO 22301 aligned maturity model: 37 questions in 8 domains, each answered
 * on an anchored 0-5 capability scale. See docs/METHODOLOGY.md section 7.
 */

export const MATURITY_LEVELS: Record<MaturityLevel, { label: string; description: string }> = {
  0: { label: 'Not performed', description: 'Nothing exists for this practice.' },
  1: { label: 'Initial', description: 'Done ad hoc by individuals; no documentation or consistency.' },
  2: { label: 'Repeatable', description: 'Practiced but inconsistent; partial documentation, key gaps remain.' },
  3: { label: 'Defined', description: 'Documented, approved, and communicated across the organization.' },
  4: { label: 'Managed', description: 'Measured and reviewed on a schedule; deviations are tracked and corrected.' },
  5: { label: 'Optimized', description: 'Continuously improved using metrics, exercises, and lessons learned.' },
};

export interface MaturityQuestion {
  id: string;
  label: string;
  help: string;
}

export interface MaturityDomain {
  id: string;
  name: string;
  clause: string;
  weight: number;
  questions: MaturityQuestion[];
}

export const MATURITY_DOMAINS: MaturityDomain[] = [
  {
    id: 'context',
    name: 'Context & Scope',
    clause: 'ISO 22301 clause 4',
    weight: 1,
    questions: [
      { id: 'bcpScope', label: 'BC program scope', help: 'Scope is based on BIA and risk assessment results, names in-scope processes and risks, and justifies exclusions.' },
      { id: 'businessOperations', label: 'Business operations documented', help: 'Products, services, and core business processes are documented and current.' },
      { id: 'dependencies', label: 'Dependencies identified', help: 'People, technology, data, facilities, assets, inputs, and supply chains are catalogued per process.' },
      { id: 'alternativesForDependencies', label: 'Alternatives for critical dependencies', help: 'Secondary sources, redundant systems, or workarounds exist for critical dependencies.' },
      { id: 'legalAndRegulatoryRequirements', label: 'Legal & regulatory requirements', help: 'Health and safety, security (such as PCI DSS), industry (such as HIPAA), and continuity regulations are identified and tracked.' },
      { id: 'internalStakeholders', label: 'Internal stakeholders', help: 'Key departments, teams, and individuals with continuity roles are identified.' },
      { id: 'externalStakeholders', label: 'External stakeholders', help: 'Customers, regulators, suppliers, and distributors relevant to continuity are identified.' },
      { id: 'organizationalObjectives', label: 'Alignment with objectives', help: 'Continuity planning reflects the organization’s mission and strategic goals.' },
    ],
  },
  {
    id: 'leadership',
    name: 'Leadership & Policy',
    clause: 'ISO 22301 clause 5',
    weight: 1,
    questions: [
      { id: 'bcPolicy', label: 'BC policy', help: 'A policy commits the organization to creating, maintaining, and testing continuity plans; it is approved and current.' },
      { id: 'bcPolicyCommunication', label: 'Policy communication', help: 'The policy is communicated through onboarding, intranet, or handbooks.' },
      { id: 'bcmTeam', label: 'BC management team', help: 'Roles are defined: executive sponsor, program lead, and departmental representatives covering BC, IT DR, and crisis management.' },
      { id: 'reviewMaintenancePlan', label: 'Review & maintenance plan', help: 'Schedules exist for testing and reviewing plans, with responsibilities and reporting to top management.' },
      { id: 'bcmsProjectPlan', label: 'Program roadmap', help: 'A plan with tasks, resources, and timelines closes gaps against continuity objectives.' },
      { id: 'topManagementParticipation', label: 'Top management participation', help: 'Executives actively take part in exercises and reviews.' },
    ],
  },
  {
    id: 'risk',
    name: 'Risk Assessment',
    clause: 'ISO 22301 clauses 6 & 8.2',
    weight: 1,
    questions: [
      { id: 'riskManagement', label: 'Risk management process', help: 'Risks to continuity are identified, evaluated, and prioritized, with decisions to mitigate or accept.' },
      { id: 'riskAssessment', label: 'Risk assessment documented', help: 'Risk criteria, tolerance levels, and mitigation or acceptance strategies are documented.' },
    ],
  },
  {
    id: 'bia',
    name: 'Business Impact Analysis',
    clause: 'ISO 22301 clause 8.2 / ISO 22317',
    weight: 1.5,
    questions: [
      { id: 'biaProcess', label: 'BIA process defined', help: 'A documented BIA method prioritizes recovery using impact over time, MTPD, RTO, and RPO.' },
      { id: 'biaConducted', label: 'BIA conducted', help: 'A comprehensive BIA covers processes, dependencies, and financial, legal, and reputational impacts over time.' },
      { id: 'rtosRposDefined', label: 'RTOs & RPOs defined', help: 'Recovery objectives for critical processes follow from BIA findings and are communicated.' },
      { id: 'biaReviewed', label: 'BIA reviewed', help: 'The BIA is refreshed at least annually and after significant change.' },
    ],
  },
  {
    id: 'strategies',
    name: 'Continuity Strategies & Plans',
    clause: 'ISO 22301 clauses 8.3 & 8.4',
    weight: 1.5,
    questions: [
      { id: 'incidentResponsePlans', label: 'Incident response plans', help: 'Plans cover detection, notification, crisis communications, and relocation to alternate sites.' },
      { id: 'recoveryPlanFlexibility', label: 'Plan flexibility', help: 'Plans address varied incidents: IT failures, facility outages, and regional disruptions.' },
      { id: 'incidentResponseResources', label: 'Response resources', help: 'Personnel, data, facilities, equipment, transportation, IT, and vendors needed for response are arranged.' },
      { id: 'interimProcesses', label: 'Interim processes', help: 'Documented workarounds sustain essential output during disruption.' },
      { id: 'returnToNormalProcedures', label: 'Return to normal', help: 'Procedures cover the return to normal operations after an incident.' },
    ],
  },
  {
    id: 'crisis',
    name: 'Crisis Management & Communications',
    clause: 'ISO 22301 clause 8.4',
    weight: 1,
    questions: [
      { id: 'crisisCommunication', label: 'Crisis communication', help: 'Internal and external communication plans exist, with alternate channels if primary ones fail.' },
      { id: 'emergencyResponsePlans', label: 'Emergency response', help: 'Evacuation, shelter-in-place, lockdown, and medical emergency procedures exist.' },
      { id: 'crisisManagementPlans', label: 'Crisis management plans', help: 'Crisis team notification, assessment, activation, and ongoing evaluation are defined.' },
      { id: 'crisisTesting', label: 'Crisis plan testing', help: 'Crisis response is validated at scheduled intervals, at least annually.' },
    ],
  },
  {
    id: 'testing',
    name: 'Exercising & Testing',
    clause: 'ISO 22301 clause 8.5',
    weight: 1,
    questions: [
      { id: 'bcTesting', label: 'BC exercises', help: 'Exercises use realistic scenarios and objectives, including arrangements with external parties.' },
      { id: 'testDocumentation', label: 'Exercise documentation', help: 'Results, outcomes, and recommendations are documented after every exercise.' },
      { id: 'testReview', label: 'Management review of results', help: 'Top management reviews exercise results and acts on post-exercise reports.' },
      { id: 'annualTesting', label: 'Exercise cadence', help: 'Exercises run at least annually and after significant operational change.' },
    ],
  },
  {
    id: 'documentation',
    name: 'Documentation & Improvement',
    clause: 'ISO 22301 clauses 7 & 10',
    weight: 1,
    questions: [
      { id: 'changeManagementProcedures', label: 'Change management', help: 'IT and business changes are assessed for continuity impact, with responsibilities and timelines.' },
      { id: 'documentationSecurity', label: 'Documentation security', help: 'Plan documents meet organizational and regulatory security requirements.' },
      { id: 'documentationVersionControl', label: 'Version control & retention', help: 'Documents are version controlled with retention and disposition policies.' },
      { id: 'externalDocumentationControl', label: 'External documentation', help: 'Documents from partners and vendors are identified and controlled appropriately.' },
    ],
  },
];

export const ALL_QUESTIONS: MaturityQuestion[] = MATURITY_DOMAINS.flatMap((d) => d.questions);

export interface DomainScore {
  domainId: string;
  name: string;
  answered: number;
  total: number;
  /** Mean of answered questions, 0-5; null if none answered. */
  score: number | null;
}

export interface MaturityResult {
  domains: DomainScore[];
  /** Weighted mean of domain scores, 0-5; null until at least one answer exists. */
  overall: number | null;
  answered: number;
  total: number;
  /** Domains sorted weakest first (answered domains only). */
  roadmap: DomainScore[];
}

export function scoreMaturity(assessment: MaturityAssessment | null): MaturityResult {
  const answers = assessment?.answers ?? {};
  const domains: DomainScore[] = MATURITY_DOMAINS.map((d) => {
    const values = d.questions
      .map((q) => answers[q.id])
      .filter((v): v is MaturityLevel => v != null);
    return {
      domainId: d.id,
      name: d.name,
      answered: values.length,
      total: d.questions.length,
      score:
        values.length === 0
          ? null
          : Math.round((values.reduce((s: number, v) => s + v, 0) / values.length) * 100) / 100,
    };
  });

  let weightSum = 0;
  let weighted = 0;
  domains.forEach((ds, i) => {
    if (ds.score != null) {
      const w = MATURITY_DOMAINS[i].weight;
      weightSum += w;
      weighted += ds.score * w;
    }
  });

  const scored = domains.filter((d) => d.score != null);
  return {
    domains,
    overall: weightSum === 0 ? null : Math.round((weighted / weightSum) * 100) / 100,
    answered: domains.reduce((s, d) => s + d.answered, 0),
    total: ALL_QUESTIONS.length,
    roadmap: [...scored].sort((a, b) => (a.score! - b.score!)),
  };
}
