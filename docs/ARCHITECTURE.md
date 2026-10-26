# TraceLab architecture

Derived from `../nextjs-template`. Its shadcn Base UI primitives, utility, Tailwind pipeline, and strict TypeScript settings are reused; the source template is unchanged.

The explicit playground requirements override the original template's auth-only Route Handler policy: `/api/lab` is an intentional browser-triggered experiment endpoint, and `/api/orders` is an API available for inspection. Page reads still run in Server Components through feature queries and the shared `apiRequest` boundary. Backend responses are validated with Zod. No authentication or real commerce mutation is implemented.

```
app (thin routes) → features (queries, handlers, UI)
                 → lib / components / i18n
backend → @tracelab/shared
features → @tracelab/shared
```

UI copy stays in `src/i18n/th.ts` to preserve the template convention (the playground text is English). Components use CSS theme tokens. ESLint enforces shared-layer import direction. Root and backend TypeScript are strict with unchecked-index access enabled.

## Telemetry boundary

`src/instrumentation.ts` registers `@vercel/otel` using a real OTLP HTTP exporter. The backend starts its own NodeSDK before accepting requests. OpenTelemetry 2.x / experimental-release-line 0.214.x packages are pinned together for compatibility with `@vercel/otel` 2.1.3; no experimental browser SDK is needed.

The BFF opens a CLIENT span, calls `propagation.inject(context.active(), headers)`, then sends the request. The backend calls `propagation.extract(ROOT_CONTEXT, request.headers)` and creates a SERVER span inside the extracted context. Node async-local context tracking preserves descendants through `await` and `Promise.all`. Automatic outgoing fetch instrumentation is disabled to keep one outgoing span and one unambiguous propagated parent.

`Recorder` wraps every custom span in one `try/catch/finally` and ends it exactly once. Failures record sanitized exceptions and ERROR status. Local waterfall rows use a separate monotonic clock and explicit local parent IDs. They are not read from the exporter. Backend timing rows are not merged across process clocks; see their real spans in Jaeger.

Both exporters apply an attribute allowlist to manual and framework spans, drop links, keep only the service name resource, and sanitize exception events. This removes automatic framework URLs/query strings as well as arbitrary payloads and headers. Fixture names are display-only. The playground accepts no passwords, payment numbers, tokens, or user-selected downstream URLs.

## Verification layers

- Scenario tests use the real SDK and in-memory exporter to verify ancestry, error events, span endings, delay ranges, sequential/parallel scheduling, and 0%/100% probabilities. Injected clocks/randomness make slow/failure tests deterministic without waiting three seconds per test.
- A real HTTP boundary integration test injects/extracts W3C headers, checks exported parent IDs, tests concurrent request isolation, and verifies invalid headers start a new trace.
- `verify:live` targets independently running Next.js/backend services and actual Jaeger/Grafana. It verifies both service names and parent IDs in received trace data, rather than treating a response trace ID as proof of ingestion.
- Playwright exercises page navigation, order filters/details, success/failure feedback, and learning content. These layers cover different risks; Docker ingestion cannot be established by unit tests.
