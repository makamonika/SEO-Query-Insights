import { CheckCircle2 } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function SuccessMessage() {
  return (
    <div className="space-y-4">
      <Alert className="border-green-600/50 bg-green-50 dark:bg-green-950/20">
        <CheckCircle2 className="size-4 text-green-600 dark:text-green-500" />
        <AlertTitle className="text-green-900 dark:text-green-100">Check your email</AlertTitle>
        <AlertDescription className="text-green-800 dark:text-green-200">
          If an account exists for this email, you will receive password reset instructions.
        </AlertDescription>
      </Alert>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">Didn&apos;t receive the email? Check your spam folder.</p>
        <Button
          type="button"
          variant="ghost"
          onClick={() => window.location.reload()}
          className="text-primary hover:text-primary/90"
        >
          Try another email
        </Button>
      </div>

      <div className="pt-4 border-t">
        <a
          href="/login"
          className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded flex items-center justify-center"
        >
          Back to login
        </a>
      </div>
    </div>
  );
}
