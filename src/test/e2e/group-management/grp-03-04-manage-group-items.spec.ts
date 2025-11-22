import { test, expect } from "@/test/e2e/fixtures/test";
import { AddQueriesModal, GroupDetailsPage } from "@/test/e2e/pages";
import { fetchBaselineQueriesWithIds } from "@/test/e2e/utils/supabase-admin";
import { computeGroupMetrics } from "@/test/e2e/helpers/metrics";
import { createGroupViaApi } from "@/test/e2e/helpers/groups";

test.describe.serial("Group Management - Manage Group Items", () => {
  test("GRP-03 Add Queries to Existing Group", async ({ page }) => {
    const baselineQueries = await fetchBaselineQueriesWithIds();
    expect(baselineQueries.length).toBeGreaterThanOrEqual(3);
    const [queryA, queryB, queryC] = baselineQueries;

    const initialQueries = [queryA, queryB];
    const metricsBefore = computeGroupMetrics(initialQueries);
    const metricsAfter = computeGroupMetrics([queryA, queryB, queryC]);

    const groupName = `QA E2E Add ${Date.now()}`;
    const group = await createGroupViaApi(page, {
      name: groupName,
      queryIds: initialQueries.map((query) => query.id),
    });

    await page.goto(`/groups/${group.id}`);
    const detailsPage = new GroupDetailsPage(page);
    await detailsPage.expectLoaded(groupName);
    await detailsPage.expectQueryCount(metricsBefore.queryCount);
    await detailsPage.expectMetricsSummary(metricsBefore);

    await detailsPage.openAddQueriesModal();
    const addModal = new AddQueriesModal(page);
    await addModal.expectOpen();
    await addModal.selectQuery(queryC.query_text);
    await addModal.expectSelectionCount(1);

    const [addResponse] = await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes(`/api/groups/${group.id}/items`) && response.request().method() === "POST"
      ),
      addModal.submit(),
    ]);

    expect(addResponse.ok()).toBe(true);
    const addResult = await addResponse.json();
    expect(addResult.addedCount).toBe(1);

    await expect(addModal.modal).not.toBeVisible();

    //await expect(page.getByRole("status")).toContainText("Added 1 query to group");
    await detailsPage.expectQueryPresent(queryC.query_text);
    await detailsPage.expectQueryCount(metricsAfter.queryCount);
    await detailsPage.expectMetricsSummary(metricsAfter);

    // The UI checks above ensure the refetch completed and UI shows correct data.
    // The frontend successfully fetched updated metrics from the API, so no additional polling is needed.
  });

  test("GRP-04 Remove Query From Group", async ({ page }) => {
    const baselineQueries = await fetchBaselineQueriesWithIds();
    expect(baselineQueries.length).toBeGreaterThanOrEqual(3);
    const [queryA, queryB, queryC] = baselineQueries;
    const allQueries = [queryA, queryB, queryC];

    const metricsBefore = computeGroupMetrics(allQueries);
    const metricsAfter = computeGroupMetrics([queryA, queryB]);

    const groupName = `QA E2E Remove ${Date.now()}`;
    const group = await createGroupViaApi(page, {
      name: groupName,
      queryIds: allQueries.map((query) => query.id),
    });

    await page.goto(`/groups/${group.id}`);
    const detailsPage = new GroupDetailsPage(page);
    await detailsPage.expectLoaded(groupName);
    await detailsPage.expectQueryCount(metricsBefore.queryCount);
    await detailsPage.expectMetricsSummary(metricsBefore);
    await detailsPage.expectQueryPresent(queryC.query_text);

    const [removeResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes(`/api/groups/${group.id}/items/${queryC.id}`) &&
          response.request().method() === "DELETE"
      ),
      detailsPage.removeQuery(queryC.query_text),
    ]);

    expect(removeResponse.ok()).toBe(true);
    // Verify toast notification appears with success message
    await expect(page.getByText("Removed from group")).toBeVisible();
    await detailsPage.expectQueryAbsent(queryC.query_text);
    await detailsPage.expectQueryCount(metricsAfter.queryCount);
    await detailsPage.expectMetricsSummary(metricsAfter);
  });
});
