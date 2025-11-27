import { useMemo } from "react";
import { useGroupDetails } from "@/hooks/useGroupDetails";
import { useTableState } from "@/hooks/useTableState";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useModalState } from "@/hooks/useModalState";
import { EditableHeader } from "./EditableHeader";
import { MetricsSummary } from "./MetricsSummary";
import { QueriesTable } from "@/components/queries/QueriesTable";
import { ConfirmDialog } from "./ConfirmDialog";
import { AddQueriesToGroupModal } from "./AddQueriesToGroupModal";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, Trash2Icon, PlusIcon } from "lucide-react";
import { sortQueries } from "@/lib/query-sorting";
import type { QuerySortField } from "@/types";

export interface GroupDetailsPageProps {
  groupId: string;
}

/**
 * Group Details page component
 * Displays group header, metrics, and member queries with edit/delete capabilities
 */
export function GroupDetailsPage({ groupId }: GroupDetailsPageProps) {
  // Table state (pagination + sorting)
  const { pageSize, offset, handlePageChange, handlePageSizeChange, sortBy, order, handleSortChange } =
    useTableState<QuerySortField>("impressions", "desc", 50);

  // Confirmation dialog state
  const confirmDialog = useConfirmDialog<{ queryId?: string; queryText?: string }>();

  // Add queries modal state
  const addQueriesModal = useModalState();

  // Group details (combines group + members data and actions)
  const {
    group,
    isLoadingGroup,
    groupError,
    members,
    membersMeta: meta,
    isLoadingMembers,
    isRenamingId,
    isDeletingId,
    removingQueryId,
    isAddingItems,
    renameGroup,
    removeQuery,
    addQueries,
    handleDelete,
  } = useGroupDetails({
    groupId,
    limit: pageSize,
    offset,
  });

  // Sort members client-side using shared sorting logic
  const sortedMembers = useMemo(() => {
    return sortQueries(members, sortBy, order);
  }, [members, sortBy, order]);

  // Handle delete group - show confirmation first
  const handleDeleteGroup = () => {
    confirmDialog.openDialog("delete-group");
  };

  // Confirm delete group
  const confirmDeleteGroup = async () => {
    await handleDelete(groupId);
    // Navigate to groups list after successful deletion
    window.location.href = "/groups";
  };

  // Handle remove query - show confirmation first
  const handleRemoveQueryClick = (queryId: string, queryText: string) => {
    confirmDialog.openDialog("remove-query", { queryId, queryText });
  };

  // Confirm remove query
  const confirmRemoveQuery = async () => {
    if (!confirmDialog.data?.queryId) return;

    try {
      await removeQuery(confirmDialog.data.queryId);
    } catch {
      // Error already handled by hook with toast
    }
  };

  // Handle add queries
  const handleAddQueries = async (queryIds: string[]) => {
    try {
      await addQueries(queryIds);
      addQueriesModal.close();
    } catch {
      // Error already handled by hook with toast
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
          onRename={renameGroup}
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
            <Button onClick={() => addQueriesModal.open()} disabled={isAddingItems}>
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
                onClick={() => handleRemoveQueryClick(row.id, row.queryText)}
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
        onOpenChange={confirmDialog.closeDialog}
      />

      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === "remove-query"}
        title="Remove Query from Group"
        description={`Are you sure you want to remove "${confirmDialog.data?.queryText}" from this group? The query itself will not be deleted.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmRemoveQuery}
        onOpenChange={confirmDialog.closeDialog}
      />

      {/* Add Queries Modal */}
      <AddQueriesToGroupModal
        open={addQueriesModal.isOpen}
        onOpenChange={(open) => (open ? addQueriesModal.open() : addQueriesModal.close())}
        onAdd={handleAddQueries}
        isSubmitting={isAddingItems}
        existingQueryIds={existingQueryIds}
        groupName={group.name}
      />
    </div>
  );
}
