import { z } from "zod";
import { pathParamsSchema } from "./group";

/**
 * Zod schemas for Group Items API
 * - Validates request body for adding/removing items
 */

/**
 * Request body for adding items to a group
 * - queryIds: array of 1-500 UUID strings
 * - each UUID must be valid
 */
export const addItemsBodySchema = z.object({
  queryIds: z
    .array(z.string().uuid("Invalid query ID format"))
    .min(1, "At least one query ID is required")
    .max(500, "Cannot add more than 500 items at once"),
});

/**
 * Path parameters for deleting a specific item
 * - queryId: valid UUID string
 */
export const deleteItemParamsSchema = pathParamsSchema.extend({
  queryId: z.string().uuid("Invalid query ID format"),
});

export type AddItemsBodyInput = z.infer<typeof addItemsBodySchema>;
export type DeleteItemParamsInput = z.infer<typeof deleteItemParamsSchema>;
