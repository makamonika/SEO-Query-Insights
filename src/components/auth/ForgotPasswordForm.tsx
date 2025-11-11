import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
  }>({});

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) {
      return "Email is required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address";
    }
    return undefined;
  };

  const handleEmailBlur = () => {
    const error = validateEmail(email);
    setFieldErrors({ email: error });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate email
    const emailError = validateEmail(email);

    if (emailError) {
      setFieldErrors({ email: emailError });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to send reset email. Please try again.");
      }

      // Success - show success message
      setSuccess(true);
      setEmail(""); // Clear form
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
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
            onClick={() => setSuccess(false)}
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) {
              setFieldErrors({ email: undefined });
            }
          }}
          onBlur={handleEmailBlur}
          placeholder="Enter your email"
          disabled={isLoading}
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          autoComplete="email"
        />
        {fieldErrors.email && (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {fieldErrors.email}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Sending..." : "Send reset link"}
      </Button>

      <div className="text-center">
        <a
          href="/login"
          className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Back to login
        </a>
      </div>
    </form>
  );
}
