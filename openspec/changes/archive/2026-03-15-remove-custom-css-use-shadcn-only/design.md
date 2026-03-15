## Context

The repository currently has two parallel styling approaches: legacy custom CSS files and newer shadcn/Tailwind component usage. This split increases maintenance overhead because visual updates require changes in multiple style systems and creates inconsistent UI behavior across routes.

The requested direction is explicit: keep the existing Remix + Express architecture, but remove custom CSS from product-facing UI and standardize on shadcn components plus Tailwind utilities only. This change is cross-cutting because it impacts route modules, shared components, and styling conventions used by the team.

## Goals / Non-Goals

**Goals:**

- Standardize product UI implementation on shadcn component primitives and Tailwind utility classes only.
- Remove dependency on custom CSS class contracts for dashboard and auth pages.
- Preserve current application behavior and route/backend architecture while migrating styling.
- Leave a reusable component baseline that future routes can follow without reintroducing custom stylesheets.

**Non-Goals:**

- Redesigning backend APIs, auth flow semantics, or data models.
- Building a new design system beyond shadcn primitives and existing Tailwind configuration.
- Introducing animations, branding refresh work, or marketing-focused visual treatments.

## Decisions

### Use shadcn primitives as the single UI abstraction layer

All route-level UI should be composed from shared shadcn primitives (for example `Button`, `Card`, `Input`, `Table`, `Badge`, `Select`, `Textarea`) and Tailwind utilities.

Rationale: this gives consistent behavior, accessibility defaults, and a predictable API for teams extending the app.

Alternatives considered:

- Keep mixed custom CSS and shadcn usage: rejected because it preserves style drift and duplicate maintenance burden.
- Replace with an entirely different component library: rejected as unnecessary migration scope.

### Remove custom CSS usage incrementally by route and feature

Migrate route modules and feature components in bounded slices (dashboard/auth first), replacing custom classes with utility composition and component variants, then remove unused CSS.

Rationale: incremental migration lowers risk and allows easy verification after each slice.

Alternatives considered:

- Big-bang stylesheet deletion: rejected due to higher regression risk and difficult debugging.

### Keep Tailwind base reset compatibility with existing app constraints

Continue using the existing Tailwind setup choices (including any preflight configuration needed to coexist with app behavior) while removing feature-specific CSS dependencies.

Rationale: this avoids unrelated global regressions while still meeting the no-custom-CSS objective for product UI implementation.

Alternatives considered:

- Enabling broad global resets during migration: rejected because it can introduce wide, hard-to-trace visual side effects.

## Risks / Trade-offs

- [Risk] Missing edge-case utility classes can cause subtle spacing or alignment regressions.
  [Mitigation] Validate each migrated screen at mobile/tablet/desktop breakpoints before removing old classes.
- [Risk] Some interactions currently rely on implicit CSS behavior.
  [Mitigation] Explicitly express hover/focus/disabled states through component variants and utility classes.
- [Risk] Team members may reintroduce ad-hoc CSS files later.
  [Mitigation] Document the rule in README/contribution guidance and keep shared primitives discoverable.

## Migration Plan

1. Inventory all route and feature files still importing or depending on custom CSS classes.
2. Replace custom class usage with shadcn primitives and Tailwind utility classes in prioritized UI surfaces.
3. Remove unused custom CSS definitions and stylesheet imports from routes/components after migration verification.
4. Build and manually verify key flows (dashboard viewing, table filtering, auth pages) across breakpoints.
5. Update documentation to declare shadcn + Tailwind utilities as the only approved UI styling path.

Rollback strategy: restore removed CSS imports and class usage from version control for affected modules if critical rendering regressions are found.

## Open Questions

- Should utility-only and shadcn-only rules apply to all legacy pages immediately, or be enforced only for newly touched modules after this migration?
- Do we want a lint/check script in a follow-up change to detect new custom CSS imports automatically?
