## ADDED Requirements

### Requirement: User-facing product name is Duralog

The system SHALL present the product name as "Duralog" in user-facing application copy and browser-facing metadata.

#### Scenario: Auth and app shell branding

- **WHEN** a user visits login, signup, or protected application views
- **THEN** the user-visible product name appears as "Duralog" and does not show the previous product name in those primary views

#### Scenario: Browser metadata branding

- **WHEN** the application document title or equivalent browser-facing metadata is rendered
- **THEN** the product name shown to the user is "Duralog"

### Requirement: Documentation uses Duralog as the canonical app name

The system MUST use "Duralog" as the canonical product name in onboarding and usage documentation for this repository.

#### Scenario: README naming consistency

- **WHEN** a developer reads the primary project README
- **THEN** user-facing references to the application name use "Duralog"
