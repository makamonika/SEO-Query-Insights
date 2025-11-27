import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { AcceptClusterDto, GroupDto } from "@/types";
import { mapGroupRowBase } from "@/lib/mappers";
import { recomputeAndPersistGroupMetrics } from "../group-metrics.service";
import { ClusterValidator } from "./validator";

/**
 * Cluster Acceptor Service
 * Handles acceptance of cluster suggestions and creation of groups
 */
export const ClusterAcceptorService = {
  /**
   * Accept cluster suggestions and persist them as groups
   * Creates groups with ai_generated = true
   */
  async acceptClusters(
    supabase: SupabaseClient<Database>,
    userId: string,
    clustersToAccept: AcceptClusterDto[]
  ): Promise<GroupDto[]> {
    // Validate input
    this.validateInput(clustersToAccept);

    const createdGroups: GroupDto[] = [];

    // Create groups and their items
    for (const cluster of clustersToAccept) {
      const group = await this.createGroupFromCluster(supabase, userId, cluster);
      createdGroups.push(group);
    }

    // Log user action
    await this.logUserAction(supabase, userId, createdGroups);

    return createdGroups;
  },

  /**
   * Validate input clusters
   */
  validateInput(clustersToAccept: AcceptClusterDto[]): void {
    if (!Array.isArray(clustersToAccept) || clustersToAccept.length === 0) {
      throw new Error("At least one cluster must be provided");
    }

    for (const cluster of clustersToAccept) {
      const validation = ClusterValidator.validateClusterForAcceptance(cluster);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
    }
  },

  /**
   * Create a single group from a cluster
   */
  async createGroupFromCluster(
    supabase: SupabaseClient<Database>,
    userId: string,
    cluster: AcceptClusterDto
  ): Promise<GroupDto> {
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

    return {
      ...baseGroup,
      queryCount,
      metricsImpressions: metrics.impressions,
      metricsClicks: metrics.clicks,
      metricsCtr: metrics.ctr,
      metricsAvgPosition: metrics.avgPosition,
    };
  },

  /**
   * Log user action
   */
  async logUserAction(supabase: SupabaseClient<Database>, userId: string, createdGroups: GroupDto[]): Promise<void> {
    await supabase.from("user_actions").insert({
      user_id: userId,
      action_type: "cluster_accepted",
      metadata: {
        acceptedCount: createdGroups.length,
        groupIds: createdGroups.map((g) => g.id),
      },
    });
  },
};
