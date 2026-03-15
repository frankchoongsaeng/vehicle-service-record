## 1. Backend auth foundation

- [x] 1.1 Add Express auth endpoints for login, logout, and current-session lookup using the existing password and token helpers
- [x] 1.2 Add auth middleware that reads the session cookie, verifies the token, and attaches the authenticated user to the request context
- [x] 1.3 Configure cookie issuance and clearing behavior for development and production-safe defaults

## 2. Protect user data APIs

- [x] 2.1 Update vehicle routes to require authentication and scope reads and writes by the authenticated user's `user_id`
- [x] 2.2 Update service record routes to require authentication and scope reads and writes by the authenticated user's `user_id`
- [x] 2.3 Add or update backend tests/manual verification coverage for unauthorized requests, invalid credentials, and user-scoped responses

## 3. Frontend login and session flow

- [x] 3.1 Add a dedicated Remix login route with email/password form submission and invalid-credential error handling
- [x] 3.2 Add frontend session bootstrap logic that checks the current session before rendering protected app content
- [x] 3.3 Add redirect handling so unauthenticated users are sent to login and successful sign-in returns them to the intended application route

## 4. Developer setup and documentation

- [x] 4.1 Add a development user provisioning path, such as a Prisma seed script or equivalent documented setup step
- [x] 4.2 Update README and environment documentation with login setup, session requirements, and local verification steps
- [x] 4.3 Manually validate sign-in, reload persistence, logout/session clearing, and protected API behavior end to end
