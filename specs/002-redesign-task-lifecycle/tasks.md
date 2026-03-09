# Tasks: Redesign Task & Cycle Lifecycle

**Input**: Design documents from `/specs/002-redesign-task-lifecycle/`  
**Prerequisites**: spec.md (user stories P1–P2, 28 functional requirements, 10 clarifications)  
**Tech Stack**: Ionic 7 / Angular (standalone components), Capacitor, SQLite (`@capacitor-community/sqlite`), TypeScript  
**Tests**: Not explicitly requested — test tasks omitted.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Models**: `src/app/models/`
- **Services**: `src/app/services/`
- **Pages**: `src/app/pages/task-management/`
- **Components**: `src/app/pages/task-management/*/components/`

---

## Phase 1: Setup

**Purpose**: New model definitions, types, and shared utilities that all stories depend on

- [x] T001 Replace Task model with new schema (add `state` field: active/paused/archived, remove `isCompleted`/`lastCompletedDate`, keep `isArchived` as derived from state) in `src/app/models/task.model.ts`
- [x] T002 [P] Replace Cycle model: new `Cycle` interface with `resolution` (open/done/lapsed/skipped), timestamps (`dueAt`, `softDeadline`, `hardDeadline`), optional `startedAt`/`completedAt`/`skippedAt`, remove old `TaskCycle`/`TaskCycleStatus`/`TaskStatus` types in `src/app/models/task-cycle.model.ts`
- [x] T003 [P] Create display state derivation module: `CycleDisplayStatus` type (upcoming/due/overdue/completed/missed/skipped), `deriveDisplayState(cycle, task, now)` pure function, and `STATUS_CONFIG` map (label, color, icon per state) in new file `src/app/models/cycle-display.model.ts`
- [x] T004 [P] Create timestamp calculation utilities: `calculateDueAt(cycleStartDate, notificationTime)`, `calculateSoftDeadline(dueAt, frequency)`, `calculateHardDeadline(dueAt, frequency)`, `calculateNextCycleStart(previousCycleStart, frequency)` with configurable buffer/grace defaults per frequency in new file `src/app/utils/cycle-timestamps.util.ts`

**Checkpoint**: New type system and pure utility functions are defined. No service or DB changes yet.

---

## Phase 2: Foundational (Database Migration & Core Services)

**Purpose**: Database schema migration and core service rewrites. MUST complete before any user story work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Add database migration in `src/app/services/database.service.ts`: drop `task_cycles` table, recreate with new schema (`resolution` TEXT, `dueAt` TEXT, `softDeadline` TEXT, `hardDeadline` TEXT, `startedAt` TEXT, `completedAt` TEXT, `skippedAt` TEXT), add `state` column to `tasks` table (default 'active'), migrate `isArchived=1` rows to `state='archived'`
- [x] T006 Rewrite `TaskCycleService` core in `src/app/services/task-cycle.service.ts`: replace all status logic with new resolution model, implement `closeLapsedCycles()` (replaces `closeMissedCycles`), implement `createNextCycle()` using new timestamp utilities, implement `resolveCycle(cycleId, resolution)` as single resolution function for done/skipped/lapsed, enforce one-open-cycle-per-task constraint
- [x] T007 Rewrite `TaskService` in `src/app/services/task.service.ts`: replace `completeTask()` with delegation to `TaskCycleService.resolveCycle()`, add `pauseTask(id)`/`resumeTask(id)` methods, update `createTask()` to set `state='active'` and create first cycle with new timestamp schema, update `archiveTask()`/`unarchiveTask()` to use `state` field, handle one-time task auto-archive on cycle resolution
- [x] T008 Update `loadTaskList()` in `src/app/services/task-cycle.service.ts`: call `closeLapsedCycles()` at start, derive display state via `deriveDisplayState()` for every list item, build `TaskListItem` using new model (remove old `taskStatus`/`canStartEarly`/`canComplete` fields, add `displayStatus` from derivation function), filter by task `state` (exclude archived, show paused distinctly), sort with display-state-aware priority (due > overdue > upcoming)
- [x] T009 Wire initial cycle creation on first launch after migration in `src/app/app.component.ts`: after DB migration completes, iterate all tasks with `state='active'`, create one open cycle per task using new timestamp schema

**Checkpoint**: Database migrated, core services operational with new resolution model. App can boot with fresh cycles for all active tasks.

---

## Phase 3: User Story 1 — Cycle Lifecycle Resolution (Priority: P1) 🎯 MVP

**Goal**: Cycles move through upcoming → due → overdue phases (derived) and resolve as done, lapsed, or skipped. The core state machine works correctly.

**Independent Test**: Create a task, observe its cycle display at different time points, complete/skip it, verify the next cycle is created.

### Implementation for User Story 1

- [x] T010 [US1] Update task list item component to use `deriveDisplayState()` and `STATUS_CONFIG` for status label, color, and icon in `src/app/pages/task-management/task-list/components/task-list-item.component.ts`
- [x] T011 [P] [US1] Update task list item template/styles to render all seven display states with correct visual treatment (muted for upcoming, prominent blue for due, amber for overdue, green for completed, muted red for missed, gray for skipped) in `src/app/pages/task-management/task-list/components/task-list-item.component.scss`
- [x] T012 [US1] Update task list page to use new `loadTaskList()` output, replace old segment filters (pending/in_progress) with new filters (all/due/upcoming), remove old status derivation logic in `src/app/pages/task-management/task-list/task-list.page.ts`
- [x] T013 [US1] Update task list page template to reflect new segment filters and remove references to old statuses in `src/app/pages/task-management/task-list/task-list.page.html`
- [x] T014 [P] [US1] Update task list page styles to remove old status-specific styles and add any new layout adjustments in `src/app/pages/task-management/task-list/task-list.page.scss`
- [x] T015 [US1] Update task detail page to use `deriveDisplayState()` for status display, replace `canStart`/`canMarkComplete` getters with single `Complete` action (available when cycle is open) and `Skip` action (available when cycle is open), remove progress slider and in-progress logic in `src/app/pages/task-management/task-detail/task-detail.page.ts`
- [x] T016 [US1] Update task detail page template to show Complete/Skip buttons based on cycle resolution=open, remove Start/progress controls, show current display state with consistent styling in `src/app/pages/task-management/task-detail/task-detail.page.html`
- [x] T017 [P] [US1] Update task detail page styles to match new layout (no progress section, prominent Complete button) in `src/app/pages/task-management/task-detail/task-detail.page.scss`

**Checkpoint**: Core lifecycle works end-to-end. User can see cycles in all time phases, complete them in one tap, skip them, and see auto-lapsed missed cycles. New cycles are created after each resolution.

---

## Phase 4: User Story 2 — Pause & Resume Tasks (Priority: P1)

**Goal**: Users can pause a task to freeze cycle generation and resume later without accumulated misses.

**Independent Test**: Pause a task, verify no lapsing occurs during pause, resume and verify new cycle starts from next future due time.

### Implementation for User Story 2

- [x] T018 [US2] Add Pause/Resume actions to task detail page: show Pause button when task `state='active'`, show Resume button when `state='paused'`, call `TaskService.pauseTask()`/`resumeTask()` in `src/app/pages/task-management/task-detail/task-detail.page.ts`
- [x] T019 [US2] Update task detail template with Pause/Resume buttons and paused state indicator in `src/app/pages/task-management/task-detail/task-detail.page.html`
- [x] T020 [P] [US2] Update task list item component to show "Paused" badge/indicator when `task.state === 'paused'`, with distinct muted styling in `src/app/pages/task-management/task-list/components/task-list-item.component.ts`
- [x] T021 [US2] Update `closeLapsedCycles()` in `src/app/services/task-cycle.service.ts` to skip cycles belonging to paused tasks (check `task.state` before auto-lapsing)
- [x] T022 [US2] Add Pause/Resume to task options menu (long press / three-dot menu) in task list page in `src/app/pages/task-management/task-list/task-list.page.ts`

**Checkpoint**: Pausing freezes a task's lifecycle. Resuming creates a fresh cycle. No misses accumulate while paused.

---

## Phase 5: User Story 3 — Separate Missed & Skipped Statistics (Priority: P1)

**Goal**: Statistics view shows completed, missed, and skipped as three distinct categories with correct completion rate calculation.

**Independent Test**: Create a task, complete some cycles, let some lapse, skip some, then view statistics and verify counts and completion rate.

### Implementation for User Story 3

- [x] T023 [US3] Rewrite statistics component to query cycles grouped by resolution (done/lapsed/skipped), calculate completion rate excluding skipped from denominator, display three separate counts in `src/app/pages/task-management/task-detail/components/task-statistics.component.ts`
- [x] T024 [P] [US3] Add "Last occurrence: Missed on [date]" contextual indicator to task list item when the most recent resolved cycle for a task is `lapsed` — query previous cycle in `loadTaskList()` and pass as `lastMissedDate` on `TaskListItem` in `src/app/services/task-cycle.service.ts`
- [x] T025 [US3] Display the "Last: Missed" badge in task list item template when `lastMissedDate` is present in `src/app/pages/task-management/task-list/components/task-list-item.component.ts`
- [x] T026 [US3] Exclude paused periods from statistics: when calculating completion rate, ignore time ranges where the task was paused (use task history or a `pausedAt`/`resumedAt` log) in `src/app/pages/task-management/task-detail/components/task-statistics.component.ts`

**Checkpoint**: Statistics accurately reflect done/missed/skipped. Completion rate is fair (skips excluded). Missed context is visible in the list.

---

## Phase 6: User Story 4 — One-Tap Completion (Priority: P2)

**Goal**: Users can complete a cycle with a single tap from any open time phase, including retroactive completion of the most recent missed cycle.

**Independent Test**: Tap complete on an upcoming, due, and overdue cycle — each resolves in one tap. Find a missed cycle and retroactively mark it done.

### Implementation for User Story 4

- [x] T027 [US4] Add quick-complete action (checkmark button) directly on the task list item row, calling `resolveCycle(cycleId, 'done')` without navigation in `src/app/pages/task-management/task-list/components/task-list-item.component.ts`
- [x] T028 [US4] Update task list page to handle quick-complete event from list item, refresh list after resolution in `src/app/pages/task-management/task-list/task-list.page.ts`
- [x] T029 [US4] Implement retroactive completion: add "I actually did this" action on cycles where `resolution='lapsed'` AND it is the most recent lapsed cycle for that task, call `resolveCycle(cycleId, 'done')` to flip resolution in `src/app/pages/task-management/task-detail/task-detail.page.ts`
- [x] T030 [US4] Update task detail template to show retroactive complete button when viewing a task whose most recent resolved cycle is lapsed in `src/app/pages/task-management/task-detail/task-detail.page.html`

**Checkpoint**: One-tap complete works from list and detail. Retroactive completion works for most recent miss only.

---

## Phase 7: User Story 5 — Unified Visual Status (Priority: P2)

**Goal**: Every screen uses the same derivation function and visual config. Zero status inconsistencies across list, detail, and statistics.

**Independent Test**: View the same task across all three screens, confirm identical label/color/icon.

### Implementation for User Story 5

- [x] T031 [US5] Audit and remove any remaining screen-specific status derivation logic from task list page in `src/app/pages/task-management/task-list/task-list.page.ts`
- [x] T032 [P] [US5] Audit and remove any remaining screen-specific status derivation logic from task detail page in `src/app/pages/task-management/task-detail/task-detail.page.ts`
- [x] T033 [US5] Update statistics component to use `STATUS_CONFIG` for coloring chart segments / legend items, ensuring labels match list and detail views in `src/app/pages/task-management/task-detail/components/task-statistics.component.ts`
- [x] T034 [US5] Create shared status badge component (or directive) that takes a `CycleDisplayStatus` and renders the correct label/color/icon from `STATUS_CONFIG` — use in list item, detail page, and statistics in `src/app/components/cycle-status-badge/cycle-status-badge.component.ts` (new file)

**Checkpoint**: All screens render status identically. One function, one config, zero drift.

---

## Phase 8: User Story 6 — Contact Association (Priority: P2)

**Goal**: Tasks remain linkable to contacts/customers. Filtering by contact works with the new model.

**Independent Test**: Create a task linked to a contact, filter by that contact, verify it appears.

### Implementation for User Story 6

- [x] T035 [US6] Verify `customerId` field is preserved through the Task model migration — ensure `createTask()`, `updateTask()`, and `getTaskById()` still handle customer association correctly in `src/app/services/task.service.ts`
- [x] T036 [US6] Verify contact filter in task list works with new `loadTaskList()` — ensure `getCustomerTasks()` queries use the new schema and `state` field (exclude archived) in `src/app/services/task-cycle.service.ts`
- [x] T037 [US6] Update task form component to ensure customer selection is preserved through the new model in `src/app/pages/task-management/task-form/task-form.component.ts`

**Checkpoint**: Contact-linked tasks work exactly as before, fully compatible with new lifecycle.

---

## Phase 9: User Story 7 — Notifications with New Lifecycle (Priority: P2)

**Goal**: Notifications fire at `dueAt` time and respect task state (no notifications for paused/archived).

**Independent Test**: Create a task with push notification, verify notification fires at `dueAt`, pause the task, verify no notification fires.

### Implementation for User Story 7

- [x] T038 [US7] Update `scheduleTaskNotification()` in `src/app/services/task.service.ts` to use cycle's `dueAt` timestamp instead of old `notificationTime`+`startDate` calculation, skip scheduling for paused/archived tasks
- [x] T039 [US7] Update `rescheduleAllPendingNotifications()` in `src/app/services/task.service.ts` to filter by `task.state === 'active'` only, use `dueAt` from the current open cycle
- [x] T040 [US7] Update notification rescheduling on app launch in `src/app/app.component.ts` to use new service methods and respect task state

**Checkpoint**: Notifications align with cycle `dueAt`. Paused/archived tasks are silent.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, edge cases, and final validation

- [x] T041 Handle multi-day offline scenario in `closeLapsedCycles()`: when multiple hardDeadlines have passed, auto-lapse in sequence creating each next cycle until one covers the current period, with a cap to prevent runaway loop (max 365 iterations) in `src/app/services/task-cycle.service.ts`
- [x] T042 [P] Handle one-time task auto-archive: after resolving the single cycle of a `frequency='once'` task, auto-set `task.state='archived'` in `src/app/services/task-cycle.service.ts`
- [x] T043 [P] Update task archive page to work with new `state` field instead of `isArchived` boolean in `src/app/pages/task-management/task-archive/task-archive.page.ts`
- [x] T044 [P] Update task form to work with new model — remove any references to old `isCompleted`/`lastCompletedDate` fields, ensure frequency/notificationTime map to new cycle timestamps on save in `src/app/pages/task-management/task-form/task-form.component.ts`
- [x] T045 [P] Remove unused code: delete old `TaskCycleStatus`, `TaskStatus` types, old `getTaskStatus()`, `canStartEarly()`, `canComplete()` methods, old `progressValue`/`progressSlider` references across all files
- [x] T046 Clean up global styles — remove old status-specific CSS classes (`.status-pending`, `.status-in-progress`, etc.) and add new ones if needed in `src/global.scss`
- [x] T047 Update `TaskListItem` interface in `src/app/models/task-cycle.model.ts` to remove deprecated fields (`taskStatus`, `canStartEarly`, `canComplete`) and add new fields (`displayStatus`, `lastMissedDate`)

**Checkpoint**: All cleanup done. No references to old model remain. App is fully migrated.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3–9 (User Stories)**: All depend on Phase 2 completion
  - US1 (Phase 3): No story dependencies — **start here for MVP**
  - US2 (Phase 4): Independent, but builds on services from Phase 2
  - US3 (Phase 5): Independent, uses resolution data from Phase 2
  - US4 (Phase 6): Depends on US1 (needs complete action wired up in list/detail)
  - US5 (Phase 7): Depends on US1 (status rendering must exist before auditing consistency)
  - US6 (Phase 8): Independent — verification/compatibility pass
  - US7 (Phase 9): Independent — notification rewiring
- **Phase 10 (Polish)**: Depends on all desired stories being complete

### User Story Dependencies

- **US1 (P1)**: Start after Phase 2 — no story dependencies
- **US2 (P1)**: Start after Phase 2 — no story dependencies, can parallel with US1
- **US3 (P1)**: Start after Phase 2 — no story dependencies, can parallel with US1/US2
- **US4 (P2)**: Start after US1 complete (needs complete action in list/detail)
- **US5 (P2)**: Start after US1 complete (needs status rendering to audit)
- **US6 (P2)**: Start after Phase 2 — independent verification pass
- **US7 (P2)**: Start after Phase 2 — independent notification pass

### Within Each User Story

- Models/utilities before services
- Services before UI components
- Templates after their component logic
- Styles can parallel with templates

### Parallel Opportunities

- Phase 1: T002, T003, T004 can all run in parallel (different new files)
- Phase 3: T011/T014/T017 (styles) can parallel with their component logic tasks
- Phase 4–9: US2, US3, US6, US7 can all run in parallel after Phase 2
- Phase 10: T042, T043, T044, T045 can all run in parallel (different files)

---

## Parallel Example: Phase 1

```
# All create new files — fully parallel:
Task T002: Replace Cycle model in src/app/models/task-cycle.model.ts
Task T003: Create display state derivation in src/app/models/cycle-display.model.ts
Task T004: Create timestamp utilities in src/app/utils/cycle-timestamps.util.ts
```

## Parallel Example: User Story 1

```
# Styles can parallel with logic:
Task T011: Update task list item styles (scss)
Task T014: Update task list page styles (scss)
Task T017: Update task detail page styles (scss)
# While these run sequentially:
Task T010 → T012 → T013 (list item logic → list page logic → list page template)
Task T015 → T016 (detail logic → detail template)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T009)
3. Complete Phase 3: User Story 1 (T010–T017)
4. **STOP and VALIDATE**: App boots, task list shows cycles in correct phases, complete/skip works, auto-lapse works, next cycles created
5. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready
2. Add US1 (Phase 3) → Core lifecycle works → **MVP!**
3. Add US2 (Phase 4) → Pause/resume available
4. Add US3 (Phase 5) → Statistics accurate
5. Add US4 (Phase 6) → One-tap completion polished
6. Add US5 (Phase 7) → Visual consistency audit
7. Add US6 (Phase 8) → Contact compatibility verified
8. Add US7 (Phase 9) → Notifications aligned
9. Phase 10 → Cleanup and edge cases

### Single Developer Strategy

Work sequentially in priority order: Phase 1 → 2 → 3 (MVP) → 4 → 5 → 6 → 7 → 8 → 9 → 10.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Migration wipes cycle history (clean slate per clarification) — warn user on first launch after upgrade
