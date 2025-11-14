import type { AggregatedMetrics, QueryDto } from "../types";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toValidNumber(value: unknown): number {
  return isFiniteNumber(value) ? value : 0;
}

export function calculateGroupMetricsFromQueries(queries: QueryDto[]): {
  metrics: AggregatedMetrics;
  queryCount: number;
} {
  if (!queries || queries.length === 0) {
    return {
      metrics: { impressions: 0, clicks: 0, ctr: 0, avgPosition: 0 },
      queryCount: 0,
    };
  }

  let totalImpressions = 0;
  let totalClicks = 0;
  const positions: number[] = [];

  for (const q of queries) {
    totalImpressions += toValidNumber(q.impressions);
    totalClicks += toValidNumber(q.clicks);
    if (isFiniteNumber(q.avgPosition)) positions.push(q.avgPosition);
  }

  const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgPosition = positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : 0;

  return {
    metrics: {
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: Number(ctr.toFixed(4)),
      avgPosition: Number(avgPosition.toFixed(1)),
    },
    queryCount: queries.length,
  };
}

// Shared helpers for CTR and opportunity
export function calculateCtrDecimal(clicks: number, impressions: number): number {
  if (!Number.isFinite(clicks) || !Number.isFinite(impressions) || impressions <= 0) return 0;
  return clicks / impressions;
}

export function computeIsOpportunity(impressions: number, ctrDecimal: number, avgPosition: number): boolean {
  return impressions > 1000 && ctrDecimal < 0.01 && avgPosition >= 5 && avgPosition <= 15;
}
