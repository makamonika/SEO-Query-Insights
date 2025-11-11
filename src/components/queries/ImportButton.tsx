import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface ImportButtonProps {
  isImporting: boolean;
  onImport: () => void;
}

export function ImportButton({ isImporting, onImport }: ImportButtonProps) {
  return (
    <Button onClick={onImport} disabled={isImporting} variant="default" size="default">
      {isImporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Importing...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Import Data
        </>
      )}
    </Button>
  );
}
