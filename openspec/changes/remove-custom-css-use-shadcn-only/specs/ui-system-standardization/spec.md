## ADDED Requirements

### Requirement: Product UI styling shall use shadcn components and Tailwind utilities only

The system SHALL implement product-facing UI styling through shadcn component primitives and Tailwind utility classes, without relying on custom CSS files for feature or route presentation.

#### Scenario: Rendering a migrated product route

- **WHEN** a user loads a migrated route such as the dashboard or auth page
- **THEN** visual structure and interaction states are provided by shadcn components and Tailwind utility classes only

### Requirement: Shared UI primitives shall be the default composition path

The system MUST provide and use shared shadcn-based primitives for common controls such as cards, buttons, form fields, badges, tables, and selectors so route modules do not define parallel custom-styled controls.

#### Scenario: Building a new form or data panel

- **WHEN** a developer adds or updates UI for a form or data panel
- **THEN** the implementation composes shared shadcn primitives instead of introducing new custom CSS-driven controls

### Requirement: Migrated modules shall not import custom feature stylesheets

The system MUST remove direct imports of custom feature or route stylesheets from migrated modules once equivalent shadcn/Tailwind styling is in place.

#### Scenario: Verifying migrated modules

- **WHEN** a migrated module is reviewed for readiness
- **THEN** it contains no custom feature stylesheet imports and still preserves required readability, hierarchy, and responsive behavior
