import { z } from "zod";

/**
 * Validation schemas for AI Clusters endpoints
 */

/**
 * Single cluster in accept request
 */
const acceptClusterSchema = z.object({
  name: z
    .string()
    .min(1, "Cluster name must not be empty")
    .max(120, "Cluster name must not exceed 120 characters")
    .trim(),
  queryTexts: z
    .array(z.string().min(1, "Query text must not be empty"))
    .min(1, "Each cluster must have at least one query"),
});

/**
 * Request body for accepting clusters
 * POST /api/ai-clusters/accept
 */
export const acceptClustersRequestSchema = z.object({
  clusters: z.array(acceptClusterSchema).min(1, "Must accept at least one cluster"),
});
