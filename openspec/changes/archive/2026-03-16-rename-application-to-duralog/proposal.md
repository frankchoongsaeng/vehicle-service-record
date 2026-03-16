## Why

The product is currently presented as "Vehicle Service Record" across the application and documentation. Renaming it to "Duralog" is needed to align the user-facing brand before further feature work and external sharing.

## What Changes

- Replace user-visible product naming from "Vehicle Service Record" to "Duralog" in app shells, auth pages, dashboard framing text, and browser/document metadata.
- Update project documentation and onboarding text to use "Duralog" as the canonical application name.
- Keep technical identifiers (package names, internal route paths, and API paths) unchanged unless they are explicitly user-facing labels.
- Ensure no mixed-branding remains in primary user journeys (login, signup, dashboard, and README quick start).

## Capabilities

### New Capabilities

- `application-branding`: Define and enforce consistent user-facing product naming as "Duralog" across UI and documentation.

### Modified Capabilities

None.

## Impact

Affected areas include Remix route content under `app/routes/`, shared app chrome and text under `src/`, static HTML metadata in `index.html`, and project documentation in `README.md`. No backend API contract or database schema changes are expected.
