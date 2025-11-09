import { formatNumber, formatCTR } from "@/lib/table-utils.tsx";

export interface MetricsSummaryProps {
  queryCount: number;
  metricsImpressions: number;
  metricsClicks: number;
  metricsCtr: number;
  metricsAvgPosition: number;
}

/**
 * Displays aggregated metrics for a group in compact stat cards
 * Consistent formatting with queries table
 */
export function MetricsSummary({
  queryCount,
  metricsImpressions,
  metricsClicks,
  metricsCtr,
  metricsAvgPosition,
}: MetricsSummaryProps) {
  const stats = [
    {
      label: "Queries",
      value: formatNumber(queryCount),
    },
    {
      label: "Impressions",
      value: formatNumber(metricsImpressions),
    },
    {
      label: "Clicks",
      value: formatNumber(metricsClicks),
    },
    {
      label: "CTR",
      value: formatCTR(metricsCtr),
    },
    {
      label: "Avg Position",
      value: formatNumber(metricsAvgPosition, 1),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border bg-card p-4 shadow-xs"
          role="group"
          aria-label={`${stat.label}: ${stat.value}`}
        >
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
