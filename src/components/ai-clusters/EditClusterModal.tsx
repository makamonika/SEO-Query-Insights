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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QueriesTable } from "@/components/queries/QueriesTable";
import { SearchInput } from "@/components/queries/SearchInput";
import { OpportunityToggle } from "@/components/queries/OpportunityToggle";
import { useQueries } from "@/hooks/useQueries";
import { useSelection } from "@/hooks/useSelection";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Trash2Icon } from "lucide-react";
import type { AIClusterViewModel } from "@/hooks/useAIClustersSuggestions";
import type { QuerySortField, SortOrder, QueryDto } from "@/types";

export interface EditClusterModalProps {
  open: boolean;
  cluster: AIClusterViewModel | null;
  onClose: () => void;
  onSave: (changes: { name: string; queryIds: string[] }) => void;
}

/**
 * Modal for editing cluster name and membership
 * Reuses AddQueriesToGroupModal pattern but adapted for clusters
 */
export function EditClusterModal({ open, cluster, onClose, onSave }: EditClusterModalProps) {
  // Name editing state
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  // Current member query IDs
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());

  // Search and filter state for adding queries
  const [search, setSearch] = useState("");
  const [isOpportunity, setIsOpportunity] = useState<boolean>();

  // Sorting state
  const [sortBy, setSortBy] = useState<QuerySortField>("impressions");
  const [order, setOrder] = useState<SortOrder>("desc");

  // Debounce search term
  const debouncedSearch = useDebouncedValue(search, 300);

  // Selection for adding new queries
  const { selected, toggleRow, clearSelection } = useSelection();

  // Fetch all queries for search/add
  const { data: queries, isLoading } = useQueries({
    search: debouncedSearch,
    isOpportunity,
    sortBy,
    order,
    limit: 100,
    offset: 0,
  });

  // Filter out queries that are already members
  const availableQueries = useMemo(() => {
    return queries.filter((query) => !memberIds.has(query.id));
  }, [queries, memberIds]);

  // Get member queries for display
  const { data: allQueries } = useQueries({
    limit: 10000,
  });

  const memberQueries = useMemo(() => {
    const queriesMap = new Map(allQueries.map((q) => [q.id, q]));
    return Array.from(memberIds)
      .map((id) => queriesMap.get(id))
      .filter((q): q is QueryDto => q !== undefined);
  }, [allQueries, memberIds]);

  // Initialize form when cluster changes
  useEffect(() => {
    if (cluster && open) {
      setName(cluster.name);
      setMemberIds(new Set(cluster.queryIds));
      setNameError(null);
      setSearch("");
      setIsOpportunity(undefined);
      setSortBy("impressions");
      setOrder("desc");
      clearSelection();
    }
  }, [cluster, open, clearSelection]);

  const handleSortChange = useCallback(
    ({ sortBy: newSortBy, order: newOrder }: { sortBy: QuerySortField; order: SortOrder }) => {
      setSortBy(newSortBy);
      setOrder(newOrder);
    },
    []
  );

  const handleAddSelected = () => {
    if (selected.size > 0) {
      setMemberIds((prev) => new Set([...prev, ...selected]));
      clearSelection();
    }
  };

  const handleRemoveMember = (queryId: string) => {
    setMemberIds((prev) => {
      const next = new Set(prev);
      next.delete(queryId);
      return next;
    });
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

    if (memberIds.size === 0) {
      setNameError("Cluster must have at least one query");
      return;
    }

    onSave({
      name: trimmedName,
      queryIds: Array.from(memberIds),
    });
    onClose();
  };

  if (!cluster) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Edit Cluster</DialogTitle>
          <DialogDescription>Modify the cluster name and manage member queries</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Name Input */}
          <div className="px-6 pb-4 space-y-2">
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
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Current Members ({memberIds.size})</Label>
              {memberIds.size === 0 && <span className="text-sm text-destructive">At least one query required</span>}
            </div>

            {memberQueries.length > 0 ? (
              <div className="border rounded-lg p-4 max-h-[200px] overflow-y-auto space-y-2">
                {memberQueries.map((query) => (
                  <div key={query.id} className="flex items-center justify-between gap-4 p-2 hover:bg-muted/50 rounded">
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
          <div className="px-6 pb-4 border-t pt-4">
            <Label className="mb-2 block">Add Queries</Label>

            {/* Search and Filter Controls */}
            <div className="flex gap-4 items-center mb-4">
              <SearchInput value={search} onChange={setSearch} placeholder="Search queries to add..." />
              <OpportunityToggle
                checked={isOpportunity || false}
                onChange={(checked: boolean) => setIsOpportunity(checked ? true : undefined)}
              />
            </div>

            {/* Selection Summary */}
            {selected.size > 0 && (
              <div className="flex items-center justify-between gap-2 mb-4">
                <Badge variant="secondary">
                  {selected.size} {selected.size === 1 ? "query" : "queries"} selected
                </Badge>
                <Button type="button" size="sm" onClick={handleAddSelected}>
                  Add Selected
                </Button>
              </div>
            )}

            {/* Available Queries Table */}
            <QueriesTable
              rows={availableQueries}
              isLoading={isLoading}
              emptyMessage={
                search || isOpportunity
                  ? "No matching queries found"
                  : "All queries are already in this cluster or no queries available"
              }
              selected={selected}
              onToggleRow={toggleRow}
              sortBy={sortBy}
              order={order}
              onSortChange={handleSortChange}
              height="300px"
            />
          </div>

          <DialogFooter className="px-6 py-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || memberIds.size === 0}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
