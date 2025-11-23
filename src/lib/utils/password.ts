/**
 * Calculate password strength based on length
 * Returns label and color class for displaying strength indicator
 */
export function getPasswordStrength(password: string): {
  label: string;
  color: string;
} {
  if (!password) {
    return { label: "", color: "" };
  }

  if (password.length < 6) {
    return {
      label: "Too short",
      color: "text-destructive",
    };
  }

  if (password.length < 8) {
    return {
      label: "Weak",
      color: "text-yellow-600 dark:text-yellow-500",
    };
  }

  if (password.length < 12) {
    return {
      label: "Good",
      color: "text-blue-600 dark:text-blue-500",
    };
  }

  return {
    label: "Strong",
    color: "text-green-600 dark:text-green-500",
  };
}
