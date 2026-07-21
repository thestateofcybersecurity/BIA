import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Workspace, Tier, Severity, Horizon } from '@/lib/domain/types';
import { deriveAll, computeGaps, REVIEW_INTERVAL_MONTHS } from '@/lib/domain/scoring';
import { scoreMaturity, MATURITY_DOMAINS } from '@/lib/domain/maturity';
import { rollDownRequirements } from '@/lib/domain/rolldown';
import { CATALOG } from '@/lib/domain/scenarios';
import {
  HORIZONS,
  HORIZON_LABELS,
  MTPD_LABELS,
  TIER_LABELS,
  TIER_SHORT,
  DEPENDENCY_CLASSES,
  DEPENDENCY_LABELS,
  RATED_CATEGORIES,
  SEVERITY_LABELS,
} from '@/lib/domain/constants';
import { formatCurrency, formatCompactCurrency, formatHours, formatDate } from '@/lib/format';

/**
 * The official BC plan document, generated server-side as a real PDF.
 * Layout mirrors the on-screen report (docs/METHODOLOGY.md section 10)
 * with document-control formalities: cover, control and approvals page,
 * running header/footer, and page numbering.
 */

const INK = '#1b2430';
const INK_SOFT = '#3d4756';
const MUTED = '#6b7280';
const FAINT = '#9aa1ac';
const LINE = '#d9d4c7';
const PAPER = '#f5f2ea';
const ACCENT = '#bc4a1b';
const OK = '#2e6e46';
const WARN = '#a06c0a';
const BAD = '#a3271c';

const TIER_COLORS: Record<Tier, { bg: string; fg: string }> = {
  1: { bg: '#8a2210', fg: '#ffffff' },
  2: { bg: '#c95f24', fg: '#ffffff' },
  3: { bg: '#e8a366', fg: INK },
  4: { bg: '#ece7da', fg: INK_SOFT },
};

const SEV_COLORS: Record<Severity, { bg: string; fg: string }> = {
  0: { bg: '#ece7da', fg: INK_SOFT },
  1: { bg: '#f2d3ae', fg: INK },
  2: { bg: '#e8a366', fg: INK },
  3: { bg: '#c95f24', fg: '#ffffff' },
  4: { bg: '#8a2210', fg: '#ffffff' },
};

const s = StyleSheet.create({
  page: {
    paddingTop: 64,
    paddingBottom: 58,
    paddingHorizontal: 54,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: INK,
    lineHeight: 1.45,
  },
  coverPage: {
    padding: 0,
    fontFamily: 'Helvetica',
    color: INK,
    backgroundColor: '#ffffff',
  },
  // Running header / footer
  header: {
    position: 'absolute',
    top: 22,
    left: 54,
    right: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.75,
    borderBottomColor: LINE,
    paddingBottom: 6,
  },
  headerText: { fontSize: 7, color: MUTED, letterSpacing: 1 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 54,
    right: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.75,
    borderTopColor: LINE,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: MUTED, letterSpacing: 1 },
  // Sections
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 18,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: INK,
  },
  sectionNum: { fontSize: 11, color: ACCENT, fontFamily: 'Helvetica-Bold', marginRight: 8 },
  sectionTitle: { fontSize: 15, fontFamily: 'Times-Bold' },
  subTitle: { fontSize: 11, fontFamily: 'Times-Bold', marginTop: 10, marginBottom: 5 },
  body: { fontSize: 9, color: INK_SOFT, marginBottom: 6 },
  // Tables
  table: { marginTop: 4, marginBottom: 8 },
  thRow: { flexDirection: 'row', backgroundColor: INK, paddingVertical: 4, paddingHorizontal: 6 },
  th: { fontSize: 6.5, color: '#ffffff', letterSpacing: 0.8, textTransform: 'uppercase' },
  tr: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
  },
  trAlt: { backgroundColor: PAPER },
  td: { fontSize: 8, color: INK_SOFT },
  tdStrong: { fontSize: 8, color: INK, fontFamily: 'Helvetica-Bold' },
  // Chips
  chip: {
    fontSize: 6.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 6.5,
    color: MUTED,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
});

const col = (width: string | number) => ({ width } as const);

function SectionTitle({ num, title }: { num: string; title: string }) {
  return (
    <View style={s.sectionTitleRow} minPresenceAhead={90} wrap={false}>
      <Text style={s.sectionNum}>{num}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function TierChip({ tier }: { tier: Tier | null }) {
  if (tier == null) {
    return <Text style={[s.chip, { backgroundColor: '#eeeeee', color: MUTED }]}>Unassessed</Text>;
  }
  const c = TIER_COLORS[tier];
  return (
    <Text style={[s.chip, { backgroundColor: c.bg, color: c.fg }]}>
      T{tier} {TIER_SHORT[tier]}
    </Text>
  );
}

function Th({ children, width }: { children: React.ReactNode; width: string | number }) {
  return (
    <View style={col(width)}>
      <Text style={s.th}>{children}</Text>
    </View>
  );
}

function Td({
  children,
  width,
  strong,
  color,
}: {
  children: React.ReactNode;
  width: string | number;
  strong?: boolean;
  color?: string;
}) {
  return (
    <View style={[col(width), { paddingRight: 4 }]}>
      <Text style={[strong ? s.tdStrong : s.td, color ? { color } : {}]}>{children}</Text>
    </View>
  );
}

function PageChrome({ org, generated }: { org: string; generated: string }) {
  return (
    <>
      <View style={s.header} fixed>
        <Text style={s.headerText}>{org.toUpperCase()} · BUSINESS CONTINUITY PLAN</Text>
        <Text style={s.headerText}>{generated}</Text>
      </View>
      <View style={s.footer} fixed>
        <Text style={s.footerText}>CONFIDENTIAL · INTERNAL USE ONLY</Text>
        <Text
          style={s.footerText}
          render={({ pageNumber, totalPages }) => `PAGE ${pageNumber} OF ${totalPages}`}
        />
      </View>
    </>
  );
}

export function ReportDocument({ ws, generatedAt }: { ws: Workspace; generatedAt: string }) {
  const org = ws.org!;
  const currency = org.currency;
  const derived = deriveAll(ws);
  const maturity = scoreMaturity(ws.maturity);
  const rollDown = rollDownRequirements(ws);
  const generated = formatDate(generatedAt);

  const ranked = ws.processes
    .map((p) => ({ p, d: derived.get(p.id)!, a: ws.assessments.find((x) => x.processId === p.id) }))
    .sort((x, y) => (y.d.priority ?? -1) - (x.d.priority ?? -1));

  const tierCount = (t: Tier) => ranked.filter(({ d }) => d.tier === t).length;
  const cost24 = ranked.reduce((sum, { d }) => sum + (d.cost24h ?? 0), 0);
  const cost1w = ranked.reduce((sum, { a }) => sum + (a?.financialLoss.w1 ?? 0), 0);
  const maxCost24 = Math.max(...ranked.map(({ d }) => d.cost24h ?? 0), 1);

  const gaps = ws.objectives
    .flatMap((o) => computeGaps(o, derived.get(o.processId)?.mtpd ?? null))
    .sort((a, b) => b.gapHours - a.gapHours);

  const nameOf = (id: string) => ws.processes.find((p) => p.id === id)?.name ?? id;
  const remFor = (processId: string, kind: 'rto' | 'rpo') =>
    ws.remediations.find((r) => r.processId === processId && r.kind === kind);

  const approvals = ranked.filter(({ a }) => a?.approvedBy);
  const completedSessions = ws.exercises.filter((e) => e.status === 'completed');

  const maxSeverityAt = (processId: string, h: Horizon): Severity | null => {
    const a = ws.assessments.find((x) => x.processId === processId);
    if (!a) return null;
    let max: Severity | null = derived.get(processId)?.financialSeverity[h] ?? null;
    for (const cat of RATED_CATEGORIES) {
      const v = a.ratings[cat][h];
      if (v != null && (max == null || v > max)) max = v;
    }
    return max;
  };

  return (
    <Document
      title={`Business Continuity Plan - ${org.name}`}
      author={org.name}
      subject="Business Impact Analysis and Continuity Plan"
      creator="BIA Platform"
    >
      {/* ============ COVER ============ */}
      <Page size="LETTER" style={s.coverPage}>
        <View style={{ height: 10, backgroundColor: INK }} />
        <View style={{ height: 3, backgroundColor: ACCENT }} />
        <View style={{ paddingHorizontal: 64, paddingTop: 96, flex: 1 }}>
          <Text style={{ fontSize: 8, letterSpacing: 3, color: ACCENT, marginBottom: 18 }}>
            CONFIDENTIAL · INTERNAL USE ONLY
          </Text>
          <Text style={{ fontSize: 34, fontFamily: 'Times-Bold', lineHeight: 1.15 }}>
            Business Continuity Plan
          </Text>
          <Text style={{ fontSize: 16, fontFamily: 'Times-Roman', color: INK_SOFT, marginTop: 10 }}>
            {org.name}
          </Text>
          <View style={{ width: 64, height: 2, backgroundColor: ACCENT, marginTop: 22 }} />

          <View style={{ marginTop: 200 }}>
            {(
              [
                ['Document', 'Business Impact Analysis & Continuity Plan'],
                ['Prepared for', org.name],
                ['Industry', org.industry || 'Not specified'],
                ['Report date', generated],
                ['Methodology', 'ISO 22317 · ISO 22301 · NIST SP 800-34'],
                ['Processes in scope', String(ws.processes.length)],
              ] as const
            ).map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', marginBottom: 5 }}>
                <Text style={{ fontSize: 8, color: MUTED, width: 110, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  {k}
                </Text>
                <Text style={{ fontSize: 9, color: INK }}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ paddingHorizontal: 64, paddingBottom: 40 }}>
          <Text style={{ fontSize: 7, color: FAINT }}>
            This document is generated from live assessment data and reflects the state of the
            business impact analysis as of the report date. Distribution is restricted to
            personnel with a business need to know.
          </Text>
        </View>
        <View style={{ height: 3, backgroundColor: ACCENT }} />
        <View style={{ height: 10, backgroundColor: INK }} />
      </Page>

      {/* ============ DOCUMENT CONTROL ============ */}
      <Page size="LETTER" style={s.page}>
        <PageChrome org={org.name} generated={generated} />

        <SectionTitle num="" title="Document control" />
        <View style={s.table}>
          {(
            [
              ['Title', `Business Continuity Plan - ${org.name}`],
              ['Classification', 'Confidential · Internal use only'],
              ['Generated', generated],
              ['Generator', 'BIA platform (data-derived; no boilerplate content)'],
              ['Review cycle', `Assessments are due for review ${REVIEW_INTERVAL_MONTHS} months after last approval or edit`],
              ['Risk appetite', org.riskAppetite.charAt(0).toUpperCase() + org.riskAppetite.slice(1)],
              ['Regulatory context', org.regulatoryContext || 'Not specified'],
            ] as const
          ).map(([k, v], i) => (
            <View key={k} style={[s.tr, ...(i % 2 ? [s.trAlt] : [])]}>
              <Td width="28%" strong>{k}</Td>
              <Td width="72%">{v}</Td>
            </View>
          ))}
        </View>

        <Text style={s.subTitle}>Assessment approvals</Text>
        <Text style={s.body}>
          Each business impact assessment carries an owner sign-off. Editing an assessment
          voids its approval until re-signed.
        </Text>
        <View style={s.table}>
          <View style={s.thRow}>
            <Th width="40%">Process</Th>
            <Th width="30%">Approved by</Th>
            <Th width="30%">Date</Th>
          </View>
          {ranked.map(({ p, a }, i) => (
            <View key={p.id} style={[s.tr, ...(i % 2 ? [s.trAlt] : [])]}>
              <Td width="40%" strong>{p.name}</Td>
              {a?.approvedBy ? (
                <>
                  <Td width="30%">{a.approvedBy}</Td>
                  <Td width="30%">{a.approvedAt ? formatDate(a.approvedAt) : ''}</Td>
                </>
              ) : (
                <>
                  <Td width="30%" color={WARN}>Not approved</Td>
                  <Td width="30%">·</Td>
                </>
              )}
            </View>
          ))}
        </View>
      </Page>

      {/* ============ MAIN CONTENT ============ */}
      <Page size="LETTER" style={s.page}>
        <PageChrome org={org.name} generated={generated} />

        {/* 01 EXecutive summary */}
        <SectionTitle num="01" title="Executive summary" />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {([1, 2, 3, 4] as Tier[]).map((t) => (
            <View
              key={t}
              style={{
                flex: 1,
                borderWidth: 0.75,
                borderColor: LINE,
                backgroundColor: PAPER,
                padding: 8,
              }}
            >
              <Text style={s.label}>{TIER_LABELS[t]}</Text>
              <Text style={{ fontSize: 20, fontFamily: 'Times-Bold' }}>{tierCount(t)}</Text>
            </View>
          ))}
        </View>
        <Text style={s.body}>
          {ws.processes.length} business processes were assessed using time-phased impact
          analysis. A 24 hour disruption across all assessed processes represents an estimated{' '}
          {formatCurrency(cost24, currency)} in cumulative losses, rising to{' '}
          {formatCurrency(cost1w, currency)} at one week. {gaps.length} recovery gap
          {gaps.length === 1 ? ' is' : 's are'} currently on the register. Overall program
          maturity is{' '}
          {maturity.overall != null ? `${maturity.overall.toFixed(1)} of 5` : 'not yet assessed'}.
        </Text>

        <Text style={s.subTitle}>Cost of downtime at 24 hours</Text>
        <View style={{ marginBottom: 6 }}>
          {ranked
            .filter(({ d }) => (d.cost24h ?? 0) > 0)
            .slice(0, 8)
            .map(({ p, d }) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                <Text style={[s.td, { width: '30%' }]}>{p.name}</Text>
                <View style={{ width: '55%', height: 7, backgroundColor: PAPER }}>
                  <View
                    style={{
                      width: `${Math.max(2, Math.round(((d.cost24h ?? 0) / maxCost24) * 100))}%`,
                      height: 7,
                      backgroundColor: ACCENT,
                    }}
                  />
                </View>
                <Text style={[s.td, { width: '15%', textAlign: 'right' }]}>
                  {formatCompactCurrency(d.cost24h ?? 0, currency)}
                </Text>
              </View>
            ))}
        </View>

        {/* 02 Scope */}
        <SectionTitle num="02" title="Scope & organization" />
        <View style={s.table}>
          {(
            [
              ['Organization', org.name],
              ['Industry', org.industry || 'Not specified'],
              ['Regulatory context', org.regulatoryContext || 'Not specified'],
              ['Annual revenue', formatCurrency(org.annualRevenue, currency)],
              ['Employees', org.employees.toLocaleString()],
              ['Risk appetite', org.riskAppetite],
              ['Processes in scope', String(ws.processes.length)],
            ] as const
          ).map(([k, v], i) => (
            <View key={k} style={[s.tr, ...(i % 2 ? [s.trAlt] : [])]}>
              <Td width="30%" strong>{k}</Td>
              <Td width="70%">{v}</Td>
            </View>
          ))}
        </View>

        {/* 03 Methodology */}
        <SectionTitle num="03" title="Methodology" />
        <Text style={s.body}>
          Each process was assessed for the impact of full disruption at five horizons (
          {HORIZONS.map((h) => HORIZON_LABELS[h]).join(', ')}) across five categories: financial,
          operational, customers and reputation, legal and regulatory, and health and safety, on
          an anchored 0 to 4 severity scale. Financial severity is derived from loss estimates
          against bands scaled to annual revenue and risk appetite. The Maximum Tolerable Period
          of Disruption (MTPD) is the earliest horizon at which any category reaches severity 4;
          criticality tiers follow from MTPD (Tier 1 within 24 hours, Tier 2 within 3 days, Tier
          3 within 1 month, Tier 4 beyond). Recovery time objectives, including work recovery
          time for backlog catch-up, are validated to sit inside the MTPD, and shortfalls between
          achievable and target recovery produce the gap register. Application and supplier
          requirements are inherited from the strictest dependent process.
        </Text>

        {/* 04 Inventory */}
        <SectionTitle num="04" title="Process inventory & dependencies" />
        {ranked.map(({ p }) => (
          <View
            key={p.id}
            wrap={false}
            style={{
              borderWidth: 0.75,
              borderColor: LINE,
              backgroundColor: '#fdfcf8',
              padding: 8,
              marginBottom: 6,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 10, fontFamily: 'Times-Bold' }}>{p.name}</Text>
              <Text style={{ fontSize: 7, color: MUTED }}>
                {p.owner || 'No owner'} · {p.department || 'No department'}
              </Text>
            </View>
            {p.description ? <Text style={[s.td, { marginTop: 2 }]}>{p.description}</Text> : null}
            <View style={{ marginTop: 4 }}>
              {DEPENDENCY_CLASSES.filter((c) => p.dependencies[c].length > 0).map((c) => (
                <Text key={c} style={{ fontSize: 7, color: INK_SOFT, marginBottom: 1 }}>
                  <Text style={{ color: MUTED }}>{DEPENDENCY_LABELS[c].toUpperCase()}: </Text>
                  {p.dependencies[c].join(', ')}
                </Text>
              ))}
              {p.upstreamProcessIds.length > 0 && (
                <Text style={{ fontSize: 7, color: INK_SOFT }}>
                  <Text style={{ color: MUTED }}>UPSTREAM PROCESSES: </Text>
                  {p.upstreamProcessIds.map(nameOf).join(', ')}
                </Text>
              )}
            </View>
          </View>
        ))}

        {/* 05 BIA results */}
        <SectionTitle num="05" title="BIA results" />
        <Text style={s.subTitle}>Impact heatmap</Text>
        <Text style={s.body}>
          Worst severity across all five categories per process and horizon (0 negligible to 4
          severe). The MTPD is the first horizon where any category reaches 4.
        </Text>
        <View style={[s.table, { marginBottom: 10 }]} wrap={false}>
          <View style={s.thRow}>
            <Th width="30%">Process</Th>
            {HORIZONS.map((h) => (
              <Th key={h} width="10%">{HORIZON_LABELS[h]}</Th>
            ))}
            <Th width="20%">MTPD / Tier</Th>
          </View>
          {ranked.map(({ p, d }, i) => (
            <View key={p.id} style={[s.tr, ...(i % 2 ? [s.trAlt] : []), { alignItems: 'center' }]}>
              <Td width="30%" strong>{p.name}</Td>
              {HORIZONS.map((h) => {
                const v = maxSeverityAt(p.id, h);
                const c = v != null ? SEV_COLORS[v] : { bg: '#f4f4f4', fg: FAINT };
                return (
                  <View key={h} style={col('10%')}>
                    <Text
                      style={{
                        fontSize: 8,
                        fontFamily: 'Helvetica-Bold',
                        backgroundColor: c.bg,
                        color: c.fg,
                        width: 18,
                        paddingVertical: 2,
                        textAlign: 'center',
                      }}
                    >
                      {v ?? '·'}
                    </Text>
                  </View>
                );
              })}
              <View style={col('20%')}>
                <Text style={s.td}>{d.mtpd ? MTPD_LABELS[d.mtpd] : 'Incomplete'}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 6.5, color: FAINT, marginBottom: 8 }}>
          {([0, 1, 2, 3, 4] as Severity[]).map((v) => `${v} ${SEVERITY_LABELS[v]}`).join('   ·   ')}
        </Text>

        <Text style={s.subTitle}>Criticality and downtime cost</Text>
        <View style={s.table}>
          <View style={s.thRow}>
            <Th width="26%">Process</Th>
            <Th width="13%">MTPD</Th>
            <Th width="15%">Tier</Th>
            <Th width="10%">Priority</Th>
            <Th width="13%">24h cost</Th>
            <Th width="13%">1 week cost</Th>
            <Th width="10%">Sign-off</Th>
          </View>
          {ranked.map(({ p, d, a }, i) => (
            <View key={p.id} style={[s.tr, ...(i % 2 ? [s.trAlt] : []), { alignItems: 'center' }]}>
              <Td width="26%" strong>{p.name}</Td>
              <Td width="13%">{d.mtpd ? MTPD_LABELS[d.mtpd] : '·'}</Td>
              <View style={col('15%')}><TierChip tier={d.tier} /></View>
              <Td width="10%">{d.priority ?? '·'}</Td>
              <Td width="13%">{d.cost24h != null ? formatCompactCurrency(d.cost24h, currency) : '·'}</Td>
              <Td width="13%">
                {a?.financialLoss.w1 != null ? formatCompactCurrency(a.financialLoss.w1, currency) : '·'}
              </Td>
              <Td width="10%" color={a?.approvedBy ? OK : WARN}>
                {a?.approvedBy ? 'Signed' : 'Pending'}
              </Td>
            </View>
          ))}
        </View>
        {ranked.some(({ d }) => d.mtpdOverridden) && (
          <>
            <Text style={s.subTitle}>MTPD overrides</Text>
            {ranked
              .filter(({ d }) => d.mtpdOverridden)
              .map(({ p, a }) => (
                <Text key={p.id} style={s.body}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>{p.name}: </Text>
                  {a?.mtpdOverride?.justification}
                </Text>
              ))}
          </>
        )}

        {/* 06 Objectives & gaps */}
        <SectionTitle num="06" title="Recovery objectives & gap register" />
        <View style={s.table}>
          <View style={s.thRow}>
            <Th width="28%">Process</Th>
            <Th width="12%">RTO target</Th>
            <Th width="14%">RTO achievable</Th>
            <Th width="10%">WRT</Th>
            <Th width="12%">RPO target</Th>
            <Th width="14%">RPO achievable</Th>
            <Th width="10%">MBCO</Th>
          </View>
          {ws.objectives.map((o, i) => (
            <View key={o.id} style={[s.tr, ...(i % 2 ? [s.trAlt] : [])]}>
              <Td width="28%" strong>{nameOf(o.processId)}</Td>
              <Td width="12%">{o.rtoTargetHours != null ? formatHours(o.rtoTargetHours) : '·'}</Td>
              <Td width="14%">{o.rtoAchievableHours != null ? formatHours(o.rtoAchievableHours) : '·'}</Td>
              <Td width="10%">{o.wrtHours != null ? formatHours(o.wrtHours) : '·'}</Td>
              <Td width="12%">{o.rpoTargetHours != null ? formatHours(o.rpoTargetHours) : '·'}</Td>
              <Td width="14%">{o.rpoAchievableHours != null ? formatHours(o.rpoAchievableHours) : '·'}</Td>
              <Td width="10%">{o.mbcoPercent != null ? `${o.mbcoPercent}%` : '·'}</Td>
            </View>
          ))}
        </View>

        {gaps.length > 0 && (
          <>
            <Text style={s.subTitle}>Gap register</Text>
            <View style={s.table}>
              <View style={s.thRow}>
                <Th width="22%">Process</Th>
                <Th width="8%">Gap</Th>
                <Th width="16%">Target / achievable</Th>
                <Th width="10%">Severity</Th>
                <Th width="14%">Owner</Th>
                <Th width="20%">Remediation</Th>
                <Th width="10%">Status</Th>
              </View>
              {gaps.map((g, i) => {
                const rem = remFor(g.processId, g.kind);
                const sevColor = g.severity === 'high' ? BAD : g.severity === 'medium' ? WARN : MUTED;
                return (
                  <View key={`${g.processId}-${g.kind}`} style={[s.tr, ...(i % 2 ? [s.trAlt] : [])]}>
                    <Td width="22%" strong>{nameOf(g.processId)}</Td>
                    <Td width="8%">{g.kind.toUpperCase()}</Td>
                    <Td width="16%">
                      {formatHours(g.targetHours)} / {formatHours(g.achievableHours)}
                    </Td>
                    <Td width="10%" color={sevColor} strong>
                      +{formatHours(g.gapHours)} {g.severity}
                    </Td>
                    <Td width="14%">{rem?.owner || 'Unassigned'}</Td>
                    <Td width="20%">{rem?.action || 'Not defined'}</Td>
                    <Td width="10%">{(rem?.status ?? 'open').replace('_', ' ')}</Td>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* 07 Workflows + resources */}
        <SectionTitle num="07" title="Recovery workflows & resource requirements" />
        {ws.workflows.length === 0 ? (
          <Text style={s.body}>No recovery workflows documented yet.</Text>
        ) : (
          ws.workflows.map((wf) => {
            const total = wf.steps.reduce((sum, x) => sum + x.durationHours, 0);
            const o = ws.objectives.find((x) => x.processId === wf.processId);
            const over = o?.rtoTargetHours != null && total > o.rtoTargetHours;
            return (
              <View key={wf.id} style={{ marginBottom: 8 }} wrap={false}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Times-Bold' }}>{nameOf(wf.processId)}</Text>
                  <Text style={{ fontSize: 7, color: over ? BAD : MUTED }}>
                    {wf.steps.length} steps · {formatHours(total)} sequential
                    {o?.rtoTargetHours != null ? ` · RTO target ${formatHours(o.rtoTargetHours)}` : ''}
                    {over ? ' · EXCEEDS RTO' : ''}
                  </Text>
                </View>
                {wf.steps.map((st, i) => (
                  <View key={st.id} style={{ flexDirection: 'row', marginBottom: 2, paddingLeft: 4 }}>
                    <Text style={{ fontSize: 7.5, color: ACCENT, width: 18, fontFamily: 'Helvetica-Bold' }}>
                      {String(i + 1).padStart(2, '0')}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.td}>{st.description}</Text>
                      <Text style={{ fontSize: 6.5, color: MUTED }}>
                        {st.team || 'Unassigned'} · {formatHours(st.durationHours)}
                        {st.alternateStaff.length > 0 ? ` · alternates: ${st.alternateStaff.join(', ')}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            );
          })
        )}

        {ws.resourceProfiles.length > 0 && (
          <>
            <Text style={s.subTitle}>Recovery resource requirements</Text>
            {ws.resourceProfiles.map((rp) => (
              <View key={rp.id} style={{ marginBottom: 8 }} wrap={false}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 3 }}>
                  {nameOf(rp.processId)}
                </Text>
                <View style={s.table}>
                  <View style={s.thRow}>
                    <Th width="30%">Needed by</Th>
                    {HORIZONS.map((h) => (
                      <Th key={h} width="14%">{HORIZON_LABELS[h]}</Th>
                    ))}
                  </View>
                  {(
                    [
                      ['Minimum staff', rp.staff],
                      ['Workstations / equipment', rp.workstations],
                      ['Facility seats', rp.facilitySeats],
                    ] as const
                  ).map(([label, row], i) => (
                    <View key={label} style={[s.tr, ...(i % 2 ? [s.trAlt] : [])]}>
                      <Td width="30%">{label}</Td>
                      {HORIZONS.map((h) => (
                        <Td key={h} width="14%">{row[h] ?? '·'}</Td>
                      ))}
                    </View>
                  ))}
                </View>
                {rp.vitalRecords.length > 0 && (
                  <Text style={{ fontSize: 7, color: INK_SOFT }}>
                    <Text style={{ color: MUTED }}>VITAL RECORDS: </Text>
                    {rp.vitalRecords.join(', ')}
                  </Text>
                )}
                {rp.notes ? <Text style={{ fontSize: 7, color: MUTED, marginTop: 1 }}>{rp.notes}</Text> : null}
              </View>
            ))}
          </>
        )}

        {/* 08 Roll-down */}
        <SectionTitle num="08" title="Dependency recovery requirements" />
        <Text style={s.body}>
          The BIA handed down to IT and third-party management: each application inherits the
          strictest recovery objectives of the processes that depend on it, and each supplier
          inherits their highest criticality.
        </Text>
        {(
          [
            ['Applications', rollDown.applications],
            ['Suppliers', rollDown.suppliers],
          ] as const
        ).map(([label, rows]) =>
          rows.length === 0 ? null : (
            <View key={label}>
              <Text style={s.subTitle}>{label}</Text>
              <View style={s.table}>
                <View style={s.thRow}>
                  <Th width="26%">Name</Th>
                  <Th width="14%">Criticality</Th>
                  <Th width="13%">Required RTO</Th>
                  <Th width="13%">Required RPO</Th>
                  <Th width="34%">Supports</Th>
                </View>
                {rows.map((r, i) => (
                  <View key={r.name} style={[s.tr, ...(i % 2 ? [s.trAlt] : []), { alignItems: 'center' }]}>
                    <Td width="26%" strong>{r.name}</Td>
                    <View style={col('14%')}><TierChip tier={r.topTier} /></View>
                    <Td width="13%">
                      {r.strictestRtoHours != null ? `<= ${formatHours(r.strictestRtoHours)}` : '·'}
                    </Td>
                    <Td width="13%">
                      {r.strictestRpoHours != null ? `<= ${formatHours(r.strictestRpoHours)}` : '·'}
                    </Td>
                    <Td width="34%">{r.processes.map((p) => p.name).join(', ')}</Td>
                  </View>
                ))}
              </View>
            </View>
          )
        )}

        {/* 09 Exercise program */}
        <SectionTitle num="09" title="Exercise program" />
        <Text style={s.body}>
          Recommended cadence: two tabletop exercises per year minimum, rotating categories, with
          results feeding the maturity assessment and the gap register.
        </Text>
        <View style={s.table}>
          <View style={s.thRow}>
            <Th width="16%">Category</Th>
            <Th width="26%">Scenario</Th>
            <Th width="58%">Focus</Th>
          </View>
          {CATALOG.map((sc, i) => (
            <View key={sc.id} style={[s.tr, ...(i % 2 ? [s.trAlt] : [])]}>
              <Td width="16%">{sc.category}</Td>
              <Td width="26%" strong>{sc.title}</Td>
              <Td width="58%">{sc.summary}</Td>
            </View>
          ))}
        </View>
        {completedSessions.length > 0 && (
          <>
            <Text style={s.subTitle}>Exercises conducted</Text>
            <View style={s.table}>
              <View style={s.thRow}>
                <Th width="46%">Exercise</Th>
                <Th width="18%">Type</Th>
                <Th width="16%">Date</Th>
                <Th width="20%">After-action report</Th>
              </View>
              {completedSessions.map((e, i) => (
                <View key={e.id} style={[s.tr, ...(i % 2 ? [s.trAlt] : [])]}>
                  <Td width="46%" strong>{e.scenario.title}</Td>
                  <Td width="18%">{e.mode === 'ai' ? 'Claude-tailored' : 'Template'}</Td>
                  <Td width="16%">{formatDate(e.createdAt)}</Td>
                  <Td width="20%">
                    {e.report
                      ? `${e.report.recommendations.length} recommendations`
                      : 'Not generated'}
                  </Td>
                </View>
              ))}
            </View>
          </>
        )}

        {/* 10 Maturity */}
        <SectionTitle num="10" title="Maturity & roadmap" />
        {maturity.overall == null ? (
          <Text style={s.body}>Maturity assessment not yet completed.</Text>
        ) : (
          <>
            <Text style={s.body}>
              Overall maturity {maturity.overall.toFixed(1)} of 5 across {MATURITY_DOMAINS.length}{' '}
              ISO 22301 domains ({maturity.answered} of {maturity.total} questions answered).
            </Text>
            <View style={s.table}>
              <View style={s.thRow}>
                <Th width="34%">Domain</Th>
                <Th width="26%">Clause</Th>
                <Th width="12%">Score</Th>
                <Th width="28%"> </Th>
              </View>
              {maturity.domains.map((d, i) => {
                const meta = MATURITY_DOMAINS.find((m) => m.id === d.domainId)!;
                return (
                  <View key={d.domainId} style={[s.tr, ...(i % 2 ? [s.trAlt] : []), { alignItems: 'center' }]}>
                    <Td width="34%" strong>{d.name}</Td>
                    <Td width="26%">{meta.clause}</Td>
                    <Td width="12%">{d.score != null ? `${d.score.toFixed(1)} / 5` : '·'}</Td>
                    <View style={col('28%')}>
                      <View style={{ width: '100%', height: 6, backgroundColor: PAPER }}>
                        <View
                          style={{
                            width: `${Math.round(((d.score ?? 0) / 5) * 100)}%`,
                            height: 6,
                            backgroundColor: ACCENT,
                          }}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
            {maturity.roadmap.length > 0 && (
              <Text style={s.body}>
                Improvement priority (weakest first):{' '}
                {maturity.roadmap.map((d) => d.name).join(', ')}.
              </Text>
            )}
          </>
        )}
      </Page>
    </Document>
  );
}
