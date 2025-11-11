import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "../../db/database.types";
import type { AiClusterSuggestionDto, AcceptClusterDto, QueryDto, GroupDto } from "../../types";
import { QUERIES_COLUMNS } from "../db/projections";
import { calculateGroupMetricsFromQueries } from "../metrics";
import { mapQueryRowToDto, mapGroupRowBase } from "../mappers";
import { OpenRouterService, OpenRouterError } from "./openrouter.service";
import type { JsonSchemaConfig } from "./openrouter.types";
import { recomputeAndPersistGroupMetrics } from "./group-metrics.service";

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

const MAX_QUERIES_FOR_CLUSTERING = 500;

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
  return `You are an expert SEO strategist focused on creating actionable query clusters for content optimization.

Your goal is to group search queries that:
1. **Can be optimized together** - queries that share the same core topic and could be addressed with the same or similar content/page
2. **Share strong semantic meaning** - queries must refer to the same subject, entity, or closely related concepts
3. **Have matching search intent** - all queries in a cluster must have the same intent type (informational, navigational, or transactional)
4. **Represent a clear optimization task** - each cluster should represent a specific work item for the SEO team

Clustering Rules (STRICTLY ENFORCE):
- **Semantic Coherence**: Only group queries that are genuinely about the same topic/subject. If queries are loosely related but not about the same core concept, DO NOT cluster them together
- **Intent Alignment**: NEVER mix queries with different search intents in the same cluster (e.g., don't mix "how to" informational queries with "buy" transactional queries)
- **Content Optimization Focus**: Ask yourself: "Could these queries be optimized on the same page or with similar content?" If not, don't cluster them
- **Quality over Quantity**: It is BETTER to leave queries unclustered than to create weak, loosely-related clusters
- **Minimum Cluster Size**: Only create clusters with 3+ queries that are strongly related

Output Guidelines:
- Create 3-7 clusters (aim for 5 if data supports it)
- Cluster names should be specific, SEO-focused, and actionable (e.g., "Pricing Plans Comparison" not just "Pricing")
- Each cluster name should clearly describe the optimization opportunity
- Omit queries that don't fit into strong, coherent clusters - unclustered queries will not appear in the response

Remember: Clusters should help SEO teams prioritize optimization work by identifying queries that can be improved together.

Input format:
- The user message is a JSON object with shape:
  {
    "queries": [{ "id": string, "q": string, "imp": number, "clk": number, "ctr": number|null, "pos": number|null, "opp": boolean }],
    "constraints": { "minClusterSize": number, "minClusters": number, "maxClusters": number, "useOnlyProvidedIds": true }
  }
- Use only values from queries[].id when producing queryIds.`;
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
  const payload = {
    queries: queries.map((q) => ({
      id: q.id,
      q: q.query_text,
      imp: q.impressions,
      clk: q.clicks,
      ctr: q.ctr ?? null,
      pos: q.avg_position ?? null,
      opp: q.is_opportunity,
    })),
    constraints: {
      minClusterSize: 3,
      minClusters: 3,
      maxClusters: 7,
      useOnlyProvidedIds: true,
      nameStyle: "specific_seo_actionable",
    },
  };

  return JSON.stringify(payload);
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
  // Fetch in chunks of 1000 to bypass Supabase's default limit
  const queries: Tables<"queries">[] = [];
  const chunkSize = 1000;
  const totalToFetch = MAX_QUERIES_FOR_CLUSTERING;

  for (let offset = 0; offset < totalToFetch; offset += chunkSize) {
    const end = Math.min(offset + chunkSize - 1, totalToFetch - 1);
    const { data: chunk, error } = await supabase
      .from("queries")
      .select(QUERIES_COLUMNS)
      .order("impressions", { ascending: false })
      .order("date", { ascending: false })
      .range(offset, end);

    if (error) {
      console.error("Supabase error fetching queries:", error);
      throw new Error(`Failed to fetch queries for clustering: ${error.message}`);
    }

    if (!chunk || chunk.length === 0) {
      break; // No more data available
    }

    queries.push(...chunk);

    // If we got less than chunkSize, we've reached the end
    if (chunk.length < chunkSize) {
      break;
    }
  }

  if (queries.length === 0) {
    console.log("No queries available for clustering");
    return [];
  }
  console.log(`Fetched ${queries.length} queries for clustering`);
  // Step 2: Split queries into batches of 1000 for AI processing
  const BATCH_SIZE = 1000;
  const batches: Tables<"queries">[][] = [];

  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    batches.push(queries.slice(i, i + BATCH_SIZE));
  }

  // Step 3: Process each batch through AI clustering
  const batchResults: { clusters: { name: string; queryIds: string[] }[] }[] = [];
  const openRouter = getOpenRouterService();
  const systemPrompt = buildSystemPrompt();

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    try {
      const userPrompt = buildUserPrompt(batch);

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
        const aiResponse = JSON.parse(response.message.content);
        batchResults.push(aiResponse);
      } catch (parseError) {
        console.error(`Failed to parse AI response for batch ${batchIndex + 1}:`, parseError);
        throw new Error(`Invalid JSON response from AI for batch ${batchIndex + 1}`);
      }
    } catch (error) {
      if (error instanceof OpenRouterError) {
        console.error(`OpenRouter error for batch ${batchIndex + 1}:`, error.message);
        throw new Error(`AI clustering failed for batch ${batchIndex + 1}: ${error.message}`);
      }
      throw error;
    }
  }

  // Step 4: Combine all clusters from all batches (no merging)
  const queryMap = new Map(queries.map((q) => [q.id, mapQueryRowToDto(q)]));

  // UUID format validation regex (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Flatten all clusters from all batches and convert to DTOs
  const allClusters: AiClusterSuggestionDto[] = [];
  let invalidIdCount = 0;
  let notFoundIdCount = 0;

  for (const batchResult of batchResults) {
    for (const cluster of batchResult.clusters) {
      // Filter out invalid IDs (not UUID format)
      const validIds = cluster.queryIds.filter((id) => {
        if (!uuidRegex.test(id)) {
          invalidIdCount++;
          return false;
        }
        return true;
      });

      const clusterQueries = validIds
        .map((id) => {
          const query = queryMap.get(id);
          if (!query) {
            notFoundIdCount++;
          }
          return query;
        })
        .filter((q): q is QueryDto => q !== undefined);

      if (clusterQueries.length >= 3) {
        const { metrics, queryCount } = calculateGroupMetricsFromQueries(clusterQueries);

        allClusters.push({
          name: cluster.name,
          queries: clusterQueries,
          queryCount,
          metricsImpressions: metrics.impressions,
          metricsClicks: metrics.clicks,
          metricsCtr: metrics.ctr,
          metricsAvgPosition: metrics.avgPosition,
        });
      }
    }
  }

  if (invalidIdCount > 0) {
    console.warn(
      `Warning: ${invalidIdCount} invalid query IDs (not UUID format) were filtered out. This may indicate the AI model is not following the ID format instructions correctly.`
    );
  }
  if (notFoundIdCount > 0) {
    console.warn(`Warning: ${notFoundIdCount} query IDs were valid UUIDs but not found in the dataset.`);
  }
  const clusters = allClusters;

  // Step 5: Log user action (optional - don't fail if this errors)
  try {
    await supabase.from("user_actions").insert({
      user_id: userId,
      action_type: "cluster_generated",
      metadata: {
        clusterCount: clusters.length,
        queryCount: queries.length,
        totalQueriesInClusters: clusters.reduce((sum: number, c: AiClusterSuggestionDto) => sum + c.queryCount, 0),
        batchCount: batches.length,
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
): Promise<GroupDto[]> {
  const createdGroups: GroupDto[] = [];

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

    // Persist and read metrics for the created group
    const { metrics, queryCount } = await recomputeAndPersistGroupMetrics(supabase, groupData.id);
    const baseGroup = mapGroupRowBase(groupData);
    const created: GroupDto = {
      ...baseGroup,
      queryCount,
      metricsImpressions: metrics.impressions,
      metricsClicks: metrics.clicks,
      metricsCtr: metrics.ctr,
      metricsAvgPosition: metrics.avgPosition,
    };

    createdGroups.push(created);
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
