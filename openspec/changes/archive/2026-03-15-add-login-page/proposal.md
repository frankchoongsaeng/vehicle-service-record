## Why

The application already models users and includes password hashing and token helpers, but there is no way for a user to sign in through the UI. Adding a dedicated login page is necessary to make authenticated access possible and to prepare the app for per-user vehicle and service record data.

## What Changes

- Add a dedicated login page for email and password sign-in.
- Add a backend login endpoint that validates credentials and issues the existing auth token format.
- Add client-side auth state handling so the app can persist a signed-in session and redirect unauthenticated users to the login page.
- Add clear error handling for invalid credentials and expired or missing sessions.

## Capabilities

### New Capabilities

- `user-login`: Allow existing users to authenticate through a login page and access the application with a valid session token.

### Modified Capabilities

None.

## Impact

Affected areas include Remix routes under `app/`, shared frontend code under `src/`, Express server routes and auth middleware under `server/src/`, and API request handling for authenticated access. This change also relies on the existing `User` Prisma model and current password/token helpers.
