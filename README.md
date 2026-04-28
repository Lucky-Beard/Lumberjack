# Lumberjack

A small structured logging helper for building wide, span-style log events.

## Install

```sh
npm install @luckybeard/lumberjack
```

```sh
bun add @luckybeard/lumberjack
```

## Quick Start

```ts
import { LoggingSpan } from "@luckybeard/lumberjack";

LoggingSpan.start("checkout")
  .add_metric("order.id", "order_123")
  .add_metric("user", {
    email: "person@example.com",
    apiKey: "secret-key",
  })
  .set_level("info")
  .log_close();
```

`log_close()` closes the span, logs the payload through `console[level]`, and returns the closed span.

Example payload:

```ts
{
  "span.name": "checkout",
  "span.time_start": "2026-04-28T10:00:00.000Z",
  "order.id": "order_123",
  user: {
    email: "pe***@example.com",
    apiKey: "[redacted]",
  },
  "span.running_duration_ms": 12,
  "span.time_end": "2026-04-28T10:00:00.012Z",
}
```

## Use With Another Logger

Use `close()` when you want the structured payload without writing to `console`.

```ts
import { LoggingSpan } from "@luckybeard/lumberjack";

const span = LoggingSpan.start("upstream.request");

try {
  const response = await fetch("https://example.com/api");

  span.add_metric("response", response).set_level(response.ok ? "info" : "warn");
} catch (error) {
  span.add_metric("error", error).set_level("error");
}

const closed = span.close();

logger[closed.level](closed.data);
```

## API

### `LoggingSpan`

- `LoggingSpan.start(name: string): LoggingSpan` creates a span and records `span.name` and `span.time_start`.
- `new LoggingSpan(name: string)` creates a span directly.
- `add_metric(key: string, value: unknown): this` adds or replaces a metric.
- `add_bulk_metrics(metrics: Record<string, unknown>): this` adds multiple metrics.
- `set_level(level: SpanLogLevels): this` sets the level used by `log_close()` and exposed on the closed span.
- `close(): IClosedLoggerSpan` records `span.running_duration_ms` and `span.time_end`, then returns a closed span.
- `log_close(): IClosedLoggerSpan` closes the span and logs `closed.data` through `console[closed.level]`.

### `ClosedLoggerSpan`

- `data: Record<string, unknown>` is the sealed span payload.
- `level: SpanLogLevels` is the level captured when the span was closed.

### Types

```ts
type SpanLogLevels = "info" | "warn" | "error" | "trace";
type IClosedLoggerSpan = ClosedLoggerSpan;
```

## Metric Handling

- `Error` and `TypeError` values are serialized as `{ detail, stack, cause }`.
- `Response` values are serialized as `{ status, statusText, headers }`.
- Object metric values and response headers are cloned and sanitized by top-level key.
- Writes after `close()` are ignored and emit a warning.

Sanitization redacts keys containing `token`, `key`, `password`, or `otp`, and masks keys containing `email` or `phone`. Treat this as a convenience layer, not a security boundary or complete PII scrubber.

## Runtime

Lumberjack is an ESM TypeScript package for modern runtimes that provide `structuredClone`, `Response`, and `console` globals.
