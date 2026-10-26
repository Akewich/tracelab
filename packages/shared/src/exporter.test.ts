import { afterAll, expect, it } from "vitest";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { SafeTraceExporter } from "./exporter.ts";

const exported = new InMemorySpanExporter();
const provider = new BasicTracerProvider({
  resource: resourceFromAttributes({
    "service.name": "tracelab-nextjs",
    "secret.resource": "secret-value",
  }),
  spanProcessors: [new SimpleSpanProcessor(new SafeTraceExporter(exported))],
});
afterAll(() => provider.shutdown());
it("exports real span identities while removing sensitive framework attributes and exceptions", async () => {
  const span = provider.getTracer("privacy-test").startSpan("checkout", {
    attributes: {
      "app.operation": "process-checkout",
      "orders.count": 12,
      "url.full": "https://example.test/orders?customer=private-person",
      "http.target": "/orders?token=private-token",
      authorization: "Bearer private-token",
      "customer.name": "private-person",
    },
  });
  span.recordException(new Error("private-token"));
  const identity = span.spanContext();
  span.end();
  await provider.forceFlush();
  const result = exported.getFinishedSpans()[0];
  expect(result?.spanContext()).toEqual(identity);
  expect(result?.attributes).toEqual({
    "app.operation": "process-checkout",
    "orders.count": 12,
  });
  expect(result?.resource.attributes).toEqual({
    "service.name": "tracelab-nextjs",
  });
  expect(result?.events[0]?.attributes?.["exception.message"]).toBe(
    "Operation failed",
  );
  expect(
    JSON.stringify({
      attributes: result?.attributes,
      events: result?.events,
      resource: result?.resource.attributes,
    }),
  ).not.toMatch(/private-person|private-token|secret-value/);
});
