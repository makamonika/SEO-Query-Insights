import type { Page } from "@playwright/test";

interface CreateGroupParams {
  name: string;
  queryIds: string[];
  aiGenerated?: boolean;
}

interface CreatedGroup {
  id: string;
  name: string;
  queryCount?: number;
}

export interface GroupRecord {
  id: string;
  name: string;
  queryCount: number;
  metricsImpressions: number;
  metricsClicks: number;
  metricsCtr: number;
  metricsAvgPosition: number;
}

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_INTERVAL = 250;

export async function createGroupViaApi(page: Page, params: CreateGroupParams): Promise<CreatedGroup> {
  const response = await page.request.post("/api/groups", {
    data: {
      name: params.name,
      queryIds: params.queryIds,
      aiGenerated: params.aiGenerated ?? false,
    },
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to create group (${response.status()}): ${body}`);
  }

  const created = (await response.json()) as CreatedGroup;
  await waitForGroupById(page, created.id);
  return created;
}

/**
 * Helper to create a delay without using deprecated waitForTimeout
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForGroupById(
  page: Page,
  groupId: string,
  timeout = DEFAULT_TIMEOUT,
  interval = DEFAULT_INTERVAL
): Promise<void> {
  const maxAttempts = Math.ceil(timeout / interval);
  let lastError: Error | null = null;
  let lastStatus: number | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await page.request.get(`/api/groups/${groupId}`);
      lastStatus = response.status();
      if (response.status() === 200) {
        return;
      }
    } catch (error) {
      lastError = error as Error;
    }

    if (attempt < maxAttempts - 1) {
      await delay(interval);
    }
  }

  const statusInfo = lastStatus !== null ? ` (last status: ${lastStatus})` : "";
  const errorInfo = lastError ? ` Last error: ${lastError.message}` : "";
  throw new Error(
    `Timed out waiting for group ${groupId} to become available after ${maxAttempts} attempts.${statusInfo}${errorInfo}`
  );
}
