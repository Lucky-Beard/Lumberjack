import type { IClosedLog, SpanLogLevels } from "../types";

export class ClosedLogStub implements IClosedLog {
  public get data(): Record<string, unknown> {
    return Object.freeze({ data: "frozen" });
  }

  public get level(): SpanLogLevels {
    return "info";
  }
}

export class LoggerSpanStub {
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
}
