import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Page Object for the `/groups` list view.
 * Handles inline rename/delete actions and navigation to group details.
 */
export class GroupsPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByRole("searchbox", { name: "Search queries" });
    this.table = page.locator("#groups-list");
  }

  async goto(): Promise<void> {
    await this.page.goto("/groups");
    await expect(this.page.getByRole("heading", { name: "Groups" })).toBeVisible();
  }

  async search(term: string): Promise<void> {
    // Wait for the API response after filling the search input
    // This accounts for the 300ms debounce + network request
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes("/api/groups") && response.status() === 200,
      { timeout: 5000 }
    );

    await this.searchInput.fill(term);

    // Wait for the debounced search to trigger and complete
    await responsePromise;
  }

  async waitForTableLoaded(): Promise<void> {
    await expect(this.table).toBeVisible();
  }

  async openGroup(name: string): Promise<void> {
    await this.page.getByRole("button", { name: `View ${name}` }).click();
  }

  async beginRename(name: string): Promise<void> {
    await this.page.getByRole("button", { name: `Edit ${name}` }).click();
  }

  async completeRename(newName: string): Promise<void> {
    const nameInput = this.page.getByLabel("Group name");
    await nameInput.fill(newName);
    await this.page.getByRole("button", { name: "Save group name" }).click();
  }

  async confirmDelete(name: string): Promise<void> {
    await this.page.getByRole("button", { name: `Delete ${name}` }).click();
    await this.page.getByRole("button", { name: "Confirm" }).click();
  }

  async expectGroupVisible(name: string): Promise<void> {
    await expect(this.table.getByRole("row", { name: new RegExp(name) })).toBeVisible();
  }

  async expectGroupAbsent(name: string): Promise<void> {
    await expect(this.table.getByRole("row", { name: new RegExp(name) })).toHaveCount(0);
  }
}
