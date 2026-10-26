import type { Attributes } from "@opentelemetry/api";
import { resourceFromAttributes } from "@opentelemetry/resources";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";

const allowedAttributes = new Set([
  "app.operation",
  "app.simulated",
  "lab.scenario",
  "lab.failure_probability",
  "orders.count",
  "order.items_count",
  "db.system.name",
  "db.operation.name",
  "http.request.method",
  "http.response.status_code",
  "http.route",
  "server.address",
  "next.span_type",
  "next.route",
  "next.rsc",
]);
const allowedMessages = new Set([
  "Operation failed",
  "Simulated checkout failure.",
  "Simulated probabilistic failure.",
  "Backend unavailable. Start the backend service.",
  "Backend returned an error.",
  "Backend response did not match its contract.",
  "Trace context did not propagate to the backend.",
]);

/** Allowlist applies to framework spans too: no URLs, query strings, headers, or payloads. */
export function sanitizeSpan(span: ReadableSpan): ReadableSpan {
  const attributes: Attributes = {};
  for (const [key, value] of Object.entries(span.attributes))
    if (allowedAttributes.has(key)) attributes[key] = value;
  const events = span.events
    .filter((event) => event.name === "exception")
    .map((event) => ({
      ...event,
      attributes: {
        "exception.type": "OperationError",
        "exception.message": allowedMessages.has(
          String(event.attributes?.["exception.message"]),
        )
          ? String(event.attributes?.["exception.message"])
          : "Operation failed",
      },
    }));
  // Preserve SDK getters/methods while overriding only the export view, never the live span.
  return Object.assign(Object.create(span) as ReadableSpan, {
    attributes,
    events,
    links: [],
    status: { code: span.status.code },
    resource: resourceFromAttributes({
      "service.name":
        span.resource.attributes["service.name"] ?? "unknown_service",
    }),
  });
}

export class SafeTraceExporter implements SpanExporter {
  private exporter: SpanExporter;
  constructor(exporter: SpanExporter) {
    this.exporter = exporter;
  }
  export(
    spans: ReadableSpan[],
    callback: Parameters<SpanExporter["export"]>[1],
  ): void {
    this.exporter.export(spans.map(sanitizeSpan), callback);
  }
  shutdown(): Promise<void> {
    return this.exporter.shutdown();
  }
  forceFlush(): Promise<void> {
    return this.exporter.forceFlush?.() ?? Promise.resolve();
  }
}
