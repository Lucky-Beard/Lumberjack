import type { IClosedLog, ILoggingSpan, SpanLogLevels } from "./types";
import { sanitize_object } from "./utils";

export class ClosedLoggerSpan implements IClosedLog {
  #data: Record<string, unknown>;
  #level: SpanLogLevels;

  public get data() {
    return this.#data;
  }

  public get level() {
    return this.#level;
  }

  constructor(map: Map<string, unknown>, level: SpanLogLevels) {
    const asObject = Object.fromEntries(map.entries());
    this.#data = Object.seal(asObject);
    this.#level = level;
  }
}

export class LoggingSpan implements ILoggingSpan {
  #closed: boolean = false;
  #details: Map<string, unknown> = new Map();
  #level: SpanLogLevels = "info";
  #start_time: number;

  constructor(name: string) {
    this.#details.set("span.name", name);
    this.#details.set("span.time_start", new Date().toISOString());
    this.#start_time = Date.now();
  }

  public set_level(level: SpanLogLevels): this {
    this.#level = level;
    return this;
  }

  public static start(name: string): LoggingSpan {
    return new LoggingSpan(name);
  }

  public add_metric(key: string, value: unknown): this {
    if (this.#closed) {
      console.warn(
        `Attempted to add metric ${key} to closed span ${this.#details.get("span.name")}`,
      );
    } else {
      this.#details.set(key, this.parse_value(value));
    }

    return this;
  }

  public add_bulk_metrics(metrics: Record<string, unknown>): this {
    for (const [key, value] of Object.entries(metrics)) {
      this.add_metric(key, value);
    }

    return this;
  }

  public close(): IClosedLog {
    this.#details.set("span.running_duration_ms", Date.now() - this.#start_time);
    this.#details.set("span.time_end", new Date().toISOString());

    this.#closed = true;
    return new ClosedLoggerSpan(this.#details, this.#level);
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
}
