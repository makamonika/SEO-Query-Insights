import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { CreateGroupRequestDto } from "@/types";

type CreateGroupModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: CreateGroupRequestDto) => Promise<void>;
  isSubmitting: boolean;
  error?: string;
  queryTexts: string[];
};

export function CreateGroupModal({
  open,
  onOpenChange,
  onCreate,
  isSubmitting,
  error,
  queryTexts,
}: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [validationError, setValidationError] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName("");
      setValidationError("");
    }
  }, [open]);

  // Clear validation error when user types
  useEffect(() => {
    if (validationError && name.trim()) {
      setValidationError("");
    }
  }, [name, validationError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError("Group name is required");
      return;
    }

    try {
      await onCreate({ name: trimmedName, aiGenerated: false });
    } catch (err) {
      // Error handling is done in parent component
      // This catch prevents unhandled promise rejection
    }
  };

  const displayError = validationError || error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Create a manual group with {queryTexts.length} selected {queryTexts.length === 1 ? "query" : "queries"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Group Name Input */}
            <div className="grid gap-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name..."
                disabled={isSubmitting}
                aria-label="Group name"
                aria-invalid={!!displayError}
                aria-describedby={displayError ? "name-error" : undefined}
                autoFocus
              />
              {displayError && (
                <p id="name-error" className="text-sm text-destructive" role="alert">
                  {displayError}
                </p>
              )}
            </div>

            {/* Selected Queries List */}
            <div className="grid gap-2">
              <Label>Selected Queries ({queryTexts.length})</Label>
              <div className="max-h-[200px] overflow-y-auto rounded-md border p-3">
                {queryTexts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No queries selected</p>
                ) : (
                  <ul className="space-y-2">
                    {queryTexts.map((queryText, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5 shrink-0">
                          {index + 1}
                        </Badge>
                        <span className="text-sm break-words">{queryText}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

