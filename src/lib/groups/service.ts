import type { Tables } from "../../db/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { GroupWithMetricsDto } from "../../types";

type GroupRow = Tables<"groups">;

function mapGroupRowToDto(row: GroupRow): GroupWithMetricsDto {
  // TODO: Add aggregation for metrics (impressions, clicks, ctr, avgPosition) via SQL join
  // And logic for queryCount
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    aiGenerated: row.ai_generated,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    queryCount: 0,
    metrics: {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      avgPosition: 0,
    },
  };
}

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
): Promise<GroupWithMetricsDto[]> {
  // Fetch groups owned by the user; metrics aggregation to be added next
  // Map sort fields to DB columns
  const sortColumn = opts.sortBy === "name" ? "name" : opts.sortBy === "aiGenerated" ? "ai_generated" : "created_at";
  const ascending = (opts.order ?? "desc") === "asc";

  let query = supabase.from("groups").select("*").eq("user_id", userId);

  // Apply search filter if provided
  if (opts.search && opts.search.trim().length > 0) {
    query = query.ilike("name", `%${opts.search.trim()}%`);
  }

  query = query.order(sortColumn, { ascending }).range(opts.offset, opts.offset + opts.limit - 1);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list groups: ${error.message}`);
  }

  if (!data) {
    return [];
  }
  // TODO: Add queryCount when implementing metrics aggregation
  return data.map(mapGroupRowToDto);
}

export async function createGroup(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: { name: string; aiGenerated?: boolean }
): Promise<GroupWithMetricsDto> {
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

  return mapGroupRowToDto(data);
}

export async function getGroupById(
  supabase: SupabaseClient<Database>,
  userId: string,
  groupId: string
): Promise<GroupWithMetricsDto | null> {
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
  return mapGroupRowToDto(data);
}

export async function updateGroup(
  supabase: SupabaseClient<Database>,
  userId: string,
  groupId: string,
  patch: { name?: string; aiGenerated?: boolean }
): Promise<GroupWithMetricsDto | null> {
  const updates: Partial<GroupRow> = {};
  if (patch.name !== undefined) updates.name = patch.name.trim();
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
  return mapGroupRowToDto(data);
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
  let query = supabase
    .from("groups")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .ilike("name", name);
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
