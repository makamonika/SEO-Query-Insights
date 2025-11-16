import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { formatNumber, formatCTR, formatDate } from "@/lib/table-utils.tsx";
import { GroupNameEditor } from "./GroupNameEditor";
import { GroupActions } from "./GroupActions";
import type { GroupDto } from "@/types";

interface GroupCardProps {
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

export function GroupCard({
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
}: GroupCardProps) {
  return (
    <div className="border-b last:border-b-0 p-4 space-y-4" aria-label={group.name}>
      {/* Header Section */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isEditing ? (
            <GroupNameEditor
              value={editingName}
              onChange={onEditingNameChange}
              onSave={onEditSave}
              onCancel={onEditCancel}
              disabled={isRenaming}
              isSaving={isRenaming}
              className="flex-1 min-w-0"
              inputClassName="h-9 flex-1"
            />
          ) : (
            <>
              <h3 className="font-medium truncate">{group.name}</h3>
              {group.aiGenerated && (
                <Badge variant="secondary" className="shrink-0">
                  <Sparkles className="h-3 w-3" />
                  AI
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-muted-foreground">Query Count</div>
          <div className="font-medium tabular-nums mt-0.5">{formatNumber(group.queryCount)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Impressions</div>
          <div className="font-medium tabular-nums mt-0.5">{formatNumber(group.metricsImpressions)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Clicks</div>
          <div className="font-medium tabular-nums mt-0.5">{formatNumber(group.metricsClicks)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">CTR</div>
          <div className="font-medium tabular-nums mt-0.5">{formatCTR(group.metricsCtr)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Avg Position</div>
          <div className="font-medium tabular-nums mt-0.5">{formatNumber(group.metricsAvgPosition, 1)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Created</div>
          <div className="font-medium mt-0.5">{formatDate(group.createdAt)}</div>
        </div>
      </div>

      {/* Actions Section */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t">
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
          variant="card"
        />
      </div>
    </div>
  );
}
