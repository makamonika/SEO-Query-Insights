import { QueriesTable } from "./QueriesTable";
import { QueriesToolbar } from "./QueriesToolbar";
import type { QueryDto, QuerySortField, SortOrder } from "@/types";

interface QueriesTableWithControlsProps {
  // Data
  rows: QueryDto[];
  isLoading: boolean;

  // Search & Filter
  search: string;
  isOpportunity?: boolean;
  onSearchChange: (value: string) => void;
  onOpportunityToggle: (value: boolean) => void;

  // Sorting (handled by table headers)
  sortBy: QuerySortField;
  order: SortOrder;
  onSortChange: (params: { sortBy: QuerySortField; order: SortOrder }) => void;

  // Selection
  selected: Set<string>;
  onToggleRow: (id: string) => void;

  // Actions
  onOpenNewGroup: () => void;
  onGenerateAI: () => void;
  isGeneratingAI: boolean;

  // Table display options
  height?: string;
  maxHeight?: string;
}

/**
 * Data table with integrated controls
 * Combines search, filters, sorting, and table in one cohesive component
 */
export function QueriesTableWithControls({
  rows,
  isLoading,
  search,
  isOpportunity = false,
  onSearchChange,
  onOpportunityToggle,
  sortBy,
  order,
  onSortChange,
  selected,
  onToggleRow,
  onOpenNewGroup,
  onGenerateAI,
  isGeneratingAI,
  height,
  maxHeight,
}: QueriesTableWithControlsProps) {
  // Show controls only when there are queries or actively searching/filtering
  const showControls = rows.length > 0 || search || isOpportunity;

  return (
    <div className="space-y-4">
      {/* Controls bar - only show when there's data or active filters */}
      {showControls && (
        <QueriesToolbar
          search={search}
          isOpportunity={isOpportunity}
          onSearchChange={onSearchChange}
          onOpportunityToggle={onOpportunityToggle}
          selectedCount={selected.size}
          onOpenNewGroup={onOpenNewGroup}
          onGenerateAI={onGenerateAI}
          isGeneratingAI={isGeneratingAI}
        />
      )}

      {/* Table */}
      <QueriesTable
        rows={rows}
        isLoading={isLoading}
        selected={selected}
        onToggleRow={onToggleRow}
        sortBy={sortBy}
        order={order}
        onSortChange={onSortChange}
        height={height}
        maxHeight={maxHeight}
      />
    </div>
  );
}
