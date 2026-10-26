import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { context, propagation, SpanKind, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { injectTraceContext } from "@tracelab/shared/telemetry";
import {
  backendSimulationSchema,
  ordersResponseSchema,
} from "@tracelab/shared";
import { createBackendServer } from "./server.ts";
import type { AddressInfo } from "node:net";

const exporter = new InMemorySpanExporter();
const provider = new BasicTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
});
const manager = new AsyncLocalStorageContextManager().enable();
const server = createBackendServer();
let url: string;

beforeAll(async () => {
  trace.setGlobalTracerProvider(provider);
  context.setGlobalContextManager(manager);
  propagation.setGlobalPropagator(new W3CTraceContextPropagator());
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
beforeEach(() => exporter.reset());
afterAll(async () => {
  if (server.listening)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  await provider.shutdown();
  manager.disable();
  context.disable();
  propagation.disable();
  trace.disable();
});

describe("real HTTP W3C context propagation", () => {
  it("extracts the outgoing span as parent and preserves the trace through database work", async () => {
    let outgoingId = "";
    let traceId = "";
    await trace
      .getTracer("integration-caller")
      .startActiveSpan(
        "outgoing-client",
        { kind: SpanKind.CLIENT },
        async (span) => {
          try {
            outgoingId = span.spanContext().spanId;
            traceId = span.spanContext().traceId;
            const headers = injectTraceContext();
            expect(headers.traceparent).toBe(`00-${traceId}-${outgoingId}-01`);
            const response = await fetch(`${url}/simulate`, { headers });
            expect(response.status).toBe(200);
            const body = backendSimulationSchema.parse(await response.json());
            expect(body.traceId).toBe(traceId);
            expect(body.parentSpanId).toBe(outgoingId);
            expect(response.headers.get("x-trace-id")).toBe(traceId);
          } finally {
            span.end();
          }
        },
      );
    await provider.forceFlush();
    const spans = exporter.getFinishedSpans();
    const serverSpan = spans.find((span) => span.name === "GET /simulate");
    const external = spans.find(
      (span) => span.name === "external-api-simulation",
    );
    const query = spans.find((span) => span.name === "simulate-database-query");
    expect(serverSpan?.parentSpanContext?.spanId).toBe(outgoingId);
    expect(external?.parentSpanContext?.spanId).toBe(
      serverSpan?.spanContext().spanId,
    );
    expect(query?.parentSpanContext?.spanId).toBe(
      external?.spanContext().spanId,
    );
    expect(spans.every((span) => span.spanContext().traceId === traceId)).toBe(
      true,
    );
    expect(new Set(spans.map((span) => span.spanContext().spanId)).size).toBe(
      spans.length,
    );
  });

  it("isolates simultaneous requests and rejects malformed incoming context", async () => {
    const ids = await Promise.all(
      [0, 1, 2].map(async () =>
        trace
          .getTracer("concurrent-caller")
          .startActiveSpan("client", async (span) => {
            try {
              const response = await fetch(`${url}/simulate`, {
                headers: injectTraceContext(),
              });
              const body = backendSimulationSchema.parse(await response.json());
              expect(body.traceId).toBe(span.spanContext().traceId);
              expect(body.parentSpanId).toBe(span.spanContext().spanId);
              return body.traceId;
            } finally {
              span.end();
            }
          }),
      ),
    );
    expect(new Set(ids).size).toBe(3);
    const response = await fetch(`${url}/simulate`, {
      headers: { traceparent: "invalid-header" },
    });
    const body = backendSimulationSchema.parse(await response.json());
    expect(body.parentSpanId).toBeNull();
    expect(body.traceId).toMatch(/^[0-9a-f]{32}$/);
  });

  it("serves validated fixture orders without exporting personal display fields", async () => {
    const response = await fetch(`${url}/orders`);
    const body = ordersResponseSchema.parse(await response.json());
    expect(body.orders).toHaveLength(12);
    await provider.forceFlush();
    const exported = JSON.stringify(
      exporter
        .getFinishedSpans()
        .map((span) => ({ attributes: span.attributes, events: span.events })),
    );
    for (const order of body.orders)
      expect(exported).not.toContain(order.customer);
    expect(exported).not.toMatch(/password|authorization|token|cookie/i);
  });
});
