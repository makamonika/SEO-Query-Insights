import { useState, memo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Eye, Pencil, Trash2, Check, X } from "lucide-react";
import { formatNumber, formatCTR, formatDate, getSortIcon, getNextSortState } from "@/lib/table-utils.tsx";
import type { GroupDto, SortOrder } from "@/types";
import type { GroupSortField } from "@/hooks/useGroups";

interface GroupsTableProps {
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

export const GroupsTable = memo(function GroupsTable({
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
}: GroupsTableProps) {
  // Local state for inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleColumnHeaderClick = (field: GroupSortField) => {
    const defaultOrder = field === "createdAt" ? "desc" : "asc";
    const nextState = getNextSortState(sortBy, order, field, defaultOrder);
    onSortChange(nextState);
  };

  const handleEditStart = (group: GroupDto) => {
    setEditingId(group.id);
    setEditingName(group.name);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleEditSave = async (id: string) => {
    await onRename(id, editingName);
    setEditingId(null);
    setEditingName("");
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async (id: string) => {
    await onDelete(id);
    setDeleteConfirmId(null);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  return (
    <div id="groups-table" className="mt-6 rounded-md border">
      {isLoading ? (
        <TableEmptyState message="Loading groups..." />
      ) : rows.length === 0 ? (
        <TableEmptyState message="No groups found" />
      ) : (
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
              <TableHead aria-sort={sortBy === "aiGenerated" ? (order === "asc" ? "ascending" : "descending") : "none"}>
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
              <TableHead aria-sort={sortBy === "createdAt" ? (order === "asc" ? "ascending" : "descending") : "none"}>
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
              const isEditing = editingId === group.id;
              const isRenaming = isRenamingId === group.id;
              const isDeleting = isDeletingId === group.id;
              const isDeleteConfirm = deleteConfirmId === group.id;

              return (
                <TableRow key={group.id} aria-label={group.name}>
                  <TableCell className="font-medium">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleEditSave(group.id);
                            } else if (e.key === "Escape") {
                              handleEditCancel();
                            }
                          }}
                          disabled={isRenaming}
                          aria-label="Group name"
                          className="h-8"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditSave(group.id)}
                          disabled={isRenaming || !editingName.trim()}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleEditCancel}
                          disabled={isRenaming}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      group.name
                    )}
                  </TableCell>
                  <TableCell>
                    {group.aiGenerated && (
                      <Badge variant="secondary">
                        <Sparkles className="h-3 w-3" />
                        AI
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(group.queryCount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(group.metricsImpressions)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(group.metricsClicks)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCTR(group.metricsCtr)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(group.metricsAvgPosition, 1)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(group.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {isDeleteConfirm ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-muted-foreground">Delete?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteConfirm(group.id)}
                          disabled={isDeleting}
                          className="h-8"
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleDeleteCancel}
                          disabled={isDeleting}
                          className="h-8"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditStart(group)}
                          disabled={isEditing || isRenaming || isDeleting}
                          className="h-8 w-8 p-0"
                          aria-label={`Edit ${group.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onView(group.id)}
                          disabled={isEditing || isRenaming || isDeleting}
                          className="h-8 w-8 p-0"
                          aria-label={`View ${group.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClick(group.id)}
                          disabled={isEditing || isRenaming || isDeleting}
                          className="h-8 w-8 p-0"
                          aria-label={`Delete ${group.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
});
