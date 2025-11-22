import { test as base, expect } from "@playwright/test";
import { cleanupGroupsForUser, ensureQaUser, resetBaselineQueries } from "@/test/e2e/utils/supabase-admin";

type QaUserFixture = Awaited<ReturnType<typeof ensureQaUser>>;

interface Fixtures {
  qaUser: QaUserFixture;
}

export const test = base.extend<Fixtures>({
  qaUser: async ({}, use) => {
    const qaUser = await ensureQaUser();
    await use(qaUser);
  },
});

// Set up baseline queries before each test
// This ensures each test has the expected test data
test.beforeEach(async () => {
  await resetBaselineQueries();
});

// Clean up after each test, even if the test fails
// This ensures the next test starts with a clean state
test.afterEach(async ({ qaUser }) => {
  try {
    await cleanupGroupsForUser(qaUser.id);
  } catch (error) {
    console.error("⚠️  Failed to cleanup after test:", error);
    // Don't throw - we want other cleanup to continue
  }
});

export { expect };
