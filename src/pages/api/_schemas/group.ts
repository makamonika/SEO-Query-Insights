import { z } from "zod";

/**
 * Zod schemas for Groups API
 * - Validates create/update payloads and pagination params
 */

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(100),
  aiGenerated: z.boolean().optional().default(false),
  queryIds: z.array(z.string().uuid("Invalid query ID format")).optional().default([]),
});

export const updateGroupSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    aiGenerated: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.aiGenerated !== undefined, {
    message: "At least one field must be provided",
  });

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const pathParamsSchema = z.object({
  groupId: z.string().uuid("groupId must be a valid UUID"),
});

export const groupListQuerySchema = paginationSchema.extend({
  sortBy: z.enum(["name", "createdAt", "aiGenerated"]).optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().trim().optional(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type PathParamsInput = z.infer<typeof pathParamsSchema>;
export type GroupListQueryInput = z.infer<typeof groupListQuerySchema>;
