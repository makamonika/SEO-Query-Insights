import { SearchInput } from "./SearchInput";
import { OpportunityToggle } from "./OpportunityToggle";
import { GroupWithAIButton } from "./GroupWithAIButton";
import { NewGroupButton } from "./NewGroupButton";

interface QueriesToolbarProps {
  // Search & Filter
  search: string;
  isOpportunity: boolean;
  onSearchChange: (value: string) => void;
  onOpportunityToggle: (value: boolean) => void;

  // Selection
  selectedCount: number;

  // Actions
  onOpenNewGroup: () => void;
  onGenerateAI: () => void;
  isGeneratingAI: boolean;
}

/**
 * Toolbar for queries with search, filters, and actions
 */
export function QueriesToolbar({
  search,
  isOpportunity,
  onSearchChange,
  onOpportunityToggle,
  selectedCount,
  onOpenNewGroup,
  onGenerateAI,
  isGeneratingAI,
}: QueriesToolbarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: Search and filters */}
      <div className="flex flex-wrap items-center gap-4">
        <SearchInput value={search} onChange={onSearchChange} />
        <OpportunityToggle checked={isOpportunity} onChange={onOpportunityToggle} />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {selectedCount > 0 && <span className="text-sm text-muted-foreground mr-2">{selectedCount} selected</span>}
        <GroupWithAIButton onGenerate={onGenerateAI} isGenerating={isGeneratingAI} />
        <NewGroupButton onClick={onOpenNewGroup} />
      </div>
    </div>
  );
}
