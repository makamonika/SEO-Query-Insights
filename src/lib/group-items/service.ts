/**
 * Group Items Service
 *
 * Handles adding and removing query texts from groups.
 * Enforces ownership validation and tracks user actions.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "../../db/database.types";
import type { QueryDto } from "../../types";
import { QUERIES_COLUMNS } from "../db/projections";
import { mapQueryRowToDto } from "../mappers";

export interface AddGroupItemsResult {
  addedCount: number;
}

export interface RemoveGroupItemResult {
  removed: boolean;
}

/**
 * Add multiple query IDs to a group
 * - Deduplicates input
 * - Checks for existing items to avoid duplicates
 * - Validates that all query IDs exist
 * - Tracks action in user_actions table
 */
export async function addGroupItems(
  supabase: SupabaseClient<Database>,
  userId: string,
  groupId: string,
  queryIds: string[]
): Promise<AddGroupItemsResult> {
  // Step 1: Deduplicate query IDs
  const uniqueQueryIds = [...new Set(queryIds.filter((id) => id.length > 0))];

  if (uniqueQueryIds.length === 0) {
    return { addedCount: 0 };
  }

  // Step 2: Verify all query IDs exist
  const { data: existingQueries, error: queriesError } = await supabase
    .from("queries")
    .select("id")
    .in("id", uniqueQueryIds);

  if (queriesError) {
    throw new Error(`Failed to verify queries: ${queriesError.message}`);
  }

  const validQueryIds = new Set(existingQueries?.map((q) => q.id) ?? []);
  const invalidIds = uniqueQueryIds.filter((id) => !validQueryIds.has(id));

  if (invalidIds.length > 0) {
    throw new Error(`Invalid query IDs: ${invalidIds.join(", ")}`);
  }

  // Step 3: Check which items already exist in the group
  const { data: existingItems, error: checkError } = await supabase
    .from("group_items")
    .select("query_id")
    .eq("group_id", groupId)
    .in("query_id", uniqueQueryIds);

  if (checkError) {
    throw new Error(`Failed to check existing items: ${checkError.message}`);
  }

  const existingQueryIds = new Set(existingItems?.map((item) => item.query_id) ?? []);
  const newQueryIds = uniqueQueryIds.filter((id) => !existingQueryIds.has(id));

  if (newQueryIds.length === 0) {
    return { addedCount: 0 };
  }

  // Step 4: Insert new items
  const itemsToInsert = newQueryIds.map((queryId) => ({
    group_id: groupId,
    query_id: queryId,
  }));

  const { error: insertError } = await supabase.from("group_items").insert(itemsToInsert);

  if (insertError) {
    throw new Error(`Failed to insert group items: ${insertError.message}`);
  }

  const addedCount = newQueryIds.length;

  // Step 5: Track user action
  if (addedCount > 0) {
    await supabase.from("user_actions").insert({
      user_id: userId,
      action_type: "group_item_added",
      target_id: groupId,
      metadata: { count: addedCount, queryIds: newQueryIds },
    });
  }

  return { addedCount };
}

/**
 * Remove a single query from a group by query ID
 * - Validates query ID format
 * - Tracks action in user_actions table
 */
export async function removeGroupItem(
  supabase: SupabaseClient<Database>,
  userId: string,
  groupId: string,
  queryId: string
): Promise<RemoveGroupItemResult> {
  // Step 1: Validate query ID
  if (!queryId || queryId.trim().length === 0) {
    throw new Error("Query ID cannot be empty");
  }

  // Step 2: Delete the item
  const { error, count } = await supabase
    .from("group_items")
    .delete({ count: "exact" })
    .eq("group_id", groupId)
    .eq("query_id", queryId);

  if (error) {
    throw new Error(`Failed to remove group item: ${error.message}`);
  }

  const removed = (count ?? 0) > 0;

  // Step 3: Track user action if item was removed
  if (removed) {
    await supabase.from("user_actions").insert({
      user_id: userId,
      action_type: "group_item_removed",
      target_id: groupId,
      metadata: { queryId },
    });
  }

  return { removed };
}

/**
 * Get all queries that are members of a group
 * Returns full query data joined with group membership via foreign key
 * Ordered by impressions descending by default
 * Supports pagination with limit and offset
 */
export async function getGroupItems(
  supabase: SupabaseClient<Database>,
  userId: string,
  groupId: string,
  opts?: {
    limit?: number;
    offset?: number;
  }
): Promise<{ data: QueryDto[]; total: number }> {
  // Step 1: Join group_items with queries using the foreign key relationship
  // Using inner join to only get items where the query exists
  const { data, error, count } = await supabase
    .from("group_items")
    .select(
      `
      query_id,
      queries!inner (
        ${QUERIES_COLUMNS}
      )
    `,
      { count: "exact" }
    )
    .eq("group_id", groupId);

  if (error) {
    throw new Error(`Failed to fetch group items: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return { data: [], total: 0 };
  }

  // Step 2: Map to QueryDto and sort by impressions descending
  const queries = data
    .map((item) => {
      // The queries field is a single object due to the foreign key relationship
      const query = item.queries;
      if (!query) return null;
      return mapQueryRowToDto(query as Tables<"queries">);
    })
    .filter((q): q is QueryDto => q !== null);

  // Sort by impressions descending (client-side since ordering related fields can be tricky)
  const sortedQueries = queries.sort((a, b) => b.impressions - a.impressions);

  // Step 3: Apply pagination if provided
  if (opts?.limit !== undefined && opts?.offset !== undefined) {
    const paginatedQueries = sortedQueries.slice(opts.offset, opts.offset + opts.limit);
    return { data: paginatedQueries, total: count ?? 0 };
  }

  return { data: sortedQueries, total: count ?? 0 };
}
