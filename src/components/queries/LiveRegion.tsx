interface LiveRegionProps {
  message?: string;
}

/**
 * Visually hidden live region for screen reader announcements
 */
export function LiveRegion({ message }: LiveRegionProps) {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
      {message}
    </div>
  );
}
