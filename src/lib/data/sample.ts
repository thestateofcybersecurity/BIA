import type {
  Workspace,
  BusinessProcess,
  ImpactAssessment,
  Severity,
  Horizon,
  DependencyMap,
} from '@/lib/domain/types';

/**
 * Sample workspace: Lakeside Mutual, a fictional regional insurer
 * ($180M revenue, 450 staff). Used for demos and for exploring the
 * methodology before entering real data.
 */

const now = () => new Date().toISOString();

type Five = [Severity, Severity, Severity, Severity, Severity];

const rec = (v: Five): Record<Horizon, Severity> => ({
  h4: v[0], h24: v[1], d3: v[2], w1: v[3], m1: v[4],
});

const loss = (v: [number, number, number, number, number]): Record<Horizon, number> => ({
  h4: v[0], h24: v[1], d3: v[2], w1: v[3], m1: v[4],
});

const deps = (d: Partial<DependencyMap>): DependencyMap => ({
  people: [], applications: [], equipment: [], facilities: [], suppliers: [], data: [],
  ...d,
});

interface Def {
  id: string;
  name: string;
  description: string;
  owner: string;
  department: string;
  usersServed: string;
  peakPeriods: string;
  dependencies: DependencyMap;
  upstream: string[];
  losses: [number, number, number, number, number];
  operational: Five;
  reputational: Five;
  legal: Five;
  safety: Five;
}

const DEFS: Def[] = [
  {
    id: 'contact-center',
    name: 'Customer contact center',
    description: 'Inbound phone and chat support for policyholders, including first notice of loss for claims.',
    owner: 'Dana Whitfield',
    department: 'Customer Operations',
    usersServed: 'All policyholders (approx. 210,000)',
    peakPeriods: 'Severe weather events, renewal season (Nov-Jan)',
    dependencies: deps({
      people: ['Contact center agents (42 FTE)', 'Workforce scheduler'],
      applications: ['Genesys Cloud', 'PolicyCore CRM', 'ClaimsFlow'],
      equipment: ['Agent headsets and workstations'],
      facilities: ['Rochester HQ, floor 2', 'Remote agent pool'],
      suppliers: ['Genesys', 'Telco carrier (Lumen)'],
      data: ['Customer contact records', 'Call recordings'],
    }),
    upstream: [],
    losses: [8000, 45000, 160000, 420000, 1_600_000],
    operational: [2, 4, 4, 4, 4],
    reputational: [1, 3, 3, 4, 4],
    legal: [0, 1, 1, 2, 2],
    safety: [1, 2, 2, 3, 3],
  },
  {
    id: 'claims',
    name: 'Claims processing',
    description: 'Intake, adjudication, and payment of policyholder claims.',
    owner: 'Marcus Yee',
    department: 'Claims',
    usersServed: 'Policyholders with open claims (approx. 4,800 active)',
    peakPeriods: 'Catastrophe events',
    dependencies: deps({
      people: ['Claims adjusters (28 FTE)', 'SIU investigators'],
      applications: ['ClaimsFlow', 'Payment gateway (Fiserv)', 'Document management (OnBase)'],
      facilities: ['Rochester HQ, floor 3'],
      suppliers: ['Fiserv', 'Independent adjuster network'],
      data: ['Claims files', 'Payment records'],
    }),
    upstream: ['contact-center'],
    losses: [5000, 60000, 300000, 900000, 3_800_000],
    operational: [1, 2, 3, 4, 4],
    reputational: [1, 4, 4, 4, 4],
    legal: [0, 1, 3, 3, 4],
    safety: [0, 1, 2, 2, 2],
  },
  {
    id: 'policy-admin',
    name: 'Policy administration',
    description: 'Policy issuance, endorsements, renewals, and cancellations.',
    owner: 'Priya Raman',
    department: 'Operations',
    usersServed: 'Policyholders and 320 independent agents',
    peakPeriods: 'Renewal season (Nov-Jan)',
    dependencies: deps({
      people: ['Policy services team (18 FTE)'],
      applications: ['PolicyCore', 'Rating engine', 'Document generation'],
      facilities: ['Rochester HQ, floor 3'],
      suppliers: ['PolicyCore vendor (Duck Creek)'],
      data: ['Policy master records'],
    }),
    upstream: [],
    losses: [2000, 25000, 120000, 500000, 2_100_000],
    operational: [0, 2, 4, 4, 4],
    reputational: [0, 1, 2, 3, 4],
    legal: [0, 1, 2, 3, 3],
    safety: [0, 0, 0, 1, 1],
  },
  {
    id: 'billing',
    name: 'Premium billing & payments',
    description: 'Premium invoicing, payment collection, and reconciliation.',
    owner: 'Tom Okafor',
    department: 'Finance',
    usersServed: 'All policyholders',
    peakPeriods: 'Month-end billing cycles',
    dependencies: deps({
      people: ['Billing team (9 FTE)'],
      applications: ['BillingCenter', 'Payment gateway (Fiserv)', 'Bank integrations'],
      suppliers: ['Fiserv', 'M&T Bank'],
      data: ['Billing schedules', 'Payment history'],
    }),
    upstream: ['policy-admin'],
    losses: [1000, 15000, 90000, 400000, 2_400_000],
    operational: [0, 1, 2, 3, 4],
    reputational: [0, 1, 2, 2, 3],
    legal: [0, 0, 1, 2, 3],
    safety: [0, 0, 0, 0, 0],
  },
  {
    id: 'agent-portal',
    name: 'Agent portal',
    description: 'Self-service quoting, binding, and policy inquiry for independent agents.',
    owner: 'Priya Raman',
    department: 'Distribution',
    usersServed: '320 independent agents',
    peakPeriods: 'Business hours, quarter-end',
    dependencies: deps({
      applications: ['Agent portal (AWS-hosted)', 'Rating engine', 'PolicyCore'],
      suppliers: ['AWS (us-east-1)'],
      data: ['Agent book of business'],
    }),
    upstream: ['policy-admin'],
    losses: [3000, 30000, 110000, 350000, 1_300_000],
    operational: [1, 2, 3, 3, 4],
    reputational: [1, 2, 3, 4, 4],
    legal: [0, 0, 0, 1, 1],
    safety: [0, 0, 0, 0, 0],
  },
  {
    id: 'payroll',
    name: 'Payroll',
    description: 'Biweekly payroll for 450 employees, tax withholding and remittance.',
    owner: 'Elena Sorensen',
    department: 'HR',
    usersServed: '450 employees',
    peakPeriods: 'Biweekly pay runs, year-end',
    dependencies: deps({
      people: ['Payroll specialist (2 FTE)'],
      applications: ['ADP Workforce Now', 'Time tracking'],
      suppliers: ['ADP'],
      data: ['Payroll records', 'Tax filings'],
    }),
    upstream: [],
    losses: [0, 2000, 15000, 120000, 500000],
    operational: [0, 0, 1, 3, 3],
    reputational: [0, 0, 1, 2, 3],
    legal: [0, 0, 1, 4, 4],
    safety: [0, 0, 1, 2, 2],
  },
  {
    id: 'underwriting',
    name: 'New business underwriting',
    description: 'Risk evaluation and pricing for new policy applications.',
    owner: 'James Calloway',
    department: 'Underwriting',
    usersServed: 'Agents and prospective policyholders',
    peakPeriods: 'Renewal season',
    dependencies: deps({
      people: ['Underwriters (12 FTE)'],
      applications: ['Underwriting workbench', 'Third-party data services (LexisNexis)'],
      suppliers: ['LexisNexis'],
      data: ['Application files'],
    }),
    upstream: ['agent-portal'],
    losses: [0, 5000, 40000, 180000, 850000],
    operational: [0, 1, 2, 3, 3],
    reputational: [0, 0, 1, 2, 3],
    legal: [0, 0, 0, 1, 1],
    safety: [0, 0, 0, 0, 0],
  },
  {
    id: 'fin-reporting',
    name: 'Financial reporting',
    description: 'Statutory and regulatory financial reporting, general ledger close.',
    owner: 'Tom Okafor',
    department: 'Finance',
    usersServed: 'Regulators, board, rating agencies',
    peakPeriods: 'Quarter-end and annual statutory filing deadlines',
    dependencies: deps({
      people: ['Financial reporting team (5 FTE)'],
      applications: ['General ledger (Workday)', 'Statutory reporting tool'],
      suppliers: ['Workday'],
      data: ['General ledger', 'Statutory filings'],
    }),
    upstream: ['billing'],
    losses: [0, 1000, 8000, 60000, 400000],
    operational: [0, 0, 1, 2, 3],
    reputational: [0, 0, 0, 1, 2],
    legal: [0, 0, 1, 2, 4],
    safety: [0, 0, 0, 0, 0],
  },
];

export function sampleWorkspace(): Workspace {
  const ts = now();

  const processes: BusinessProcess[] = DEFS.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    owner: d.owner,
    department: d.department,
    usersServed: d.usersServed,
    peakPeriods: d.peakPeriods,
    dependencies: d.dependencies,
    upstreamProcessIds: d.upstream,
    createdAt: ts,
    updatedAt: ts,
  }));

  const assessments: ImpactAssessment[] = DEFS.map((d) => ({
    id: `a-${d.id}`,
    processId: d.id,
    financialLoss: loss(d.losses),
    ratings: {
      operational: rec(d.operational),
      reputational: rec(d.reputational),
      legal: rec(d.legal),
      safety: rec(d.safety),
    },
    mtpdOverride: null,
    notes: '',
    updatedAt: ts,
  }));

  return {
    org: {
      name: 'Lakeside Mutual Insurance',
      industry: 'Property & casualty insurance',
      regulatoryContext: 'NY DFS (23 NYCRR 500), NAIC model laws, SOC 2',
      annualRevenue: 180_000_000,
      employees: 450,
      riskAppetite: 'moderate',
      currency: 'USD',
      updatedAt: ts,
    },
    processes,
    assessments,
    objectives: [
      { id: 'o1', processId: 'contact-center', rtoTargetHours: 4, rpoTargetHours: 1, mbcoPercent: 60, rtoAchievableHours: 4, rpoAchievableHours: 1, dataLossNotes: 'Telephony is cloud-hosted; CRM replicates continuously.', updatedAt: ts },
      { id: 'o2', processId: 'claims', rtoTargetHours: 8, rpoTargetHours: 4, mbcoPercent: 50, rtoAchievableHours: 48, rpoAchievableHours: 4, dataLossNotes: 'Payment gateway cutover to backup processor is untested.', updatedAt: ts },
      { id: 'o3', processId: 'policy-admin', rtoTargetHours: 24, rpoTargetHours: 8, mbcoPercent: 40, rtoAchievableHours: 36, rpoAchievableHours: 8, dataLossNotes: '', updatedAt: ts },
      { id: 'o4', processId: 'billing', rtoTargetHours: 72, rpoTargetHours: 4, mbcoPercent: 50, rtoAchievableHours: 72, rpoAchievableHours: 24, dataLossNotes: 'Nightly batch only; intraday payments would need manual re-entry.', updatedAt: ts },
      { id: 'o5', processId: 'agent-portal', rtoTargetHours: 24, rpoTargetHours: 8, mbcoPercent: 70, rtoAchievableHours: 12, rpoAchievableHours: 8, dataLossNotes: '', updatedAt: ts },
      { id: 'o6', processId: 'payroll', rtoTargetHours: 96, rpoTargetHours: 24, mbcoPercent: 100, rtoAchievableHours: 48, rpoAchievableHours: 24, dataLossNotes: 'ADP holds primary records.', updatedAt: ts },
    ],
    remediations: [
      { id: 'r1', processId: 'claims', kind: 'rto', owner: 'Marcus Yee', action: 'Contract and test backup payment processor; document manual adjudication workaround for 72h operation.', status: 'in_progress', updatedAt: ts },
      { id: 'r2', processId: 'billing', kind: 'rpo', owner: 'Tom Okafor', action: 'Enable intraday replication for payment transactions.', status: 'open', updatedAt: ts },
    ],
    workflows: [
      {
        id: 'w1',
        processId: 'contact-center',
        updatedAt: ts,
        steps: [
          { id: 's1', description: 'Activate cloud contact center disaster routing profile; redirect inbound numbers.', team: 'IT Telephony', durationHours: 1, dependencies: deps({ applications: ['Genesys Cloud'], suppliers: ['Lumen'] }), alternateStaff: ['Network on-call engineer'] },
          { id: 's2', description: 'Notify remote agent pool and shift to at-home operation.', team: 'Customer Operations', durationHours: 1, dependencies: deps({ people: ['Workforce scheduler'] }), alternateStaff: ['Ops duty manager'] },
          { id: 's3', description: 'Publish IVR message and status page update for policyholders.', team: 'Communications', durationHours: 1, dependencies: deps({ applications: ['Status page'] }), alternateStaff: [] },
        ],
      },
      {
        id: 'w2',
        processId: 'claims',
        updatedAt: ts,
        steps: [
          { id: 's1', description: 'Confirm ClaimsFlow database failover to standby region.', team: 'IT Infrastructure', durationHours: 6, dependencies: deps({ applications: ['ClaimsFlow'] }), alternateStaff: ['DBA on-call'] },
          { id: 's2', description: 'Switch document intake to secondary OnBase instance.', team: 'IT Applications', durationHours: 4, dependencies: deps({ applications: ['OnBase'] }), alternateStaff: [] },
          { id: 's3', description: 'Re-point payment batch jobs at backup processor and run test payment.', team: 'Finance Systems', durationHours: 16, dependencies: deps({ suppliers: ['Fiserv'] }), alternateStaff: [] },
          { id: 's4', description: 'Resume adjudication with reduced staff; activate manual payment approvals.', team: 'Claims', durationHours: 4, dependencies: deps({ people: ['Claims adjusters (28 FTE)'] }), alternateStaff: ['Independent adjuster network'] },
        ],
      },
    ],
    maturity: {
      updatedAt: ts,
      answers: {
        bcpScope: 3, businessOperations: 3, dependencies: 2, alternativesForDependencies: 2,
        legalAndRegulatoryRequirements: 4, internalStakeholders: 3, externalStakeholders: 2, organizationalObjectives: 3,
        bcPolicy: 3, bcPolicyCommunication: 2, bcmTeam: 3, reviewMaintenancePlan: 2, bcmsProjectPlan: 2, topManagementParticipation: 2,
        riskManagement: 3, riskAssessment: 3,
        biaProcess: 2, biaConducted: 2, rtosRposDefined: 2, biaReviewed: 1,
        incidentResponsePlans: 3, recoveryPlanFlexibility: 2, incidentResponseResources: 2, interimProcesses: 1, returnToNormalProcedures: 1,
        crisisCommunication: 3, emergencyResponsePlans: 4, crisisManagementPlans: 3, crisisTesting: 2,
        bcTesting: 1, testDocumentation: 1, testReview: 1, annualTesting: 2,
        changeManagementProcedures: 2, documentationSecurity: 3, documentationVersionControl: 2, externalDocumentationControl: 1,
      },
    },
  };
}
