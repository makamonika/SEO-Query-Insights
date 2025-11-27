import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QueriesTable } from "@/components/queries/QueriesTable";
import { SearchInput } from "@/components/queries/SearchInput";
import { OpportunityToggle } from "@/components/queries/OpportunityToggle";
import { useQuerySearch } from "@/hooks/useQuerySearch";
import { Trash2Icon } from "lucide-react";
import type { AIClusterViewModel } from "@/hooks/useAIClustersSuggestions";
import type { QueryDto } from "@/types";

export interface EditClusterModalProps {
  open: boolean;
  cluster: AIClusterViewModel | null;
  onClose: () => void;
  onSave: (changes: { name: string; queries: QueryDto[] }) => void;
}

/**
 * Modal for editing cluster name and membership
 * Uses useQuerySearch hook to eliminate duplicated search/filter/sort logic
 */
export function EditClusterModal({ open, cluster, onClose, onSave }: EditClusterModalProps) {
  // Name editing state
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const [memberQueries, setMemberQueries] = useState<QueryDto[]>([]);

  // Derive member IDs from member queries
  const memberIds = useMemo(() => new Set(memberQueries.map((q) => q.id)), [memberQueries]);

  // Use the extracted query search hook with member IDs as exclusion
  const querySearch = useQuerySearch({
    excludeIds: memberIds,
    limit: 100,
    initialSortBy: "impressions",
    initialOrder: "desc",
    resetTrigger: open,
  });

  // Initialize form when cluster changes
  useEffect(() => {
    if (cluster && open) {
      setName(cluster.name);
      setMemberQueries(cluster.queries);
      setNameError(null);
    }
  }, [cluster, open]);

  const handleAddSelected = () => {
    if (querySearch.selected.size > 0) {
      // Add query objects to memberQueries
      const newQueries = querySearch.queries.filter((q) => querySearch.selected.has(q.id));
      setMemberQueries((prev) => [...prev, ...newQueries]);
      querySearch.clearSelection();
    }
  };

  const handleRemoveMember = (queryId: string) => {
    setMemberQueries((prev) => prev.filter((q) => q.id !== queryId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();

    // Validation
    if (!trimmedName) {
      setNameError("Cluster name cannot be empty");
      return;
    }

    if (trimmedName.length > 120) {
      setNameError("Cluster name must be 120 characters or less");
      return;
    }

    if (memberQueries.length === 0) {
      setNameError("Cluster must have at least one query");
      return;
    }

    onSave({
      name: trimmedName,
      queries: memberQueries,
    });
    onClose();
  };

  if (!cluster) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Edit Cluster</DialogTitle>
          <DialogDescription>Modify the cluster name and manage member queries</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6">
            {/* Name Input */}
            <div className="pb-4 space-y-2">
              <Label htmlFor="cluster-name">Cluster Name</Label>
              <Input
                id="cluster-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                placeholder="Enter cluster name..."
                aria-invalid={!!nameError}
                maxLength={120}
              />
              {nameError && (
                <p className="text-sm text-destructive" role="alert">
                  {nameError}
                </p>
              )}
            </div>

            {/* Current Members Section */}
            <div className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <Label>Current Members ({memberQueries.length})</Label>
                {memberQueries.length === 0 && (
                  <span className="text-sm text-destructive">At least one query required</span>
                )}
              </div>

              {memberQueries.length > 0 ? (
                <div className="border rounded-lg p-4 max-h-[200px] overflow-y-auto space-y-2">
                  {memberQueries.map((query) => (
                    <div
                      key={query.id}
                      className="flex items-center justify-between gap-4 p-2 hover:bg-muted/50 rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{query.queryText}</p>
                        <p className="text-xs text-muted-foreground truncate">{query.url}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMember(query.id)}
                        aria-label={`Remove ${query.queryText}`}
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg p-8 text-center text-muted-foreground">
                  <p className="text-sm">No queries in this cluster</p>
                </div>
              )}
            </div>

            {/* Add Queries Section */}
            <div className="pb-4 border-t pt-4">
              <Label className="mb-2 block">Add Queries</Label>

              {/* Search and Filter Controls */}
              <div className="flex gap-4 items-center mb-4">
                <SearchInput
                  value={querySearch.search}
                  onChange={querySearch.setSearch}
                  placeholder="Search queries to add..."
                />
                <OpportunityToggle
                  checked={querySearch.isOpportunity || false}
                  onChange={(checked: boolean) => querySearch.setIsOpportunity(checked ? true : undefined)}
                />
              </div>

              {/* Selection Summary */}
              {querySearch.selected.size > 0 && (
                <div className="flex items-center justify-between gap-2 mb-4">
                  <Badge variant="secondary">
                    {querySearch.selected.size} {querySearch.selected.size === 1 ? "query" : "queries"} selected
                  </Badge>
                  <Button type="button" size="sm" onClick={handleAddSelected}>
                    Add Selected
                  </Button>
                </div>
              )}

              {/* Available Queries Table */}
              <div className="mb-4">
                <QueriesTable
                  rows={querySearch.availableQueries}
                  isLoading={querySearch.isLoading}
                  emptyMessage={
                    querySearch.search || querySearch.isOpportunity
                      ? "No matching queries found"
                      : "All queries are already in this cluster or no queries available"
                  }
                  selected={querySearch.selected}
                  onToggleRow={querySearch.toggleRow}
                  sortBy={querySearch.sortBy}
                  order={querySearch.order}
                  onSortChange={querySearch.handleSortChange}
                  maxHeight="400px"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || memberQueries.length === 0}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
