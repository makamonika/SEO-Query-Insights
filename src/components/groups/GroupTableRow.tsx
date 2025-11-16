import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { formatNumber, formatCTR, formatDate } from "@/lib/table-utils.tsx";
import { GroupNameEditor } from "./GroupNameEditor";
import { GroupActions } from "./GroupActions";
import type { GroupDto } from "@/types";

interface GroupTableRowProps {
  group: GroupDto;
  isEditing: boolean;
  editingName: string;
  onEditingNameChange: (name: string) => void;
  onEditStart: () => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  isRenaming: boolean;
  isDeleting: boolean;
  isDeleteConfirm: boolean;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onView: () => void;
}

export function GroupTableRow({
  group,
  isEditing,
  editingName,
  onEditingNameChange,
  onEditStart,
  onEditSave,
  onEditCancel,
  isRenaming,
  isDeleting,
  isDeleteConfirm,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
  onView,
}: GroupTableRowProps) {
  return (
    <TableRow key={group.id} aria-label={group.name}>
      <TableCell className="font-medium">
        {isEditing ? (
          <GroupNameEditor
            value={editingName}
            onChange={onEditingNameChange}
            onSave={onEditSave}
            onCancel={onEditCancel}
            disabled={isRenaming}
            isSaving={isRenaming}
            inputClassName="h-8"
          />
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
        <GroupActions
          onEdit={onEditStart}
          onView={onView}
          onDelete={onDeleteClick}
          onDeleteConfirm={onDeleteConfirm}
          onDeleteCancel={onDeleteCancel}
          isDeleteConfirming={isDeleteConfirm}
          isDeleting={isDeleting}
          disabled={isEditing || isRenaming || isDeleting}
          groupName={group.name}
          variant="table"
        />
      </TableCell>
    </TableRow>
  );
}
