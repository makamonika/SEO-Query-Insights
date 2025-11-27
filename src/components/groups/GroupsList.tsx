import { memo } from "react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { getSortIcon, getNextSortState } from "@/lib/table-utils.tsx";
import { useGroupRowState } from "@/hooks/useGroupRowState";
import { GroupCard } from "./GroupCard";
import { GroupTableRow } from "./GroupTableRow";
import type { GroupDto, SortOrder } from "@/types";
import type { GroupSortField } from "@/hooks/useGroups";

interface GroupsListProps {
  rows: GroupDto[];
  isLoading: boolean;
  sortBy: GroupSortField;
  order: SortOrder;
  onSortChange: (params: { sortBy: GroupSortField; order: SortOrder }) => void;
  // Action handlers
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onView: (id: string) => void;
  // Loading states
  isRenamingId: string | null;
  isDeletingId: string | null;
}

export const GroupsList = memo(function GroupsList({
  rows,
  isLoading,
  sortBy,
  order,
  onSortChange,
  onRename,
  onDelete,
  onView,
  isRenamingId,
  isDeletingId,
}: GroupsListProps) {
  // Extract row state management to custom hook
  const rowState = useGroupRowState();

  const handleColumnHeaderClick = (field: GroupSortField) => {
    const defaultOrder = field === "createdAt" ? "desc" : "asc";
    const nextState = getNextSortState(sortBy, order, field, defaultOrder);
    onSortChange(nextState);
  };

  return (
    <div id="groups-list" className="mt-6 rounded-md border">
      {isLoading ? (
        <TableEmptyState message="Loading groups..." />
      ) : rows.length === 0 ? (
        <TableEmptyState message="No groups found" />
      ) : (
        <>
          {/* Desktop Table Layout */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead aria-sort={sortBy === "name" ? (order === "asc" ? "ascending" : "descending") : "none"}>
                    <button
                      type="button"
                      onClick={() => handleColumnHeaderClick("name")}
                      className="flex items-center hover:text-foreground"
                    >
                      Name
                      {getSortIcon(sortBy === "name", order)}
                    </button>
                  </TableHead>
                  <TableHead
                    aria-sort={sortBy === "aiGenerated" ? (order === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <button
                      type="button"
                      onClick={() => handleColumnHeaderClick("aiGenerated")}
                      className="flex items-center hover:text-foreground"
                    >
                      AI
                      {getSortIcon(sortBy === "aiGenerated", order)}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Query Count</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Avg Position</TableHead>
                  <TableHead
                    aria-sort={sortBy === "createdAt" ? (order === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <button
                      type="button"
                      onClick={() => handleColumnHeaderClick("createdAt")}
                      className="flex items-center hover:text-foreground"
                    >
                      Created
                      {getSortIcon(sortBy === "createdAt", order)}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((group) => {
                  const isEditing = rowState.isEditing(group.id);
                  const isRenaming = isRenamingId === group.id;
                  const isDeleting = isDeletingId === group.id;
                  const isDeleteConfirm = rowState.isDeleteConfirm(group.id);

                  return (
                    <GroupTableRow
                      key={group.id}
                      group={group}
                      isEditing={isEditing}
                      editingName={rowState.editingName}
                      onEditingNameChange={rowState.updateEditingName}
                      onEditStart={() => rowState.startEdit(group)}
                      onEditSave={() => rowState.saveEdit(group.id, onRename)}
                      onEditCancel={rowState.cancelEdit}
                      isRenaming={isRenaming}
                      isDeleting={isDeleting}
                      isDeleteConfirm={isDeleteConfirm}
                      onDeleteClick={() => rowState.showDeleteConfirm(group.id)}
                      onDeleteConfirm={() => rowState.confirmDelete(group.id, onDelete)}
                      onDeleteCancel={rowState.cancelDelete}
                      onView={() => onView(group.id)}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden">
            {rows.map((group) => {
              const isEditing = rowState.isEditing(group.id);
              const isRenaming = isRenamingId === group.id;
              const isDeleting = isDeletingId === group.id;
              const isDeleteConfirm = rowState.isDeleteConfirm(group.id);

              return (
                <GroupCard
                  key={group.id}
                  group={group}
                  isEditing={isEditing}
                  editingName={rowState.editingName}
                  onEditingNameChange={rowState.updateEditingName}
                  onEditStart={() => rowState.startEdit(group)}
                  onEditSave={() => rowState.saveEdit(group.id, onRename)}
                  onEditCancel={rowState.cancelEdit}
                  isRenaming={isRenaming}
                  isDeleting={isDeleting}
                  isDeleteConfirm={isDeleteConfirm}
                  onDeleteClick={() => rowState.showDeleteConfirm(group.id)}
                  onDeleteConfirm={() => rowState.confirmDelete(group.id, onDelete)}
                  onDeleteCancel={rowState.cancelDelete}
                  onView={() => onView(group.id)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
});
