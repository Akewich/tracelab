import {
  context,
  isSpanContextValid,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
  type Attributes,
  type Span,
} from "@opentelemetry/api";
import { LabError, type Timing } from "./index.ts";

export function activeTraceId(): string | null {
  const spanContext = trace.getActiveSpan()?.spanContext();
  return spanContext && isSpanContextValid(spanContext)
    ? spanContext.traceId
    : null;
}

export function injectTraceContext(): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return carrier;
}

/** Local educational timing records are separate from exported spans. */
export class Recorder {
  readonly timings: Timing[] = [];
  readonly started = performance.now();
  private nextId = 0;

  async run<T>(
    operation: string,
    work: (scope: Scope, span: Span) => Promise<T>,
    attributes: Attributes = {},
    parentId: string | null = null,
    kind = SpanKind.INTERNAL,
  ): Promise<T> {
    const row: Timing = {
      id: String(++this.nextId),
      parentId,
      operation,
      startMs: performance.now() - this.started,
      durationMs: 0,
      status: "success",
    };
    this.timings.push(row);
    const started = performance.now();
    return trace
      .getTracer("tracelab.operations")
      .startActiveSpan(
        operation,
        { kind, attributes: { "app.operation": operation, ...attributes } },
        async (span) => {
          try {
            return await work(new Scope(this, row.id), span);
          } catch (error) {
            row.status = "error";
            // Keep exception telemetry useful without recording arbitrary payloads or URLs.
            const safeMessage =
              error instanceof LabError ? error.message : "Operation failed";
            span.recordException({
              name: "OperationError",
              message: safeMessage,
            });
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: safeMessage,
            });
            if (error instanceof LabError)
              span.setAttribute("http.response.status_code", error.status);
            throw error;
          } finally {
            row.durationMs = performance.now() - started;
            span.end();
          }
        },
      );
  }
}

export class Scope {
  private recorder: Recorder;
  private parentId: string;
  constructor(recorder: Recorder, parentId: string) {
    this.recorder = recorder;
    this.parentId = parentId;
  }
  run<T>(
    operation: string,
    work: (scope: Scope, span: Span) => Promise<T>,
    attributes: Attributes = {},
    kind = SpanKind.INTERNAL,
  ) {
    return this.recorder.run(operation, work, attributes, this.parentId, kind);
  }
}
