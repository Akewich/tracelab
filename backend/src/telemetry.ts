import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { SafeTraceExporter } from "@tracelab/shared/exporter";

const base = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";
export const sdk = new NodeSDK({
  resource: resourceFromAttributes({ "service.name": "tracelab-backend" }),
  autoDetectResources: false,
  textMapPropagator: new W3CTraceContextPropagator(),
  traceExporter: new SafeTraceExporter(
    new OTLPTraceExporter({
      url:
        process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
        `${base.replace(/\/$/, "")}/v1/traces`,
    }),
  ),
  instrumentations: [],
});
sdk.start();
