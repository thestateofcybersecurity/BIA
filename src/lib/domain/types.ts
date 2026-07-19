// Core domain types. The methodology these implement is defined in docs/METHODOLOGY.md.

export type Horizon = 'h4' | 'h24' | 'd3' | 'w1' | 'm1';
export type MtpdValue = Horizon | 'beyond';

export type ImpactCategory =
  | 'financial'
  | 'operational'
  | 'reputational'
  | 'legal'
  | 'safety';

export type RatedCategory = Exclude<ImpactCategory, 'financial'>;

export type Severity = 0 | 1 | 2 | 3 | 4;

export type RiskAppetite = 'conservative' | 'moderate' | 'aggressive';

export interface OrgProfile {
  name: string;
  industry: string;
  regulatoryContext: string;
  annualRevenue: number;
  employees: number;
  riskAppetite: RiskAppetite;
  currency: string;
  updatedAt: string;
}

export interface DependencyMap {
  people: string[];
  applications: string[];
  equipment: string[];
  facilities: string[];
  suppliers: string[];
  data: string[];
}

export type DependencyClass = keyof DependencyMap;

export interface BusinessProcess {
  id: string;
  name: string;
  description: string;
  owner: string;
  department: string;
  usersServed: string;
  peakPeriods: string;
  dependencies: DependencyMap;
  upstreamProcessIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ImpactAssessment {
  id: string;
  processId: string;
  /** Cumulative estimated financial loss (org currency) at each horizon; null = not yet entered. */
  financialLoss: Record<Horizon, number | null>;
  /** Severity ratings per qualitative category per horizon. */
  ratings: Record<RatedCategory, Record<Horizon, Severity | null>>;
  mtpdOverride: { value: MtpdValue; justification: string } | null;
  notes: string;
  updatedAt: string;
}

export interface RecoveryObjectives {
  id: string;
  processId: string;
  rtoTargetHours: number | null;
  rpoTargetHours: number | null;
  mbcoPercent: number | null;
  rtoAchievableHours: number | null;
  rpoAchievableHours: number | null;
  dataLossNotes: string;
  updatedAt: string;
}

export type GapKind = 'rto' | 'rpo';
export type GapStatus = 'open' | 'in_progress' | 'resolved' | 'accepted';

export interface GapRemediation {
  id: string;
  processId: string;
  kind: GapKind;
  owner: string;
  action: string;
  status: GapStatus;
  updatedAt: string;
}

export interface RecoveryStep {
  id: string;
  description: string;
  team: string;
  durationHours: number;
  dependencies: DependencyMap;
  alternateStaff: string[];
}

export interface RecoveryWorkflow {
  id: string;
  processId: string;
  steps: RecoveryStep[];
  updatedAt: string;
}

export type MaturityLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface MaturityAssessment {
  /** questionId -> level; missing/null = unanswered */
  answers: Record<string, MaturityLevel | null>;
  updatedAt: string;
}

/** Everything for one user/tenant, persisted as a single document. */
export interface Workspace {
  org: OrgProfile | null;
  processes: BusinessProcess[];
  assessments: ImpactAssessment[];
  objectives: RecoveryObjectives[];
  remediations: GapRemediation[];
  workflows: RecoveryWorkflow[];
  maturity: MaturityAssessment | null;
}

export type Tier = 1 | 2 | 3 | 4;

/** Computed, never stored. */
export interface ProcessDerived {
  processId: string;
  financialSeverity: Record<Horizon, Severity | null>;
  peakSeverity: Record<ImpactCategory, Severity>;
  mtpd: MtpdValue | null;
  mtpdDerived: MtpdValue | null;
  mtpdOverridden: boolean;
  tier: Tier | null;
  priority: number | null;
  /** Cost of downtime at the 24h horizon, if entered. */
  cost24h: number | null;
  assessmentComplete: boolean;
}
