import type { Tables } from "../db/database.types";
import type { QueryDto } from "../types";

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

export function mapGroupRowBase(row: Tables<"groups">) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    aiGenerated: row.ai_generated,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as const;
}
