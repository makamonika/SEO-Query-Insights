import type { APIRoute } from "astro";
import { z } from "zod";

import type { GetQueriesResponseDto, ErrorResponse } from "../../types";
import { QUERIES_COLUMNS } from "../../lib/db/projections";
import { QUERY_SORT_FIELDS, SORT_ORDERS } from "../../types";
import type { Tables } from "../../db/database.types";

/**
 * Validation schema for GET /queries query parameters
 * Implements strict validation with defaults and constraints per implementation plan
 */
const QueryParamsSchema = z
  .object({
    search: z.string().trim().min(1).optional(),
    isOpportunity: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .optional()
      .transform((v) => (typeof v === "string" ? v === "true" : v)),
    sortBy: z.enum(QUERY_SORT_FIELDS).default("impressions"),
    order: z.enum(SORT_ORDERS).optional(),
    limit: z.coerce.number().int().min(1).max(1000).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .transform((input) => {
    // Apply conditional default for order based on sortBy
    const sortBy = input.sortBy ?? "impressions";
    const order = input.order ?? (sortBy === "impressions" ? "desc" : "asc");
    return { ...input, sortBy, order };
  });

/**
 * Transforms database record (snake_case) to DTO (camelCase)
 */
function transformQueryToDto(query: Tables<"queries">): GetQueriesResponseDto[number] {
  return {
    id: query.id,
    date: query.date,
    queryText: query.query_text,
    url: query.url,
    impressions: query.impressions,
    clicks: query.clicks,
    ctr: query.ctr,
    avgPosition: query.avg_position,
    isOpportunity: query.is_opportunity,
    createdAt: query.created_at,
  };
}

/**
 * GET /api/queries
 *
 * Lists query performance records with optional filtering, sorting, and pagination.
 *
 * Query Parameters:
 * - search?: string - case-insensitive partial match against query_text
 * - isOpportunity?: boolean - filter by is_opportunity flag
 * - sortBy?: 'impressions' | 'clicks' | 'ctr' | 'avgPosition' - default 'impressions'
 * - order?: 'asc' | 'desc' - default 'desc' for impressions, 'asc' otherwise
 * - limit?: number - default 50, range 1-1000
 * - offset?: number - default 0, min 0
 *
 * Returns: GetQueriesResponseDto or ErrorResponse
 */
export const GET: APIRoute = async ({ locals, url }) => {
  try {
    // Step 1: Parse and validate query parameters
    const rawParams = Object.fromEntries(url.searchParams.entries());
    const parseResult = QueryParamsSchema.safeParse(rawParams);

    if (!parseResult.success) {
      const errorResponse: ErrorResponse = {
        error: {
          code: "validation_error",
          message: "Invalid query parameters",
          details: parseResult.error.flatten().fieldErrors,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const params = parseResult.data;

    // Step 2: Build Supabase query with filters, sorting, and pagination
    const supabase = locals.supabase;

    // Convert camelCase sortBy to snake_case for database column
    const dbSortColumn = params.sortBy === "avgPosition" ? "avg_position" : params.sortBy;
    const ascending = params.order === "asc";

    let query = supabase.from("queries").select(QUERIES_COLUMNS);

    // Step 3: Apply filters
    if (params.search) {
      query = query.ilike("query_text", `%${params.search}%`);
    }
    if (typeof params.isOpportunity === "boolean") {
      query = query.eq("is_opportunity", params.isOpportunity);
    }

    // Apply sorting with deterministic secondary sort for stable pagination
    query = query.order(dbSortColumn, { ascending });
    query = query.order("date", { ascending: false });
    query = query.order("impressions", { ascending: false });

    // Apply pagination
    query = query.range(params.offset, params.offset + params.limit - 1);

    // Step 4: Execute query
    const { data, error } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      const errorResponse: ErrorResponse = {
        error: {
          code: "internal",
          message: "Failed to fetch queries",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 5: Transform database records to DTOs with camelCase fields
    const responseData: GetQueriesResponseDto = data.map(transformQueryToDto);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all error handler
    console.error("Unexpected error in GET /api/queries:", error);
    const errorResponse: ErrorResponse = {
      error: {
        code: "internal",
        message: "An unexpected error occurred",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
