## Context

The current product stores only completed or dated service records. Upcoming maintenance in the dashboard is inferred from a fixed set of hardcoded service rules in the frontend, which means users cannot define their own recurring service bundles or cadence. The requested feature crosses persistence, API, loader shaping, and records-page interaction because plans must be managed per vehicle, rendered under the records experience, and reused by the dashboard maintenance summary.

The records experience already uses URL-derived state for search filters and detail panels, and project guidance requires navigation state to live in the URL. The design therefore needs to add maintenance-plan navigation under the records page without introducing local-only navigation state.

## Goals / Non-Goals

**Goals:**

- Persist recurring maintenance plans per vehicle, including both time-based and mileage-based cadence.
- Persist multiple maintenance items under a single plan so bundled work can be modeled as one recurring unit.
- Add CRUD APIs and frontend forms for maintenance plans under the records area.
- Make due-state calculations use saved plans, with next due status determined by whichever threshold is reached first.
- Surface plans under the records page using URL-driven navigation and summary information.

**Non-Goals:**

- Automatically creating future service records from a plan.
- Tracking per-item cadence inside a single plan; cadence is shared by the plan as a whole.
- Sending reminders, notifications, or calendar integrations.
- Reworking the broader dashboard layout beyond replacing hardcoded upcoming-maintenance inputs with persisted plans.

## Decisions

### Add first-class maintenance plan tables rather than overloading service records

Introduce a `MaintenancePlan` model keyed to `user_id` and `vehicle_id`, plus a child `MaintenancePlanItem` model for the individual services included in that plan. The parent plan stores the recurring cadence and optional anchor data such as last completed date and last completed mileage; the child items store one service type each.

Rationale: a recurring plan is conceptually different from a historical service record. Keeping plans separate avoids overloading `ServiceRecord` with nullable planning fields and supports bundled items cleanly.

Alternatives considered:

- Add planning columns directly to `ServiceRecord`: rejected because recurring plans and completed events have different lifecycles and validation rules.
- Store bundled items as JSON in one table column: rejected because Prisma and the rest of the codebase already benefit from normalized relational data.

### Model due evaluation at the plan level using the earliest threshold

Each plan stores `interval_months` and `interval_mileage` as optional positive integers, with validation requiring at least one of them. Due status is calculated by comparing the plan’s last completed date and mileage against the current date and vehicle mileage; when both cadence values exist, the earliest reached threshold determines whether the plan is upcoming or overdue.

Rationale: this matches the user requirement of “whichever comes first” while keeping the cadence easy to understand.

Alternatives considered:

- Require both intervals: rejected because some users may want date-only or mileage-only recurring work.
- Track separate plan states for time and mileage independently: rejected because the primary UX need is one actionable due status per plan.

### Add maintenance planning under records with a URL-driven view switch

Keep the existing records route but add a query-parameter view switch such as `?view=history` and `?view=plans`. The records page loader returns both service records and maintenance plans; the page header and summary cards remain shared while the main panel swaps between history table and plans list/form affordances.

Rationale: the user asked for the feature under the records page, and query-param navigation satisfies the repository rule that navigational UI state must be bookmarkable and reload-safe.

Alternatives considered:

- Add a separate top-level route outside records: rejected because it weakens the requested information architecture.
- Use component-local state tabs: rejected because navigation state must be represented in the URL.

### Keep plan editing in the existing side-panel pattern

Add nested routes for creating and editing maintenance plans under the records route, similar to record detail/edit behavior. The base records page controls whether the detail panel opens from the URL, and plan forms submit through the existing frontend API client into the backend routes.

Rationale: reusing the side-panel inspection/edit pattern keeps the UI consistent and limits the amount of new page structure required.

Alternatives considered:

- Modal-based plan editing: rejected because it introduces another state container and weaker deep-link semantics.
- Inline editable cards only: rejected because plan forms are complex enough to benefit from a dedicated panel.

### Replace hardcoded dashboard maintenance rules with persisted plans plus fallback-free calculations

Update the maintenance utility layer to consume maintenance plans from loaders when building upcoming items, timeline alerts, and overdue counts. The dashboard will no longer invent default maintenance rules for service types that the user has never planned.

Rationale: once planning is user-defined, continuing to show hardcoded assumptions would conflict with explicit plan data.

Alternatives considered:

- Merge persisted plans with hardcoded defaults: rejected because it produces ambiguous, duplicated maintenance expectations.

## Risks / Trade-offs

- [Risk] Existing dashboard summaries may show fewer upcoming items for vehicles without plans. -> Mitigation: accept this behavior as the more correct user-owned model and surface an empty-state prompt to create plans.
- [Risk] Users may not know what to enter for “last completed” anchors when creating a plan. -> Mitigation: allow empty anchors and show those plans as unscheduled until date or mileage context exists.
- [Risk] Records and plans sharing one page can become visually dense. -> Mitigation: use a clear URL-driven view switch and retain the existing side-panel pattern instead of showing both workflows at once.
- [Risk] Data migration adds new relational tables and API shapes. -> Mitigation: keep the migration additive, preserve all existing service-record behavior, and derive plan responses in dedicated route handlers.

## Migration Plan

1. Add Prisma models and a migration for maintenance plans and plan items.
2. Regenerate Prisma client and implement backend CRUD routes scoped to vehicle ownership.
3. Extend shared frontend types and API client methods for maintenance plans.
4. Update records-route loaders and UI to support history/plans view switching and plan side-panel forms.
5. Replace dashboard upcoming-maintenance calculations to read persisted plans.
6. Run build and manual verification for record history, plan CRUD, and dashboard due-state behavior.

Rollback strategy: revert the additive migration and route/UI wiring, restoring the existing hardcoded maintenance summary behavior.

## Open Questions

- When a plan has no last completed date and no last completed mileage, should it be displayed as “Not yet scheduled” or immediately “Planned” with no due target?
- Should deleting a maintenance plan be allowed even if the user has already created matching service records, or should the system later support converting plans into completed records explicitly?
