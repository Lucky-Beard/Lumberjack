import { describe, expect, test } from "bun:test";

import { LoggingSpan } from "../logger";
import { namespace } from "./metric-namespace";

describe("namespace()", () => {
  test("creates namespaced metric names", () => {
    const checkout_metric = namespace("checkout");

    const metric_name: "checkout.accepted" = checkout_metric.name("accepted");

    expect(checkout_metric.namespace).toBe("checkout");
    expect(metric_name).toBe("checkout.accepted");
  });

  test("allows nested metric names", () => {
    const payment_metric = namespace("payment");

    expect(payment_metric.name("response.status")).toBe("payment.response.status");
  });

  test("creates namespaced bulk metrics", () => {
    const checkout_metric = namespace("checkout");

    const metrics: {
      "checkout.total": number;
      "checkout.currency": string;
    } = checkout_metric.metrics({
      total: 129.99,
      currency: "USD",
    });

    expect(metrics).toEqual({
      "checkout.total": 129.99,
      "checkout.currency": "USD",
    });
  });

  test("works with add_metric", () => {
    const checkout_metric = namespace("checkout");

    const data = LoggingSpan.start("checkout")
      .add_metric(checkout_metric.name("accepted"), true)
      .close().data;

    expect(data["checkout.accepted"]).toBe(true);
  });

  test("works with add_bulk_metrics", () => {
    const checkout_metric = namespace("checkout");

    const data = LoggingSpan.start("checkout")
      .add_bulk_metrics(
        checkout_metric.metrics({
          currency: "USD",
          total: 129.99,
        }),
      )
      .close().data;

    expect(data["checkout.currency"]).toBe("USD");
    expect(data["checkout.total"]).toBe(129.99);
  });

  test("rejects invalid metric namespaces", () => {
    const invalid_namespaces = [
      "",
      " checkout",
      "checkout ",
      ".checkout",
      "checkout.",
      "checkout..submit",
      "span",
      "span.lifecycle",
    ];

    for (const ns of invalid_namespaces) {
      expect(() => namespace(ns)).toThrow();
    }
  });

  test("rejects invalid metric names", () => {
    const checkout_metric = namespace("checkout");
    const invalid_names = ["", " value", "value ", ".value", "value.", "value..nested"];

    for (const name of invalid_names) {
      expect(() => checkout_metric.name(name)).toThrow();
      expect(() => checkout_metric.metrics({ [name]: true })).toThrow();
    }
  });
});
