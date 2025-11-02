import { DataStatusLabel } from "./DataStatusLabel";
import { ImportButton } from "./ImportButton";
import { shouldShowImportButton, getDailyImportCutoff } from "./utils";
import { DAILY_IMPORT_HOUR, DAILY_IMPORT_MINUTE } from "@/lib/settings";

interface PageHeaderProps {
  lastImportAt?: string;
  isImporting: boolean;
  hasFailed: boolean;
  onImport: () => Promise<void>;
}

export function PageHeader({ lastImportAt, isImporting, hasFailed, onImport }: PageHeaderProps) {
  const status = isImporting ? "running" : hasFailed ? "failed" : "completed";
  const showImportButton = shouldShowImportButton(DAILY_IMPORT_HOUR, DAILY_IMPORT_MINUTE, lastImportAt);

  // Format the daily import time for display
  const cutoffTime = getDailyImportCutoff(DAILY_IMPORT_HOUR, DAILY_IMPORT_MINUTE);
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const cutoffTimeStr = timeFormatter.format(cutoffTime);

  return (
    <div className="border-b bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Query Performance Dashboard</h1>
          </div>

          <div className="flex flex-col items-end gap-2">
            {showImportButton ? (
              <>
                <ImportButton isImporting={isImporting} onImport={onImport} />
                <DataStatusLabel lastImportAt={lastImportAt} status={status} />
              </>
            ) : (
              <div className="text-sm text-green-600 text-right">
                ✓ Data is up-to-date (imported after {cutoffTimeStr})
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
