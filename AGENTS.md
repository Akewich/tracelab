<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may
differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Project rules

Read `docs/ARCHITECTURE.md` first. Summary:

- Feature code goes in `src/features/<name>/` (`contracts.ts`, `schemas.ts`,
  `server/`, `components/`, and actions when needed).
- `src/app/` holds thin route files only: parse params, call a feature
  query, compose feature components.
- Imports flow `app → features → lib/components/config/i18n`. ESLint enforces
  this; do not disable the rule.
- Read data in Server Components through `features/<name>/server/*`, which
  use `apiRequest` from `@/lib/api/base`. Do not `fetch('/api/...')` from
  Client Components for page data.
- Mutations are Server Actions that return `ActionResult` and never throw to
  the client.
- Validate every backend response with zod in `contracts.ts`.
- Put all user-facing copy in `src/i18n/th.ts`.
- Use design tokens from `globals.css` (`bg-background`, `text-muted-foreground`,
  …), never raw colors.
- Colocate tests as `*.test.ts(x)`. Run `pnpm check` before you finish.
- Never expose tokens, `API_URL`, or other secrets to the browser.

## TraceLab adaptations

- Use Biome for formatting (`pnpm format`, `pnpm format:check`) and ESLint
  for Next.js/TypeScript checks. Run `pnpm check` before finishing and report
  environment blockers truthfully.
- `/api/lab` intentionally supports client-triggered experiments. It is not
  a page-data client fetching layer. `/api/orders` is an inspectable API.
- Fixed-destination health checks directly probe the backend, Jaeger, and
  Grafana. Commerce queries use `apiRequest` with Zod contracts.
- Shared cross-process contracts and telemetry live in `packages/shared`.
- Preserve explicit W3C context injection/extraction, valid real trace IDs,
  and the safe exporter. Do not replace missing SDK packages with mocks.
- Keep local measured waterfall rows distinct from exported trace data.
