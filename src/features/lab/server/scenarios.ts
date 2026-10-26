import {
  type LabResult,
  type ScenarioInput,
  LabError,
  sleep,
  orderSchema,
} from "@tracelab/shared";
import { orders } from "@tracelab/shared/fixtures";
import {
  Recorder,
  activeTraceId,
  type Scope,
} from "@tracelab/shared/telemetry";
import { backendSimulationSchema } from "@tracelab/shared";

type Downstream = (
  scope: Scope,
) => Promise<ReturnType<typeof backendSimulationSchema.parse>>;
export interface ScenarioDependencies {
  downstream: Downstream;
  delay?: (ms: number) => Promise<void>;
  random?: () => number;
}

export async function executeScenario(
  input: ScenarioInput,
  dependencies: ScenarioDependencies,
): Promise<LabResult> {
  const recorder = new Recorder();
  const delay = dependencies.delay ?? sleep;
  const random = dependencies.random ?? Math.random;
  let traceId: string | null = null;
  let backendTraceId: string | null = null;
  let httpStatus = 200;
  let message = "Request completed successfully.";

  try {
    await recorder.run(
      `lab.${input.scenario}`,
      async (scope, span) => {
        traceId = activeTraceId();
        span.setAttribute("lab.scenario", input.scenario);
        const operation = (name: string, ms: number) =>
          scope.run(
            name,
            async (_child, operationSpan) => {
              if (name === "validate-order-data") orderSchema.parse(orders[0]);
              if (name === "calculate-order-totals") {
                orders.reduce((total, order) => total + order.total, 0);
                operationSpan.setAttribute("order.items_count", orders.length);
              }
              await delay(ms);
            },
            { "app.simulated": true },
          );
        switch (input.scenario) {
          case "fast":
            await operation(
              "simulate-database-query",
              50 + Math.floor(random() * 51),
            );
            break;
          case "slow":
            await operation(
              "simulate-database-query",
              1500 + Math.floor(random() * 1501),
            );
            break;
          case "failed":
            await scope.run(
              "process-checkout",
              async () => {
                await delay(90);
                throw new LabError("Simulated checkout failure.");
              },
              { "app.simulated": true },
            );
            break;
          case "random":
            span.setAttribute(
              "lab.failure_probability",
              input.failureProbability,
            );
            await scope.run(
              "process-checkout",
              async () => {
                await delay(180);
                if (random() < input.failureProbability)
                  throw new LabError("Simulated probabilistic failure.");
              },
              { "app.simulated": true },
            );
            break;
          case "sequential":
            await operation("validate-order-data", 120);
            await operation("fetch-customer-information", 260);
            await operation("calculate-order-totals", 180);
            break;
          case "parallel":
            await Promise.all([
              operation("fetch-customer-information", 260),
              operation("fetch-orders", 180),
              operation("calculate-order-totals", 120),
            ]);
            break;
          case "nested":
            await scope.run(
              "process-checkout",
              async (checkout) => {
                await checkout.run("validate-order-data", async () =>
                  delay(90),
                );
                await checkout.run("fetch-orders", async (ordersSpan) => {
                  await ordersSpan.run(
                    "simulate-database-query",
                    async () => delay(170),
                    {
                      "db.system.name": "simulated",
                      "db.operation.name": "SELECT",
                    },
                  );
                  await ordersSpan.run(
                    "calculate-order-totals",
                    async () => delay(100),
                    { "order.items_count": 3 },
                  );
                });
              },
              { "app.simulated": true },
            );
            break;
          case "external": {
            const backend = await dependencies.downstream(scope);
            backendTraceId = backend.traceId;
            if (traceId && backendTraceId && traceId !== backendTraceId)
              throw new LabError(
                "Trace context did not propagate to the backend.",
                502,
              );
            break;
          }
        }
        span.setAttribute("http.response.status_code", 200);
      },
      { "app.simulated": true },
    );
  } catch (error) {
    httpStatus = error instanceof LabError ? error.status : 500;
    message =
      error instanceof LabError
        ? error.message
        : "The scenario could not complete.";
  }
  const root = recorder.timings[0];
  return {
    scenario: input.scenario,
    status: httpStatus === 200 ? "success" : "error",
    message,
    httpStatus,
    traceId,
    backendTraceId,
    serverDurationMs: root?.durationMs ?? 0,
    timings: recorder.timings,
  };
}
