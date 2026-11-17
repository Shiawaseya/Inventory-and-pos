// Place at: src/lib/passwordPolicy.ts  (must mirror App\Services\AccountValidator on the backend)

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;

export const PASSWORD_RULES = [
  {
    id: "length",
    label: `${PASSWORD_MIN}-${PASSWORD_MAX} characters`,
    test: (p: string) => p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX,
  },
  {
    id: "lower",
    label: "One lowercase letter",
    test: (p: string) => /[a-z]/.test(p),
  },
  {
    id: "upper",
    label: "One uppercase letter",
    test: (p: string) => /[A-Z]/.test(p),
  },
  { id: "number", label: "One number", test: (p: string) => /\d/.test(p) },
  {
    id: "special",
    label: "One special character",
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
  {
    id: "spaces",
    label: "No spaces",
    test: (p: string) => p.length > 0 && !/\s/.test(p),
  },
] as const;

/** Same rule as the HTML `pattern` attribute used on the signup input. */
export const PASSWORD_PATTERN =
  "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s])\\S{8,64}";

export function getPasswordError(password: string): string | null {
  const failed = PASSWORD_RULES.find((r) => !r.test(password));
  return failed
    ? `Password requirement not met: ${failed.label.toLowerCase()}.`
    : null;
}

export function normalizePhone(phone: string): string {
  const p = phone.trim().replace(/[\s\-().]/g, "");
  const m = p.match(/^(?:\+63|63)(\d{10})$/);
  return m ? `0${m[1]}` : p;
}

export function getPhoneError(phone: string): string | null {
  if (!phone.trim()) return "Contact number is required.";
  return /^\+?\d{7,15}$/.test(normalizePhone(phone))
    ? null
    : "Enter a valid contact number (e.g. 09171234567).";
}

export function getEmailError(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? null
    : "Enter a valid email address.";
}
