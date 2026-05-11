import { describe, expect, test } from "bun:test";

import { ClosedLogStub, LoggerSpanStub } from "./stubs";

describe("ClosedLogStub", () => {
  test("provides an immutable default closed log payload", () => {
    const closed = new ClosedLogStub();

    expect(closed.level).toBe("info");
    expect(closed.data).toEqual({ data: "frozen" });
    expect(Object.isFrozen(closed.data)).toBe(true);
  });
});

describe("LoggerSpanStub", () => {
  test("keeps the same fluent API shape as LoggingSpan", () => {
    const span = new LoggerSpanStub();

    expect(span.set_level("warn")).toBe(span);
    expect(span.set_name("checkout")).toBe(span);
    expect(span.add_metric("order.id", "order-1")).toBe(span);
    expect(span.add_bulk_metrics({ "cart.id": "cart-1" })).toBe(span);
  });

  test("returns a closed log stub from close and log_close", () => {
    const span = new LoggerSpanStub();

    expect(span.close()).toBeInstanceOf(ClosedLogStub);
    expect(span.log_close()).toBeInstanceOf(ClosedLogStub);
  });
});
