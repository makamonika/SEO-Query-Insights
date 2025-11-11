import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QueriesTable } from "@/components/queries/QueriesTable";
import { SearchInput } from "@/components/queries/SearchInput";
import { OpportunityToggle } from "@/components/queries/OpportunityToggle";
import { useQueries } from "@/hooks/useQueries";
import { useSelection } from "@/hooks/useSelection";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { QuerySortField, SortOrder } from "@/types";

interface AddQueriesToGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (queryIds: string[]) => Promise<void>;
  isSubmitting: boolean;
  existingQueryIds: Set<string>;
  groupName: string;
}

/**
 * Modal for searching and adding queries to an existing group
 * Excludes queries that are already in the group
 * Reuses the QueriesTable component with selection for consistency
 */
export function AddQueriesToGroupModal({
  open,
  onOpenChange,
  onAdd,
  isSubmitting,
  existingQueryIds,
  groupName,
}: AddQueriesToGroupModalProps) {
  // Search and filter state
  const [search, setSearch] = useState("");
  const [isOpportunity, setIsOpportunity] = useState<boolean>();

  // Sorting state
  const [sortBy, setSortBy] = useState<QuerySortField>("impressions");
  const [order, setOrder] = useState<SortOrder>("desc");

  // Debounce search term to avoid too many API calls
  const debouncedSearch = useDebouncedValue(search, 300);

  // Selection management
  const { selected, toggleRow, clearSelection } = useSelection();

  // Fetch queries with search filter
  const { data: queries, isLoading } = useQueries({
    search: debouncedSearch,
    isOpportunity,
    sortBy,
    order,
    limit: 100,
    offset: 0,
  });

  // Filter out queries that are already in the group
  const availableQueries = useMemo(() => {
    return queries.filter((query) => !existingQueryIds.has(query.id));
  }, [queries, existingQueryIds]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setIsOpportunity(undefined);
      setSortBy("impressions");
      setOrder("desc");
      clearSelection();
    }
  }, [open, clearSelection]);

  // Handle sort change
  const handleSortChange = useCallback(
    ({ sortBy: newSortBy, order: newOrder }: { sortBy: QuerySortField; order: SortOrder }) => {
      setSortBy(newSortBy);
      setOrder(newOrder);
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selected.size === 0) {
      return;
    }

    try {
      await onAdd(Array.from(selected));
      // Close modal on success (parent will handle this via onOpenChange)
    } catch {
      // Error handling is done in parent component
      // This catch prevents unhandled promise rejection
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Add Queries to Group</DialogTitle>
          <DialogDescription>Search and select queries to add to &quot;{groupName}&quot;</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Search and Filter Controls */}
          <div className="flex gap-4 items-center px-6 pb-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by query text..." />
            <OpportunityToggle
              checked={isOpportunity || false}
              onChange={(checked: boolean) => setIsOpportunity(checked ? true : undefined)}
            />
          </div>

          {/* Selection Summary */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 px-6 pb-4">
              <Badge variant="secondary">
                {selected.size} {selected.size === 1 ? "query" : "queries"} selected
              </Badge>
            </div>
          )}

          {/* Queries Table - Scrollable container */}
          <div className="flex-1 min-h-0 px-6">
            <QueriesTable
              rows={availableQueries}
              isLoading={isLoading}
              emptyMessage={
                search || isOpportunity ? "No matching queries found" : "All queries are already in this group"
              }
              selected={selected}
              onToggleRow={toggleRow}
              sortBy={sortBy}
              order={order}
              onSortChange={handleSortChange}
              maxHeight="400px"
            />
          </div>

          <DialogFooter className="px-6 py-4 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || selected.size === 0}>
              {isSubmitting ? "Adding..." : `Add ${selected.size || ""} ${selected.size === 1 ? "Query" : "Queries"}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
