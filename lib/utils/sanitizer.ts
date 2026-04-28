const REDACTED_VALUE = "[redacted]" as const;

const SENSITIVE_KEYWORDS = ["token", "key", "password", "otp", "phone"] as const;
const EMAIL_KEYWORDS = ["email"] as const;
const PHONE_KEYWORDS = ["phone"] as const;

const redactorRegex = new RegExp(SENSITIVE_KEYWORDS.join("|"), "i");
const emailRegex = new RegExp(EMAIL_KEYWORDS.join("|"), "i");
const phoneRegex = new RegExp(PHONE_KEYWORDS.join("|"), "i");

/**
 * Redact an email address while preserving the first two characters and domain.
 *
 * @param input - Value to redact.
 * @returns A masked email string, or `REDACTED_VALUE` for non-string values.
 */
export function redact_email(input: unknown): string {
  try {
    if (typeof input === "string") {
      return input.replace(/(.{2}).+(@.+)/, "$1***$2");
    }
  } catch {}
  return REDACTED_VALUE;
}

/**
 * Redact a phone value while preserving the first two and last three characters.
 *
 * @param input - Phone value to redact.
 * @returns A masked phone string, or `REDACTED_VALUE` for unsupported values.
 */
export function redact_phone(input: unknown): string {
  try {
    if (typeof input === "string" || typeof input === "number") {
      return input.toString().replace(/(.{2}).+(.{3})/, "$1***$2");
    }
  } catch {}

  return REDACTED_VALUE;
}

/**
 * Clone an object and redact sensitive top-level values based on their keys.
 *
 * Email and phone keys use field-specific masking. Other sensitive keys are
 * replaced with `REDACTED_VALUE`. Nested objects are cloned but not recursively
 * sanitized.
 *
 * @param input - Object to clone and sanitize.
 * @returns A sanitized clone of the input object.
 */
export function sanitize_object(input: Record<string, unknown>): Record<string, unknown> {
  const clonedData = structuredClone(input);

  for (const key in clonedData) {
    if (emailRegex.test(key)) {
      clonedData[key] = redact_email(clonedData[key]);
    } else if (phoneRegex.test(key)) {
      clonedData[key] = redact_phone(clonedData[key]);
    } else if (redactorRegex.test(key)) {
      clonedData[key] = REDACTED_VALUE;
    }
  }

  return clonedData;
}
