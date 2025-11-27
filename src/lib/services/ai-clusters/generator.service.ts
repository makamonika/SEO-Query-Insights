import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/db/database.types";
import type { AiClusterSuggestionDto, QueryDto } from "@/types";
import { QUERIES_COLUMNS } from "@/lib/db/projections";
import { calculateGroupMetricsFromQueries } from "@/lib/metrics";
import { mapQueryRowToDto } from "@/lib/mappers";
import { OpenRouterService } from "../openrouter.service";
import { OPENROUTER_API_KEY } from "astro:env/server";
import { BatchProcessorService } from "./batch-processor.service";
import { ClusterValidator } from "./validator";

/**
 * Cluster Generator Service
 * Handles generation of AI cluster suggestions
 */

const MAX_QUERIES_FOR_CLUSTERING = 500;
const MIN_CLUSTER_SIZE = 3;

export const ClusterGeneratorService = {
  /**
   * Generate AI cluster suggestions using OpenRouter AI
   * @returns Array of cluster suggestions (stateless, not stored)
   */
  async generateClusters(supabase: SupabaseClient<Database>, userId: string): Promise<AiClusterSuggestionDto[]> {
    // Step 1: Fetch queries for clustering
    const queries = await this.fetchQueries(supabase);

    if (queries.length === 0) {
      console.log("No queries available for clustering");
      return [];
    }

    console.log(`Fetched ${queries.length} queries for clustering`);

    // Step 2: Split queries into batches
    const batches = BatchProcessorService.createBatches(queries, 1000);

    // Step 3: Process batches through AI
    const openRouter = this.getOpenRouterService();
    const batchResults = await BatchProcessorService.processBatches(batches, openRouter);

    // Step 4: Convert batch results to DTOs
    const queryMap = new Map(queries.map((q) => [q.id, mapQueryRowToDto(q)]));
    const clusters = this.convertBatchResultsToDtos(batchResults, queryMap);

    // Step 5: Log user action
    await this.logUserAction(supabase, userId, clusters, queries.length, batches.length);

    console.log(
      `Returning ${clusters.length} clusters with ${clusters.reduce((sum, c) => sum + c.queryCount, 0)} total queries`
    );

    return clusters;
  },

  /**
   * Fetch queries for clustering
   */
  async fetchQueries(supabase: SupabaseClient<Database>): Promise<Tables<"queries">[]> {
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
        break;
      }

      queries.push(...chunk);

      if (chunk.length < chunkSize) {
        break;
      }
    }

    return queries;
  },

  /**
   * Initialize OpenRouter service
   */
  getOpenRouterService(): OpenRouterService {
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY environment variable is not set");
    }

    return OpenRouterService.getInstance({
      apiKey: OPENROUTER_API_KEY,
      model: "openai/gpt-4o-mini",
    });
  },

  /**
   * Convert batch results to cluster DTOs
   */
  convertBatchResultsToDtos(
    batchResults: { clusters: { name: string; queryIds: string[] }[] }[],
    queryMap: Map<string, QueryDto>
  ): AiClusterSuggestionDto[] {
    const allClusters: AiClusterSuggestionDto[] = [];
    let invalidIdCount = 0;
    let notFoundIdCount = 0;

    for (const batchResult of batchResults) {
      for (const cluster of batchResult.clusters) {
        // Validate cluster name
        if (!ClusterValidator.validateClusterName(cluster.name)) {
          console.warn("Skipping cluster with invalid name");
          continue;
        }

        // Filter out invalid IDs
        const { validIds, invalidCount } = ClusterValidator.validateQueryIds(cluster.queryIds);
        invalidIdCount += invalidCount;

        // Map IDs to query DTOs
        const clusterQueries = validIds
          .map((id) => {
            const query = queryMap.get(id);
            if (!query) {
              notFoundIdCount++;
            }
            return query;
          })
          .filter((q): q is QueryDto => q !== undefined);

        // Only include clusters that meet minimum size
        if (clusterQueries.length >= MIN_CLUSTER_SIZE) {
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

    // Log warnings
    if (invalidIdCount > 0) {
      console.warn(`Warning: ${invalidIdCount} invalid query IDs (not UUID format) were filtered out.`);
    }
    if (notFoundIdCount > 0) {
      console.warn(`Warning: ${notFoundIdCount} query IDs were valid UUIDs but not found in the dataset.`);
    }

    return allClusters;
  },

  /**
   * Log user action (non-fatal)
   */
  async logUserAction(
    supabase: SupabaseClient<Database>,
    userId: string,
    clusters: AiClusterSuggestionDto[],
    queryCount: number,
    batchCount: number
  ): Promise<void> {
    try {
      await supabase.from("user_actions").insert({
        user_id: userId,
        action_type: "cluster_generated",
        metadata: {
          clusterCount: clusters.length,
          queryCount,
          totalQueriesInClusters: clusters.reduce((sum, c) => sum + c.queryCount, 0),
          batchCount,
        },
      });
    } catch (actionError) {
      console.warn("Failed to log user action (non-fatal):", actionError);
    }
  },
};
