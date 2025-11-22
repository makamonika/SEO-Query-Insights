import type { Tables } from "@/db/database.types";
import type { GroupDto, QueryDto } from "@/types";

export function mapQueryRowToDto(row: Tables<"queries">): QueryDto {
  return {
    id: row.id,
    date: row.date,
    queryText: row.query_text,
    url: row.url,
    impressions: row.impressions,
    clicks: row.clicks,
    ctr: row.ctr,
    avgPosition: row.avg_position,
    isOpportunity: row.is_opportunity,
    createdAt: row.created_at,
  };
}

export function mapGroupRowBase(row: Tables<"groups">): GroupDto {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    aiGenerated: row.ai_generated,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    queryCount: Number(row.query_count ?? 0),
    metricsImpressions: Number(row.metrics_impressions ?? 0),
    metricsClicks: Number(row.metrics_clicks ?? 0),
    metricsCtr: Number(row.metrics_ctr ?? 0),
    metricsAvgPosition: Number(row.metrics_avg_position ?? 0),
  };
}
