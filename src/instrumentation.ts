export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerOTel } = await import("@vercel/otel");
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    );
    const { W3CTraceContextPropagator } = await import("@opentelemetry/core");
    const { SafeTraceExporter } = await import("@tracelab/shared/exporter");
    // We create and inject our own CLIENT span. Disable duplicate automatic fetch spans.
    process.env.NEXT_OTEL_FETCH_DISABLED = "1";
    const base =
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";
    registerOTel({
      serviceName: "tracelab-nextjs",
      instrumentations: [],
      propagators: [new W3CTraceContextPropagator()],
      traceExporter: new SafeTraceExporter(
        new OTLPTraceExporter({
          url:
            process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
            `${base.replace(/\/$/, "")}/v1/traces`,
        }),
      ),
    });
  }
}
