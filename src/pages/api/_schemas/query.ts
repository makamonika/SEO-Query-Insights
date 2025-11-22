import { z } from "zod";
import { QUERY_SORT_FIELDS, SORT_ORDERS } from "@/types";

/**
 * Validation schema for GET /api/queries query parameters
 * Implements strict validation with defaults and constraints per implementation plan
 */
export const queryParamsSchema = z
  .object({
    search: z.string().trim().min(1).optional(),
    isOpportunity: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .optional()
      .transform((v) => (typeof v === "string" ? v === "true" : v)),
    sortBy: z.enum(QUERY_SORT_FIELDS).default("impressions"),
    order: z.enum(SORT_ORDERS).optional(),
    limit: z.coerce.number().int().min(1).max(1000).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .transform((input) => {
    // Apply conditional default for order based on sortBy
    const sortBy = input.sortBy ?? "impressions";
    const order = input.order ?? (sortBy === "impressions" ? "desc" : "asc");
    return { ...input, sortBy, order };
  });

export type QueryParamsInput = z.infer<typeof queryParamsSchema>;
