## 1. Data model and backend routes

- [x] 1.1 Add Prisma models and migration for maintenance plans and bundled plan items
- [x] 1.2 Implement authenticated maintenance plan CRUD routes scoped to a vehicle and its owning user
- [x] 1.3 Add backend validation for cadence rules, bundled items, and ownership-aware not-found handling

## 2. Shared types and maintenance calculations

- [x] 2.1 Extend shared frontend and backend data contracts plus API client methods for maintenance plans
- [x] 2.2 Replace hardcoded maintenance-rule calculations with utilities that derive due state from persisted plans and vehicle mileage/date anchors

## 3. Records-page planning experience

- [x] 3.1 Update the records route loader and URL state to support history and plans views under the same page
- [x] 3.2 Build maintenance plan list, summary cards, and empty-state UI under the records page
- [x] 3.3 Add side-panel create/edit/detail flows for maintenance plans, including bundled-item entry and delete actions

## 4. Verification

- [ ] 4.1 Validate plan CRUD behavior and due-state edge cases in the UI and backend integration
- [x] 4.2 Run project validation commands and confirm the new records-page planning flow builds successfully
