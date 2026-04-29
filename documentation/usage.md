---
outline: deep
---

# Usage

Lumberjack helps you build one wide structured log event around a unit of work. Start a **Logging Span**, add **Metrics** as the work progresses, then close the span once to produce a **Closed Logging Span**.

Use `log_close()` when normal console logging is enough. Use `close()` when you want to send the **Log Payload** somewhere else, such as an HTTP logging endpoint.

## Install

Install the package from npm:

```sh
npm install @luckybeard/lumberjack
```

Then import `LoggingSpan` from the package entrypoint:

```ts
import { LoggingSpan } from "@luckybeard/lumberjack";
```

## Log To Console With `log_close()`

`log_close()` closes the Logging Span, writes the Log Payload with `console[closed.level]`, and returns the Closed Logging Span.

This is the simplest path when your runtime already collects console logs.

```ts {4,29}
import { LoggingSpan } from "@luckybeard/lumberjack";

async function submitCheckout(cartId: string) {
  const span = LoggingSpan.start("checkout.submit")
    .add_metric("cart.id", cartId)
    .set_level("info");

  try {
    const response = await fetch("https://payments.example.com/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cartId }),
    });

    span
      .add_metric("payment.response", response)
      .add_metric("checkout.accepted", response.ok)
      .set_level(response.ok ? "info" : "warn");

    if (!response.ok) {
      throw new Error(`Checkout failed with ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    span.add_metric("error", error).set_level("error");
    throw error;
  } finally {
    span.log_close();
  }
}
```

The emitted payload includes Lumberjack's span lifecycle data plus the Metrics you added:

```ts
{
  "span.name": "checkout.submit",
  "span.time_start": "2026-04-29T10:00:00.000Z",
  "cart.id": "cart_123",
  "payment.response": {
    status: 200,
    statusText: "OK",
    headers: {
      "x-request-id": "req_123"
    }
  },
  "checkout.accepted": true,
  "span.running_duration_ms": 42,
  "span.time_end": "2026-04-29T10:00:00.042Z"
}
```

## Send Logs With `close()`

Use `close()` when you want the Closed Logging Span without writing to `console`. The app remains responsible for delivery, retries, authentication, batching, and endpoint behavior.

The recommended HTTP body is `{ level, data }`, because the severity level is stored on the Closed Logging Span and the Log Payload is stored on `closed.data`.

```ts {3-12}
import { LoggingSpan, type IClosedLoggerSpan } from "@luckybeard/lumberjack";

async function sendLog(closed: IClosedLoggerSpan) {
  await fetch("https://logs.example.com/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      level: closed.level,
      data: closed.data,
    }),
  });
}

async function submitCheckout(cartId: string) {
  const span = LoggingSpan.start("checkout.submit").add_bulk_metrics({
    "cart.id": cartId,
    "checkout.channel": "web",
  });

  try {
    const response = await fetch("https://payments.example.com/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cartId }),
    });

    span
      .add_metric("payment.response", response)
      .add_metric("checkout.accepted", response.ok)
      .set_level(response.ok ? "info" : "warn");

    if (!response.ok) {
      throw new Error(`Checkout failed with ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    span.add_metric("error", error).set_level("error");
    throw error;
  } finally {
    const closed = span.close();

    try {
      await sendLog(closed);
    } catch (deliveryError) {
      console.warn("Failed to deliver checkout log", deliveryError);
    }
  }
}
```

Choose one closing method per Logging Span: call either `log_close()` or `close()`, not both.

## Metrics

Metrics are named values recorded on a Logging Span. Use dotted names to group related values:

```ts
const span = LoggingSpan.start("checkout.submit")
  .add_metric("cart.id", "cart_123")
  .add_metric("customer.id", "customer_456")
  .add_metric("checkout.total", 129.99)
  .add_metric("checkout.currency", "USD");
```

Use `add_bulk_metrics()` when you already have several values at the same point in the operation:

```ts
span.add_bulk_metrics({
  "cart.id": "cart_123",
  "customer.id": "customer_456",
  "checkout.channel": "web",
});
```

If the same key is added more than once before closing, the latest value is kept.

## Levels

Every Logging Span has a level. The default is `info`.

```ts
span.set_level("warn");
```

Supported levels are:

- `info`
- `warn`
- `error`
- `trace`

`log_close()` uses the level to choose the console method. For example, an `error` level span is written with `console.error(closed.data)`.

## Closing Behavior

Closing a Logging Span adds lifecycle Metrics to the Log Payload:

- `span.running_duration_ms`
- `span.time_end`

The span also includes these Metrics from the moment it is started:

- `span.name`
- `span.time_start`

After a span is closed, later calls to `add_metric()` are ignored and Lumberjack writes a warning to `console.warn`.

## Sanitization

Lumberjack clones object Metrics and sanitizes top-level keys before storing them on the Log Payload.

Keys containing `token`, `key`, `password`, or `otp` are replaced with `[redacted]`. Keys containing `email` or `phone` are masked.

```ts
const closed = LoggingSpan.start("checkout.submit")
  .add_metric("customer", {
    email: "person@example.com",
    phone: "+1-555-0100",
    apiKey: "secret-key",
  })
  .close();

console.log(closed.data.customer);
```

```ts
{
  email: "pe***@example.com",
  phone: "+1***100",
  apiKey: "[redacted]"
}
```

Sanitization is a convenience layer, not a security boundary. Nested object values are cloned but not recursively sanitized.

## Special Values

Lumberjack handles common runtime values before adding them to the Log Payload:

- `Error` and `TypeError` values become `{ detail, stack, cause }`.
- `Response` values become `{ status, statusText, headers }` with sanitized headers.
- Objects are cloned and sanitized by top-level key.
- Primitive values are stored as-is.

## API At A Glance

| API | Description |
| --- | --- |
| `LoggingSpan.start(name)` | Starts a Logging Span and records `span.name` and `span.time_start`. |
| `new LoggingSpan(name)` | Direct constructor. Prefer `LoggingSpan.start()` in examples and application code. |
| `span.add_metric(key, value)` | Adds or replaces one Metric. |
| `span.add_bulk_metrics(metrics)` | Adds or replaces several Metrics. |
| `span.set_level(level)` | Sets the level used by `log_close()` and exposed on the Closed Logging Span. |
| `span.close()` | Closes the span and returns a Closed Logging Span without writing to `console`. |
| `span.log_close()` | Closes the span, logs `closed.data` through `console[closed.level]`, and returns the Closed Logging Span. |

## Runtime Requirements

Lumberjack is an ESM TypeScript package for modern runtimes that provide these globals:

- `console`
- `structuredClone`
- `Response`

The package also exports test stubs from `@luckybeard/lumberjack/testing`. Keep runtime usage focused on `@luckybeard/lumberjack`; use the testing entrypoint when you want to replace real logging spans in tests.
