import "server-only";
import { SpanKind } from "@opentelemetry/api";
import { LabError } from "@tracelab/shared";
import { injectTraceContext, type Scope } from "@tracelab/shared/telemetry";
import type { z } from "zod";

/** Shared server-side API boundary: tracing, W3C propagation, timeout, and Zod validation. */
export async function apiRequest<T>(
  path: "/orders" | "/simulate",
  schema: z.ZodType<T>,
  scope: Scope,
): Promise<T> {
  return scope.run(
    `backend ${path}`,
    async (_child, span) => {
      // Inject inside the active CLIENT span so backend SERVER spans have this parent.
      const headers = injectTraceContext();
      const base = process.env.BACKEND_URL ?? "http://localhost:4000";
      let response: Response;
      try {
        response = await fetch(new URL(path, base), {
          headers,
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
      } catch {
        throw new LabError(
          "Backend unavailable. Start the backend service.",
          502,
        );
      }
      span.setAttribute("http.response.status_code", response.status);
      if (!response.ok) throw new LabError("Backend returned an error.", 502);
      const parsed = schema.safeParse(await response.json().catch(() => null));
      if (!parsed.success)
        throw new LabError("Backend response did not match its contract.", 502);
      return parsed.data;
    },
    {
      "http.request.method": "GET",
      "server.address": "tracelab-backend",
      "http.route": path,
    },
    SpanKind.CLIENT,
  );
}
