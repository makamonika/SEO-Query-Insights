import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { AiClusterSuggestionDto, GroupWithMetricsDto, AcceptClusterDto } from "../../types";
import { QUERIES_COLUMNS } from "../db/projections";
import { calculateGroupMetricsFromQueries } from "../metrics";
import { mapQueryRowToDto } from "../mappers";
import { OpenRouterService, OpenRouterError } from "../services/openrouter.service";
import type { JsonSchemaConfig } from "../services/openrouter.types";

/**
 * AI Clusters Service
 * Handles generation and acceptance of AI cluster suggestions
 *
 * Architecture: Stateless - suggestions are generated on-demand and returned to client.
 * No server-side storage of suggestions. Acceptance creates groups directly from client data.
 */

// ============================================================================
// Constants & Configuration
// ============================================================================

const MAX_QUERIES_FOR_CLUSTERING = 1000;

// JSON Schema for OpenRouter response format
const CLUSTER_RESPONSE_SCHEMA: JsonSchemaConfig = {
  type: "json_schema",
  json_schema: {
    name: "cluster_suggestions",
    schema: {
      type: "object",
      properties: {
        clusters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              queryIds: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["name", "queryIds"],
            additionalProperties: false,
          },
        },
      },
      required: ["clusters"],
      additionalProperties: false,
    },
    strict: true,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Initialize OpenRouter service with API key from environment
 */
function getOpenRouterService(): OpenRouterService {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  return OpenRouterService.getInstance({
    apiKey,
    model: "openai/gpt-4o-mini",
  });
}

/**
 * Build the system prompt for cluster generation
 */
function buildSystemPrompt(): string {
  return `You are an expert SEO analyst specialized in grouping search queries into meaningful, opportunity-driven semantic clusters.

Your task is to analyze a list of search queries and group a subset of them (ideally 3-7 thematic clusters) based on:
- Search intent (informational, navigational, transactional)
- Topic similarity
- User journey stage
- Semantic relationships
- Performance metrics (impressions, clicks, CTR, average position)
- Opportunity flag (isOpportunity) indicating high optimization potential

Guidelines:
- Create 3-7 clusters (aim for 5 if possible)
- A query SHOULD be clustered only if it clearly fits a cluster - it is acceptable to leave queries unclustered; unclustered queries must be omitted from the response
- Each cluster should have a clear, descriptive name (2-5 words)
- Distribute queries as evenly as practical across clusters
- Cluster names must be specific and actionable (e.g., "Product Pricing & Plans" not just "Pricing")
- Prioritize grouping by search intent and opportunity over exact keyword matching`;
}

/**
 * Build the user prompt with query data
 */
function buildUserPrompt(
  queries: {
    id: string;
    query_text: string;
    impressions: number;
    clicks: number;
    ctr: number;
    avg_position: number;
    is_opportunity: boolean;
  }[]
): string {
  const queryList = queries
    .map(
      (q, idx) =>
        `${idx + 1}. [ID: ${q.id}] "${q.query_text}" | impressions: ${q.impressions}, clicks: ${q.clicks}, ctr: ${q.ctr !== null && q.ctr !== undefined ? (q.ctr * 100).toFixed(2) : "N/A"}%, avgPos: ${q.avg_position !== null && q.avg_position !== undefined ? q.avg_position.toFixed(1) : "N/A"}, opportunity: ${q.is_opportunity}`
    )
    .join("\n");

  return `Analyze the following search queries and propose semantic clusters **only for the queries that fit together meaningfully**. Queries that do not fit any cluster SHOULD be discarded (they will not appear in the response).

${queryList}

Return a JSON response with the following structure:
- clusters: array of clusters where each cluster includes:
  - name: descriptive cluster name
  - queryIds: array of query IDs (strings) belonging to this cluster

Only include clustered query IDs; omitted queries are considered unclustered.`;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Generate AI cluster suggestions using OpenRouter AI
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
    .select(QUERIES_COLUMNS)
    .order("impressions", { ascending: false })
    .order("date", { ascending: false })
    .limit(MAX_QUERIES_FOR_CLUSTERING);

  if (error) {
    console.error("Supabase error fetching queries:", error);
    throw new Error(`Failed to fetch queries for clustering: ${error.message}`);
  }

  if (!queries || queries.length === 0) {
    console.log("No queries available for clustering");
    return [];
  }

  console.log(`Fetched ${queries.length} queries for clustering`);

  // Step 2: Generate clusters using OpenRouter AI
  let aiResponse: { clusters: { name: string; queryIds: string[] }[] };

  try {
    const openRouter = getOpenRouterService();
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(queries);

    const response = await openRouter.chat({
      systemPrompt,
      userPrompt,
      responseFormat: CLUSTER_RESPONSE_SCHEMA,
      parameters: {
        temperature: 0.7,
      },
    });

    // Parse the AI response
    try {
      aiResponse = JSON.parse(response.message.content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Invalid JSON response from AI");
    }

    console.log(`AI generated ${aiResponse.clusters.length} clusters`);
  } catch (error) {
    if (error instanceof OpenRouterError) {
      console.error("OpenRouter error:", error.message);
      throw new Error(`AI clustering failed: ${error.message}`);
    }
    throw error;
  }

  // Step 3: Transform AI response to DTOs
  const queryMap = new Map(queries.map((q) => [q.id, mapQueryRowToDto(q)]));

  const clusters: AiClusterSuggestionDto[] = aiResponse.clusters
    .map((cluster) => {
      // Filter out invalid query IDs and get actual query data
      // per cluster
      const clusterQueries = cluster.queryIds
        .map((id) => queryMap.get(id))
        .filter((q): q is NonNullable<typeof q> => q !== undefined);

      if (clusterQueries.length === 0) {
        return null;
      }

      // Calculate aggregated metrics for the cluster via shared util
      const { metrics, queryCount } = calculateGroupMetricsFromQueries(clusterQueries);

      return {
        name: cluster.name,
        queries: clusterQueries,
        queryCount,
        metrics,
      };
    })
    .filter((cluster): cluster is NonNullable<typeof cluster> => cluster !== null);

  // Step 4: Log user action (optional - don't fail if this errors)
  try {
    await supabase.from("user_actions").insert({
      user_id: userId,
      action_type: "cluster_generated",
      metadata: {
        clusterCount: clusters.length,
        queryCount: queries.length,
        totalQueriesInClusters: clusters.reduce((sum, c) => sum + c.queryCount, 0),
      },
    });
  } catch (actionError) {
    console.warn("Failed to log user action (non-fatal):", actionError);
  }

  console.log(
    `Returning ${clusters.length} clusters with ${clusters.reduce((sum, c) => sum + c.queryCount, 0)} total queries`
  );
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

  // Prefetch all queries needed for metrics calculation in a single query
  const allQueryIds = Array.from(new Set(clustersToAccept.flatMap((c) => c.queryIds)));
  let queryById = new Map<string, any>();
  if (allQueryIds.length > 0) {
    const { data: queriesForAll, error: queriesError } = await supabase
      .from("queries")
      .select(QUERIES_COLUMNS)
      .in("id", allQueryIds);

    if (queriesError) {
      throw new Error(`Failed to fetch queries for metrics: ${queriesError.message}`);
    }
    if (queriesForAll) {
      queryById = new Map(queriesForAll.map((q) => [q.id as string, q]));
    }
  }

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

    // Calculate metrics for the created group
    const queriesForCluster = cluster.queryIds
      .map((id) => queryById.get(id))
      .filter((q): q is NonNullable<typeof q> => q !== undefined)
      .map((q) => mapQueryRowToDto(q));
    const { metrics, queryCount } = calculateGroupMetricsFromQueries(queriesForCluster);

    createdGroups.push({
      id: groupData.id,
      userId: groupData.user_id,
      name: groupData.name,
      aiGenerated: groupData.ai_generated,
      createdAt: groupData.created_at,
      updatedAt: groupData.updated_at,
      queryCount,
      metrics,
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
