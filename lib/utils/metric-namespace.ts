import { DEFAULT_SPAN_NAMESPACE } from "../constants/keys";
import type { MetricNamespace, NamespacedMetrics } from "../types";

export function namespace<const Namespace extends string>(
  namespace: Namespace,
): MetricNamespace<Namespace> {
  validate_metric_namespace(namespace);

  return {
    namespace,
    name<const Name extends string>(name: Name): `${Namespace}.${Name}` {
      validate_metric_name(name);
      return `${namespace}.${name}` as `${Namespace}.${Name}`;
    },
    metrics<const Metrics extends Record<string, unknown>>(
      metrics: Metrics,
    ): NamespacedMetrics<Namespace, Metrics> {
      const namespaced_metrics: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(metrics)) {
        validate_metric_name(key);
        namespaced_metrics[`${namespace}.${key}`] = value;
      }

      return namespaced_metrics as NamespacedMetrics<Namespace, Metrics>;
    },
  } as const;
}

function validate_metric_namespace(namespace: string): void {
  validate_dotted_name(namespace, "Metric namespace");

  if (namespace === DEFAULT_SPAN_NAMESPACE || namespace.startsWith(`${DEFAULT_SPAN_NAMESPACE}.`)) {
    throw new Error(`Metric namespace "${namespace}" is reserved by Lumberjack`);
  }
}

function validate_metric_name(name: string): void {
  validate_dotted_name(name, "Metric name");
}

function validate_dotted_name(value: string, label: string): void {
  if (value.length === 0) {
    throw new Error(`${label} cannot be empty`);
  }

  if (value.trim() !== value) {
    throw new Error(`${label} cannot start or end with whitespace`);
  }

  if (value.startsWith(".") || value.endsWith(".")) {
    throw new Error(`${label} cannot start or end with a dot`);
  }

  if (value.includes("..")) {
    throw new Error(`${label} cannot contain consecutive dots`);
  }
}
