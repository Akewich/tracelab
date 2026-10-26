# TraceLab

A hands-on e-commerce observability playground built from [`../nextjs-template`](../nextjs-template). Next.js App Router, strict TypeScript, React, Tailwind, shadcn Base UI, Lucide, Zod, and real OpenTelemetry tracing across two independent processes.

**Real:** HTTP requests, server spans, W3C propagation, measured timings, exceptions, and OTLP exports.

**Simulated:** orders/customers, database queries, checkout, external-provider work, and deliberate failures. There is no real database, payment integration, or browser OpenTelemetry SDK. Client timings are browser `performance.now()` measurements, not browser spans.

## Start

Requires **Node.js 24+**, **pnpm 11.5.1**, and a running Docker engine with Compose. Ports 3000, 4000, 4317, 4318, 16686, and 3001 must be available.

```bash
cd /Users/ekawich/Desktop/Ake_work/unixdev/tracelab
pnpm install
docker compose up -d
pnpm dev
```

The root `dev` command starts both Next.js and the standalone TypeScript backend, loads optional root environment overrides, and stops both when you press Ctrl+C. Defaults work without an environment file. To customize them:

```bash
cp .env.example .env.local
```

| Service             | Address                         |
| ------------------- | ------------------------------- |
| TraceLab            | http://localhost:3000           |
| Mock backend health | http://localhost:4000/health    |
| Jaeger trace UI     | http://localhost:16686          |
| Jaeger OTLP HTTP    | http://localhost:4318/v1/traces |
| Jaeger OTLP gRPC    | localhost:4317                  |
| Grafana Explore     | http://localhost:3001/explore   |

Grafana has anonymous **Viewer** access for this local playground; there is no login step. Its provisioned `TraceLab Jaeger` data source uses **`http://jaeger:16686`** inside the Compose network. It never uses container-local `localhost` to reach Jaeger. Jaeger uses in-memory storage: restarting its container clears traces. Grafana settings persist in a named volume. Only the tracing stack runs in Docker; `pnpm dev` runs the application processes on the host.

## Explore the application

- **Overview `/`:** statistics and revenue chart computed from fictional orders; recent orders; actual backend/Jaeger/Grafana reachability checks. API latency is the latest BFF-to-backend sample (the average of one sample), not a production rolling metric. Missing services show unavailable, never invented healthy data.
- **Orders `/orders`:** server-rendered search and status filtering, order details at `/orders/ORD-1048`, streaming loading skeletons, and retryable backend errors. Searches use fictional display names; those query strings are removed from exported telemetry.
- **Lab `/lab`:** choose a scenario, click **Run experiment**, inspect status/timings/trace ID, and click **Open Jaeger**. **Run again** repeats the selected scenario. Random failure exposes a probability slider. The session history is in memory and resets on reload.
- **Learn `/learn`:** trace/span vocabulary, parent relationships, IDs, propagation, `traceparent`, instrumentation, exporters, Jaeger/Grafana, browser/server boundaries, code excerpts, and a request-flow diagram.

| Experiment            | Expected response                            | Look for in Jaeger                                            |
| --------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| Fast request          | HTTP 200; configured work 50–100 ms          | Short simulated database child                                |
| Slow request          | HTTP 200; configured work 1,500–3,000 ms     | Database child dominates the critical path                    |
| Failed request        | HTTP 500                                     | ERROR on checkout and its parent; exception events            |
| Random failure        | HTTP 200 or 500                              | `lab.failure_probability`; compare repeated traces            |
| Sequential operations | HTTP 200                                     | Three non-overlapping children; durations approximately add   |
| Parallel operations   | HTTP 200                                     | Sibling children overlap; root follows the longest child      |
| Nested spans          | HTTP 200                                     | Four levels: lab → checkout → orders → database               |
| External service      | HTTP 200; HTTP 502 if backend is unavailable | Both real service names and a cross-process parent/child edge |

Probabilities **0%** and **100%** give deterministic success and failure. Intermediate values are independent random draws, so ten requests need not match the chosen percentage exactly. Timer scheduling can overshoot configured delays; network and development compilation add further time.

## Inspect a real distributed trace

1. Start the stack and run **External service** in the lab.
2. The result displays a real active trace ID and the independently returned backend trace ID. If they match, the UI confirms their equality. An ID alone does **not** prove Jaeger ingested it.
3. Click **Open Jaeger**, which links directly to `/trace/<traceId>`. Allow a few seconds for batch export. Alternatively, select `tracelab-nextjs` in Jaeger's Search page and click **Find Traces**.
4. Confirm both service names appear in this **same** trace:

```text
tracelab-nextjs
  Next.js request / route handler
    lab.external
      backend /simulate                    CLIENT span
        tracelab-backend: GET /simulate     SERVER span
          external-api-simulation
            fetch-customer-information
            simulate-database-query
```

5. Check the backend server span's parent ID against the outgoing BFF client span's ID. In the backend source the propagated parent ID is also returned for automated verification. Framework span names can vary across Next.js releases; the custom names above are explicit in the application.
6. Open Grafana Explore, select **TraceLab Jaeger**, and search or paste the same trace ID. Grafana queries Jaeger; it is not a second collector. Metrics, logs, dashboards backed by Prometheus, and alerting are outside this playground.

### Why the services connect

`src/instrumentation.ts` uses Next.js's supported registration hook and `@vercel/otel` with service name **`tracelab-nextjs`**. `backend/src/telemetry.ts` starts an independent NodeSDK with service name **`tracelab-backend`** before accepting traffic. OpenTelemetry SDK 2.6.1 and its corresponding 0.214.0 release line are pinned for compatibility with `@vercel/otel` 2.1.3.

The outgoing request starts an explicit CLIENT span. Inside it, `propagation.inject(context.active(), headers)` writes W3C headers. The backend extracts them with `propagation.extract(ROOT_CONTEXT, request.headers)` and starts its SERVER span within `context.with(extracted, ...)`. Async-local context tracking carries ancestry across `await` and `Promise.all`. Automatic outgoing fetch spans are disabled to keep the outgoing span and propagated parent unambiguous.

The shared `Recorder` wraps custom spans with error recording, ERROR status, and one `finally` ending the span. It gets IDs from `trace.getActiveSpan()` and checks their validity. With no valid context, the UI says **Trace ID unavailable**. Both services export OTLP JSON over HTTP to `http://localhost:4318/v1/traces`.

### Understand the two durations

**Client-observed duration** starts before browser `fetch()` and ends after parsing its response. It includes network, request scheduling, server work, and response handling.

**Server application span duration** measures only the custom `lab.<scenario>` operation. It excludes framework work before/after that operation and transport. The same measurement is exposed as `Server-Timing: application;dur=...`. View complete server/framework span durations in Jaeger.

The local waterfall is explicitly an **educational representation from monotonic application timings**, separate from exported span data. It shows BFF operations, local parents, offsets, durations, and error/success. It does not pretend to fetch traces from Jaeger or combine independent machine clocks. Backend database spans are shown in Jaeger. Updating the waterfall proves execution, not export delivery.

## Commands and verification

```bash
pnpm format           # Biome formats source/config/CSS
pnpm format:check     # Biome formatting verification
pnpm lint             # Next.js / TypeScript ESLint checks
pnpm typecheck        # Next route types + strict root and backend TS
pnpm test:unit        # No network listeners needed
pnpm test             # Includes actual HTTP propagation integration tests
pnpm check            # Formatting + ESLint + TypeScript + all Vitest tests
pnpm build            # Production Next build + backend type check
pnpm verify:live      # Requires pnpm dev AND Docker stack running
pnpm exec playwright install chromium
pnpm test:e2e         # Browser navigation, order filters/details, lab success/failure
docker compose down  # Stop local infrastructure
```

`verify:live` deliberately fails if any required service is unavailable. It exercises all eight scenarios, checks 0%/100% probability behavior and invalid-input HTTP 400, then queries Jaeger for received data. It checks **both service names and the actual cross-service parent ID**, verifies nested hierarchy, and queries Jaeger through Grafana's provisioned data-source proxy. Browser/user-journey checks are separate in Playwright.

### Validation performed before the initial commit

Dependencies and the generated `pnpm-lock.yaml` are now present. CI uses a frozen lockfile; Biome excludes the generated lockfile from formatting.

| Check                              | Executed result                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Biome formatting                   | Passed with Biome 2.6.3                                                                                                  |
| ESLint                             | Passed with the installed Next.js 16.4.3 configuration                                                                   |
| TypeScript                         | Passed for Next route types, the root project, and backend                                                               |
| Vitest                             | 24 passed; the HTTP suite was blocked before its 3 tests by `listen EPERM`                                               |
| Default production build           | Attempted; Turbopack was blocked when its CSS worker tried to bind a port (`Operation not permitted`)                    |
| Webpack production build           | `pnpm exec next build --webpack` passed, including TypeScript and static page generation; backend build/typecheck passed |
| Compose configuration              | `docker compose config --quiet` passed                                                                                   |
| Docker runtime                     | Docker socket access is denied by the execution environment                                                              |
| Jaeger ingestion / Grafana queries | Not verified live in this environment                                                                                    |
| Browser / Playwright               | Not executed; no browser session available                                                                               |
| React Doctor                       | Earlier attempt blocked by npm DNS access                                                                                |

The full `pnpm check` does not pass in this sandbox because the real HTTP tests require opening a listener. The source retains those tests for a normal development machine and GitHub Actions; they are not silently skipped or replaced with fake tracing. No successful live Jaeger/Grafana verification is claimed.

## GitHub delivery

The project has its own local `main` repository. A GitHub subagent prepared [the verification workflow](.github/workflows/verify.yml) and [publication script](scripts/publish-github.mjs). CI installs dependencies, checks Biome/ESLint/types/tests, builds, starts both application processes plus Docker infrastructure, and verifies real exported traces and Grafana querying. This workflow has not run on GitHub in the implementation environment.

The publication script targets a **private `Akewich/tracelab`** repository, based on the existing template remote and GitHub account. Publishing requires valid GitHub CLI authentication and access to `api.github.com`.

After restoring network access and authenticating, install dependencies, run the full checks/live verification, review the source, and commit it before publishing:

```bash
gh auth login --hostname github.com
pnpm install
pnpm check
pnpm build
# With Docker and both app services running:
pnpm verify:live
# After reviewing and committing the project on main:
pnpm publish:github
```

The publication script requires a clean, already committed `main` tree, verifies the authenticated owner and destination privacy, and creates/pushes only the intended private repository. It never stages files, commits unreviewed work, force-pushes, rewrites history, or changes an unrelated origin. The generated lockfile is included with the source, and CI installs it with `--frozen-lockfile`.

## Troubleshooting

**`pnpm install` cannot resolve registry.npmjs.org:** fix registry/DNS/proxy access, then retry. This project does not replace missing packages with telemetry mocks. Use Node 24+ and pnpm 11.5.1; the root `packageManager` declares the intended pnpm version.

**Docker cannot connect:** start Docker Desktop or OrbStack and check `docker info`. Then run `docker compose up -d` and `docker compose logs jaeger grafana`. A successful Compose config check does not establish that the daemon or containers are running.

**Orders show an error / external scenario returns 502:** ensure `pnpm dev` launched both services. Test `curl http://localhost:4000/health`. Set `BACKEND_URL` in root `.env.local` only when the backend is elsewhere, and restart `pnpm dev`. Do not expose the server backend URL with `NEXT_PUBLIC_*`.

**`EADDRINUSE`:** stop the existing process occupying the required port. The playground intentionally uses fixed local ports so links and the Compose configuration agree. **`EPERM` on listen** means the execution environment forbids starting a server; run the project in a terminal with local networking available.

**A trace ID exists but Jaeger shows nothing:** wait a few seconds, inspect application/exporter logs, and confirm Jaeger listens on 4318. `OTEL_EXPORTER_OTLP_ENDPOINT` is the base address; `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, when set, must include `/v1/traces`. This project explicitly chooses the HTTP/JSON exporter. Port 16686 is the query UI, not the ingestion endpoint. `OTEL_SDK_DISABLED`, an external sampler override, or an incoming unsampled parent can suppress exports. Restart app processes after environment changes.

**Two services show separate traces:** run `pnpm verify:live`. Inspect outgoing `traceparent` inside the CLIENT span and incoming extraction before the backend SERVER span. Never inject before creating the client span. Avoid re-enabling competing fetch instrumentation without reviewing the propagated parent. The exact implementation lives in `src/lib/api/base.ts` and `backend/src/server.ts`.

**Grafana cannot query Jaeger:** confirm the provisioned URL is `http://jaeger:16686`, inspect Grafana logs, and check both containers are on the same Compose network. Try the same ID in Jaeger first. The supplied datasource UID is `tracelab-jaeger`; `verify:live` checks that proxy path directly.

**No trace ID available:** the SDK did not register, the code ran outside a valid span, or tracing is disabled. The application intentionally displays unavailable rather than generating an ID. See `src/instrumentation.ts` and the provider-free test.

**Client time is much longer than the fast span:** dev-mode compilation, network, framework rendering, and parsing are outside the custom server timer. Warm the route or use a production build before comparing; the configured 50–100 ms is simulated operation delay, not a guaranteed HTTP round trip.

## Project map

```text
src/app/                      Thin pages and Route Handlers
src/features/dashboard/       Demo metrics, chart, service health overview
src/features/orders/          Validated queries, list/filter/detail UI
src/features/lab/             Scenario engine, API boundary, interactive UI
src/features/learn/           Learning content and diagrams
src/lib/api/base.ts         Validated BFF calls with explicit W3C injection
src/components/               Shared shell, trace link, shadcn primitives
src/i18n/th.ts                Centralized English copy (template convention)
src/instrumentation.ts        Supported Next.js SDK registration
backend/src/                  Independent TypeScript HTTP service and SDK
packages/shared/src/          Contracts, fixtures, span helper, safe exporter
infra/                        Jaeger config and Grafana datasource provisioning
scripts/verify-live.mjs       Real-service/real-export verification
e2e/                          Playwright user journeys
```

Both exporters allowlist safe attributes, remove URL/query/header/payload attributes and links, retain only the service name resource, and sanitize exception details. Synthetic display names are never attached to spans. These behaviors are tested with deliberately sensitive-looking sentinel strings. All Docker ports bind to loopback. This is a local teaching environment; payment and infrastructure work are intentionally simulated.

See [architecture](docs/ARCHITECTURE.md) for data flow and template-specific adaptations. Reference documentation: [Next.js OpenTelemetry](https://nextjs.org/docs/app/guides/open-telemetry), [Vercel OTel](https://github.com/vercel/otel/tree/main/packages/otel), [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/), [Jaeger 2.22](https://www.jaegertracing.io/docs/2.22/), [Grafana Jaeger data source](https://grafana.com/docs/grafana/latest/datasources/jaeger/).
