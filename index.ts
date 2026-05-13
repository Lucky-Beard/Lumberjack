/// <reference types="./missing-types.d.ts" />

export type { SpanLogLevels, IClosedLog as IClosedLoggerSpan } from "./lib/types/index.ts";
export { LoggingSpan, ClosedLoggerSpan } from "./lib/logger";
export type { MetricNamespace, NamespacedMetrics } from "./lib/types/index.ts";
export { namespace } from "./lib/utils/index";
