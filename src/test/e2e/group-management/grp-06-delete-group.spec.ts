import { test, expect } from "@/test/e2e/fixtures/test";
import { GroupsPage, GroupDetailsPage } from "@/test/e2e/pages";
import { fetchBaselineQueriesWithIds } from "@/test/e2e/utils/supabase-admin";
import { createGroupViaApi } from "@/test/e2e/helpers/groups";

test.describe("Group Management - GRP-06 Delete Group", () => {
  test("deletes an existing group and removes access", async ({ page }) => {
    const baselineQueries = await fetchBaselineQueriesWithIds();
    expect(baselineQueries.length).toBeGreaterThan(0);

    const selectedQueries = baselineQueries.slice(0, 2);
    const groupName = `QA E2E Delete ${Date.now()}`;
    const group = await createGroupViaApi(page, {
      name: groupName,
      queryIds: selectedQueries.map((query) => query.id),
    });

    const groupsPage = new GroupsPage(page);
    await groupsPage.goto();
    await groupsPage.search(groupName);
    await groupsPage.waitForTableLoaded();
    await groupsPage.expectGroupVisible(groupName);
    await groupsPage.openGroup(groupName);

    const detailsPage = new GroupDetailsPage(page);
    await detailsPage.expectLoaded(groupName);
    await detailsPage.deleteGroup();

    await page.waitForURL("**/groups");
    await groupsPage.waitForTableLoaded();

    await groupsPage.search(groupName);
    await groupsPage.expectGroupAbsent(groupName);

    const response = await page.request.get(`/api/groups/${group.id}`);
    expect(response.status()).toBe(404);
  });
});
