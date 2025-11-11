interface DataStatusLabelProps {
  lastImportAt?: string;
  status?: "idle" | "running" | "completed" | "failed";
}

export function DataStatusLabel({ lastImportAt, status = "idle" }: DataStatusLabelProps) {
  // Show "No imports yet" if no successful import or if failed with no previous success
  if (!lastImportAt) {
    return <div className="text-sm text-muted-foreground">No imports yet</div>;
  }

  // Don't show date/time when failed - only show the error message
  if (status === "failed") {
    return (
      <div className="text-sm text-red-600">
        <span className="font-medium">Import failed</span>
      </div>
    );
  }

  const date = new Date(lastImportAt);
  const formattedDate = date.toLocaleDateString();
  const formattedTime = date.toLocaleTimeString();

  const statusText = {
    idle: "Last successful import",
    running: "Importing",
    completed: "Last successful import",
    failed: "Import failed", // Won't be used due to early return above
  }[status];

  const statusColor = {
    idle: "text-muted-foreground",
    running: "text-blue-600",
    completed: "text-green-600",
    failed: "text-red-600",
  }[status];

  return (
    <div className={`text-sm ${statusColor}`}>
      <span className="font-medium">{statusText}:</span> {formattedDate} at {formattedTime}
    </div>
  );
}
