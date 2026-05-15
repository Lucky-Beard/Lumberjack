import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";

import { ClosedLoggerSpan, LoggingSpan } from "./logger";

function expectIsoTimestamp(value: unknown): number {
  expect(typeof value).toBe("string");

  const timestamp = Date.parse(value as string);
  expect(Number.isNaN(timestamp)).toBe(false);

  return timestamp;
}

function expectRecord(value: unknown): Record<string, unknown> {
  expect(typeof value).toBe("object");
  expect(value).not.toBeNull();
  expect(Array.isArray(value)).toBe(false);

  return value as Record<string, unknown>;
}

afterEach(() => {
  mock.restore();
});

describe("ClosedLoggerSpan", () => {
  test("exposes a sealed snapshot of span data and the close level", () => {
    const details = new Map<string, unknown>([
      ["span.name", "checkout"],
      ["order.id", "order-1"],
    ]);

    const closed = new ClosedLoggerSpan("checkout", details, "warn");
    details.set("late.metric", "ignored");

    expect(closed.level).toBe("warn");
    expect(closed.name).toBe("checkout");
    expect(closed.data).toEqual({
      "span.name": "checkout",
      "order.id": "order-1",
    });
    expect(Object.isSealed(closed.data)).toBe(true);
  });
});

describe("LoggingSpan", () => {
  test("starts spans with lifecycle fields and preserves primitive metrics", () => {
    const span = LoggingSpan.start("checkout");

    expect(span.add_metric("order.id", "order-1")).toBe(span);
    expect(span.add_metric("attempt", 2)).toBe(span);
    expect(span.add_metric("cache.hit", false)).toBe(span);
    expect(span.add_metric("optional", null)).toBe(span);

    const closed = span.close();
    const data = closed.data;

    expect(closed).toBeInstanceOf(ClosedLoggerSpan);
    expect(closed.level).toBe("info");
    expect(data["span.name"]).toBe("checkout");
    expect(data["order.id"]).toBe("order-1");
    expect(data["attempt"]).toBe(2);
    expect(data["cache.hit"]).toBe(false);
    expect(data["optional"]).toBeNull();

    const startTime = expectIsoTimestamp(data["span.time_start"]);
    const endTime = expectIsoTimestamp(data["span.time_end"]);
    expect(endTime).toBeGreaterThanOrEqual(startTime);
    expect(typeof data["span.running_duration_ms"]).toBe("number");
    expect(data["span.running_duration_ms"] as number).toBeGreaterThanOrEqual(0);
  });

  test("updates the close level and keeps the fluent API", () => {
    const span = LoggingSpan.start("payment");

    expect(span.set_level("error")).toBe(span);

    const closed = span.close();

    expect(closed.level).toBe("error");
  });

  test("updates the span name through set_name and keeps the fluent API", () => {
    const span = LoggingSpan.start("checkout");

    expect(span.set_name("checkout.retry")).toBe(span);

    const closed = span.close();

    expect(closed).toBeInstanceOf(ClosedLoggerSpan);
    expect((closed as ClosedLoggerSpan).name).toBe("checkout.retry");
    expect(closed.data["span.name"]).toBe("checkout.retry");
  });

  test("warns and ignores attempts to change the span name with add_metric", () => {
    const warnSpy = spyOn(console, "warn").mockImplementation((..._args: unknown[]) => {});
    const span = LoggingSpan.start("checkout");

    expect(span.add_metric("span.name", "checkout.changed")).toBe(span);

    const closed = span.close();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "Span names should not be changed with add_metric. Use set_name() instead to set the span name on key span.name. Attempted to set span.name on span checkout",
    );
    expect(closed).toBeInstanceOf(ClosedLoggerSpan);
    expect((closed as ClosedLoggerSpan).name).toBe("checkout");
    expect(closed.data["span.name"]).toBe("checkout");
  });

  test("adds bulk metrics and lets later metric values replace earlier ones", () => {
    const span = LoggingSpan.start("database");

    expect(
      span.add_bulk_metrics({
        "db.operation": "select",
        "db.rows": 1,
      }),
    ).toBe(span);
    span.add_metric("db.rows", 2);

    const data = span.close().data;

    expect(data["db.operation"]).toBe("select");
    expect(data["db.rows"]).toBe(2);
  });

  test("sanitizes object metric values without mutating the input object", () => {
    const request = {
      apiKey: "secret-key",
      userEmail: "person@example.com",
      safe: "visible",
    };

    const data = LoggingSpan.start("request").add_metric("request", request).close().data;
    const requestMetric = expectRecord(data["request"]);

    expect(requestMetric).toEqual({
      apiKey: "[redacted]",
      userEmail: "pe***@example.com",
      safe: "visible",
    });
    expect(requestMetric).not.toBe(request);
    expect(request).toEqual({
      apiKey: "secret-key",
      userEmail: "person@example.com",
      safe: "visible",
    });
  });

  test("serializes error metrics with detail, stack, and JSON encoded cause", () => {
    const cause = { requestId: "request-1" };
    const error = new TypeError("Invalid payload", { cause });

    const data = LoggingSpan.start("failure").add_metric("error", error).close().data;

    expect(data["error"]).toEqual({
      detail: "TypeError: Invalid payload",
      stack: error.stack,
      cause: JSON.stringify(cause),
    });
  });

  test("serializes response metrics with sanitized headers", () => {
    const response = new Response("accepted", {
      status: 202,
      statusText: "Accepted",
      headers: {
        "X-Api-Key": "secret-key",
        "X-Request-Id": "request-1",
        "X-User-Email": "person@example.com",
      },
    });

    const data = LoggingSpan.start("upstream").add_metric("response", response).close().data;

    expect(data["response"]).toEqual({
      status: 202,
      statusText: "Accepted",
      headers: {
        "x-api-key": "[redacted]",
        "x-request-id": "request-1",
        "x-user-email": "pe***@example.com",
      },
    });
  });

  test("warns and ignores metric writes after the span is closed", () => {
    const warnSpy = spyOn(console, "warn").mockImplementation((..._args: unknown[]) => {});
    const span = LoggingSpan.start("closed").add_metric("before", "kept");
    const closed = span.close();

    expect(span.add_metric("after", "ignored")).toBe(span);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith("Attempted to add metric after to closed span closed");
    expect(closed.data["before"]).toBe("kept");
    expect(closed.data["after"]).toBeUndefined();
  });

  test("logs the closed payload through the selected console level", () => {
    const errorSpy = spyOn(console, "error").mockImplementation((..._args: unknown[]) => {});
    const span = LoggingSpan.start("log-close").set_level("error").add_metric("ok", true);

    const closed = span.log_close();

    expect(closed.level).toBe("error");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(closed.data);
    expect(closed.data["ok"]).toBe(true);
    expect(closed.data["span.time_end"]).toBeDefined();
  });

  test("omits span.waypoints when no waypoints are added", () => {
    const data = LoggingSpan.start("plain").close().data;

    expect(data["span.waypoints"]).toBeUndefined();
  });

  test("records a string-only waypoint as a start marker in the waypoints array", () => {
    const span = LoggingSpan.start("pipeline");

    expect(span.waypoint("db_query")).toBe(span);

    const data = span.close().data;

    expect(data["span.waypoints"]).toEqual(["start", "db_query.start", "end"]);
  });

  test("records start and end markers for a sync watcher waypoint", () => {
    let watcherRan = false;
    const span = LoggingSpan.start("pipeline");

    const result = span.waypoint("transform", () => {
      watcherRan = true;
    });

    expect(result).toBe(span);
    expect(watcherRan).toBe(true);

    const data = span.close().data;

    expect(data["span.waypoints"]).toEqual([
      "start",
      "transform.start",
      "transform.end",
      "end",
    ]);
  });

  test("records start and end markers for an async watcher waypoint", async () => {
    let watcherRan = false;
    const span = LoggingSpan.start("pipeline");

    const result = span.waypoint("fetch", async () => {
      watcherRan = true;
    });

    expect(result).toBeInstanceOf(Promise);

    const resolved = await result;

    expect(resolved).toBe(span);
    expect(watcherRan).toBe(true);

    const data = span.close().data;

    expect(data["span.waypoints"]).toEqual([
      "start",
      "fetch.start",
      "fetch.end",
      "end",
    ]);
  });

  test("records multiple waypoints in order", () => {
    const data = LoggingSpan.start("multi")
      .waypoint("auth")
      .waypoint("validate")
      .waypoint("persist")
      .close().data;

    expect(data["span.waypoints"]).toEqual([
      "start",
      "auth.start",
      "validate.start",
      "persist.start",
      "end",
    ]);
  });

  test("preserves waypoint order when mixing string and sync watcher waypoints", () => {
    const data = LoggingSpan.start("mixed")
      .waypoint("check")
      .waypoint("transform", () => {})
      .waypoint("done")
      .close().data;

    expect(data["span.waypoints"]).toEqual([
      "start",
      "check.start",
      "transform.start",
      "transform.end",
      "done.start",
      "end",
    ]);
  });

  test("does not duplicate lifecycle fields or waypoint end marker on repeated close", () => {
    const span = LoggingSpan.start("idempotent").waypoint("step");
    const first = span.close();
    const second = span.close();

    expect(first.data["span.waypoints"]).toEqual(["start", "step.start", "end"]);
    expect(second.data["span.waypoints"]).toEqual(first.data["span.waypoints"]);
    expect(second.data["span.time_end"]).toBe(first.data["span.time_end"]);
    expect(second.data["span.running_duration_ms"]).toBe(first.data["span.running_duration_ms"]);
  });

  test("warns and ignores waypoints added after the span is closed", () => {
    const warnSpy = spyOn(console, "warn").mockImplementation((..._args: unknown[]) => {});
    const span = LoggingSpan.start("sealed").waypoint("before");
    const closed = span.close();

    span.waypoint("after");

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(closed.data["span.waypoints"]).toEqual(["start", "before.start", "end"]);
  });

  test("does not execute a watcher when waypoint is added to a closed span", () => {
    const warnSpy = spyOn(console, "warn").mockImplementation((..._args: unknown[]) => {});
    let watcherRan = false;
    const span = LoggingSpan.start("sealed").waypoint("before");
    span.close();

    span.waypoint("after", () => {
      watcherRan = true;
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(watcherRan).toBe(false);
  });

  test("drops the async watcher end marker when the span closes before the watcher resolves", async () => {
    let resolve!: () => void;
    const gate = new Promise<void>((r) => {
      resolve = r;
    });

    const span = LoggingSpan.start("race");
    const waypointPromise = span.waypoint("slow", () => gate);

    const closed = span.close();

    resolve();
    await waypointPromise;

    expect(closed.data["span.waypoints"]).toEqual(["start", "slow.start", "end"]);
  });
});
