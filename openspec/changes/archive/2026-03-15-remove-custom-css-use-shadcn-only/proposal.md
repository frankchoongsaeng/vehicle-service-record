## Why

The current UI mixes custom CSS stylesheets with utility classes and component-level styles, which creates inconsistent presentation and slows future UI work. Standardizing on shadcn components with Tailwind utilities only will make the interface easier to maintain, more predictable, and faster to evolve.

## What Changes

- Remove route- and feature-level custom CSS usage for application UI surfaces and replace style behavior with shadcn component variants and Tailwind utility classes.
- Define shadcn components under a shared UI layer as the default primitives for forms, cards, tables, badges, and actions.
- Update existing dashboard and auth views to use shadcn primitives consistently and eliminate direct dependency on custom CSS class contracts.
- Keep existing app architecture (Remix routes + Express backend) unchanged while migrating presentation implementation.

## Capabilities

### New Capabilities

- `ui-system-standardization`: The application UI uses shadcn components and Tailwind utility classes as the only styling system for product pages, without custom CSS files.

### Modified Capabilities

None.

## Impact

Affected areas include Remix routes in `app/`, reusable components in `src/components/`, shared styling setup (`tailwind` and shadcn primitives), and cleanup of custom stylesheet usage in `src/`. No backend API contract changes are expected.
