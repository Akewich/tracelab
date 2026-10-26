# Architecture

## Folder layout

```
src/
├── app/                      # Routing only. Thin files that compose features.
│   ├── (auth)/login/         # Public pages (centered card layout)
│   ├── (dashboard)/          # Authenticated pages (AppShell layout)
│   ├── api/auth/             # Route Handlers: auth only (refresh, logout)
│   ├── health/               # Liveness probe
│   ├── layout.tsx  error.tsx  not-found.tsx  global-error.tsx
│   └── globals.css           # Design tokens (the only place colors live)
├── features/<name>/          # Everything for one business domain
│   ├── api.ts                # Backend endpoint paths for this feature
│   ├── contracts.ts          # zod schemas for backend responses (snake → camel)
│   ├── schemas.ts            # zod schemas for forms and URL params
│   ├── actions.ts            # "use server" mutations → ActionResult
│   ├── server/               # server-only reads (queries.ts, …)
│   └── components/           # UI used only by this feature
├── components/
│   ├── ui/                   # shadcn primitives (generated; don't hand-edit much)
│   ├── layout/               # AppShell, PageHeader, NavLink
│   ├── data/                 # Generic data UI (pagination, …)
│   └── theme/                # ThemeProvider, ThemeToggle
├── lib/                      # Generic, feature-agnostic helpers
│   ├── api/                  # apiRequest client, ApiError, envelope helpers
│   ├── auth/                 # Session cookies, JWT decode, ?next= guard
│   └── action-result.ts      # ok() / fail()
├── config/                   # env.ts (server-only, validated), site.ts
├── i18n/th.ts                # All user-facing copy
└── proxy.ts                  # Session guard + nonce CSP (Next 16 "middleware")
```

Tests sit next to the file they test (`foo.ts` + `foo.test.ts`). Playwright
end-to-end tests live in `e2e/`.

## Dependency rules (enforced by Biome)

```
app/  ──▶  features/  ──▶  lib/, components/, config/, i18n/
```

- `app/` may import anything.
- `features/` must not import from `app/`.
- `lib/`, `components/`, `config/` and `i18n/` must not import from `app/` or
  `features/`.

If shared code needs something from a feature, the code belongs in that
feature. If two features need the same thing, move it down into `lib/` or
`components/` and make it generic.

A feature may import another feature's public pieces (for example
`features/auth/server/current-user`), but keep that rare. If it grows, the
code probably belongs in `lib/`.

## Data flow

**Reads:** a Server Component page parses `searchParams` with a zod schema,
calls the feature's `server/queries.ts`, and passes plain data to components
as props.

```
page.tsx → features/x/server/queries.ts → lib/api/client.apiRequest → backend
```

**Writes:** a client form calls a Server Action in `features/x/actions.ts`.
The action validates with the same zod schema the form used, calls
`apiRequest`, maps `ApiError` to a Thai message, calls `revalidatePath`, and
returns an `ActionResult`. Actions never throw to the client.

**Route Handlers** (`app/api/**`) are only for auth, webhooks, file uploads
and third-party callbacks. Do not build `fetch('/api/...')` from Client
Components for page data.

## The API client

`lib/api/client.ts` is the one place that talks to the backend:

- `apiRequest(path, schema, options)` attaches the bearer token from the
  httpOnly cookie, applies a 10 s timeout and `no-store`, checks the status,
  and parses the body with the zod schema. It returns typed data or throws
  `ApiError` with a `kind` (`unauthorized`, `forbidden`, `not_found`,
  `validation`, `rate_limited`, `server`, `network`, `contract`).
- `envelope(schema)` unwraps the backend's `{ status, data }` wrapper.
- `paginated(schema)` maps a DRF page to `{ items, pagination }`.

Use `th.apiErrors[error.kind]` for a default message, and branch on
`error.code` for backend vendor codes.

## Security defaults

- Tokens live only in httpOnly cookies. The refresh cookie is scoped to
  `/api/auth`. Browser JavaScript never sees a token.
- `API_URL` is server-only and validated at boot (`config/env.ts`). Modules
  that touch it import `server-only`, so a client import fails the build.
- `proxy.ts` sets a per-request nonce CSP. Add third-party origins there
  (e.g. map tiles) when a feature needs them.
- `next.config.ts` adds nosniff, referrer, permissions and HSTS headers.
- `?next=` redirects go through `sanitizeNextPath` (open-redirect guard).
- The proxy guard is UX only. The backend authorizes every call.

## Adding a feature

```bash
pnpm gen:feature patients
```

Then:

1. Fill in `contracts.ts` with the real backend fields.
2. Add copy to `src/i18n/th.ts`.
3. Add `src/app/(dashboard)/patients/page.tsx` (copy `items/page.tsx`).
4. Add a `NavLink` in `src/app/(dashboard)/layout.tsx`.
5. Write tests for contracts and any logic.

`features/items` is a complete reference: list with search and pagination, a
create form, a Server Action, and contract tests.
