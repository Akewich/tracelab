import { afterAll, beforeAll, expect, it } from "vitest";
import {
  context,
  propagation,
  ROOT_CONTEXT,
  SpanKind,
  trace,
} from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { injectTraceContext } from "./telemetry.ts";

const exporter = new InMemorySpanExporter();
const provider = new BasicTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
});
const manager = new AsyncLocalStorageContextManager().enable();
beforeAll(() => {
  trace.setGlobalTracerProvider(provider);
  context.setGlobalContextManager(manager);
  propagation.setGlobalPropagator(new W3CTraceContextPropagator());
});
afterAll(async () => {
  await provider.shutdown();
  manager.disable();
  context.disable();
  propagation.disable();
  trace.disable();
});

it("injects and extracts W3C context with correct parent IDs across asynchronous work", async () => {
  await trace
    .getTracer("caller")
    .startActiveSpan("caller", { kind: SpanKind.CLIENT }, async (caller) => {
      try {
        const headers = injectTraceContext();
        expect(headers.traceparent).toBe(
          `00-${caller.spanContext().traceId}-${caller.spanContext().spanId}-01`,
        );
        await Promise.resolve();
        const incoming = propagation.extract(ROOT_CONTEXT, headers);
        await context.with(incoming, async () =>
          trace
            .getTracer("receiver")
            .startActiveSpan(
              "receiver",
              { kind: SpanKind.SERVER },
              async (receiver) => {
                try {
                  await Promise.resolve();
                  expect(trace.getActiveSpan()?.spanContext().spanId).toBe(
                    receiver.spanContext().spanId,
                  );
                } finally {
                  receiver.end();
                }
              },
            ),
        );
      } finally {
        caller.end();
      }
    });
  await provider.forceFlush();
  const spans = exporter.getFinishedSpans();
  const caller = spans.find((span) => span.name === "caller");
  const receiver = spans.find((span) => span.name === "receiver");
  expect(receiver?.spanContext().traceId).toBe(caller?.spanContext().traceId);
  expect(receiver?.parentSpanContext?.spanId).toBe(
    caller?.spanContext().spanId,
  );
});

it("does not accept invalid traceparent as a remote parent", () => {
  for (const value of [
    "invalid",
    "00-00000000000000000000000000000000-0000000000000000-01",
  ]) {
    const parent = propagation.extract(ROOT_CONTEXT, { traceparent: value });
    expect(trace.getSpanContext(parent)).toBeUndefined();
  }
});
