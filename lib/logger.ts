import { DEFAULT_SPAN_NAME_KEY } from "./constants/keys";
import type { IClosedLog, ILoggingSpan, SpanLogLevels } from "./types";
import { sanitize_object } from "./utils";

export class ClosedLoggerSpan implements IClosedLog {
  #data: Record<string, unknown>;
  #level: SpanLogLevels;
  #name: string;

  public get data() {
    return this.#data;
  }

  public get level() {
    return this.#level;
  }

  public get name() {
    return this.#name;
  }

  constructor(name: string, map: Map<string, unknown>, level: SpanLogLevels) {
    const asObject = Object.fromEntries(map.entries());
    this.#data = Object.seal(asObject);
    this.#level = level;
    this.#name = name;
  }
}

export class LoggingSpan implements ILoggingSpan {
  #closed: boolean = false;
  #details: Map<string, unknown> = new Map();
  #level: SpanLogLevels = "info";
  #start_time: number;
  #span_name: string;
  #waypoints: string[] = ["start"];

  constructor(name: string) {
    this.#details.set(DEFAULT_SPAN_NAME_KEY, name);
    this.#details.set("span.time_start", new Date().toISOString());
    this.#start_time = Date.now();
    this.#span_name = name;
  }

  public waypoint(name: string): ILoggingSpan;
  public waypoint(name: string, watcher: () => void): ILoggingSpan;
  public waypoint(name: string, watcher: () => Promise<void>): Promise<ILoggingSpan>;
  public waypoint(
    name: string,
    watcher?: () => void | Promise<void>,
  ): ILoggingSpan | Promise<ILoggingSpan>;
  public waypoint(name: unknown, watcher?: unknown): ILoggingSpan | Promise<ILoggingSpan> {
    if (this.#closed) {
      console.warn(
        `Attempted to add waypoint ${name} to closed span ${this.#details.get(DEFAULT_SPAN_NAME_KEY)}`,
      );
      return this;
    }

    this.#waypoints.push(`${name}.start`);

    if (typeof watcher === "function") {
      const result = watcher();

      if (result instanceof Promise) {
        return result.then(() => {
          if (!this.#closed) {
            this.#waypoints.push(`${name}.end`);
          } else {
            console.warn(
              `Attempted to end waypoint ${name} to closed span ${this.#details.get(DEFAULT_SPAN_NAME_KEY)}`,
            );
          }
          return this;
        });
      } else {
        this.#waypoints.push(`${name}.end`);
      }
    }

    return this;
  }

  public set_level(level: SpanLogLevels): this {
    this.#level = level;
    return this;
  }

  public static start(name: string): LoggingSpan {
    return new LoggingSpan(name);
  }

  public add_metric(key: string, value: unknown): this {
    if (key?.trim() !== DEFAULT_SPAN_NAME_KEY) {
      this.insert_metric(key, value);
    } else {
      console.warn(
        `Span names should not be changed with add_metric. Use set_name() instead to set the span name on key ${DEFAULT_SPAN_NAME_KEY}. Attempted to set ${key} on span ${this.#details.get(DEFAULT_SPAN_NAME_KEY)}`,
      );
    }

    return this;
  }

  public add_bulk_metrics(metrics: Record<string, unknown>): this {
    for (const [key, value] of Object.entries(metrics)) {
      this.add_metric(key, value);
    }

    return this;
  }

  public set_name(name: string): this {
    this.insert_metric(DEFAULT_SPAN_NAME_KEY, name);
    this.#span_name = name;
    return this;
  }

  public close(): IClosedLog {
    if (!this.#closed) {
      this.#details.set("span.running_duration_ms", Date.now() - this.#start_time);
      this.#details.set("span.time_end", new Date().toISOString());

      this.#closed = true;

      if (this.#waypoints.length > 1) {
        this.#waypoints.push("end");
        this.#details.set("span.waypoints", this.#waypoints);
      }
    }
    return new ClosedLoggerSpan(this.#span_name, this.#details, this.#level);
  }

  public log_close(): IClosedLog {
    const data = this.close();
    console[this.#level](data.data);
    return data;
  }

  private create_error_value(error: Error | TypeError) {
    const detail = `${error.name}: ${error.message}`;

    return {
      detail,
      stack: error.stack,
      cause: JSON.stringify(error.cause),
    };
  }

  private create_response_value(response: Response) {
    return {
      status: response.status,
      statusText: response.statusText,
      headers: sanitize_object(Object.fromEntries(response.clone().headers.entries())),
    };
  }

  private parse_value(value: unknown) {
    if (value instanceof Error || value instanceof TypeError) {
      return this.create_error_value(value);
    } else if (value instanceof Response) {
      return this.create_response_value(value);
    } else if (typeof value === "object") {
      return sanitize_object(value as Record<string, unknown>);
    }

    return value;
  }

  private insert_metric(key: string, value: unknown) {
    if (this.#closed) {
      console.warn(
        `Attempted to add metric ${key} to closed span ${this.#details.get("span.name")}`,
      );
    } else {
      this.#details.set(key, this.parse_value(value));
    }
  }
}
