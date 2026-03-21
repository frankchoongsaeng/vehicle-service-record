## Why

The records area currently mixes completed work with hardcoded upcoming-maintenance assumptions, which prevents users from defining the service cadence they actually follow for each vehicle. Adding first-class maintenance plans now lets users manage repeatable work packages in one place and turns maintenance scheduling into explicit, user-owned data instead of inferred defaults.

## What Changes

- Add maintenance plans for a vehicle under the records area so users can create, view, edit, and remove recurring maintenance definitions without leaving the records workflow.
- Let each plan define both a time interval and a mileage interval, with due-state evaluation based on whichever threshold is reached first.
- Let a single plan include multiple maintenance items so bundled work such as quarterly service can be tracked as one recurring plan.
- Surface maintenance plans alongside service records in the records page with URL-driven navigation between record history and planned maintenance views.
- Replace hardcoded dashboard maintenance assumptions with data derived from saved maintenance plans when calculating upcoming and overdue maintenance.

## Capabilities

### New Capabilities

- `maintenance-planning`: Allow users to manage recurring maintenance plans per vehicle, including cadence rules and bundled maintenance items, and view those plans under the records experience.

### Modified Capabilities

None.

## Impact

Affected areas include Prisma schema and migrations, Express vehicle-record routes or adjacent maintenance-plan routes, frontend API client types, records-page Remix routes and forms, and dashboard maintenance calculations that currently rely on hardcoded rules.
