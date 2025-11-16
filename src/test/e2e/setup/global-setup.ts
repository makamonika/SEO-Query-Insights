import { request, type FullConfig } from "@playwright/test";
import { cleanupAllTestData, ensureArtifactsDirectory, ensureQaUser, qaAuthStatePath } from "../utils/supabase-admin";

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = (config.projects[0]?.use?.baseURL as string | undefined) ?? "http://localhost:3000";

  await ensureArtifactsDirectory();

  const qaUser = await ensureQaUser();

  // Clean up any leftover data from previous failed test runs
  console.log("🧹 Cleaning up any leftover test data from previous runs...");
  try {
    await cleanupAllTestData(qaUser.id);
    console.log("✅ Pre-test cleanup completed\n");
  } catch (error) {
    console.error("⚠️  Pre-test cleanup failed:", error);
    // Continue anyway - tests might still work
  }

  const requestContext = await request.newContext({
    baseURL,
  });

  const response = await requestContext.post("/api/auth/login", {
    data: {
      email: qaUser.email,
      password: qaUser.password,
    },
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok()) {
    const responseText = await response.text();
    throw new Error(
      `Failed to authenticate QA user for storage state: ${response.status()} ${response.statusText()} - ${responseText}`
    );
  }

  await requestContext.storageState({ path: qaAuthStatePath });
  await requestContext.dispose();
}
