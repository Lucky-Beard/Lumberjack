export type NamespacedMetrics<Namespace extends string, Metrics extends Record<string, unknown>> = {
  [Key in keyof Metrics as Key extends string ? `${Namespace}.${Key}` : never]: Metrics[Key];
};

export type MetricNamespace<Namespace extends string = string> = {
  readonly namespace: Namespace;
  name<const Name extends string>(name: Name): `${Namespace}.${Name}`;
  metrics<const Metrics extends Record<string, unknown>>(
    metrics: Metrics,
  ): NamespacedMetrics<Namespace, Metrics>;
};
