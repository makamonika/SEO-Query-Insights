import type { Tables } from "@/db/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { GroupDto } from "@/types";
import { mapGroupRowBase } from "@/lib/mappers";
import { recomputeAndPersistGroupMetrics } from "./group-metrics.service";
import { addGroupItems } from "./group-items.service";

type GroupRow = Tables<"groups">;

export async function listGroups(
  supabase: SupabaseClient<Database>,
  userId: string,
  opts: {
    limit: number;
    offset: number;
    sortBy?: "name" | "createdAt" | "aiGenerated";
    order?: "asc" | "desc";
    search?: string;
  }
): Promise<{ data: GroupDto[]; total: number }> {
  // Fetch groups owned by the user; metrics aggregation to be added next
  // Map sort fields to DB columns
  const sortColumn = opts.sortBy === "name" ? "name" : opts.sortBy === "aiGenerated" ? "ai_generated" : "created_at";
  const ascending = (opts.order ?? "desc") === "asc";

  let query = supabase.from("groups").select("*", { count: "exact" }).eq("user_id", userId);

  // Apply search filter if provided
  if (opts.search && opts.search.trim().length > 0) {
    query = query.ilike("name", `%${opts.search.trim()}%`);
  }

  query = query.order(sortColumn, { ascending }).range(opts.offset, opts.offset + opts.limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list groups: ${error.message}`);
  }

  if (!data) {
    return { data: [], total: 0 };
  }

  // Read persisted metrics from group rows (denormalized on write)
  const groups: GroupDto[] = data.map((row) => mapGroupRowBase(row));

  return { data: groups, total: count ?? 0 };
}

export async function createGroup(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: { name: string; aiGenerated?: boolean; queryIds?: string[] }
): Promise<GroupDto> {
  const name = payload.name.trim();
  if (name.length === 0) {
    throw new Error("Group name cannot be empty");
  }
  await assertUniqueGroupName(supabase, userId, name);

  const { data, error } = await supabase
    .from("groups")
    .insert({
      name,
      user_id: userId,
      ai_generated: payload.aiGenerated ?? false,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create group: ${error.message}`);
  }

  // Add query items to the group if provided, then recompute metrics
  let metricsResult = { metrics: { impressions: 0, clicks: 0, ctr: 0, avgPosition: 0 }, queryCount: 0 };
  if (payload.queryIds && payload.queryIds.length > 0) {
    await addGroupItems(supabase, userId, data.id, payload.queryIds);
    metricsResult = await recomputeAndPersistGroupMetrics(supabase, data.id);
  }

  const baseGroup = mapGroupRowBase(data);
  const { metrics, queryCount } = metricsResult;

  return {
    ...baseGroup,
    queryCount,
    metricsImpressions: metrics.impressions,
    metricsClicks: metrics.clicks,
    metricsCtr: metrics.ctr,
    metricsAvgPosition: metrics.avgPosition,
  };
}

export async function getGroupById(
  supabase: SupabaseClient<Database>,
  userId: string,
  groupId: string
): Promise<GroupDto | null> {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("user_id", userId)
    .eq("id", groupId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch group: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  return mapGroupRowBase(data as GroupRow);
}

export async function updateGroup(
  supabase: SupabaseClient<Database>,
  userId: string,
  groupId: string,
  patch: { name?: string; aiGenerated?: boolean }
): Promise<GroupDto | null> {
  const updates: Partial<GroupRow> = {};
  if (patch.name !== undefined) {
    const trimmedName = patch.name.trim();
    if (trimmedName.length === 0) {
      throw new Error("Group name cannot be empty");
    }
    updates.name = trimmedName;
  }
  if (patch.aiGenerated !== undefined) updates.ai_generated = patch.aiGenerated;

  // Validate duplicate name if name is being changed
  if (updates.name !== undefined && updates.name.length > 0) {
    await assertUniqueGroupName(supabase, userId, updates.name, groupId);
  }

  const { data, error } = await supabase
    .from("groups")
    .update(updates)
    .eq("user_id", userId)
    .eq("id", groupId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update group: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  return mapGroupRowBase(data as GroupRow);
}

export async function deleteGroup(
  supabase: SupabaseClient<Database>,
  userId: string,
  groupId: string
): Promise<boolean> {
  const { error, count } = await supabase
    .from("groups")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("id", groupId);

  if (error) {
    throw new Error(`Failed to delete group: ${error.message}`);
  }
  return (count ?? 0) > 0;
}

export class DuplicateGroupNameError extends Error {
  constructor(message = "A group with this name already exists") {
    super(message);
    this.name = "DuplicateGroupNameError";
  }
}

async function assertUniqueGroupName(
  supabase: SupabaseClient<Database>,
  userId: string,
  name: string,
  excludeGroupId?: string
): Promise<void> {
  // Normalize name for comparison (trim and lowercase)
  const normalizedName = name.trim().toLowerCase();

  let query = supabase
    .from("groups")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .ilike("name", normalizedName);
  if (excludeGroupId) {
    query = query.neq("id", excludeGroupId);
  }
  const { count, error } = await query;
  if (error) {
    throw new Error(`Failed to verify duplicates: ${error.message}`);
  }
  if ((count ?? 0) > 0) {
    throw new DuplicateGroupNameError();
  }
}
