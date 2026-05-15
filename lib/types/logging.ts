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

  /** Set the name of a span at "span.name" */
  set_name(name: string): this;

  /** Add or replace a metric on the span. */
  add_metric(key: string, value: unknown): this;

  /** Add or replace multiple metrics on the span. */
  add_bulk_metrics(metrics: Record<string, unknown>): this;

  /** Finalize the span and return its closed representation. */
  close(): IClosedLog;

  /** Finalize the span, log the closed data, and return it. */
  log_close(): IClosedLog;

  /**
   * Add a waypoint to the span, optionally providing a watcher function.
   *
   * @note - If a waypoint is watching a handle and the span is closed before it closes, the span will be ignore the closing of the waypoint.
   *
   * With this function you can add a waypoint either with a string like:
   *
   * ```ts
   * span.waypoint("db_query");
   * ```
   *
   * Or you can add a function to add start and end markers on an action
   *
   * ```ts
   * await span.waypoint("db_query", async () => {
   *   const result = await db.query("SELECT * FROM users");
   *   span.add_metric("db_query.result_count", result.length);
   * });
   * ```
   */
  waypoint(name: string): ILoggingSpan;
  waypoint(name: string, watcher: () => Promise<void>): Promise<ILoggingSpan>;
  waypoint(name: string, watcher: () => void): ILoggingSpan;
}
