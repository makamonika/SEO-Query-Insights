import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PencilIcon, CheckIcon, XIcon, Trash2Icon, SparklesIcon } from "lucide-react";
import { useInlineNameEdit } from "@/hooks/useInlineNameEdit";

export interface EditableHeaderProps {
  name: string;
  aiGenerated?: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onRename: (name: string) => Promise<void>;
  onDelete: () => void;
}

/**
 * Editable group header with inline editing, AI badge, and delete button
 * Handles validation: non-empty, max length, no change detection
 */
export function EditableHeader({ name, aiGenerated, isSaving, isDeleting, onRename, onDelete }: EditableHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Use shared inline name editing hook
  const { isEditing, editedName, error, startEdit, cancelEdit, saveEdit, setEditedName } = useInlineNameEdit({
    initialName: name,
    onSave: onRename,
    maxLength: 120,
  });

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                disabled={isSaving}
                aria-label="Group name"
                aria-invalid={!!error}
                className="text-3xl font-bold h-auto py-2"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={saveEdit}
                disabled={isSaving || !editedName.trim() || editedName.trim() === name}
                aria-label="Save group name"
              >
                <CheckIcon />
              </Button>
              <Button size="icon" variant="ghost" onClick={cancelEdit} disabled={isSaving} aria-label="Cancel editing">
                <XIcon />
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold break-words">{name}</h1>
            {aiGenerated && (
              <Badge variant="secondary" className="gap-1">
                <SparklesIcon className="size-3" />
                AI Generated
              </Badge>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={startEdit}
              disabled={isSaving || isDeleting}
              aria-label="Edit group name"
            >
              <PencilIcon />
            </Button>
          </div>
        )}
      </div>

      <Button
        variant="destructive"
        onClick={onDelete}
        disabled={isSaving || isDeleting || isEditing}
        aria-label="Delete group"
      >
        <Trash2Icon />
        Delete Group
      </Button>
    </div>
  );
}
