import { getPasswordStrength } from "@/lib/utils/password";

interface PasswordStrengthProps {
  password: string;
  id?: string;
}

/**
 * Displays password strength indicator based on password length
 */
export function PasswordStrength({ password, id }: PasswordStrengthProps) {
  const { label, color } = getPasswordStrength(password);

  if (!label) {
    return null;
  }

  return (
    <p id={id} className={`text-sm ${color}`}>
      Password strength: {label}
    </p>
  );
}
