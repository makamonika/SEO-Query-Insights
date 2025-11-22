import { test, expect } from "@/test/e2e/fixtures/test";
import { CreateGroupModal, GroupsPage, QueriesPage } from "@/test/e2e/pages";
import { getBaselineQueriesSeed } from "@/test/e2e/utils/supabase-admin";
import { computeGroupMetrics } from "@/test/e2e/helpers/metrics";
import { waitForGroupById } from "@/test/e2e/helpers/groups";

test.describe("Group Management - GRP-01 Create Group", () => {
  test("creates a group from selected queries", async ({ page }) => {
    const baselineQueries = getBaselineQueriesSeed();
    const selectedQueries = baselineQueries.slice(0, 2);
    const groupName = `QA E2E Group ${Date.now()}`;

    await test.step("Select baseline queries on Queries page", async () => {
      const queriesPage = new QueriesPage(page);
      await queriesPage.goto();

      await queriesPage.selectQueryByText(selectedQueries[0].query_text);
      await queriesPage.selectQueryByText(selectedQueries[1].query_text);
      await queriesPage.expectSelectionCount(2);

      await queriesPage.openCreateGroupModal();
    });

    const createdGroup = await test.step("Create group through modal", async () => {
      const createGroupModal = new CreateGroupModal(page);
      await createGroupModal.expectOpen();
      await createGroupModal.expectSelectedQueriesContain(selectedQueries[0].query_text);
      await createGroupModal.expectSelectedQueriesContain(selectedQueries[1].query_text);
      await createGroupModal.fillName(groupName);

      const [createResponse] = await Promise.all([
        page.waitForResponse(
          (response) => response.url().endsWith("/api/groups") && response.request().method() === "POST"
        ),
        createGroupModal.submit(),
      ]);

      expect(
        createResponse.status(),
        `Expected create group request to return 201 but got ${createResponse.status()}`
      ).toBe(201);

      const body = (await createResponse.json()) as {
        id: string;
        name: string;
        queryCount: number;
        metricsImpressions: number;
        metricsClicks: number;
        metricsCtr: number;
        metricsAvgPosition: number;
      };

      await expect(createGroupModal.modal).toBeHidden();
      return body;
    });

    await test.step("Verify success feedback is announced", async () => {
      // Verify toast notification appears with success message
      await expect(
        page.getByText(`Group "${groupName}" created with ${selectedQueries.length} queries`)
      ).toBeVisible();
    });

    const expectedMetrics = computeGroupMetrics(selectedQueries);

    await test.step("Assert group appears via API with correct metrics", async () => {
      await waitForGroupById(page, createdGroup.id);
      const response = await page.request.get(`/api/groups/${createdGroup.id}`);
      expect(response.status()).toBe(200);
      const group = (await response.json()) as {
        queryCount: number;
        metricsImpressions: number;
        metricsClicks: number;
        metricsCtr: number;
        metricsAvgPosition: number;
      };
      expect(group.queryCount).toBe(selectedQueries.length);
      expect(group.metricsImpressions).toBe(expectedMetrics.impressions);
      expect(group.metricsClicks).toBe(expectedMetrics.clicks);
      expect(group.metricsCtr).toBe(expectedMetrics.ctr);
      expect(group.metricsAvgPosition).toBe(expectedMetrics.avgPosition);
    });

    await test.step("Confirm group is visible in Groups list", async () => {
      const groupsPage = new GroupsPage(page);
      await groupsPage.goto();
      await groupsPage.search(groupName);
      await groupsPage.waitForTableLoaded();
      await groupsPage.expectGroupVisible(groupName);
    });
  });
});
