import { useState, useEffect } from "react";

export interface UseInlineNameEditParams {
  initialName: string;
  onSave: (name: string) => void | Promise<void>;
  minLength?: number;
  maxLength?: number;
}

export interface UseInlineNameEditResult {
  isEditing: boolean;
  editedName: string;
  error: string | null;
  startEdit: () => void;
  cancelEdit: () => void;
  saveEdit: () => Promise<void>;
  setEditedName: (name: string) => void;
  setError: (error: string | null) => void;
}

/**
 * Custom hook for inline name editing with validation
 * Supports both sync and async onSave handlers
 * @param params - Configuration for name editing
 * @returns State and handlers for inline editing
 */
export function useInlineNameEdit({
  initialName,
  onSave,
  minLength = 1,
  maxLength = 120,
}: UseInlineNameEditParams): UseInlineNameEditResult {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  // Sync edited name when initial name changes
  useEffect(() => {
    setEditedName(initialName);
  }, [initialName]);

  const startEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  const cancelEdit = () => {
    setEditedName(initialName);
    setIsEditing(false);
    setError(null);
  };

  const saveEdit = async () => {
    const trimmedName = editedName.trim();

    // Validation: non-empty
    if (!trimmedName) {
      setError("Name cannot be empty");
      return;
    }

    // Validation: min length
    if (trimmedName.length < minLength) {
      setError(`Name must be at least ${minLength} character${minLength !== 1 ? "s" : ""}`);
      return;
    }

    // Validation: max length
    if (trimmedName.length > maxLength) {
      setError(`Name must be ${maxLength} characters or less`);
      return;
    }

    // Validation: no change
    if (trimmedName === initialName) {
      setIsEditing(false);
      setError(null);
      return;
    }

    try {
      await onSave(trimmedName);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      // Keep edit mode open on error so user can correct
      const message = err instanceof Error ? err.message : "Failed to save";
      setError(message);
    }
  };

  return {
    isEditing,
    editedName,
    error,
    startEdit,
    cancelEdit,
    saveEdit,
    setEditedName,
    setError,
  };
}
