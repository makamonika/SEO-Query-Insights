import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";

interface GroupActionsProps {
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  isDeleteConfirming: boolean;
  isDeleting: boolean;
  disabled?: boolean;
  groupName: string;
  variant?: "table" | "card";
}

export function GroupActions({
  onEdit,
  onView,
  onDelete,
  onDeleteConfirm,
  onDeleteCancel,
  isDeleteConfirming,
  isDeleting,
  disabled = false,
  groupName,
  variant = "table",
}: GroupActionsProps) {
  const buttonClass = variant === "card" ? "h-9" : "h-8";

  if (isDeleteConfirming) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">Delete?</span>
        <Button size="sm" variant="destructive" onClick={onDeleteConfirm} disabled={isDeleting} className={buttonClass}>
          Confirm
        </Button>
        <Button size="sm" variant="ghost" onClick={onDeleteCancel} disabled={isDeleting} className={buttonClass}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${variant === "card" ? "justify-end gap-2" : "justify-end gap-1"}`}>
      <Button
        size="sm"
        variant="ghost"
        onClick={onEdit}
        disabled={disabled}
        className={buttonClass}
        aria-label={`Edit ${groupName}`}
      >
        <Pencil className="h-4 w-4" />
        {variant === "card" && <span className="ml-2">Edit</span>}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onView}
        disabled={disabled}
        className={buttonClass}
        aria-label={`View ${groupName}`}
      >
        <Eye className="h-4 w-4" />
        {variant === "card" && <span className="ml-2">View</span>}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onDelete}
        disabled={disabled}
        className={buttonClass}
        aria-label={`Delete ${groupName}`}
      >
        <Trash2 className="h-4 w-4" />
        {variant === "card" && <span className="ml-2">Delete</span>}
      </Button>
    </div>
  );
}
