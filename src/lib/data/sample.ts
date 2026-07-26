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
  ownerEmail: string;
  ownerPhone: string;
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
    ownerEmail: 'dana.whitfield@lakesidemutual.example',
    ownerPhone: '585-555-0142',
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
    ownerEmail: 'marcus.yee@lakesidemutual.example',
    ownerPhone: '585-555-0177',
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
    ownerEmail: 'priya.raman@lakesidemutual.example',
    ownerPhone: '585-555-0118',
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
    ownerEmail: 'tom.okafor@lakesidemutual.example',
    ownerPhone: '585-555-0163',
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
    ownerEmail: 'priya.raman@lakesidemutual.example',
    ownerPhone: '585-555-0118',
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
    ownerEmail: 'elena.sorensen@lakesidemutual.example',
    ownerPhone: '585-555-0129',
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
    ownerEmail: 'james.calloway@lakesidemutual.example',
    ownerPhone: '585-555-0154',
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
    ownerEmail: 'tom.okafor@lakesidemutual.example',
    ownerPhone: '585-555-0163',
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
    ownerEmail: d.ownerEmail,
    ownerPhone: d.ownerPhone,
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
    // Underwriting deliberately left unapproved to show the sign-off state.
    approvedBy: d.id === 'underwriting' ? null : d.owner,
    approvedAt: d.id === 'underwriting' ? null : ts,
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
      { id: 'o1', processId: 'contact-center', rtoTargetHours: 4, rpoTargetHours: 1, mbcoPercent: 60, rtoAchievableHours: 4, rpoAchievableHours: 1, wrtHours: 2, dataLossNotes: 'Telephony is cloud-hosted; CRM replicates continuously.', updatedAt: ts },
      { id: 'o2', processId: 'claims', rtoTargetHours: 8, rpoTargetHours: 4, mbcoPercent: 50, rtoAchievableHours: 48, rpoAchievableHours: 4, wrtHours: 24, dataLossNotes: 'Payment gateway cutover to backup processor is untested.', updatedAt: ts },
      { id: 'o3', processId: 'policy-admin', rtoTargetHours: 24, rpoTargetHours: 8, mbcoPercent: 40, rtoAchievableHours: 36, rpoAchievableHours: 8, wrtHours: 12, dataLossNotes: '', updatedAt: ts },
      { id: 'o4', processId: 'billing', rtoTargetHours: 72, rpoTargetHours: 4, mbcoPercent: 50, rtoAchievableHours: 72, rpoAchievableHours: 24, wrtHours: null, dataLossNotes: 'Nightly batch only; intraday payments would need manual re-entry.', updatedAt: ts },
      { id: 'o5', processId: 'agent-portal', rtoTargetHours: 24, rpoTargetHours: 8, mbcoPercent: 70, rtoAchievableHours: 12, rpoAchievableHours: 8, wrtHours: 4, dataLossNotes: '', updatedAt: ts },
      { id: 'o6', processId: 'payroll', rtoTargetHours: 96, rpoTargetHours: 24, mbcoPercent: 100, rtoAchievableHours: 48, rpoAchievableHours: 24, wrtHours: 24, dataLossNotes: 'ADP holds primary records.', updatedAt: ts },
    ],
    remediations: [
      { id: 'r1', processId: 'claims', kind: 'rto', owner: 'Marcus Yee', action: 'Contract and test backup payment processor; document manual adjudication workaround for 72h operation.', status: 'in_progress', strategy: 'third_party', estimatedCost: 85_000, targetDate: '2026-11-30', updatedAt: ts },
      { id: 'r2', processId: 'billing', kind: 'rpo', owner: 'Tom Okafor', action: 'Enable intraday replication for payment transactions.', status: 'open', strategy: 'data_protection', estimatedCost: 40_000, targetDate: '2027-03-31', updatedAt: ts },
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
    exercises: [],
    resourceProfiles: [
      {
        id: 'rp-contact-center',
        processId: 'contact-center',
        staff: { h4: 8, h24: 15, d3: 25, w1: 35, m1: 42 },
        workstations: { h4: 8, h24: 15, d3: 25, w1: 35, m1: 42 },
        facilitySeats: { h4: 0, h24: 10, d3: 20, w1: 30, m1: 42 },
        vitalRecords: ['Customer contact records', 'IVR scripts', 'Escalation matrix'],
        notes: 'First 4 hours run fully remote on softphones; seats reflect gradual return to Rochester HQ or the alternate site.',
        updatedAt: ts,
      },
      {
        id: 'rp-claims',
        processId: 'claims',
        staff: { h4: 4, h24: 10, d3: 18, w1: 24, m1: 28 },
        workstations: { h4: 4, h24: 10, d3: 18, w1: 24, m1: 28 },
        facilitySeats: { h4: 0, h24: 6, d3: 12, w1: 20, m1: 28 },
        vitalRecords: ['Open claims files', 'Payment authorization records', 'Adjuster licensing records'],
        notes: 'Manual adjudication at 24h needs printed authority limits; surge via independent adjuster network beyond 1 week.',
        updatedAt: ts,
      },
    ],
    collectionRequests: [],
    risks: [
      {
        id: 'risk-ransomware',
        title: 'Ransomware detonation across the claims and policy estate',
        category: 'Cyber attack',
        description:
          'Initial access through a phishing lure or an unpatched edge device, followed by lateral movement to the file and database servers behind claims and policy administration.',
        processIds: ['claims', 'policy-admin', 'contact-center'],
        dependencies: ['ClaimsFlow', 'PolicyCore', 'Document management (OnBase)'],
        likelihood: 3,
        likelihoodRationale:
          'Two regional carriers in the state were hit in the last eighteen months; our own phishing simulation click rate is 9%.',
        existingControls:
          'EDR on all servers, offline backup copies tested quarterly, MFA on remote access. Network segmentation between claims and policy remains incomplete.',
        treatment: 'reduce',
        treatmentAction:
          'Finish segmentation between the claims and policy estates, and rehearse a full restore of ClaimsFlow from the offline copy.',
        owner: 'Elena Sorensen',
        targetDate: '2027-01-31',
        status: 'treating',
        updatedAt: ts,
      },
      {
        id: 'risk-fiserv',
        title: 'Payment processor outage at Fiserv',
        category: 'Supplier or third-party failure',
        description:
          'Extended unavailability of the payment gateway stops claim payments going out and premium payments coming in.',
        processIds: ['claims', 'billing'],
        dependencies: ['Fiserv', 'Payment gateway (Fiserv)'],
        likelihood: 2,
        likelihoodRationale:
          'Two brief outages in the past three years, neither beyond four hours; the contract carries no continuity commitment.',
        existingControls:
          'Manual payment authority up to $25k. The backup processor is contracted but the cutover has never been tested.',
        treatment: 'reduce',
        treatmentAction:
          'Test the backup processor cutover end to end and add a continuity clause at contract renewal.',
        owner: 'Marcus Yee',
        targetDate: '2026-11-30',
        status: 'treating',
        updatedAt: ts,
      },
      {
        id: 'risk-hq',
        title: 'Loss of Rochester HQ (fire, flood, or extended utility failure)',
        category: 'Facility loss',
        description:
          'The building housing contact center, claims, and policy operations becomes unusable for more than a week.',
        processIds: ['contact-center', 'claims', 'policy-admin'],
        dependencies: ['Rochester HQ, floor 2', 'Rochester HQ, floor 3'],
        likelihood: 1,
        likelihoodRationale:
          'No incident in the building in twenty years; the site sits outside the flood plain but on a single utility feed.',
        existingControls:
          'Contact center staff can work remotely on softphones. Claims adjudication needs printed authority limits that are only held on site.',
        treatment: 'reduce',
        treatmentAction:
          'Hold current authority-limit documentation off site and confirm alternate seating at the Buffalo branch.',
        owner: 'Priya Raman',
        targetDate: '2027-06-30',
        status: 'open',
        updatedAt: ts,
      },
      {
        id: 'risk-aws',
        title: 'Extended AWS us-east-1 disruption',
        category: 'Technology failure',
        description:
          'The agent portal is single-region; a prolonged regional impairment removes agent self-service and new business quoting.',
        processIds: ['agent-portal', 'underwriting'],
        dependencies: ['AWS (us-east-1)', 'Agent portal (AWS-hosted)'],
        likelihood: 2,
        likelihoodRationale:
          'Region-wide impairments have occurred roughly every two years, typically measured in hours rather than days.',
        existingControls: 'Daily snapshots to a second region; no standby environment running.',
        treatment: 'accept',
        treatmentAction:
          'Accepted for now: agents can transact by phone through the contact center, and the portal is Tier 3.',
        owner: 'Priya Raman',
        targetDate: null,
        status: 'accepted',
        updatedAt: ts,
      },
      {
        id: 'risk-winter',
        title: 'Severe winter storm closing the Rochester site',
        category: 'Natural hazard',
        description:
          'Lake-effect snow and a driving ban keep staff away from the Rochester site for two to three days during renewal season.',
        processIds: ['contact-center', 'claims', 'policy-admin'],
        dependencies: ['Rochester HQ, floor 2', 'Rochester HQ, floor 3'],
        likelihood: 4,
        likelihoodRationale:
          'Driving bans have been declared in three of the last five winters; this is a question of when, not if.',
        existingControls:
          'Contact center runs remotely on softphones. Policy services staff have laptops but no VPN capacity test above 60 concurrent users.',
        treatment: 'reduce',
        treatmentAction:
          'Load-test remote access at full headcount before November and publish the severe weather working procedure.',
        owner: 'Dana Whitfield',
        targetDate: '2026-10-31',
        status: 'treating',
        updatedAt: ts,
      },
      {
        id: 'risk-keyperson',
        title: 'Loss of the payroll specialist team',
        category: 'Workforce disruption',
        description:
          'Both payroll specialists are unavailable across a pay run, with no cross-trained cover.',
        processIds: ['payroll'],
        dependencies: ['ADP Workforce Now'],
        likelihood: 2,
        likelihoodRationale:
          'A two-person team with overlapping leave patterns; one departure in the last two years took four months to backfill.',
        existingControls: 'ADP support can run an emergency repeat of the previous cycle.',
        treatment: 'reduce',
        treatmentAction: 'Cross-train two HR generalists and document the pay run end to end.',
        owner: 'Elena Sorensen',
        targetDate: '2027-02-28',
        status: 'open',
        updatedAt: ts,
      },
    ],
    plan: {
      declarationAuthority:
        'Chief Operating Officer; in their absence the Incident Commander, confirmed to the CEO within 1 hour.',
      standDownAuthority:
        'Incident Commander, after each recovered process confirms normal service and the backlog is cleared.',
      commandLocation: 'Rochester HQ, boardroom 4A / alternate: Buffalo branch, training room B',
      bridgeDetails: 'Standing bridge 585-555-0900 pin 88421 · Teams channel #incident-response',
      team: [
        {
          id: 'm1',
          role: 'Incident Commander',
          name: 'Priya Raman',
          title: 'VP Operations',
          email: 'priya.raman@lakesidemutual.example',
          phone: '585-555-0118',
          deputy: 'Dana Whitfield',
          deputyPhone: '585-555-0142',
        },
        {
          id: 'm2',
          role: 'IT / Technical Recovery Lead',
          name: 'Elena Sorensen',
          title: 'Director of IT',
          email: 'elena.sorensen@lakesidemutual.example',
          phone: '585-555-0129',
          deputy: 'Infrastructure on-call',
          deputyPhone: '585-555-0130',
        },
        {
          id: 'm3',
          role: 'Communications Lead',
          name: 'Marcus Yee',
          title: 'Head of Claims',
          email: 'marcus.yee@lakesidemutual.example',
          phone: '585-555-0177',
          deputy: 'Corporate Communications duty officer',
          deputyPhone: '585-555-0180',
        },
        {
          id: 'm4',
          role: 'Legal & Regulatory Lead',
          name: 'James Calloway',
          title: 'General Counsel',
          email: 'james.calloway@lakesidemutual.example',
          phone: '585-555-0154',
          deputy: 'Compliance Manager',
          deputyPhone: '585-555-0155',
        },
        {
          id: 'm5',
          role: 'Scribe / Loggist',
          name: 'Tom Okafor',
          title: 'Finance Systems Manager',
          email: 'tom.okafor@lakesidemutual.example',
          phone: '585-555-0163',
          deputy: 'Operations analyst on duty',
          deputyPhone: '585-555-0164',
        },
      ],
      triggers: [
        {
          id: 't1',
          level: 'monitor',
          condition:
            'Any Tier 1 or Tier 2 process degraded, or a supplier reports an incident affecting us, with service still being delivered.',
          authority: 'Duty manager',
        },
        {
          id: 't2',
          level: 'partial',
          condition:
            'Any Tier 1 process fully unavailable beyond 1 hour with no restoration estimate, or any confirmed data loss affecting policy or claims records.',
          authority: 'Incident Commander',
        },
        {
          id: 't3',
          level: 'full',
          condition:
            'Loss of the Rochester HQ, a confirmed ransomware detonation, or two or more Tier 1 processes down simultaneously.',
          authority: 'Chief Operating Officer',
        },
      ],
      communications: [
        {
          id: 'c1',
          audience: 'Staff',
          channel: 'SMS alert plus email, repeated on the Teams channel',
          timing: 'Within 30 minutes of declaration',
          owner: 'Communications Lead',
          keyMessage:
            'What is known, which systems are affected, where to report for work, and when the next update comes. No speculation about cause.',
        },
        {
          id: 'c2',
          audience: 'Customers',
          channel: 'Status page, IVR message, agent script',
          timing: 'Within 1 hour of declaration',
          owner: 'Head of Claims',
          keyMessage:
            'Which services are available, how to reach us for urgent claims, and expected restoration window. Claims intake continues by phone regardless of system state.',
        },
        {
          id: 'c3',
          audience: 'Regulators (NY DFS)',
          channel: 'Written notification per 23 NYCRR 500.17',
          timing: 'Within 72 hours of determining a reportable cybersecurity event',
          owner: 'General Counsel',
          keyMessage:
            'Nature of the event, systems and data affected, containment actions taken, and remediation plan.',
        },
        {
          id: 'c4',
          audience: 'Key suppliers',
          channel: 'Direct call to named account manager',
          timing: 'Within 2 hours of declaration',
          owner: 'Incident Commander',
          keyMessage:
            'Support required, escalation path, and any change to transaction volumes or cutover to backup arrangements.',
        },
      ],
      updatedAt: ts,
    },
    maturity: {
      updatedAt: ts,
      // Ratings track what this workspace actually demonstrates, with one
      // deliberate exception: annualTesting claims a yearly exercise cadence
      // while no exercise has ever been completed here. That is the most
      // common self-assessment discrepancy in real programs, and it gives the
      // evidence check something true to catch.
      answers: {
        bcpScope: 3, businessOperations: 3, dependencies: 3, alternativesForDependencies: 2,
        legalAndRegulatoryRequirements: 4, internalStakeholders: 3, externalStakeholders: 2, organizationalObjectives: 3,
        bcPolicy: 3, bcPolicyCommunication: 2, bcmTeam: 3, reviewMaintenancePlan: 2, bcmsProjectPlan: 2, topManagementParticipation: 2,
        riskManagement: 3, riskAssessment: 3, riskCoverage: 3, riskTreatmentOwnership: 3, riskConcentration: 2,
        biaProcess: 3, biaConducted: 3, rtosRposDefined: 2, biaSignOff: 2, biaReviewed: 2,
        incidentResponsePlans: 3, strategySelection: 2, strategyInvestmentCase: 2, dependencyRequirements: 2,
        recoveryPlanFlexibility: 2, incidentResponseResources: 2, interimProcesses: 1, returnToNormalProcedures: 1,
        activationCriteria: 3, responseTeamRoster: 3, crisisCommunication: 3,
        emergencyResponsePlans: 4, crisisManagementPlans: 3, crisisTesting: 1,
        bcTesting: 1, testDocumentation: 1, testReview: 1, annualTesting: 2,
        changeManagementProcedures: 2, documentationSecurity: 3, documentationVersionControl: 2, externalDocumentationControl: 1,
      },
    },
  };
}
