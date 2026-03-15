## 1. Backend signup endpoint

- [x] 1.1 Add a signup handler in `server/src/routes/auth.ts` that validates email/password input and checks for existing user email
- [x] 1.2 Hash accepted passwords, create the user record, and issue the existing auth session cookie on successful signup
- [x] 1.3 Return structured 4xx errors for invalid payload and duplicate-email conflicts

## 2. Frontend signup experience

- [x] 2.1 Create `app/routes/signup.tsx` with signup form submission and inline error handling
- [x] 2.2 Add login/signup cross-links so users can move between auth pages without dead ends
- [x] 2.3 On successful signup, hydrate auth state and redirect to protected app entry (or preserved redirect target)

## 3. Shared auth and routing integration

- [x] 3.1 Extend auth client/provider logic in `src/auth/` to include signup API interaction and success-state handling
- [x] 3.2 Ensure route guards and session bootstrap continue to prevent unauthenticated access while supporting post-signup access
- [x] 3.3 Verify auth error mapping keeps signup validation and duplicate-email feedback user-friendly

## 4. Validation and verification

- [x] 4.1 Validate backend behavior for successful signup, duplicate email, and invalid credential payloads
- [x] 4.2 Validate frontend flows for signup success, signup failure states, and login/signup navigation links
- [x] 4.3 Run end-to-end manual checks for protected-route redirect behavior after signup and on page reload
