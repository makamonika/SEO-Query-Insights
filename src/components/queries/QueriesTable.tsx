import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { OpportunityBadge } from "./OpportunityBadge";
import { formatNumber, formatCTR, getSortIcon, getNextSortState } from "@/lib/table-utils.tsx";
import type { QueryDto, QuerySortField, SortOrder } from "@/types";

type QueriesTableProps = {
  rows: QueryDto[];
  isLoading: boolean;
  selected: Set<string>;
  onToggleRow: (id: string) => void;
  sortBy: QuerySortField;
  order: SortOrder;
  onSortChange: (params: { sortBy: QuerySortField; order: SortOrder }) => void;
};

export const QueriesTable = memo(function QueriesTable({
  rows,
  isLoading,
  selected,
  onToggleRow,
  sortBy,
  order,
  onSortChange,
}: QueriesTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  const handleColumnHeaderClick = (field: QuerySortField) => {
    const defaultOrder = field === "avgPosition" ? "asc" : "desc";
    const nextState = getNextSortState(sortBy, order, field, defaultOrder);
    onSortChange(nextState);
  };

  if (isLoading) {
    return <TableEmptyState message="Loading queries..." />;
  }

  if (rows.length === 0) {
    return <TableEmptyState message="No queries found" />;
  }

  return (
    <div className="mt-6 rounded-md border">
      {/* Table header */}
      <div className="grid grid-cols-[40px_2fr_2fr_1fr_1fr_1fr_1fr_120px] gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
        <div className="flex items-center justify-center" role="columnheader">
          {/* Selection column header */}
        </div>
        <button
          type="button"
          onClick={() => handleColumnHeaderClick("impressions")}
          className="flex items-center text-left hover:text-foreground"
          role="columnheader"
          aria-sort={sortBy === "impressions" ? (order === "asc" ? "ascending" : "descending") : "none"}
        >
          Query Text
          {sortBy === "impressions" && getSortIcon(sortBy === "impressions", order)}
        </button>
        <div role="columnheader">URL</div>
        <button
          type="button"
          onClick={() => handleColumnHeaderClick("impressions")}
          className="flex items-center text-right hover:text-foreground"
          role="columnheader"
          aria-sort={sortBy === "impressions" ? (order === "asc" ? "ascending" : "descending") : "none"}
        >
          Impressions
          {getSortIcon(sortBy === "impressions", order)}
        </button>
        <button
          type="button"
          onClick={() => handleColumnHeaderClick("clicks")}
          className="flex items-center text-right hover:text-foreground"
          role="columnheader"
          aria-sort={sortBy === "clicks" ? (order === "asc" ? "ascending" : "descending") : "none"}
        >
          Clicks
          {getSortIcon(sortBy === "clicks", order)}
        </button>
        <button
          type="button"
          onClick={() => handleColumnHeaderClick("ctr")}
          className="flex items-center text-right hover:text-foreground"
          role="columnheader"
          aria-sort={sortBy === "ctr" ? (order === "asc" ? "ascending" : "descending") : "none"}
        >
          CTR
          {getSortIcon(sortBy === "ctr", order)}
        </button>
        <button
          type="button"
          onClick={() => handleColumnHeaderClick("avgPosition")}
          className="flex items-center text-right hover:text-foreground"
          role="columnheader"
          aria-sort={sortBy === "avgPosition" ? (order === "asc" ? "ascending" : "descending") : "none"}
        >
          Avg Position
          {getSortIcon(sortBy === "avgPosition", order)}
        </button>
        <div role="columnheader">Opportunity</div>
      </div>

      {/* Virtualized table body */}
      <div
        ref={parentRef}
        id="queries-grid"
        className="h-[600px] overflow-auto"
        role="grid"
        aria-label="Query performance data"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            const isSelected = selected.has(row.id);

            return (
              <div
                key={row.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className={`absolute top-0 left-0 w-full grid grid-cols-[40px_2fr_2fr_1fr_1fr_1fr_1fr_120px] gap-4 px-4 py-3 border-b text-sm hover:bg-muted/50 transition-all duration-200 ease-out ${
                  row.isOpportunity ? "bg-amber-50/50" : ""
                } ${isSelected ? "bg-blue-50/50" : ""}`}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  willChange: "transform",
                }}
                role="row"
                aria-selected={isSelected}
              >
                <div className="flex items-center justify-center" role="gridcell">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleRow(row.id)}
                    aria-label={`Select query: ${row.queryText}`}
                  />
                </div>
                <div className="truncate" role="gridcell" title={row.queryText}>
                  {row.queryText}
                </div>
                <div className="truncate text-muted-foreground" role="gridcell" title={row.url}>
                  {row.url}
                </div>
                <div className="text-right tabular-nums" role="gridcell">
                  {formatNumber(row.impressions)}
                </div>
                <div className="text-right tabular-nums" role="gridcell">
                  {formatNumber(row.clicks)}
                </div>
                <div className="text-right tabular-nums" role="gridcell">
                  {formatCTR(row.ctr)}
                </div>
                <div className="text-right tabular-nums" role="gridcell">
                  {formatNumber(row.avgPosition, 1)}
                </div>
                <div role="gridcell">
                  <OpportunityBadge isOpportunity={row.isOpportunity} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
