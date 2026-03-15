## Context

The codebase already contains a `User` model, password hashing utilities, and token issuing and verification helpers, but the shipped product has no sign-in experience and no authenticated API surface. The current frontend mounts the vehicle management UI immediately from the index route, and the current Express routes query and mutate vehicle and service record data without any user scoping even though the Prisma schema already models `user_id` ownership.

Adding a login page therefore affects both the Remix app shell and the Express API. The design needs to introduce a minimal session model that is secure enough for a personal data application, keeps the frontend implementation simple, and aligns the API with the existing database schema.

## Goals / Non-Goals

**Goals:**

- Add a dedicated login route for email and password authentication.
- Establish a persistent authenticated session that survives page reloads.
- Restrict vehicle and service record APIs to the authenticated user and populate `user_id` on create operations.
- Provide predictable behavior for invalid credentials, expired sessions, and unauthenticated navigation.

**Non-Goals:**

- Public sign-up, password reset, or account profile management.
- Multi-factor authentication or third-party identity providers.
- Redesigning the vehicle and service record UI beyond the auth entry flow needed to reach it.

## Decisions

### Use cookie-backed sessions instead of storing tokens in browser storage

The backend will issue the existing auth token format in an `HttpOnly` cookie on successful login. The frontend will not read or manage raw tokens directly; it will rely on same-origin requests that automatically include the cookie.

Rationale: this keeps the token out of JavaScript-accessible storage, reduces client complexity, and lets the API client remain a thin fetch wrapper.

Alternatives considered:

- `localStorage` bearer token: simpler to inspect during development, but weaker against token exfiltration and requires client-side header plumbing in every request.
- Remix-managed session only: would require moving auth enforcement out of the existing Express API layer, which is more invasive than needed.

### Add a small auth API surface for login, logout, and session bootstrap

The Express server will add auth endpoints for login, logout, and fetching the current authenticated user session. The login endpoint will verify the email/password pair against the `User` table, issue the session cookie, and return the authenticated user payload. The session endpoint will let the frontend restore auth state on initial load without rendering protected content first.

Rationale: the frontend needs a single source of truth for whether a user is authenticated, and it should not infer that from failures in unrelated vehicle endpoints.

Alternatives considered:

- Using the vehicles list request as the auth probe: conflates session bootstrap with feature data loading and produces poor failure semantics.
- Login-only endpoint with no session endpoint: forces the UI to guess whether a stored session is valid after reload.

### Gate protected UI at the route entry point and preserve redirect intent

The Remix app will add a dedicated login page and route unauthenticated users away from the main application experience until session bootstrap succeeds. If a user is redirected to login from a protected entry point, the destination should be preserved and used after successful authentication.

Rationale: the current index route renders the full app immediately, which would otherwise flash protected UI before auth state is known.

Alternatives considered:

- In-component guard inside `src/App.tsx` only: easier to wire initially, but less clear routing behavior and harder to support redirect-after-login.
- Separate authenticated shell later: useful if auth expands, but unnecessary for the initial login-page change.

### Enforce authenticated ownership in existing API routes

Vehicle and service record routes will require an authenticated user and scope all reads and writes by `user_id`. Create operations will populate `user_id` from the session rather than trusting client input.

Rationale: without ownership enforcement, adding a login page would not actually protect user data and would remain inconsistent with the Prisma schema.

Alternatives considered:

- Ship the login page first and leave data routes unchanged: lower implementation effort, but functionally incomplete and a security regression.
- Pass `user_id` from the client: simpler to code, but unsafe because ownership could be forged.

### Seed or document a development login path

Because public registration is out of scope, implementation should include a development-ready way to create at least one loginable user, either through a seed script or documented manual setup.

Rationale: the feature must be testable immediately after setup.

Alternatives considered:

- Assume users already exist: not reliable for a fresh checkout.

## Risks / Trade-offs

- Session cookie behavior differs between proxied development and deployed environments → Keep requests same-origin where possible and document required cookie settings.
- Existing vehicle and record data may not yet be associated with a valid `user_id` in some local databases → Provide a migration or reset path for development databases.
- Redirect-based auth gating can create confusing loops if session bootstrap fails ambiguously → Use a dedicated session endpoint with explicit `401` behavior and clear client handling.
- Deferring sign-up means the first-user provisioning path remains operational rather than product-facing → Acceptable for this change, provided the setup path is documented.

## Migration Plan

1. Add auth routes and middleware in the Express server.
2. Update protected API routes to require an authenticated user and scope Prisma queries by `user_id`.
3. Add frontend login route, session bootstrap handling, and redirect logic.
4. Add development user provisioning and update setup documentation.
5. Validate login, reload persistence, logout, and unauthorized access behavior.

Rollback strategy: remove route gating and auth middleware, disable auth routes, and return the frontend entry point to the existing index-only flow.

## Open Questions

- Should the initial implementation expose a visible logout control as part of the main app shell, or is session expiration plus manual cookie clearing acceptable for the first pass?
- Should the development user provisioning be a Prisma seed script or a documented one-time script/SQL step?
