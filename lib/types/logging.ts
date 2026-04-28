export type SpanLogLevels = "info" | "warn" | "error" | "trace";

/** A closed logging span with its finalized payload and log level. */
export interface IClosedLog {
  /** Final span data, including user metrics and closure metadata. */
  readonly data: Record<string, unknown>;

  /** Log level captured when the span was closed. */
  readonly level: SpanLogLevels;
}

/** A mutable logging span used to collect metrics before closing. */
export interface ILoggingSpan {
  /** Set the log level used by the closed span and `log_close()`. */
  set_level(level: SpanLogLevels): this;

  /** Add or replace a metric on the span. */
  add_metric(key: string, value: unknown): this;

  /** Add or replace multiple metrics on the span. */
  add_bulk_metrics(metrics: Record<string, unknown>): this;

  /** Finalize the span and return its closed representation. */
  close(): IClosedLog;

  /** Finalize the span, log the closed data, and return it. */
  log_close(): IClosedLog;
}
