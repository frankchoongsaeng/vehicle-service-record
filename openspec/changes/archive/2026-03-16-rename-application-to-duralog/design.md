## Context

The current product name appears in multiple user-visible locations, including route headers, metadata, and README onboarding text. The requested change is a rebrand to "Duralog" without modifying backend API routes, database schema, or package-level technical identifiers.

## Goals / Non-Goals

**Goals:**

- Ensure the UI consistently displays "Duralog" in primary user flows (login, signup, dashboard/app shell).
- Ensure user-facing metadata and documentation reflect the new name.
- Avoid functional regressions in authentication and core vehicle/service workflows while applying text-level branding updates.

**Non-Goals:**

- Renaming npm package names, route paths, or backend API endpoint paths.
- Changing auth/session behavior, database models, or server-side business logic.
- Introducing a new logo system or visual redesign beyond textual product naming updates.

## Decisions

- Decision: Treat the change as user-facing branding copy updates across frontend and docs.
  - Rationale: The user request is a rename, not a functional refactor.
  - Alternative considered: Full repository-wide identifier rename (project folder, package names, internal constants). Rejected to minimize risk and scope.

- Decision: Keep technical/internal identifiers stable unless surfaced directly to end users.
  - Rationale: Preserves compatibility for scripts, API clients, and existing development workflows.
  - Alternative considered: Align all internal identifiers with brand name. Rejected because it introduces unnecessary breaking risk for a branding-only request.

- Decision: Validate branding consistency via targeted grep checks for legacy product labels in user-facing files.
  - Rationale: Lightweight and deterministic verification for copy consistency.
  - Alternative considered: Rely only on manual UI checks. Rejected because text misses are common across docs and metadata.

## Risks / Trade-offs

- [Risk] Some legacy product strings may remain in less-visible copy paths (empty states, helper text, or metadata) -> Mitigation: run text search checks and manually verify key routes.
- [Risk] Over-aggressive replacements could alter technical identifiers or historical notes unintentionally -> Mitigation: scope replacements to user-facing copy and review each diff.
- [Trade-off] Keeping internal identifiers unchanged may create mixed naming in code-level artifacts -> Mitigation: document intentional boundary between user-facing branding and technical naming.
