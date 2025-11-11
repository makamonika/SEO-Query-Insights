import { Button } from "@/components/ui/button";
import { FolderPlus } from "lucide-react";

interface NewGroupButtonProps {
  disabled?: boolean;
  onClick: () => void;
}

export function NewGroupButton({ disabled, onClick }: NewGroupButtonProps) {
  return (
    <Button onClick={onClick} disabled={disabled} variant="outline">
      <FolderPlus className="mr-2 h-4 w-4" />
      Create Group
    </Button>
  );
}
