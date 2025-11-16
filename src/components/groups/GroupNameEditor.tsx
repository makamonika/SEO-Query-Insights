import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface GroupNameEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  disabled?: boolean;
  isSaving?: boolean;
  className?: string;
  inputClassName?: string;
}

export function GroupNameEditor({
  value,
  onChange,
  onSave,
  onCancel,
  disabled = false,
  isSaving = false,
  className = "",
  inputClassName = "",
}: GroupNameEditorProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isSaving}
        aria-label="Group name"
        className={inputClassName}
      />
      <Button
        size="sm"
        variant="ghost"
        onClick={onSave}
        disabled={disabled || isSaving || !value.trim()}
        className="h-8 w-8 p-0"
        aria-label="Save"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onCancel}
        disabled={disabled || isSaving}
        className="h-8 w-8 p-0"
        aria-label="Cancel"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
