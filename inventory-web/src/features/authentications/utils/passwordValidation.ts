import type { registrationError } from "../types/error";

export const validateRegistration = (password: string, confirmPassword: string): registrationError | null => {
  if (password || confirmPassword) {
    if (password !== confirmPassword) {
      return { message: "Passwords do not match", code: "PASSWORD_MISMATCH" };
    }
    if (password.length < 8) {
      return { message: "Password is too short", code: "PASSWORD_TOO_SHORT" };
    }
    if (!/[A-Z]/.test(password)) {
      return { message: "Password must contain at least one uppercase letter", code: "PASSWORD_NO_UPPERCASE" };
    }
    if (!/[0-9]/.test(password)) {
      return { message: "Password must contain at least one number", code: "PASSWORD_NO_NUMBER" };
    }
    return null;
  }
  return null;
};