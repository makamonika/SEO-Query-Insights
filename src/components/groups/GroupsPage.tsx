import { useState, useCallback } from "react";
import { LiveRegion } from "@/components/queries/LiveRegion";
import { GroupsToolbar } from "./GroupsToolbar";
import { GroupsTable } from "./GroupsTable";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useGroups, type GroupSortField } from "@/hooks/useGroups";
import { useGroupActions } from "@/hooks/useGroupActions";
import { useAIClusters } from "@/hooks/useAIClusters";
import type { SortOrder, GroupWithMetricsDto } from "@/types";

/**
 * View-specific row type for groups list
 */
export type GroupRowView = GroupWithMetricsDto;

export function GroupsPage() {
  // Live region for accessibility announcements
  const [liveMessage, setLiveMessage] = useState<string>();

  // Filter and sort state
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<GroupSortField>("createdAt");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [limit] = useState(50);
  const [offset] = useState(0);

  // Row edit state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Debounce search input
  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch groups
  const {
    data: groups,
    isLoading,
    error,
    refetch,
  } = useGroups({
    search: debouncedSearch,
    sortBy,
    order,
    limit,
    offset,
  });

  // Group actions (CRUD operations)
  const {
    isRenamingId,
    isDeletingId,
    handleRename,
    handleDelete,
    handleView,
  } = useGroupActions({
    refetch,
    setLiveMessage,
    setEditingId,
  });

  // AI cluster generation
  const { isGeneratingAI, handleGenerateAI } = useAIClusters({
    setLiveMessage,
  });

  // Toolbar handlers - memoized to prevent unnecessary re-renders
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleSortChange = useCallback(
    ({ sortBy: newSortBy, order: newOrder }: { sortBy: GroupSortField; order: SortOrder }) => {
      setSortBy(newSortBy);
      setOrder(newOrder);
    },
    []
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to content link for accessibility */}
      <a
        href="#groups-table"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Groups</h1>

        <GroupsToolbar
          search={search}
          onSearchChange={handleSearchChange}
          onGenerateAI={handleGenerateAI}
          isGeneratingAI={isGeneratingAI}
        />

        <GroupsTable
          rows={groups}
          isLoading={isLoading}
          sortBy={sortBy}
          order={order}
          onSortChange={handleSortChange}
          onRename={handleRename}
          onDelete={handleDelete}
          onView={handleView}
          isRenamingId={isRenamingId}
          isDeletingId={isDeletingId}
        />

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-800" role="alert">
            Error: {error.message}
          </div>
        )}
      </div>

      <LiveRegion message={liveMessage} />
    </div>
  );
}

