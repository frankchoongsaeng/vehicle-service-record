## Why

The application now supports login for existing users but still has no self-service account creation flow. Adding signup now removes manual user provisioning and completes the core authentication journey for first-time users.

## What Changes

- Add a dedicated signup page where new users can register with email and password.
- Add backend signup endpoint logic that validates input, enforces unique email addresses, hashes passwords, and creates the user.
- Add client auth flow updates so a successful signup starts an authenticated session and navigates to the protected application.
- Add clear UX and API behavior for validation errors such as duplicate email and invalid password requirements.

## Capabilities

### New Capabilities

- `user-signup`: Allow new users to create an account from a dedicated signup page and start an authenticated session.

### Modified Capabilities

None.

## Impact

Affected areas include Remix auth routes under `app/routes/`, shared auth state management in `src/auth/`, Express auth route handling in `server/src/routes/auth.ts`, and validation/error shaping for session bootstrap behavior. This change also relies on the existing `User` Prisma model and password hashing/token helpers.
