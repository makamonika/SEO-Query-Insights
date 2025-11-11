import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, memo, type ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { OpportunityBadge } from "./OpportunityBadge";
import { formatNumber, formatCTR, getSortIcon, getNextSortState } from "@/lib/table-utils.tsx";
import type { QueryDto, QuerySortField, SortOrder } from "@/types";

interface QueriesTableProps {
  rows: QueryDto[];
  isLoading: boolean;
  emptyMessage?: string;
  selected?: Set<string>;
  sortBy: QuerySortField;
  order: SortOrder;
  onToggleRow?: (id: string) => void;
  onSortChange: (params: { sortBy: QuerySortField; order: SortOrder }) => void;
  // Optional custom action column
  renderActions?: (row: QueryDto) => ReactNode;
  // Optional custom height (defaults to 600px, or "auto" for content-based height)
  height?: string;
  // Optional max height when using auto height
  maxHeight?: string;
}

export const QueriesTable = memo(function QueriesTable({
  rows,
  isLoading,
  emptyMessage = "No queries found",
  selected,
  sortBy,
  order,
  onToggleRow,
  onSortChange,
  renderActions,
  height = "auto",
  maxHeight,
}: QueriesTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Determine if selection is enabled
  const hasSelection = selected !== undefined && onToggleRow !== undefined;
  // Determine if actions column is present
  const hasActions = renderActions !== undefined;
  // Check if using auto height mode
  const isAutoHeight = height === "auto";

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
    return <TableEmptyState message={emptyMessage} />;
  }

  // Build grid columns template based on enabled features
  const gridCols = [hasSelection && "40px", "2fr", "2fr", "1fr", "1fr", "1fr", "1fr", "120px", hasActions && "80px"]
    .filter(Boolean)
    .join(" ");
  const gridColsClass = `grid gap-4`;

  return (
    <div className="mt-6 rounded-md border">
      {/* Table header */}
      <div
        className={`${gridColsClass} border-b bg-muted/50 px-4 py-3 text-sm font-medium`}
        style={{ gridTemplateColumns: gridCols }}
      >
        {hasSelection && <div className="flex items-center justify-center" role="columnheader"></div>}
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
        {hasActions && (
          <div className="text-center" role="columnheader">
            Actions
          </div>
        )}
      </div>

      {/* Virtualized table body */}
      <div
        ref={parentRef}
        id="queries-grid"
        className="overflow-auto"
        style={isAutoHeight ? { maxHeight: maxHeight || "none", height: "auto" } : { height }}
        role="grid"
        aria-label="Query performance data"
      >
        <div
          style={{
            height: isAutoHeight ? "auto" : `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: isAutoHeight ? "static" : "relative",
          }}
        >
          {(isAutoHeight ? rows : virtualizer.getVirtualItems().map((v) => rows[v.index])).map((row, index) => {
            const isSelected = (hasSelection && selected?.has(row.id)) ?? false;
            const virtualRow = isAutoHeight ? null : virtualizer.getVirtualItems()[index];

            return (
              <div
                key={row.id}
                data-index={isAutoHeight ? index : (virtualRow?.index ?? index)}
                ref={isAutoHeight ? undefined : virtualizer.measureElement}
                className={`${isAutoHeight ? "" : "absolute top-0 left-0"} w-full ${gridColsClass} px-4 py-3 border-b text-sm hover:bg-muted/50 transition-all duration-200 ease-out ${
                  row.isOpportunity ? "bg-amber-50/50" : ""
                } ${isSelected ? "bg-blue-50/50" : ""}`}
                style={{
                  gridTemplateColumns: gridCols,
                  ...(isAutoHeight
                    ? {}
                    : {
                        transform: `translateY(${virtualRow?.start ?? 0}px)`,
                        willChange: "transform",
                      }),
                }}
                role="row"
                aria-label={row.queryText}
                aria-selected={isSelected}
              >
                {hasSelection && onToggleRow && (
                  <div className="flex items-center justify-center" role="gridcell">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleRow(row.id)}
                      aria-label={`Select query: ${row.queryText}`}
                    />
                  </div>
                )}
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
                {hasActions && (
                  <div className="flex justify-center" role="gridcell">
                    {renderActions(row)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
