import type { Tables } from "../../db/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { GroupWithMetricsDto, QueryDto } from "../../types";
import { QUERIES_COLUMNS } from "../db/projections";
import { calculateGroupMetricsFromQueries } from "../metrics";
import { mapQueryRowToDto, mapGroupRowBase } from "../mappers";
import { addGroupItems } from "../group-items/service";

type GroupRow = Tables<"groups">;

async function fetchQueriesByGroupIds(
  supabase: SupabaseClient<Database>,
  groupIds: string[]
): Promise<Map<string, QueryDto[]>> {
  const result = new Map<string, QueryDto[]>();
  if (groupIds.length === 0) return result;

  const { data: items, error: itemsError } = await supabase
    .from("group_items")
    .select("group_id,query_id")
    .in("group_id", groupIds);

  if (itemsError) {
    throw new Error(`Failed to fetch group items: ${itemsError.message}`);
  }

  const groupIdToQueryIds = new Map<string, string[]>();
  for (const id of groupIds) groupIdToQueryIds.set(id, []);
  const allQueryIds = new Set<string>();

  for (const item of items ?? []) {
    const gid = item.group_id as string;
    const qid = item.query_id as string;
    allQueryIds.add(qid);
    const list = groupIdToQueryIds.get(gid);
    if (list) list.push(qid);
    else groupIdToQueryIds.set(gid, [qid]);
  }

  if (allQueryIds.size === 0) {
    for (const gid of groupIds) result.set(gid, []);
    return result;
  }

  const { data: queries, error: queriesError } = await supabase
    .from("queries")
    .select(QUERIES_COLUMNS)
    .in("id", Array.from(allQueryIds));

  if (queriesError) {
    throw new Error(`Failed to fetch queries for groups: ${queriesError.message}`);
  }

  const queryById = new Map((queries ?? []).map((q) => [q.id as string, mapQueryRowToDto(q)]));

  for (const [gid, qids] of groupIdToQueryIds.entries()) {
    const rows = qids.map((id) => queryById.get(id)).filter((q): q is NonNullable<typeof q> => q !== undefined);
    result.set(gid, rows);
  }

  return result;
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
): Promise<{ data: GroupWithMetricsDto[]; total: number }> {
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

  // Aggregate metrics and query counts for all groups
  const groupIds = data.map((g) => g.id);
  const groupIdToQueries = await fetchQueriesByGroupIds(supabase, groupIds);

  const enriched = data.map((row) => {
    const base = mapGroupRowBase(row);
    const queries = groupIdToQueries.get(row.id) ?? [];
    const { metrics, queryCount } = calculateGroupMetricsFromQueries(queries);
    const dto: GroupWithMetricsDto = {
      ...base,
      queryCount,
      metrics,
    } as GroupWithMetricsDto;
    return dto;
  });

  return { data: enriched, total: count ?? 0 };
}

export async function createGroup(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: { name: string; aiGenerated?: boolean; queryIds?: string[] }
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

  // Add query items to the group if provided
  if (payload.queryIds && payload.queryIds.length > 0) {
    await addGroupItems(supabase, userId, data.id, payload.queryIds);
  }

  // Compute metrics for the newly created group
  const groupIdToQueries = await fetchQueriesByGroupIds(supabase, [data.id]);
  const queries = groupIdToQueries.get(data.id) ?? [];
  const { metrics, queryCount } = calculateGroupMetricsFromQueries(queries);

  return {
    ...mapGroupRowBase(data),
    queryCount,
    metrics,
  };
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

  const groupIdToQueries = await fetchQueriesByGroupIds(supabase, [data.id]);
  const queries = groupIdToQueries.get(data.id) ?? [];
  const { metrics, queryCount } = calculateGroupMetricsFromQueries(queries);

  return {
    ...mapGroupRowBase(data),
    queryCount,
    metrics,
  };
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

  const groupIdToQueries = await fetchQueriesByGroupIds(supabase, [data.id]);
  const queries = groupIdToQueries.get(data.id) ?? [];
  const { metrics, queryCount } = calculateGroupMetricsFromQueries(queries);

  return {
    ...mapGroupRowBase(data),
    queryCount,
    metrics,
  };
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
