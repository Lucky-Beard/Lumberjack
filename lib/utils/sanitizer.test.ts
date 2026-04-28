import { describe, expect, test } from "bun:test";

import { redact_email, redact_phone, sanitize_object } from "./sanitizer";

describe("redact_email", () => {
  test("keeps the first two characters and email domain", () => {
    expect(redact_email("person@example.com")).toBe("pe***@example.com");
  });

  test("falls back to a redacted marker for non-string values", () => {
    expect(redact_email(12345)).toBe("[redacted]");
    expect(redact_email(null)).toBe("[redacted]");
  });
});

describe("redact_phone", () => {
  test("keeps the first two and last three characters from string phone values", () => {
    expect(redact_phone("+15551234567")).toBe("+1***567");
  });

  test("redacts numeric phone values after converting them to strings", () => {
    expect(redact_phone(15551234567)).toBe("15***567");
  });

  test("falls back to a redacted marker for unsupported values", () => {
    expect(redact_phone({ value: "+15551234567" })).toBe("[redacted]");
  });
});

describe("sanitize_object", () => {
  test("redacts top-level sensitive fields based on case-insensitive key names", () => {
    const sanitized = sanitize_object({
      apiKey: "secret-key",
      oneTimeOtp: "123456",
      Password: "correct-horse-battery-staple",
      sessionToken: "secret-token",
    });

    expect(sanitized).toEqual({
      apiKey: "[redacted]",
      oneTimeOtp: "[redacted]",
      Password: "[redacted]",
      sessionToken: "[redacted]",
    });
  });

  test("uses field-specific redaction for emails and phones", () => {
    const sanitized = sanitize_object({
      userEmail: "person@example.com",
      contactPhone: "+15551234567",
    });

    expect(sanitized).toEqual({
      userEmail: "pe***@example.com",
      contactPhone: "+1***567",
    });
  });

  test("preserves non-sensitive top-level fields", () => {
    const sanitized = sanitize_object({
      id: "log-1",
      status: 200,
      success: true,
    });

    expect(sanitized).toEqual({
      id: "log-1",
      status: 200,
      success: true,
    });
  });

  test("returns a sanitized clone without mutating the input object", () => {
    const input = {
      email: "person@example.com",
      nested: {
        token: "nested values are only cloned",
      },
    };

    const sanitized = sanitize_object(input);

    expect(sanitized).not.toBe(input);
    expect(sanitized.nested).not.toBe(input.nested);
    expect(input).toEqual({
      email: "person@example.com",
      nested: {
        token: "nested values are only cloned",
      },
    });
    expect(sanitized).toEqual({
      email: "pe***@example.com",
      nested: {
        token: "nested values are only cloned",
      },
    });
  });
});
