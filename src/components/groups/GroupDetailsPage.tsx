import { useState, useMemo, useCallback } from "react";
import { useGroup } from "@/hooks/useGroups";
import { useGroupItems, useRemoveGroupItem, useAddGroupItems } from "@/hooks/useGroupItems";
import { useGroupActions } from "@/hooks/useGroupActions";
import { EditableHeader } from "./EditableHeader";
import { MetricsSummary } from "./MetricsSummary";
import { QueriesTable } from "@/components/queries/QueriesTable";
import { ConfirmDialog } from "./ConfirmDialog";
import { AddQueriesToGroupModal } from "./AddQueriesToGroupModal";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, Trash2Icon, PlusIcon } from "lucide-react";
import { LiveRegion } from "@/components/queries/LiveRegion";
import { sortQueries } from "@/lib/query-sorting";
import type { QuerySortField, SortOrder } from "@/types";

export interface GroupDetailsPageProps {
  groupId: string;
}

/**
 * Group Details page component
 * Displays group header, metrics, and member queries with edit/delete capabilities
 */
export function GroupDetailsPage({ groupId }: GroupDetailsPageProps) {
  const [liveMessage, setLiveMessage] = useState<string>();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "delete-group" | "remove-query";
    queryId?: string;
    queryText?: string;
  }>({ open: false, type: "delete-group" });
  const [addQueriesModalOpen, setAddQueriesModalOpen] = useState(false);

  // Sorting state for member queries table
  const [sortBy, setSortBy] = useState<QuerySortField>("impressions");
  const [order, setOrder] = useState<SortOrder>("desc");

  // Pagination state
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate offset from current page
  const offset = (currentPage - 1) * pageSize;

  // Fetch group data
  const { data: group, isLoading: isLoadingGroup, error: groupError, refetch: refetchGroup } = useGroup(groupId);

  // Fetch member queries
  const {
    data: members,
    meta,
    isLoading: isLoadingMembers,
    refetch: refetchMembers,
  } = useGroupItems(groupId, {
    limit: pageSize,
    offset,
  });

  // Group actions (rename, delete)
  const { isRenamingId, isDeletingId, handleRename, handleDelete } = useGroupActions({
    refetch: refetchGroup,
    setLiveMessage,
  });

  // Remove query from group
  const { removeItem, removingQueryId } = useRemoveGroupItem();

  // Add queries to group
  const { addItems, isLoading: isAddingItems } = useAddGroupItems();

  // Sort members client-side using shared sorting logic
  const sortedMembers = useMemo(() => {
    return sortQueries(members, sortBy, order);
  }, [members, sortBy, order]);

  // Handle sort change
  const handleSortChange = useCallback(
    ({ sortBy: newSortBy, order: newOrder }: { sortBy: QuerySortField; order: SortOrder }) => {
      setSortBy(newSortBy);
      setOrder(newOrder);
      setCurrentPage(1); // Reset to first page on sort change
    },
    []
  );

  // Pagination handlers - now receive offset values from Pagination component
  const handlePageChange = useCallback(
    (newOffset: number) => {
      setCurrentPage(Math.floor(newOffset / pageSize) + 1);
    },
    [pageSize]
  );

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setPageSize(newLimit);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  // Handle rename
  const handleRenameGroup = async (name: string) => {
    await handleRename(groupId, name);
    refetchGroup();
  };

  // Handle delete group - show confirmation first
  const handleDeleteGroup = () => {
    setConfirmDialog({ open: true, type: "delete-group" });
  };

  // Confirm delete group
  const confirmDeleteGroup = async () => {
    await handleDelete(groupId);
    // Navigate to groups list after successful deletion
    window.location.href = "/groups";
  };

  // Handle remove query - show confirmation first
  const handleRemoveQuery = (queryId: string, queryText: string) => {
    setConfirmDialog({ open: true, type: "remove-query", queryId, queryText });
  };

  // Confirm remove query
  const confirmRemoveQuery = async () => {
    if (!confirmDialog.queryId || !confirmDialog.queryText) return;

    try {
      await removeItem(groupId, confirmDialog.queryId);
      // Refresh both members list and group metrics
      refetchMembers();
      refetchGroup();
      setLiveMessage(`Removed "${confirmDialog.queryText}" from group`);
    } catch {
      // Error already handled by hook with toast
      setLiveMessage(`Failed to remove query from group`);
    }
  };

  // Handle add queries
  const handleAddQueries = async (queryIds: string[]) => {
    try {
      const result = await addItems(groupId, queryIds);
      // Refresh both members list and group metrics
      refetchMembers();
      refetchGroup();
      setAddQueriesModalOpen(false);
      if (result.addedCount > 0) {
        setLiveMessage(`Added ${result.addedCount} ${result.addedCount === 1 ? "query" : "queries"} to group`);
      } else {
        setLiveMessage("All selected queries were already in the group");
      }
    } catch (err) {
      // Error already handled by hook with toast
      setLiveMessage(`Failed to add queries to group`);
      throw err; // Re-throw to prevent modal from closing
    }
  };

  // Create a set of existing query IDs for the modal
  const existingQueryIds = useMemo(() => {
    return new Set(members.map((m) => m.id));
  }, [members]);

  // Loading state
  if (isLoadingGroup) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Loading group...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state (handles both errors and not found)
  if (groupError || !group) {
    const isNotFound = groupError?.message === "Group not found";

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <h1 className="text-2xl font-bold">{isNotFound ? "Group Not Found" : "Error Loading Group"}</h1>
            <p className="text-muted-foreground">
              {isNotFound
                ? "The group you're looking for doesn't exist or has been deleted."
                : groupError?.message || "Unknown error"}
            </p>
            <Button asChild>
              <a href="/groups">
                <ArrowLeftIcon />
                Back to Groups
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to content link for accessibility */}
      <a
        href="#member-queries-grid"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb / Back navigation */}
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <a href="/groups">
              <ArrowLeftIcon />
              Back to Groups
            </a>
          </Button>
        </div>

        {/* Editable Header */}
        <EditableHeader
          name={group.name}
          aiGenerated={group.aiGenerated}
          isSaving={!!isRenamingId}
          isDeleting={!!isDeletingId}
          onRename={handleRenameGroup}
          onDelete={handleDeleteGroup}
        />

        {/* Metrics Summary */}
        <MetricsSummary
          queryCount={group.queryCount}
          metricsImpressions={group.metricsImpressions}
          metricsClicks={group.metricsClicks}
          metricsCtr={group.metricsCtr}
          metricsAvgPosition={group.metricsAvgPosition}
        />

        {/* Member Queries Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Member Queries ({meta.total})</h2>
            <Button onClick={() => setAddQueriesModalOpen(true)} disabled={isAddingItems}>
              <PlusIcon />
              Add Queries
            </Button>
          </div>
          <QueriesTable
            rows={sortedMembers}
            isLoading={isLoadingMembers}
            emptyMessage="This group has no queries yet. Add queries from the Queries page to populate this group."
            sortBy={sortBy}
            order={order}
            onSortChange={handleSortChange}
            renderActions={(row) => (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemoveQuery(row.id, row.queryText)}
                disabled={removingQueryId === row.id}
                aria-label={`Remove ${row.queryText} from group`}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2Icon />
              </Button>
            )}
          />

          {/* Pagination */}
          {!isLoadingMembers && members.length > 0 && (
            <Pagination
              meta={meta}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[25, 50, 100, 200]}
              isLoading={isLoadingMembers}
            />
          )}
        </div>
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === "delete-group"}
        title="Delete Group"
        description="Are you sure you want to delete this group? The queries themselves will not be deleted, only the group."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeleteGroup}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      />

      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === "remove-query"}
        title="Remove Query from Group"
        description={`Are you sure you want to remove "${confirmDialog.queryText}" from this group? The query itself will not be deleted.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmRemoveQuery}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      />

      {/* Add Queries Modal */}
      <AddQueriesToGroupModal
        open={addQueriesModalOpen}
        onOpenChange={setAddQueriesModalOpen}
        onAdd={handleAddQueries}
        isSubmitting={isAddingItems}
        existingQueryIds={existingQueryIds}
        groupName={group.name}
      />

      <LiveRegion message={liveMessage} />
    </div>
  );
}
