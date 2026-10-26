import "server-only";
import { Recorder, activeTraceId } from "@tracelab/shared/telemetry";
import { ordersResponseSchema } from "../contracts";
import { apiRequest } from "@/lib/api/base";

export async function getOrders() {
  const recorder = new Recorder();
  const started = performance.now();
  return recorder.run("fetch-orders", async (scope, span) => {
    const data = await apiRequest("/orders", ordersResponseSchema, scope);
    span.setAttribute("orders.count", data.orders.length);
    return {
      ...data,
      traceId: activeTraceId(),
      durationMs: performance.now() - started,
    };
  });
}
