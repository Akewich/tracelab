import "server-only";
import { scenarioInput, backendSimulationSchema } from "@tracelab/shared";
import { apiRequest } from "@/lib/api/base";
import { executeScenario } from "./scenarios";

export async function handleScenario(request: Request) {
  const parsed = scenarioInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: "Choose a valid scenario and a probability between 0 and 1." },
      { status: 400 },
    );
  const result = await executeScenario(parsed.data, {
    downstream: (scope) =>
      apiRequest("/simulate", backendSimulationSchema, scope),
  });
  return Response.json(result, {
    status: result.httpStatus,
    headers: {
      "Cache-Control": "no-store",
      "Server-Timing": `application;dur=${result.serverDurationMs.toFixed(2)}`,
      ...(result.traceId ? { "X-Trace-Id": result.traceId } : {}),
    },
  });
}
