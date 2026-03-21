## ADDED Requirements

### Requirement: Users can manage recurring maintenance plans for a vehicle under the records experience

The system SHALL allow an authenticated user to create, view, update, and delete recurring maintenance plans for a specific vehicle from within the records area for that vehicle.

#### Scenario: Create a maintenance plan

- **WHEN** an authenticated user opens the records page for a vehicle and submits a valid maintenance plan
- **THEN** the system stores the plan for that vehicle and shows it in the records-area maintenance planning view

#### Scenario: Edit a maintenance plan

- **WHEN** an authenticated user updates an existing maintenance plan for one of their vehicles
- **THEN** the system persists the changes and shows the updated plan in the maintenance planning view

#### Scenario: Delete a maintenance plan

- **WHEN** an authenticated user deletes an existing maintenance plan for one of their vehicles
- **THEN** the system removes the plan and its bundled items from the vehicle’s maintenance planning view

### Requirement: A maintenance plan supports bundled maintenance items and recurring cadence rules

The system MUST allow each maintenance plan to contain multiple maintenance items and MUST allow the user to define cadence by time interval, mileage interval, or both.

#### Scenario: Plan with multiple items

- **WHEN** a user creates a maintenance plan with more than one maintenance item
- **THEN** the system stores all listed items as part of the same recurring plan

#### Scenario: At least one interval is required

- **WHEN** a user submits a maintenance plan without a time interval and without a mileage interval
- **THEN** the system rejects the submission with a validation error and does not save the plan

### Requirement: Maintenance plan due state is determined by whichever threshold comes first

The system SHALL evaluate each maintenance plan against its configured date and mileage cadence and derive plan status from the earliest reached threshold.

#### Scenario: Mileage threshold reached before date threshold

- **WHEN** a plan has both cadence values and the vehicle reaches the mileage threshold before the date threshold
- **THEN** the system marks the plan due based on the mileage threshold

#### Scenario: Date threshold reached before mileage threshold

- **WHEN** a plan has both cadence values and the date threshold is reached before the mileage threshold
- **THEN** the system marks the plan due based on the date threshold

### Requirement: Records-page maintenance planning navigation is URL-driven

The system MUST represent maintenance planning navigation under the records page in the URL so users can reload, share, and return to the same view.

#### Scenario: Open maintenance planning view from records page

- **WHEN** a user switches from record history to maintenance planning under a vehicle’s records page
- **THEN** the URL reflects the maintenance planning view and the page reloads back into that same view

#### Scenario: Open a plan editor from the maintenance planning view

- **WHEN** a user opens create or edit for a maintenance plan
- **THEN** the URL reflects the selected plan state and the corresponding panel remains addressable directly

### Requirement: Dashboard maintenance summaries use persisted maintenance plans

The system SHALL use saved maintenance plans, rather than hardcoded maintenance defaults, when showing upcoming or overdue maintenance summary data for a vehicle.

#### Scenario: Vehicle with persisted maintenance plans

- **WHEN** a vehicle has one or more saved maintenance plans
- **THEN** the dashboard upcoming-maintenance and overdue summary data is derived from those saved plans

#### Scenario: Vehicle without persisted maintenance plans

- **WHEN** a vehicle has no saved maintenance plans
- **THEN** the dashboard does not invent upcoming maintenance entries from hardcoded recurring rules
