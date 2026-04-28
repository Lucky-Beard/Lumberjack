export class ClosedLoggerSpan {
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

export class LoggingSpan {
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

  public close(): IClosedLoggerSpan {
    this.#details.set("span.running_duration_ms", Date.now() - this.#start_time);
    this.#details.set("span.time_end", new Date().toISOString());

    this.#closed = true;
    return new ClosedLoggerSpan(this.#details, this.#level);
  }

  public log_close(): IClosedLoggerSpan {
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
      headers: Object.fromEntries(response.clone().headers.entries()),
    };
  }

  private sanitize_response_data(
    data: Record<string, unknown>,
  ): Record<string, unknown> | "[Redacted]" {
    try {
      const clonedData = structuredClone(data);

      delete clonedData["token"];
      delete clonedData["accessToken"];

      if (typeof clonedData.otp !== "undefined") {
        clonedData.otp = "***" + String(clonedData.otp).substring(3);
      }

      if (typeof clonedData.email === "string") {
        clonedData.email = clonedData.email.replace(/(.{2}).+(@.+)/, "$1***$2");
      }

      if (typeof clonedData.phone === "string") {
        clonedData.phone = clonedData.phone.replace(/(.{2}).+(.{3})/, "$1***$2");
      }

      return clonedData ?? {};
    } catch {
      return "[Redacted]";
    }
  }

  private parse_value(value: unknown) {
    if (value instanceof Error || value instanceof TypeError) {
      return this.create_error_value(value);
    } else if (value instanceof Response) {
      return this.create_response_value(value);
    } else if (typeof value === "object") {
      return this.sanitize_response_data(value as Record<string, unknown>);
    }

    return value;
  }
}

export type IClosedLoggerSpan = ClosedLoggerSpan;
