---
name: code-review
description: Project-specific code review guidance for the Emu parking manager app in c:\Projects\AI\emu, focused on Astro SSR, Supabase auth, operator/admin roles, pricing logic, and domain patterns used in this repository.
---

# Code Review for Emu

This skill is tuned for the project at `c:\Projects\AI\emu` and should be used to review changes against the repository's existing architecture and conventions.

## Project snapshot

- Astro 6 SSR app (`output: "server"` in `astro.config.mjs`)
- Cloudflare Workers deployment via `@astrojs/cloudflare`
- Supabase auth and database access using `@supabase/ssr`
- Role-based access for `admin` and `operator`
- Domain model centered on sectors, operators, sector assignments, pricing tiers, and reservations
- React islands for interactivity, Tailwind 4 for styling, `cn()` helper for class composition
- Server routes and UI pages are split between Astro pages/components and React components where interactivity is needed

## Patterns in the existing codebase

### 1. Server-first architecture

The app is intentionally server-rendered first. Most page files are Astro pages/components, and API routes are server-only.

Look for these patterns when reviewing:

- `src/pages/**` should stay aligned with Astro SSR patterns
- API route files should export `prerender = false`
- Server-side auth and data access should happen in server code, not browser components
- New page logic should prefer Astro data-loading patterns over ad hoc client-side fetches

### 2. Auth and access-control model

The project centralizes auth state in `src/middleware.ts`.

Important repository-specific behaviors:

- `context.locals.user` is populated from `supabase.auth.getUser()`
- `context.locals.role` is derived from `user.app_metadata.role`
- `context.locals.operatorSectors` is loaded for operators
- `/dashboard` is treated as an operator route and `/admin/*` is treated as an admin route
- Operators are immediately signed out if their record is found to be deactivated via `deactivated_at`

Review guidance:

- Do not bypass `context.locals` when checking authorization
- Do not trust client-side role checks as the only protection
- If a new route is added, decide whether it should be operator-only, admin-only, or public and wire that consistently through middleware or route guards
- If the access model changes, ensure the route prefixes and `context.locals` assumptions remain coherent

### 3. Supabase client usage

The app has a clear server-side boundary for Supabase:

- `src/lib/supabase.ts` creates the SSR client for requests
- `createAdminClient()` exists for admin-only server operations and requires `SUPABASE_SERVICE_ROLE_KEY`
- Secrets are loaded from `astro:env/server`

Review guidance:

- Reject any attempt to expose the service role key in browser code
- Prefer `createClient()` for request-scoped access
- Keep admin-only operations server-side and explicitly guarded
- Do not introduce direct `supabase` use in React components unless the component is already running in a server-rendered context that justifies it

### 4. Domain logic lives in services

This repo separates domain/business logic from route handlers.

Notable examples:

- `src/lib/services/pricingService.ts` contains pricing calculation and discount-tier logic
- `src/lib/services/sectorService.ts` is another service layer that should be used for sector-related business rules when appropriate

Review guidance:

- Keep pricing, sector, and reservation business logic in services rather than embedding raw calculation code inside pages or API handlers
- If a feature needs new business rules, prefer extending the service layer and keeping route handlers thin
- Watch for duplicated domain logic across pages, components, or API endpoints

### 5. API validation and error handling patterns

The reservation API demonstrates the repository's preferred boundary handling:

- Validate request bodies with `zod`
- Return consistent JSON error payloads
- Use `try/catch` to normalize server errors
- Distinguish client errors (invalid input, forbidden, conflict) from internal errors

Review guidance:

- New API routes should validate input at the boundary, especially external JSON payloads
- Return actionable, non-sensitive error messages
- Avoid leaking raw stack traces or internal file paths in responses

### 6. Data integrity and locking patterns

Reservation creation is intentionally protected by a database-level RPC called `create_reservation_locked`.

This is a strong project-specific pattern:

- Reservation inserts run through an RPC that locks the sector row and re-checks availability in a transaction
- This is the repo's safeguard against concurrent overbooking

Review guidance:

- If a reservation-like write path is introduced, ensure it does not bypass this concurrency-safe mechanism without an explicit rationale
- Check that any new capacity or booking logic still enforces conflict prevention

### 7. UI conventions

The UI follows a light pattern split between Astro and React:

- Astro components are used for layout and static content
- React components are used when interactivity is needed, especially forms and client-side state
- `src/lib/utils.ts` provides `cn()` to merge Tailwind classes safely
- `src/components/ui/` reflects a shadcn-style component structure

Review guidance:

- Prefer `cn()` over manual class string concatenation
- Keep new interactive logic in React components, but avoid turning Astro pages into large client-side state machines
- Reuse existing UI primitives before creating one-off patterns

### 8. Type and schema conventions

This project uses strong typing and generated Supabase types:

- `src/types.ts` contains shared custom types such as `UserRole`
- `src/database.types.ts` is the generated DB schema type
- Domain models should align with the existing DB schema rather than re-defining the same shapes in multiple places

Review guidance:

- Avoid duplicating the same type shape in several files when it already exists in generated types
- If the schema changes, ensure the generated types and any manually maintained types stay aligned

## Practical review workflow

Use this workflow when analyzing an existing code change in `c:\Projects\AI\emu`.

### Step 1: Identify the affected surface

Start from the files that are likely to be involved:

- `src/middleware.ts` — route protection and user/role propagation
- `src/lib/supabase.ts` — Supabase request client boundaries
- `src/lib/services/pricingService.ts` — business logic for pricing
- `src/pages/api/reservations.ts` — reservation write/read API behavior
- `src/pages/dashboard.astro` — operator-facing dashboard composition
- `src/pages/admin/structure.astro` — admin screens and sector administration
- `src/components/ReservationForm.tsx` — client-side reservation workflow
- `src/pages/api/sectors.ts` — sector list API
- `src/pages/api/auth/*` and `src/pages/auth/*` — authentication flow

### Step 2: Look for project-specific pattern mismatches

Review the change against these repository-specific questions:

- Does it preserve the server-first rendering model?
- Does it use `context.locals` consistently for auth/role state?
- Does it respect the operator/admin route split?
- Does it stay inside the existing service layer for pricing, sector, or reservation logic?
- Does it avoid bypassing the locked reservation creation path?
- Does it use `zod` on incoming request payloads?
- Does it keep access-control decisions on the server, not in UI code?
- Does it use existing shared helpers such as `cn()` and existing UI components?

### Step 3: Check for repo-specific risk areas

Prioritize investigation when the change touches:

- authorization or authentication
- capacity checks or reservations
- pricing tiers and discount calculations
- environment variables, Supabase config, or Cloudflare deployment assumptions
- admin or operator-only pages
- any code that adds or mutates sectors, pricing data, operator assignments, or reservation records

### Step 4: Evaluate the real business intent

This project is a parking manager, so review the implementation in terms of concrete business rules:

- Are sector assignments enforced correctly?
- Are operators only allowed to act on their assigned sectors?
- Are reservation windows validated correctly?
- Are prices derived from pricing tiers and not manually invented in the UI?
- Are business rules understandable and testable rather than hidden in page markup or ad hoc logic?

### Step 5: Produce a review with concrete recommendations

The review output should include:

1. Summary of the implementation change
2. Exact repository patterns the code matches or violates
3. Risks or bugs introduced
4. Specific file-level remediation guidance
5. Any optional refactor suggestions that would make the code more consistent with the current codebase

## Review prompt template

When using this skill, you can ask the reviewer to produce output in this format:

- "Analyze the updated code in `c:\Projects\AI\emu` and identify patterns that are specific to this project."
- "Review the change for Astro SSR, Supabase auth, operator/admin route guards, pricing/service-layer conventions, and reservation concurrency safety."
- "Return findings grouped by: architecture, auth/access control, domain logic, data integrity, and UI conventions."
- "For each issue, point to the relevant file(s) and recommend a concrete fix."

## Emu-specific anti-patterns and issue patterns

These are the most likely problems to catch when reviewing the Emu codebase. They are not generic code smells; they are patterns that would be especially suspicious in this repository.

### A. Auth and route protection patterns

Look for these issues:

- A route or page that checks `user` or `role` only on the client and never verifies access server-side
- Route guards that do not align with `src/middleware.ts` behavior
- New operator-only or admin-only pages that skip the `context.locals.role` flow
- Direct `auth.getUser()` calls in components or scripts instead of relying on middleware or server routes
- Redirect logic that can accidentally grant access to the wrong section of the app

Typical review question:

- "If a user opens this route without a valid session, would the server still block them?"

### B. Reservation and capacity integrity patterns

This is one of the highest-risk areas in the app.

Look for these issues:

- Reservation creation that bypasses the locked RPC (`create_reservation_locked`) without clear justification
- Capacity logic duplicated in multiple places instead of relying on a shared server-side path
- Validation that checks only the form inputs but not the current sector availability state
- A route that allows setting an invalid date range or inappropriate price without server-side enforcement
- Overbooking risk caused by race conditions or duplicate inserts

Typical review question:

- "Does this code still preserve the concurrency-safe reservation path when creating or modifying bookings?"

### C. Pricing and business-rule drift

Pricing is a core domain capability in this project.

Look for these issues:

- Pricing rules reimplemented in pages, components, or scripts instead of using the service layer
- Price calculations that do not respect discount tiers, floor pricing, or fractional-day behavior
- Hardcoded prices or overrides that are not tracked consistently in storage or responses
- UI-only price calculations that can diverge from server-side pricing rules

Typical review question:

- "If pricing logic changes, is there a single source of truth and does the UI stay aligned with it?"

### D. Operator/sector assignment patterns

Operator access is scoped to sectors and should remain consistent.

Look for these issues:

- Operators able to view or modify sectors they were not assigned to
- Sector assignment checks missing from server-side API code
- Code that trusts an operator's session state but never verifies the assignment record
- Admin flows that accidentally expose assignment logic to the wrong role

Typical review question:

- "Does this route still require the operator to be assigned to the target sector before reading or writing related data?"

### E. UI layering and component boundaries

This app uses Astro for server-rendered structures and React only where needed.

Look for these issues:

- Large page files accumulating too much UI state and logic instead of splitting into components
- React components doing server-side data-fetching work that belongs in Astro/server routes
- New class-name logic that bypasses `cn()` and builds strings manually
- Repeated UI patterns that should be centralized in shared components

Typical review question:

- "Is this component doing the job it should be doing, or is it mixing concerns that belong elsewhere?"

### F. Type and schema drift

This repository depends on strong typing and generated schema awareness.

Look for these issues:

- New data shapes introduced locally and then duplicated instead of using existing generated types
- Local interfaces that drift from `database.types.ts`
- Schema changes that update one layer but not the others
- Manual shape duplication for entities already represented in the Supabase schema

Typical review question:

- "If the database schema changes, do the app types, server routes, and UI all still line up?"

### G. Environment and deployment assumptions

Because the app uses Astro SSR plus Cloudflare Workers, deployment assumptions matter.

Look for these issues:

- Environment variables referenced in code without proper `astro:env/server` handling
- Secrets or service-role logic leaking into browser-visible code
- Cloudflare-specific assumptions that do not match the repo's deployment model
- Local development commands that ignore the existing `.env.example` / `.dev.vars` conventions

Typical review question:

- "Would this code behave correctly in the existing local and deployed environment setup?"

## Review checklist for this repo

Use this checklist when reviewing any change in `c:\Projects\AI\emu`:

1. Does the change preserve the Astro SSR architecture?
2. Are auth and authorization still enforced in server code?
3. Does the code respect `context.locals.user`, `context.locals.role`, and `context.locals.operatorSectors`?
4. Does the code use the existing Supabase client boundaries correctly?
5. Are request payloads validated with `zod` at API boundaries?
6. Does any write path preserve reservation concurrency safety and sector capacity checks?
7. Is business logic centralized in services instead of duplicated in route handlers or UI?
8. Is the UI using existing patterns such as `cn()` and shadcn-style component structure?
9. Does the change keep environment-variable handling aligned with `astro.config.mjs` and `astro:env/server`?
10. If the schema changed, were migrations, generated types, and dependent code updated together?

## Repo-specific red flags

Flag these patterns during review:

- Client-side role checks that are not backed by server-side auth enforcement
- New API routes missing `prerender = false`
- Direct use of service-role environment values in browser code
- Reservation or capacity updates that bypass the locked RPC path
- Duplicate pricing or business logic added in pages/components
- New routes that do not fit the `/dashboard` (operator) or `/admin/*` (admin) structure
- Manual Tailwind class concatenation where `cn()` should be used
- New tables or permission-sensitive features without RLS-aware design
- Type drift between generated database types and local application types

## Suggested output format for reviews

When reviewing, structure the response like this:

1. Summary of the change
2. Project-specific patterns found
3. Risks or violations
4. Concrete fixes with file references
5. Optional follow-up refactor suggestions

## Direct reviewer prompt

Use this prompt when you want a quick but targeted review of a change in `c:\Projects\AI\emu`:

"Review this code change for the Emu project. Focus on the repository's existing patterns: Astro SSR architecture, Supabase request-client boundaries, middleware-based auth/role handling, operator/admin route protection, pricing/service-layer conventions, reservation concurrency safety, and UI/component boundaries. Identify any project-specific anti-patterns or risks, group the findings by category, and recommend concrete fixes with relevant files."

## Severity rubric

When reporting issues, label them with one of these severity levels:

- Critical: a bug or design issue that can expose unauthorized access, allow overbooking, break reservation integrity, leak secrets, or make the application behave incorrectly in production.
- High: a serious regression in architecture, business logic, or access control that is likely to cause user-visible problems or make future maintenance unsafe.
- Medium: a pattern that is inconsistent with project conventions, increases maintenance risk, or introduces avoidable complexity.
- Low: style or consistency issues that do not materially affect correctness but should still be cleaned up.

Suggested review wording:

- "Critical — reservation creation path bypasses the locked concurrency-safe mechanism."
- "High — operator access checks are enforced only in the UI, not in the server route."
- "Medium — pricing logic is duplicated in a page component instead of using the service layer."
- "Low — class names are manually concatenated instead of using `cn()`."

## Fast PR triage checklist

For a quick review pass, use this checklist first:

1. Does the change touch auth, access control, pricing, reservations, or sector assignments?
2. If yes, are the server-side guards still in place?
3. Does any write path still preserve the sector-capacity and concurrency rules?
4. Is business logic still centralized in service code rather than embedded in pages or components?
5. Are the API boundary validations still handled with `zod` and consistent error responses?
6. Does the UI still follow the Astro/React split and `cn()` conventions?
7. Are environment variables and secrets handled through the existing Astro configuration path?
8. If the change affected schema or types, were the generated DB types and dependent code updated together?

If a change fails any of the above, it should be treated as a review priority even before deeper code inspection begins.

## Important project notes

- `src/middleware.ts` is a central architectural guardrail for route protection.
- `src/lib/supabase.ts` is the canonical server-side Supabase entry point.
- `src/lib/services/pricingService.ts` is the canonical place for pricing rules and calculations.
- `create_reservation_locked` is a high-value concurrency constraint and should be reviewed carefully whenever reservation creation is touched.
- The application is built around a parking-management domain, so changes should keep the business rules understandable and auditable.

This skill should help reviewers analyze existing code in `c:\Projects\AI\emu` and identify patterns that are specific to this repository rather than using generic code-review advice only.
