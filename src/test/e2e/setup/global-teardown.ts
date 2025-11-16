import type { FullConfig } from "@playwright/test";
import { cleanupAllTestData, ensureQaUser } from "../utils/supabase-admin";

/**
 * Global teardown function that runs after all tests complete.
 * Cleans up all test data from the database including:
 * - Groups and group items
 * - User actions
 * - Test queries (prefixed with qa-group-e2e-)
 * 
 * This runs even if tests fail, ensuring the database is cleaned up.
 */
export default async function globalTeardown(_config: FullConfig): Promise<void> {
  console.log("\n🧹 Running global teardown...");

  try {
    const qaUser = await ensureQaUser();
    await cleanupAllTestData(qaUser.id);
    console.log("✅ Global teardown completed successfully\n");
  } catch (error) {
    console.error("❌ Global teardown failed:", error);
    console.error("⚠️  You may need to manually clean up test data from the database");
    // Don't throw - we don't want teardown failures to mask test failures
    // The error is logged for visibility
  }
}
