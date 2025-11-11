import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "../../db/database.types";
import { QUERIES_COLUMNS } from "../db/projections";
import { mapQueryRowToDto } from "../mappers";
import { calculateGroupMetricsFromQueries } from "../metrics";
import type { AggregatedMetrics, RecomputeResult } from "@/types";

export async function recomputeAndPersistGroupMetrics(
  supabase: SupabaseClient<Database>,
  groupId: string
): Promise<RecomputeResult> {
  // Fetch group items joined with queries in a single roundtrip
  const { data, error } = await supabase
    .from("group_items")
    .select(
      `
      query_id,
      queries!inner (
        ${QUERIES_COLUMNS}
      )
    `
    )
    .eq("group_id", groupId);

  if (error) {
    throw new Error(`Failed to fetch items for metrics: ${error.message}`);
  }

  interface GroupItemRow {
    query_id: string;
    queries: Tables<"queries"> | null;
  }

  const queries = (data ?? [])
    .map((row) => (row as unknown as GroupItemRow).queries)
    .filter((q): q is Tables<"queries"> => q != null)
    .map((q) => mapQueryRowToDto(q));

  const { metrics, queryCount } = calculateGroupMetricsFromQueries(queries);

  // Persist on the group row (columns must exist in DB schema)
  const updatePayload: {
    metrics_impressions: number;
    metrics_clicks: number;
    metrics_ctr: number;
    metrics_avg_position: number;
    query_count: number;
  } = {
    metrics_impressions: metrics.impressions,
    metrics_clicks: metrics.clicks,
    metrics_ctr: metrics.ctr,
    metrics_avg_position: metrics.avgPosition,
    query_count: queryCount,
  };

  const { error: updateError } = await supabase.from("groups").update(updatePayload).eq("id", groupId);

  if (updateError) {
    throw new Error(`Failed to persist group metrics: ${updateError.message}`);
  }

  return { metrics, queryCount };
}

export function extractPersistedMetrics(row: {
  query_count?: number | null;
  metrics_impressions?: number | null;
  metrics_clicks?: number | null;
  metrics_ctr?: number | null;
  metrics_avg_position?: number | null;
}): RecomputeResult {
  const queryCount = Number(row?.query_count ?? 0);
  const metrics: AggregatedMetrics = {
    impressions: Number(row?.metrics_impressions ?? 0),
    clicks: Number(row?.metrics_clicks ?? 0),
    ctr: Number(row?.metrics_ctr ?? 0),
    avgPosition: Number(row?.metrics_avg_position ?? 0),
  };
  return { metrics, queryCount };
}
