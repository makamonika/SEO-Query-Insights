import type { TablesInsert } from "@/db/database.types";

type QueryLike =
  | TablesInsert<"queries">
  | {
      impressions?: number | null;
      clicks?: number | null;
      avg_position?: number | null;
    };

interface MetricsResult {
  queryCount: number;
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
}

export function computeGroupMetrics(queries: QueryLike[]): MetricsResult {
  const impressions = queries.reduce((acc, query) => acc + Number(query.impressions ?? 0), 0);
  const clicks = queries.reduce((acc, query) => acc + Number(query.clicks ?? 0), 0);
  const avgPosition =
    queries.length > 0
      ? Number((queries.reduce((acc, query) => acc + Number(query.avg_position ?? 0), 0) / queries.length).toFixed(1))
      : 0;
  const ctr = impressions > 0 ? Number((clicks / impressions).toFixed(4)) : 0;

  return {
    queryCount: queries.length,
    impressions,
    clicks,
    ctr,
    avgPosition,
  };
}
