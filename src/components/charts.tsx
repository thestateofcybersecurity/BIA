'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from 'recharts';
import { formatCompactCurrency, formatCurrency } from '@/lib/format';

const INK = '#1b2430';
const MUTED = '#6b7280';
const LINE = '#e2ddd0';
const ACCENT = '#bc4a1b';
const SURFACE = '#fdfcf8';

const tooltipStyle = {
  background: SURFACE,
  border: `1px solid ${LINE}`,
  borderRadius: 8,
  fontSize: 12,
  color: INK,
  boxShadow: '0 4px 16px rgba(27,36,48,0.08)',
};

export function CostBarChart({
  data,
  currency,
}: {
  data: { name: string; cost: number }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={LINE} strokeDasharray="2 4" />
        <XAxis
          type="number"
          tickFormatter={(v) => formatCompactCurrency(v, currency)}
          tick={{ fill: MUTED, fontSize: 11 }}
          axisLine={{ stroke: LINE }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={170}
          tick={{ fill: INK, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(188,74,27,0.06)' }}
          contentStyle={tooltipStyle}
          formatter={(v) => [formatCurrency(Number(v), currency), '24h downtime cost']}
        />
        <Bar dataKey="cost" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {data.map((_, i) => (
            <Cell key={i} fill={ACCENT} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MaturityRadarChart({
  data,
}: {
  data: { domain: string; score: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={LINE} />
        <PolarAngleAxis dataKey="domain" tick={{ fill: MUTED, fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} />
        <Radar
          dataKey="score"
          stroke={ACCENT}
          fill={ACCENT}
          fillOpacity={0.18}
          strokeWidth={2}
          dot={{ r: 3, fill: ACCENT }}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} / 5`, 'Score']} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function CostCurveChart({
  data,
  currency,
  height = 200,
}: {
  data: { horizon: string; cost: number }[];
  currency: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={LINE} strokeDasharray="2 4" />
        <XAxis
          dataKey="horizon"
          tick={{ fill: MUTED, fontSize: 11 }}
          axisLine={{ stroke: LINE }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatCompactCurrency(v, currency)}
          tick={{ fill: MUTED, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={64}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [formatCurrency(Number(v), currency), 'Cumulative loss']}
        />
        <Line
          type="monotone"
          dataKey="cost"
          stroke={ACCENT}
          strokeWidth={2}
          dot={{ r: 3.5, fill: ACCENT }}
          activeDot={{ r: 5, stroke: SURFACE, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
