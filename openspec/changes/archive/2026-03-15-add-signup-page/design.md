## Context

The project now includes a login page and cookie-backed session flow for existing users, but account creation still requires manual user provisioning outside the app. This creates onboarding friction and blocks first-time users from entering the authenticated vehicle service workflow without developer intervention.

Signup spans both frontend and backend boundaries: Remix route-level UX, shared auth state bootstrap, Express auth endpoints, and Prisma-backed user persistence. The design should align with current auth patterns so signup and login share the same session behavior and route gating.

## Goals / Non-Goals

**Goals:**

- Add a dedicated signup page for email/password registration.
- Create a backend signup endpoint with input validation, unique-email enforcement, password hashing, and session issuance.
- Reuse the existing cookie-backed auth session model so successful signup immediately authenticates the user.
- Provide deterministic error handling for duplicate emails and invalid signup input.

**Non-Goals:**

- Email verification, password reset, or social login.
- Account profile editing and user settings management.
- Reworking existing vehicle/service record domain behavior beyond auth entry flow.

## Decisions

### Add explicit signup API endpoint under auth routes

Implement a dedicated endpoint (for example `POST /api/auth/signup`) in `server/src/routes/auth.ts` to register new users. The endpoint validates payload shape, enforces basic password policy, checks for existing user by email, hashes the password using existing password helper utilities, creates the user, and issues the same auth cookie used by login.

Rationale: keeping signup in the same auth route module centralizes credential lifecycle handling and ensures a single session model.

Alternatives considered:

- Reusing login endpoint with mode flags: reduces endpoint count but mixes two distinct actions and error semantics.
- Separate user-management route for registration: possible long-term, but unnecessary split for current scope.

### Keep session model cookie-based and server-issued

After successful user creation, the backend sets the existing `HttpOnly` session cookie and returns authenticated user payload shape consistent with login/session bootstrap endpoints.

Rationale: this avoids introducing client token storage and keeps auth state transitions uniform across login and signup.

Alternatives considered:

- Return token only and let client store it: adds client complexity and weakens security posture.
- Require immediate login after signup: adds extra friction and duplicate credential submission.

### Add dedicated signup page with explicit login cross-link

Create `app/routes/signup.tsx` with a form for email/password (and confirmation if chosen by implementation) plus a clear link to the existing login page. On success, update auth state and redirect into the protected application entry route (or preserved redirect target when present).

Rationale: first-time users need a direct account creation entry point, and cross-linking avoids dead-end auth screens.

Alternatives considered:

- Single combined auth page with mode toggle: compact UI but more branching complexity and weaker route semantics.
- Signup modal from login page: increases state complexity and weakens deep-link behavior.

### Standardize validation and conflict error responses

Backend returns structured 4xx responses for invalid email/password payloads and duplicate email conflicts; frontend maps these to user-facing form errors. Duplicate email should not leak additional account metadata beyond conflict indication.

Rationale: predictable error contracts reduce frontend branching and improve UX consistency.

Alternatives considered:

- Generic auth failure message for all signup errors: simpler but prevents actionable feedback.

## Risks / Trade-offs

- Duplicate account race between concurrent requests -> Enforce unique email at both Prisma schema/index level and route-level check; map DB uniqueness errors to conflict response.
- Weak password policy could allow low-security accounts -> Apply a minimum baseline policy and document future hardening path.
- Redirect loops between protected routes, login, and signup -> Preserve redirect intent via query param and guard against redirecting to auth routes after successful signup.
- Existing login-only assumptions in frontend auth provider -> Update provider contract to handle signup success path identically to login.

## Migration Plan

1. Add signup endpoint and shared auth response/error contracts in Express auth routes.
2. Add or confirm backend data constraints for unique user email handling.
3. Implement Remix signup route UI and connect it to auth API client.
4. Update auth provider/session bootstrap flow for post-signup authenticated state.
5. Add navigation links between login and signup pages.
6. Validate end-to-end scenarios: successful signup, duplicate email, invalid payload, protected-route redirect behavior.

Rollback strategy: remove/signup-route wiring from frontend, disable signup API endpoint, and keep existing login-only behavior unchanged.

## Open Questions

- Should password confirmation be required in the initial signup form, or deferred to a later UX refinement?
- What minimum password policy should be enforced now (length-only vs. mixed character requirements)?
