import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { AiClusterSuggestionDto, GroupWithMetricsDto, AcceptClusterDto } from "../../types";

/**
 * AI Clusters Service
 * Handles generation and acceptance of AI cluster suggestions
 *
 * Architecture: Stateless - suggestions are generated on-demand and returned to client.
 * No server-side storage of suggestions. Acceptance creates groups directly from client data.
 */

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Generate AI cluster suggestions
 * For MVP: returns mock clusters based on existing queries
 * For production: will call OpenRouter AI API
 *
 * @returns Array of cluster suggestions (stateless, not stored)
 */
export async function generateClusters(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<AiClusterSuggestionDto[]> {
  // Step 1: Fetch recent queries for clustering
  // Note: queries table is a shared dataset (no user_id column)
  const { data: queries, error } = await supabase
    .from("queries")
    .select("id, query_text, impressions, clicks, ctr, avg_position")
    .order("date", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch queries for clustering: ${error.message}`);
  }

  // Step 2: Generate clusters (placeholder - AI clustering logic to be added later)
  // TODO: Implement actual AI clustering via OpenRouter
  const clusters: AiClusterSuggestionDto[] = [];

  // Step 3: Log user action
  await supabase.from("user_actions").insert({
    user_id: userId,
    action_type: "cluster_generated",
    metadata: {
      clusterCount: clusters.length,
      queryCount: queries?.length ?? 0,
    },
  });

  return clusters;
}

/**
 * Accept cluster suggestions and persist them as groups
 * Creates groups with ai_generated = true
 */
export async function acceptClusters(
  supabase: SupabaseClient<Database>,
  userId: string,
  clustersToAccept: AcceptClusterDto[]
): Promise<GroupWithMetricsDto[]> {
  const createdGroups: GroupWithMetricsDto[] = [];

  // Step 1: Create groups and their items
  for (const cluster of clustersToAccept) {
    // Create group
    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .insert({
        name: cluster.name.trim(),
        user_id: userId,
        ai_generated: true,
      })
      .select("*")
      .single();

    if (groupError) {
      throw new Error(`Failed to create group: ${groupError.message}`);
    }

    // Add group items (queries to this group)
    if (cluster.queryIds.length > 0) {
      const groupItems = cluster.queryIds.map((queryId) => ({
        group_id: groupData.id,
        query_id: queryId,
      }));

      const { error: itemsError } = await supabase.from("group_items").insert(groupItems);

      if (itemsError) {
        throw new Error(`Failed to add group items: ${itemsError.message}`);
      }
    }

    // TODO: Fetch metrics for the created group (shared logic to be implemented later)
    // For now, return group with empty metrics scaffold
    createdGroups.push({
      id: groupData.id,
      userId: groupData.user_id,
      name: groupData.name,
      aiGenerated: groupData.ai_generated,
      createdAt: groupData.created_at,
      updatedAt: groupData.updated_at,
      queryCount: cluster.queryIds.length,
      metrics: {
        impressions: 0,
        clicks: 0,
        ctr: 0,
        avgPosition: 0,
      },
    });
  }

  // Step 2: Log user action
  await supabase.from("user_actions").insert({
    user_id: userId,
    action_type: "cluster_accepted",
    metadata: {
      acceptedCount: clustersToAccept.length,
      groupIds: createdGroups.map((g) => g.id),
    },
  });

  return createdGroups;
}
