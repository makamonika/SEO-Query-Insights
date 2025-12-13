import { useEffect } from "react";
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
import { useQuerySearch } from "@/hooks/useQuerySearch";

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
  // Use extracted query search hook
  const querySearch = useQuerySearch({
    excludeIds: existingQueryIds,
    limit: 100,
    initialSortBy: "impressions",
    initialOrder: "desc",
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      querySearch.reset();
    }
  }, [open, querySearch.reset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (querySearch.selected.size === 0) {
      return;
    }

    try {
      await onAdd(Array.from(querySearch.selected));
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
            <SearchInput
              value={querySearch.search}
              onChange={querySearch.setSearch}
              placeholder="Search by query text..."
            />
            <OpportunityToggle
              checked={querySearch.isOpportunity || false}
              onChange={(checked: boolean) => querySearch.setIsOpportunity(checked ? true : undefined)}
            />
          </div>

          {/* Selection Summary */}
          {querySearch.selected.size > 0 && (
            <div className="flex items-center gap-2 px-6 pb-4">
              <Badge variant="secondary">
                {querySearch.selected.size} {querySearch.selected.size === 1 ? "query" : "queries"} selected
              </Badge>
            </div>
          )}

          {/* Queries Table - Scrollable container */}
          <div className="flex-1 min-h-0 px-6 overflow-y-scroll">
            <div className="h-full">
              <QueriesTable
                rows={querySearch.availableQueries}
                isLoading={querySearch.isLoading}
                emptyMessage={
                  querySearch.search || querySearch.isOpportunity
                    ? "No matching queries found"
                    : "All queries are already in this group"
                }
                selected={querySearch.selected}
                onToggleRow={querySearch.toggleRow}
                sortBy={querySearch.sortBy}
                order={querySearch.order}
                onSortChange={querySearch.handleSortChange}
                height="100%"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || querySearch.selected.size === 0}>
              {isSubmitting
                ? "Adding..."
                : `Add ${querySearch.selected.size || ""} ${querySearch.selected.size === 1 ? "Query" : "Queries"}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
