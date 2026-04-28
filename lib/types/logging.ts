export type SpanLogLevels = "info" | "warn" | "error" | "trace";

export interface IClosedLog {
  readonly data: Record<string, unknown>;
  readonly level: SpanLogLevels;
}

export interface ILoggingSpan {
  set_level(level: SpanLogLevels): this;

  add_metric(key: string, value: unknown): this;

  add_bulk_metrics(metrics: Record<string, unknown>): this;

  close(): IClosedLog;

  log_close(): IClosedLog;
}
