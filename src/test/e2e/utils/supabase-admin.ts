import { createClient } from "@supabase/supabase-js";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import type { Database } from "@/db/database.types";

type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];

type SupabaseAdminClient = ReturnType<typeof createClient<Database>>;

interface QaUserCredentials {
  id: string;
  email: string;
  password: string;
}

interface GroupMetricsSummary {
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
  count: number;
}

const RUN_ID = process.env.PLAYWRIGHT_RUN_ID ?? `${Date.now()}`;
const QA_QUERY_PREFIX = `qa-group-e2e-${RUN_ID}`;
const QA_QUERY_PREFIX_WILDCARD = "qa-group-e2e-%";
const BASELINE_QUERY_DATE = "2025-01-01";

let cachedClient: SupabaseAdminClient | null = null;
let cachedQaUser: QaUserCredentials | null = null;

const baselineQueries: TablesInsert<"queries">[] = [
  {
    date: BASELINE_QUERY_DATE,
    query_text: `${QA_QUERY_PREFIX}-total-performance`,
    url: "https://example.com/performance",
    impressions: 1250,
    clicks: 180,
    ctr: 0.14,
    avg_position: 4.2,
    is_opportunity: true,
  },
  {
    date: BASELINE_QUERY_DATE,
    query_text: `${QA_QUERY_PREFIX}-conversion-drop`,
    url: "https://example.com/conversions",
    impressions: 980,
    clicks: 65,
    ctr: 0.07,
    avg_position: 8.1,
    is_opportunity: false,
  },
  {
    date: BASELINE_QUERY_DATE,
    query_text: `${QA_QUERY_PREFIX}-seasonal-trend`,
    url: "https://example.com/seasonal",
    impressions: 1575,
    clicks: 210,
    ctr: 0.13,
    avg_position: 3.6,
    is_opportunity: true,
  },
];

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getSupabaseAdminClient(): SupabaseAdminClient {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = globalThis.SUPABASE_URL;
  const supabaseKey = globalThis.SUPABASE_KEY;

  cachedClient = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
}

export async function ensureQaUser(): Promise<QaUserCredentials> {
  if (cachedQaUser) {
    return cachedQaUser;
  }

  const id = getRequiredEnv("E2E_USERNAME_ID");
  const email = getRequiredEnv("E2E_USERNAME");
  const password = getRequiredEnv("E2E_PASSWORD");

  cachedQaUser = {
    id,
    email,
    password,
  };

  return cachedQaUser;
}

/**
 * Deletes all test queries matching the QA prefix pattern.
 * Used internally by resetBaselineQueries and cleanupAllTestData.
 * @param useWildcard - If true, deletes all test queries from any run. If false, only deletes current run's queries.
 */
async function deleteTestQueries(useWildcard = false): Promise<void> {
  const adminClient = getSupabaseAdminClient();
  const pattern = useWildcard ? QA_QUERY_PREFIX_WILDCARD : `${QA_QUERY_PREFIX}%`;

  const { error } = await adminClient.from("queries").delete().ilike("query_text", pattern);

  if (error) {
    throw new Error(`Failed to delete test queries: ${error.message}`);
  }
}

/**
 * Resets baseline queries for tests.
 * Deletes existing test queries and inserts fresh baseline data.
 * Called in beforeEach to ensure consistent test state.
 */
export async function resetBaselineQueries(): Promise<void> {
  await deleteTestQueries();

  const adminClient = getSupabaseAdminClient();
  const { error: insertError } = await adminClient.from("queries").upsert(baselineQueries);

  if (insertError) {
    throw new Error(`Failed to seed baseline queries: ${insertError.message}`);
  }
}

/**
 * Cleans up groups and user actions for a specific user.
 * Called in beforeEach to ensure clean state before each test.
 */
export async function cleanupGroupsForUser(userId: string): Promise<void> {
  const adminClient = getSupabaseAdminClient();

  // Delete groups first (group_items will cascade)
  const { error: groupsError } = await adminClient.from("groups").delete().eq("user_id", userId);

  if (groupsError) {
    throw new Error(`Failed to delete groups: ${groupsError.message}`);
  }

  // Delete user actions
  const { error: actionsError } = await adminClient.from("user_actions").delete().eq("user_id", userId);

  if (actionsError) {
    throw new Error(`Failed to delete user actions: ${actionsError.message}`);
  }
}

/**
 * Performs complete cleanup of all test data.
 * Called in global teardown after all tests complete.
 * Uses non-throwing error handling to ensure cleanup continues even if one step fails.
 */
export async function cleanupAllTestData(userId: string): Promise<void> {
  const adminClient = getSupabaseAdminClient();

  // Clean up groups (and their items via cascade)
  const { error: groupsError } = await adminClient.from("groups").delete().eq("user_id", userId);

  if (groupsError) {
    console.error(`⚠️  Failed to delete groups: ${groupsError.message}`);
  } else {
    console.log(`✅ Deleted groups for user ${userId}`);
  }

  // Clean up user actions
  const { error: actionsError } = await adminClient.from("user_actions").delete().eq("user_id", userId);

  if (actionsError) {
    console.error(`⚠️  Failed to delete user actions: ${actionsError.message}`);
  } else {
    console.log(`✅ Deleted user actions for user ${userId}`);
  }

  // Clean up ALL test queries
  const { error: queriesError } = await adminClient
    .from("queries")
    .delete({ count: "exact" })
    .ilike("query_text", QA_QUERY_PREFIX_WILDCARD);

  if (queriesError) {
    console.error(`❌ Failed to delete test queries: ${queriesError.message}`);
  } else {
    console.log("✅ Successfully deleted test queries");
  }
}

export const qaTestArtifactsDir = resolve(process.cwd(), "playwright");

export const qaAuthStatePath = resolve(qaTestArtifactsDir, ".auth", "qa-user.json");

export async function ensureArtifactsDirectory(): Promise<void> {
  await mkdir(resolve(qaTestArtifactsDir, ".auth"), { recursive: true });
}

export function getBaselineQueryPrefix(): string {
  return QA_QUERY_PREFIX;
}

export function getBaselineQueriesSeed(): TablesInsert<"queries">[] {
  return baselineQueries.map((entry) => ({ ...entry }));
}

export const baselineQueriesSummary: GroupMetricsSummary = (() => {
  const impressions = baselineQueries.reduce((acc, query) => acc + (query.impressions ?? 0), 0);
  const clicks = baselineQueries.reduce((acc, query) => acc + (query.clicks ?? 0), 0);
  const avgPosition =
    baselineQueries.length > 0
      ? Number(
          (baselineQueries.reduce((acc, query) => acc + (query.avg_position ?? 0), 0) / baselineQueries.length).toFixed(
            1
          )
        )
      : 0;
  const ctr = impressions > 0 ? Number((clicks / impressions).toFixed(2)) : 0;

  return {
    impressions,
    clicks,
    avgPosition,
    ctr,
    count: baselineQueries.length,
  };
})();

export async function fetchBaselineQueriesWithIds() {
  const adminClient = getSupabaseAdminClient();

  const { data, error } = await adminClient
    .from("queries")
    .select("*")
    .ilike("query_text", `${QA_QUERY_PREFIX}%`)
    .order("query_text");

  if (error) {
    throw new Error(`Failed to fetch seeded baseline queries: ${error.message}`);
  }

  return data ?? [];
}
