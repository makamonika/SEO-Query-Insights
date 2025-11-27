import { useState, useCallback } from "react";

export interface UseConfirmDialogReturn<T> {
  open: boolean;
  type?: string;
  data?: T;
  openDialog: (type: string, data?: T) => void;
  closeDialog: () => void;
}

export function useConfirmDialog<T = string>(): UseConfirmDialogReturn<T> {
  const [state, setState] = useState<{
    open: boolean;
    type?: string;
    data?: T;
  }>({ open: false });

  const openDialog = useCallback((type: string, data?: T) => {
    setState({ open: true, type, data });
  }, []);

  const closeDialog = useCallback(() => {
    setState({ open: false });
  }, []);

  return { ...state, openDialog, closeDialog };
}
