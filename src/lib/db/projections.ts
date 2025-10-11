/**
 * Database column selections for queries table
 * Note: Supabase doesn't support SQL aliases in select strings,
 * so we select raw columns and transform to camelCase in the response
 */
export const QUERIES_COLUMNS = 'id,date,query_text,url,impressions,clicks,ctr,avg_position,is_opportunity,created_at' as const;
