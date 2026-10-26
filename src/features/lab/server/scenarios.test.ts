import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  context,
  propagation,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { scenarioInput, scenarioIds, sleep } from "@tracelab/shared";
import { activeTraceId } from "@tracelab/shared/telemetry";
import { executeScenario } from "./scenarios";

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
beforeEach(() => exporter.reset());
afterAll(async () => {
  await provider.shutdown();
  manager.disable();
  context.disable();
  propagation.disable();
  trace.disable();
});
const downstream = async () => ({
  ok: true as const,
  traceId: activeTraceId(),
  serverSpanId: null,
  parentSpanId: null,
});

describe("lab scenario behavior and exported spans", () => {
  it.each(scenarioIds)(
    "%s returns the expected status and ends every span once",
    async (scenario) => {
      const result = await executeScenario(
        { scenario, failureProbability: 0 },
        { downstream, delay: async () => {}, random: () => 0.5 },
      );
      expect(result.httpStatus).toBe(scenario === "failed" ? 500 : 200);
      expect(result.status).toBe(scenario === "failed" ? "error" : "success");
      expect(result.traceId).toMatch(/^[0-9a-f]{32}$/);
      await provider.forceFlush();
      const spans = exporter.getFinishedSpans();
      expect(spans.length).toBe(result.timings.length);
      expect(new Set(spans.map((span) => span.spanContext().spanId)).size).toBe(
        spans.length,
      );
      const root = spans.find((span) => span.name === `lab.${scenario}`);
      expect(root?.status.code).toBe(
        scenario === "failed" ? SpanStatusCode.ERROR : SpanStatusCode.UNSET,
      );
      if (scenario === "failed")
        expect(root?.events.some((event) => event.name === "exception")).toBe(
          true,
        );
    },
  );

  it.each([
    { probability: 0, expected: 200 },
    { probability: 1, expected: 500 },
  ])(
    "random probability $probability deterministically returns $expected",
    async ({ probability, expected }) => {
      const result = await executeScenario(
        { scenario: "random", failureProbability: probability },
        { downstream, delay: async () => {}, random: () => 0.5 },
      );
      expect(result.httpStatus).toBe(expected);
    },
  );

  it.each([
    { scenario: "fast" as const, min: 50, max: 100 },
    { scenario: "slow" as const, min: 1500, max: 3000 },
  ])(
    "$scenario chooses delays within its documented range",
    async ({ scenario, min, max }) => {
      for (const random of [0, 0.999999]) {
        const delays: number[] = [];
        await executeScenario(
          { scenario, failureProbability: 0 },
          {
            downstream,
            delay: async (ms) => {
              delays.push(ms);
            },
            random: () => random,
          },
        );
        expect(delays[0]).toBeGreaterThanOrEqual(min);
        expect(delays[0]).toBeLessThanOrEqual(max);
      }
    },
  );

  it("preserves sequential ordering and parallel sibling relationships across await", async () => {
    for (const scenario of ["sequential", "parallel"] as const) {
      const result = await executeScenario(
        { scenario, failureProbability: 0 },
        { downstream, delay: () => sleep(15) },
      );
      const children = result.timings.slice(1);
      const [first, second, third] = children;
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      expect(third).toBeDefined();
      if (!first || !second || !third) throw new Error("Missing operation");
      if (scenario === "sequential") {
        expect(second.startMs).toBeGreaterThanOrEqual(
          first.startMs + first.durationMs,
        );
        expect(third.startMs).toBeGreaterThanOrEqual(
          second.startMs + second.durationMs,
        );
      } else {
        expect(second.startMs).toBeLessThan(first.startMs + first.durationMs);
        expect(third.startMs).toBeLessThan(first.startMs + first.durationMs);
      }
      const spans = exporter
        .getFinishedSpans()
        .filter((span) => span.spanContext().traceId === result.traceId);
      const root = spans.find((span) => span.name === `lab.${scenario}`);
      for (const child of spans.filter((span) => span !== root))
        expect(child.parentSpanContext?.spanId).toBe(
          root?.spanContext().spanId,
        );
    }
  });

  it("exports the nested checkout hierarchy", async () => {
    await executeScenario(
      { scenario: "nested", failureProbability: 0 },
      { downstream, delay: async () => {} },
    );
    const spans = exporter.getFinishedSpans();
    const parentOf = (name: string) =>
      spans.find(
        (span) =>
          span.spanContext().spanId ===
          spans.find((span) => span.name === name)?.parentSpanContext?.spanId,
      )?.name;
    expect(parentOf("process-checkout")).toBe("lab.nested");
    expect(parentOf("fetch-orders")).toBe("process-checkout");
    expect(parentOf("simulate-database-query")).toBe("fetch-orders");
    expect(parentOf("calculate-order-totals")).toBe("fetch-orders");
  });

  it("rejects unsafe input at the API boundary", () => {
    for (const input of [
      null,
      {},
      { scenario: "unknown" },
      { scenario: "random", failureProbability: -1 },
      { scenario: "random", failureProbability: 1.1 },
      { scenario: "external", url: "https://example.com" },
    ])
      expect(scenarioInput.safeParse(input).success).toBe(false);
  });
});
