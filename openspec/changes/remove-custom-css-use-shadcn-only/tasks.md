## 1. Styling system baseline

- [x] 1.1 Inventory all custom CSS imports and class dependencies across Remix routes and shared UI components
- [x] 1.2 Confirm and document the approved shadcn primitives and Tailwind utility patterns for cards, forms, tables, badges, and actions
- [x] 1.3 Align Tailwind and shadcn configuration to support migration without introducing new custom stylesheet dependencies

## 2. Route and component migration

- [x] 2.1 Refactor dashboard route and dashboard feature components to rely only on shadcn primitives and Tailwind utility classes
- [x] 2.2 Refactor auth-facing routes/components to use the same shadcn-based primitives and utility-only styling approach
- [x] 2.3 Replace any remaining custom CSS-driven controls with shared shadcn primitives in touched modules

## 3. Custom CSS removal and verification

- [x] 3.1 Remove unused custom stylesheet files and legacy style definitions no longer referenced by migrated modules
- [x] 3.2 Remove stale stylesheet imports from route and component modules and ensure no migrated module imports feature-level custom CSS
- [x] 3.3 Run build and manual responsive validation to confirm readability, hierarchy, and interaction states remain correct

## 4. Guardrails and documentation

- [x] 4.1 Update README or contribution notes to state shadcn + Tailwind utilities as the default and custom feature CSS as disallowed
- [x] 4.2 Add follow-up enforcement guidance (lint/check strategy) to prevent new custom CSS imports from reappearing
