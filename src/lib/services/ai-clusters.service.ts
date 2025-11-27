import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { AiClusterSuggestionDto, AcceptClusterDto, GroupDto } from "@/types";
import { ClusterGeneratorService, ClusterAcceptorService } from "./ai-clusters";

/**
 * AI Clusters Service
 * Handles generation and acceptance of AI cluster suggestions
 *
 * Architecture: Stateless - suggestions are generated on-demand and returned to client.
 * No server-side storage of suggestions. Acceptance creates groups directly from client data.
 *
 * This is a facade service that delegates to specialized services:
 * - ClusterGeneratorService: Handles cluster generation
 * - ClusterAcceptorService: Handles cluster acceptance
 */

/**
 * Generate AI cluster suggestions using OpenRouter AI
 *
 * @returns Array of cluster suggestions (stateless, not stored)
 */
export async function generateClusters(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<AiClusterSuggestionDto[]> {
  return ClusterGeneratorService.generateClusters(supabase, userId);
}

/**
 * Accept cluster suggestions and persist them as groups
 * Creates groups with ai_generated = true
 */
export async function acceptClusters(
  supabase: SupabaseClient<Database>,
  userId: string,
  clustersToAccept: AcceptClusterDto[]
): Promise<GroupDto[]> {
  return ClusterAcceptorService.acceptClusters(supabase, userId, clustersToAccept);
}
