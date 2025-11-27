import { useState, useCallback } from "react";

export interface UseModalStateReturn<T> {
  isOpen: boolean;
  data: T | null;
  open: (modalData?: T) => void;
  close: () => void;
}

export function useModalState<T = void>(): UseModalStateReturn<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const open = useCallback((modalData?: T) => {
    setIsOpen(true);
    if (modalData !== undefined) {
      setData(modalData);
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  return { isOpen, data, open, close };
}
