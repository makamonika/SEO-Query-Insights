import { z } from 'zod';
import { pathParamsSchema } from './group';

/**
 * Zod schemas for Group Items API
 * - Validates request body for adding/removing items
 */

/**
 * Request body for adding items to a group
 * - queryTexts: array of 1-500 strings
 * - each string trimmed, min 1 char
 */
export const addItemsBodySchema = z.object({
  queryTexts: z
    .array(
      z.string().trim().min(1, 'Query text cannot be empty')
    )
    .min(1, 'At least one query text is required')
    .max(500, 'Cannot add more than 500 items at once'),
});

/**
 * Path parameters for deleting a specific item
 * - queryText: non-empty string (will be URL-decoded and normalized)
 */
export const deleteItemParamsSchema = pathParamsSchema.extend({
  queryText: z.string().trim().min(1, 'Query text cannot be empty'),
});

export type AddItemsBodyInput = z.infer<typeof addItemsBodySchema>;
export type DeleteItemParamsInput = z.infer<typeof deleteItemParamsSchema>;

