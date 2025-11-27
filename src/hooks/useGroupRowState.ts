import { useState, useCallback } from "react";
import type { GroupDto } from "@/types";

interface UseGroupRowStateReturn {
  // Editing state
  editingId: string | null;
  editingName: string;
  isEditing: (id: string) => boolean;
  startEdit: (group: GroupDto) => void;
  cancelEdit: () => void;
  updateEditingName: (name: string) => void;
  saveEdit: (id: string, onRename: (id: string, name: string) => Promise<void>) => Promise<void>;

  // Delete confirmation state
  deleteConfirmId: string | null;
  isDeleteConfirm: (id: string) => boolean;
  showDeleteConfirm: (id: string) => void;
  cancelDelete: () => void;
  confirmDelete: (id: string, onDelete: (id: string) => Promise<void>) => Promise<void>;
}

/**
 * Hook for managing group row state (editing and delete confirmation)
 * Extracted from GroupsList to reduce component complexity
 */
export function useGroupRowState(): UseGroupRowStateReturn {
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Editing handlers
  const isEditing = useCallback((id: string) => editingId === id, [editingId]);

  const startEdit = useCallback((group: GroupDto) => {
    setEditingId(group.id);
    setEditingName(group.name);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingName("");
  }, []);

  const updateEditingName = useCallback((name: string) => {
    setEditingName(name);
  }, []);

  const saveEdit = useCallback(
    async (id: string, onRename: (id: string, name: string) => Promise<void>) => {
      await onRename(id, editingName);
      setEditingId(null);
      setEditingName("");
    },
    [editingName]
  );

  // Delete confirmation handlers
  const isDeleteConfirm = useCallback((id: string) => deleteConfirmId === id, [deleteConfirmId]);

  const showDeleteConfirm = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  const confirmDelete = useCallback(async (id: string, onDelete: (id: string) => Promise<void>) => {
    await onDelete(id);
    setDeleteConfirmId(null);
  }, []);

  return {
    // Editing
    editingId,
    editingName,
    isEditing,
    startEdit,
    cancelEdit,
    updateEditingName,
    saveEdit,

    // Delete confirmation
    deleteConfirmId,
    isDeleteConfirm,
    showDeleteConfirm,
    cancelDelete,
    confirmDelete,
  };
}
