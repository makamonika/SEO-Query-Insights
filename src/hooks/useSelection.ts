import { useCallback, useState } from "react";

/**
 * Custom hook for managing multi-select state
 * Uses unique IDs for selection to handle cases where queryText may not be unique
 * @returns Selection state and utility functions
 */
export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleRow = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => {
      return selected.has(id);
    },
    [selected]
  );

  return {
    selected,
    toggleRow,
    clearSelection,
    isSelected,
  };
}
