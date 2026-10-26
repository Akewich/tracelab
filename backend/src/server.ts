import { createServer } from "node:http";
import {
  context,
  propagation,
  ROOT_CONTEXT,
  SpanKind,
  trace,
  isSpanContextValid,
} from "@opentelemetry/api";
import { Recorder, activeTraceId } from "@tracelab/shared/telemetry";
import { orders } from "@tracelab/shared/fixtures";
import { sleep } from "@tracelab/shared";

export function createBackendServer() {
  return createServer((request, response) => {
    void (async () => {
      const path = new URL(request.url ?? "/", "http://localhost").pathname;
      if (path === "/health") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({ status: "ok", service: "tracelab-backend" }),
        );
        return;
      }
      if (request.method !== "GET") {
        response.writeHead(405, { Allow: "GET" });
        response.end();
        return;
      }
      const route = ["/orders", "/simulate"].includes(path)
        ? path
        : "/not-found";
      // Start from ROOT_CONTEXT so unrelated requests cannot become accidental parents.
      const extracted = propagation.extract(ROOT_CONTEXT, request.headers);
      const parent = trace.getSpanContext(extracted);
      await context.with(extracted, async () => {
        const recorder = new Recorder();
        await recorder.run(
          `GET ${route}`,
          async (scope, span) => {
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Cache-Control", "no-store");
            const traceId = activeTraceId();
            if (traceId) response.setHeader("X-Trace-Id", traceId);
            if (route === "/orders") {
              const result = await scope.run(
                "fetch-orders",
                async (child, ordersSpan) => {
                  await child.run(
                    "simulate-database-query",
                    async () => sleep(65),
                    {
                      "db.system.name": "simulated",
                      "db.operation.name": "SELECT",
                      "app.simulated": true,
                    },
                  );
                  ordersSpan.setAttribute("orders.count", orders.length);
                  return orders;
                },
              );
              span.setAttribute("http.response.status_code", 200);
              response.end(JSON.stringify({ orders: result, traceId }));
            } else if (route === "/simulate") {
              await scope.run(
                "external-api-simulation",
                async (child) => {
                  await child.run(
                    "fetch-customer-information",
                    async () => sleep(95),
                    { "app.simulated": true },
                  );
                  await child.run(
                    "simulate-database-query",
                    async () => sleep(140),
                    {
                      "db.system.name": "simulated",
                      "db.operation.name": "SELECT",
                      "app.simulated": true,
                    },
                  );
                },
                { "app.simulated": true },
              );
              span.setAttribute("http.response.status_code", 200);
              const own = span.spanContext();
              response.end(
                JSON.stringify({
                  ok: true,
                  traceId,
                  serverSpanId: isSpanContextValid(own) ? own.spanId : null,
                  parentSpanId:
                    parent && isSpanContextValid(parent) ? parent.spanId : null,
                }),
              );
            } else {
              response.statusCode = 404;
              span.setAttribute("http.response.status_code", 404);
              response.end(JSON.stringify({ error: "Not found" }));
            }
          },
          { "http.request.method": "GET", "http.route": route },
          null,
          SpanKind.SERVER,
        );
      });
    })().catch(() => {
      if (!response.headersSent)
        response.writeHead(500, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Backend request failed" }));
    });
  });
}
