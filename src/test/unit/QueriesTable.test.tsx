import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueriesTable } from "@/components/queries/QueriesTable";
import type { QueryDto, SortOrder } from "@/types";

// Mock dependencies
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: vi.fn(() => ({
    getTotalSize: () => 600,
    getVirtualItems: () => [],
    measureElement: vi.fn(),
  })),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    "aria-label": ariaLabel,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    "aria-label"?: string;
  }) => (
    <input type="checkbox" checked={checked} onChange={onCheckedChange} aria-label={ariaLabel} data-testid="checkbox" />
  ),
}));

vi.mock("@/components/ui/table-empty-state", () => ({
  TableEmptyState: ({ message }: { message: string }) => <div data-testid="empty-state">{message}</div>,
}));

vi.mock("@/components/queries/OpportunityBadge", () => ({
  OpportunityBadge: ({ isOpportunity }: { isOpportunity: boolean }) =>
    isOpportunity ? <span data-testid="opportunity-badge">Opportunity</span> : null,
}));

vi.mock("@/lib/table-utils.tsx", () => ({
  formatNumber: (num: number, decimals = 0) => num.toFixed(decimals),
  formatCTR: (ctr: number) => `${(ctr * 100).toFixed(2)}%`,
  getSortIcon: (isActive: boolean, order?: SortOrder) => {
    if (!isActive) return <span data-testid="sort-icon-neutral">↕</span>;
    return order === "asc" ? <span data-testid="sort-icon-asc">↑</span> : <span data-testid="sort-icon-desc">↓</span>;
  },
  getNextSortState: (currentField: string, currentOrder: SortOrder, clickedField: string, defaultOrder: SortOrder) => {
    if (currentField === clickedField) {
      return { sortBy: clickedField, order: currentOrder === "asc" ? "desc" : "asc" };
    }
    return { sortBy: clickedField, order: defaultOrder };
  },
}));

// Test data factory
function createMockQuery(overrides: Partial<QueryDto> = {}): QueryDto {
  return {
    id: "query-1",
    queryText: "test query",
    url: "https://example.com/page",
    impressions: 1000,
    clicks: 50,
    ctr: 0.05,
    avgPosition: 5.5,
    isOpportunity: false,
    date: "2024-01-01",
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("QueriesTable", () => {
  const mockOnSortChange = vi.fn();
  const mockOnToggleRow = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading and Empty States", () => {
    it("should display loading state when isLoading is true", () => {
      render(
        <QueriesTable rows={[]} isLoading={true} sortBy="impressions" order="desc" onSortChange={mockOnSortChange} />
      );

      expect(screen.getByTestId("empty-state")).toHaveTextContent("Loading queries...");
    });

    it("should display default empty message when no rows and not loading", () => {
      render(
        <QueriesTable rows={[]} isLoading={false} sortBy="impressions" order="desc" onSortChange={mockOnSortChange} />
      );

      expect(screen.getByTestId("empty-state")).toHaveTextContent("No queries found");
    });

    it("should display custom empty message when provided", () => {
      render(
        <QueriesTable
          rows={[]}
          isLoading={false}
          emptyMessage="Custom empty message"
          sortBy="impressions"
          order="desc"
          onSortChange={mockOnSortChange}
        />
      );

      expect(screen.getByTestId("empty-state")).toHaveTextContent("Custom empty message");
    });
  });

  describe("Data Rendering", () => {
    it("should render table with query data", () => {
      const queries = [
        createMockQuery({
          id: "1",
          queryText: "seo optimization",
          url: "https://example.com/seo",
          impressions: 5000,
          clicks: 250,
          ctr: 0.05,
          avgPosition: 3.2,
        }),
      ];

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          sortBy="impressions"
          order="desc"
          onSortChange={mockOnSortChange}
        />
      );

      expect(screen.getByText("seo optimization")).toBeInTheDocument();
      expect(screen.getByText("https://example.com/seo")).toBeInTheDocument();
      expect(screen.getByText("5000")).toBeInTheDocument();
      expect(screen.getByText("250")).toBeInTheDocument();
      expect(screen.getByText("5.00%")).toBeInTheDocument();
      expect(screen.getByText("3.2")).toBeInTheDocument();
    });

    it("should render multiple rows correctly", () => {
      const queries = [
        createMockQuery({ id: "1", queryText: "query one" }),
        createMockQuery({ id: "2", queryText: "query two" }),
        createMockQuery({ id: "3", queryText: "query three" }),
      ];

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          sortBy="impressions"
          order="desc"
          onSortChange={mockOnSortChange}
        />
      );

      expect(screen.getByText("query one")).toBeInTheDocument();
      expect(screen.getByText("query two")).toBeInTheDocument();
      expect(screen.getByText("query three")).toBeInTheDocument();
    });
  });

  describe("Opportunity Badge", () => {
    it("should display opportunity badge for opportunity queries", () => {
      const queries = [createMockQuery({ isOpportunity: true })];

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          sortBy="impressions"
          order="desc"
          onSortChange={mockOnSortChange}
        />
      );

      expect(screen.getByTestId("opportunity-badge")).toBeInTheDocument();
    });

    it("should not display opportunity badge for non-opportunity queries", () => {
      const queries = [createMockQuery({ isOpportunity: false })];

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          sortBy="impressions"
          order="desc"
          onSortChange={mockOnSortChange}
        />
      );

      expect(screen.queryByTestId("opportunity-badge")).not.toBeInTheDocument();
    });

    it("should apply special styling to opportunity rows", () => {
      const queries = [createMockQuery({ id: "1", isOpportunity: true })];

      const { container } = render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          sortBy="impressions"
          order="desc"
          onSortChange={mockOnSortChange}
        />
      );

      const row = container.querySelector('[role="row"]');
      expect(row).toHaveClass("bg-amber-50/50");
    });
  });

  describe("Selection Feature", () => {
    it("should render checkboxes when selection props are provided", () => {
      const queries = [createMockQuery({ id: "1" }), createMockQuery({ id: "2" })];
      const selected = new Set<string>();

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          selected={selected}
          sortBy="impressions"
          order="desc"
          onToggleRow={mockOnToggleRow}
          onSortChange={mockOnSortChange}
        />
      );

      const checkboxes = screen.getAllByTestId("checkbox");
      expect(checkboxes).toHaveLength(2);
    });

    it("should not render checkboxes when selection props are not provided", () => {
      const queries = [createMockQuery({ id: "1" })];

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          sortBy="impressions"
          order="desc"
          onSortChange={mockOnSortChange}
        />
      );

      expect(screen.queryByTestId("checkbox")).not.toBeInTheDocument();
    });

    it("should mark selected rows as checked", () => {
      const queries = [createMockQuery({ id: "1" }), createMockQuery({ id: "2" })];
      const selected = new Set(["1"]);

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          selected={selected}
          sortBy="impressions"
          order="desc"
          onToggleRow={mockOnToggleRow}
          onSortChange={mockOnSortChange}
        />
      );

      const checkboxes = screen.getAllByTestId("checkbox");
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
    });

    it("should call onToggleRow when checkbox is clicked", async () => {
      const user = userEvent.setup();
      const queries = [createMockQuery({ id: "query-1", queryText: "test query" })];
      const selected = new Set<string>();

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          selected={selected}
          sortBy="impressions"
          order="desc"
          onToggleRow={mockOnToggleRow}
          onSortChange={mockOnSortChange}
        />
      );

      const checkbox = screen.getByTestId("checkbox");
      await user.click(checkbox);

      expect(mockOnToggleRow).toHaveBeenCalledWith("query-1");
    });

    it("should have proper aria-label for checkboxes", () => {
      const queries = [createMockQuery({ id: "1", queryText: "seo optimization" })];
      const selected = new Set<string>();

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          selected={selected}
          sortBy="impressions"
          order="desc"
          onToggleRow={mockOnToggleRow}
          onSortChange={mockOnSortChange}
        />
      );

      const checkbox = screen.getByTestId("checkbox");
      expect(checkbox).toHaveAttribute("aria-label", "Select query: seo optimization");
    });
  });

  describe("Sorting", () => {
    it("should call onSortChange when clicking impressions header", async () => {
      const user = userEvent.setup();
      const queries = [createMockQuery()];

      render(
        <QueriesTable rows={queries} isLoading={false} sortBy="clicks" order="desc" onSortChange={mockOnSortChange} />
      );

      const impressionsHeader = screen
        .getAllByRole("columnheader")
        .find((el) => el.textContent?.includes("Impressions"));
      expect(impressionsHeader).toBeDefined();
      if (impressionsHeader) await user.click(impressionsHeader);

      expect(mockOnSortChange).toHaveBeenCalledWith({
        sortBy: "impressions",
        order: "desc",
      });
    });

    it("should call onSortChange when clicking clicks header", async () => {
      const user = userEvent.setup();
      const queries = [createMockQuery()];

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          sortBy="impressions"
          order="desc"
          onSortChange={mockOnSortChange}
        />
      );

      const clicksHeader = screen.getAllByRole("columnheader").find((el) => el.textContent?.includes("Clicks"));
      expect(clicksHeader).toBeDefined();
      if (clicksHeader) await user.click(clicksHeader);

      expect(mockOnSortChange).toHaveBeenCalledWith({
        sortBy: "clicks",
        order: "desc",
      });
    });

    it("should call onSortChange when clicking CTR header", async () => {
      const user = userEvent.setup();
      const queries = [createMockQuery()];

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          sortBy="impressions"
          order="desc"
          onSortChange={mockOnSortChange}
        />
      );

      const ctrHeader = screen.getAllByRole("columnheader").find((el) => el.textContent?.includes("CTR"));
      expect(ctrHeader).toBeDefined();
      if (ctrHeader) await user.click(ctrHeader);

      expect(mockOnSortChange).toHaveBeenCalledWith({
        sortBy: "ctr",
        order: "desc",
      });
    });

    it("should call onSortChange with asc as default for avgPosition", async () => {
      const user = userEvent.setup();
      const queries = [createMockQuery()];

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          sortBy="impressions"
          order="desc"
          onSortChange={mockOnSortChange}
        />
      );

      const positionHeader = screen.getAllByRole("columnheader").find((el) => el.textContent?.includes("Avg Position"));
      expect(positionHeader).toBeDefined();
      if (positionHeader) await user.click(positionHeader);

      expect(mockOnSortChange).toHaveBeenCalledWith({
        sortBy: "avgPosition",
        order: "asc",
      });
    });

    it("should toggle sort order when clicking the same column", async () => {
      const user = userEvent.setup();
      const queries = [createMockQuery()];

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          sortBy="impressions"
          order="desc"
          onSortChange={mockOnSortChange}
        />
      );

      const impressionsHeader = screen
        .getAllByRole("columnheader")
        .find((el) => el.textContent?.includes("Impressions"));
      expect(impressionsHeader).toBeDefined();
      if (impressionsHeader) await user.click(impressionsHeader);

      expect(mockOnSortChange).toHaveBeenCalledWith({
        sortBy: "impressions",
        order: "asc",
      });
    });

    it("should set proper aria-sort attribute on sorted column", () => {
      const queries = [createMockQuery()];

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          sortBy="impressions"
          order="asc"
          onSortChange={mockOnSortChange}
        />
      );

      const impressionsHeader = screen
        .getAllByRole("columnheader")
        .find((el) => el.textContent?.includes("Impressions"));
      expect(impressionsHeader).toHaveAttribute("aria-sort", "ascending");
    });

    it("should set aria-sort to none on non-sorted columns", () => {
      const queries = [createMockQuery()];

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          sortBy="impressions"
          order="desc"
          onSortChange={mockOnSortChange}
        />
      );

      const clicksHeader = screen.getAllByRole("columnheader").find((el) => el.textContent?.includes("Clicks"));
      expect(clicksHeader).toHaveAttribute("aria-sort", "none");
    });
  });

  describe("Custom Actions Column", () => {
    it("should render actions column when renderActions is provided", () => {
      const queries = [createMockQuery({ id: "1" })];
      const renderActions = (row: QueryDto) => <button>Action for {row.id}</button>;

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          sortBy="impressions"
          order="desc"
          onSortChange={mockOnSortChange}
          renderActions={renderActions}
        />
      );

      expect(screen.getByText("Actions")).toBeInTheDocument();
      expect(screen.getByText("Action for 1")).toBeInTheDocument();
    });

    it("should not render actions column when renderActions is not provided", () => {
      const queries = [createMockQuery()];

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          sortBy="impressions"
          order="desc"
          onSortChange={mockOnSortChange}
        />
      );

      expect(screen.queryByText("Actions")).not.toBeInTheDocument();
    });

    it("should call custom action for each row", () => {
      const queries = [createMockQuery({ id: "1" }), createMockQuery({ id: "2" })];
      const renderActions = vi.fn((row: QueryDto) => <button>Action {row.id}</button>);

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          sortBy="impressions"
          order="desc"
          onSortChange={mockOnSortChange}
          renderActions={renderActions}
        />
      );

      expect(renderActions).toHaveBeenCalledTimes(2);
      expect(renderActions).toHaveBeenCalledWith(queries[0]);
      expect(renderActions).toHaveBeenCalledWith(queries[1]);
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA roles for table structure", () => {
      const queries = [createMockQuery()];

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          sortBy="impressions"
          order="desc"
          onSortChange={mockOnSortChange}
        />
      );

      expect(screen.getByRole("grid")).toBeInTheDocument();
      expect(screen.getByRole("row")).toBeInTheDocument();
      expect(screen.getAllByRole("columnheader").length).toBeGreaterThan(0);
      expect(screen.getAllByRole("gridcell").length).toBeGreaterThan(0);
    });

    it("should have aria-label on grid element", () => {
      const queries = [createMockQuery()];

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          sortBy="impressions"
          order="desc"
          onSortChange={mockOnSortChange}
        />
      );

      const grid = screen.getByRole("grid");
      expect(grid).toHaveAttribute("aria-label", "Query performance data");
    });

    it("should set aria-selected on selected rows", () => {
      const queries = [createMockQuery({ id: "1" }), createMockQuery({ id: "2" })];
      const selected = new Set(["1"]);

      const { container } = render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          selected={selected}
          sortBy="impressions"
          order="desc"
          onToggleRow={mockOnToggleRow}
          onSortChange={mockOnSortChange}
        />
      );

      const rows = container.querySelectorAll('[role="row"]');
      expect(rows[0]).toHaveAttribute("aria-selected", "true");
      expect(rows[1]).toHaveAttribute("aria-selected", "false");
    });
  });

  describe("Combined Features", () => {
    it("should handle selection, actions, and opportunity together", () => {
      const queries = [createMockQuery({ id: "1", isOpportunity: true })];
      const selected = new Set(["1"]);
      const renderActions = (row: QueryDto) => <button>Edit {row.id}</button>;

      render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          selected={selected}
          sortBy="impressions"
          order="desc"
          onToggleRow={mockOnToggleRow}
          onSortChange={mockOnSortChange}
          renderActions={renderActions}
        />
      );

      expect(screen.getByTestId("checkbox")).toBeChecked();
      expect(screen.getByTestId("opportunity-badge")).toBeInTheDocument();
      expect(screen.getByText("Edit 1")).toBeInTheDocument();
    });

    it("should maintain row styling with multiple states", () => {
      const queries = [createMockQuery({ id: "1", isOpportunity: true })];
      const selected = new Set(["1"]);

      const { container } = render(
        <QueriesTable
          rows={queries}
          isLoading={false}
          selected={selected}
          sortBy="impressions"
          order="desc"
          onToggleRow={mockOnToggleRow}
          onSortChange={mockOnSortChange}
        />
      );

      const row = container.querySelector('[role="row"]');
      // Both opportunity and selection styling should be present
      expect(row).toHaveClass("bg-amber-50/50");
      expect(row).toHaveClass("bg-blue-50/50");
    });
  });
});
