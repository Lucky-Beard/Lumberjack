import type { IClosedLog, ILoggingSpan, SpanLogLevels } from "../types";

export class ClosedLogStub implements IClosedLog {
  public get data(): Record<string, unknown> {
    return Object.freeze({ data: "frozen" });
  }

  public get level(): SpanLogLevels {
    return "info";
  }
}

export class LoggerSpanStub implements ILoggingSpan {
  public set_level(_level: SpanLogLevels): this {
    return this;
  }

  public add_metric(_key: string, _value: unknown): this {
    return this;
  }

  public add_bulk_metrics(_metrics: Record<string, unknown>): this {
    return this;
  }

  public close(): IClosedLog {
    return new ClosedLogStub();
  }

  public log_close(): IClosedLog {
    return this.close();
  }

  public set_name(_name: string): this {
    return this;
  }

  public waypoint(name: string): ILoggingSpan;
  public waypoint(name: string, watcher: () => Promise<void>): Promise<ILoggingSpan>;
  public waypoint(name: string, watcher: () => void): ILoggingSpan;
  public waypoint(_name: string, watcher?: () => void | Promise<void>): ILoggingSpan | Promise<ILoggingSpan> {
    if (typeof watcher === "function") {
      const result = watcher();
      if (result instanceof Promise) {
        return result.then(() => this);
      }
    }
    return this;
  }
}
