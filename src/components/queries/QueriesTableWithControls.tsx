import { QueriesTable } from "./QueriesTable";
import { SearchInput } from "./SearchInput";
import { OpportunityToggle } from "./OpportunityToggle";
import { GroupWithAIButton } from "./GroupWithAIButton";
import { NewGroupButton } from "./NewGroupButton";
import type { QueryDto, QuerySortField, SortOrder } from "@/types";

type QueriesTableWithControlsProps = {
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
};

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
}: QueriesTableWithControlsProps) {
  // Show controls only when there are queries or actively searching/filtering
  const showControls = rows.length > 0 || search || isOpportunity;

  return (
    <div className="space-y-4">
      {/* Controls bar - only show when there's data or active filters */}
      {showControls && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Search and filters */}
          <div className="flex flex-wrap items-center gap-4">
            <SearchInput value={search} onChange={onSearchChange} />
            <OpportunityToggle checked={isOpportunity} onChange={onOpportunityToggle} />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {selected.size > 0 && <span className="text-sm text-muted-foreground mr-2">{selected.size} selected</span>}
            <GroupWithAIButton onGenerate={onGenerateAI} isGenerating={isGeneratingAI} />
            <NewGroupButton onClick={onOpenNewGroup} />
          </div>
        </div>
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
      />
    </div>
  );
}
