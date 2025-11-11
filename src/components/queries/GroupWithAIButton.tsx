import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface GroupWithAIButtonProps {
  onGenerate: () => void | Promise<void>;
  isGenerating: boolean;
}

export function GroupWithAIButton({ onGenerate, isGenerating }: GroupWithAIButtonProps) {
  return (
    <Button onClick={onGenerate} disabled={isGenerating} variant="default">
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Group with AI
        </>
      )}
    </Button>
  );
}
