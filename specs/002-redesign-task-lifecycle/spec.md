# Feature Specification: Redesign Task & Cycle Lifecycle

**Feature Branch**: `002-redesign-task-lifecycle`  
**Created**: 2026-02-27  
**Status**: Draft  
**Input**: Redesign the task definition and cycle state machines. Introduce a two-axis cycle model (time phase × resolution), separate Missed from Skipped, add task definition states (active/paused/archived), enable one-tap completion without mandatory "In Progress" state, and unify all status derivation into a single consistent model.

## Clarifications

### Session 2026-02-27

- Q: Should "In Progress" be a cycle state? → A: No. Most habits are binary ("did you do it?"). Progress tracking belongs to a future Goals layer, not the cycle model. Users can complete in one tap from any open state.
- Q: Should Overdue be a stored state? → A: No. Overdue is derived from time (now > softDeadline while cycle is still open). Stored states are only changed by user action or system auto-lapse.
- Q: Should "Due" be a stored state? → A: No. Due is derived from time (now ≥ dueAt while cycle is still open). No background job needed.
- Q: Keep customer association? → A: Yes. Tasks remain linkable to a contact/customer.
- Q: Keep notification options? → A: Yes. Push, email, SMS, silent notification types are preserved.
- Q: What happens to one-time (frequency: 'once') tasks after resolution? → A: No next cycle is created. The task definition auto-transitions to Archived after its single cycle resolves (done, lapsed, or skipped).
- Q: Can a task have multiple open cycles simultaneously? → A: No. Strictly one open cycle per task at any time. The previous cycle must be resolved before the next is created.
- Q: How should existing cycle data be handled during migration? → A: Wipe cycle history and start fresh. Task definitions are preserved and migrated to the new model (adding `state` field). New cycles are created for all active tasks on first launch after upgrade.
- Q: Is there a limit on retroactive completion of missed cycles? → A: Only the most recent lapsed cycle per task can be retroactively completed. Older lapsed cycles are final.
- Q: Should the spec include an explicit glossary mapping old terms to new? → A: No. The new terms in the spec are the canonical terms; old codebase terms are implicitly replaced during implementation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Cycle resolves correctly through its lifecycle (Priority: P1)

As a user, I want each task occurrence (cycle) to move through clear, predictable phases — from upcoming to due to overdue — and resolve as either completed, missed, or skipped, so that my habit data is always accurate and I understand what happened with every occurrence.

**Why this priority**: The cycle lifecycle is the core mechanism. Every other feature (notifications, statistics, task list display) depends on cycles resolving correctly. Without this, the app produces inaccurate data.

**Independent Test**: Create a task with a known due time, observe the cycle display at different time points, and verify correct state at each phase.

**Acceptance Scenarios**:

1. **Given** a cycle exists for a task with dueAt in the future, **When** the user views the task list, **Then** the cycle displays as "Upcoming" with muted visual treatment.
2. **Given** a cycle's dueAt has passed but softDeadline has not, **When** the user views the task list, **Then** the cycle displays as "Due Now" with prominent visual treatment.
3. **Given** a cycle's softDeadline has passed but hardDeadline has not, **When** the user views the task list, **Then** the cycle displays as "Overdue" with warning visual treatment.
4. **Given** a cycle's hardDeadline has passed and the cycle is still open, **When** the system evaluates cycles (on app open or list load), **Then** the cycle resolution is set to "lapsed" (Missed) and a new cycle is created for the next occurrence.
5. **Given** a cycle is open and in any time phase (upcoming, due, or overdue), **When** the user taps "Complete", **Then** the cycle resolution is set to "done" and a new cycle is created for the next occurrence.
6. **Given** a cycle is open and in any time phase, **When** the user taps "Skip" and confirms, **Then** the cycle resolution is set to "skipped" and a new cycle is created for the next occurrence.

---

### User Story 2 — Task definition can be paused and resumed (Priority: P1)

As a user, I want to pause a task (e.g., when I'm sick or on vacation) so that I don't accumulate missed occurrences during periods when I intentionally cannot perform the habit, and I can resume later without losing my history.

**Why this priority**: Without pause, users who take intentional breaks see their statistics filled with misses, which is demoralizing and inaccurate. This directly impacts user retention (Atomic Habits: reduce friction of restarting).

**Independent Test**: Pause a task, wait for one or more cycle periods to pass, resume the task, and verify no missed cycles were created during the paused period.

**Acceptance Scenarios**:

1. **Given** a task is active, **When** the user pauses it, **Then** no new cycles are generated and no existing open cycles are auto-lapsed while paused.
2. **Given** a task is paused, **When** the user resumes it, **Then** a new cycle is created starting from the next appropriate due time (not retroactively filling the gap).
3. **Given** a task is paused, **When** the user views the task list, **Then** the task appears with a "Paused" indicator and is visually distinct from active tasks.
4. **Given** a task is paused, **When** the user views statistics, **Then** the paused period is excluded from completion rate calculations.

---

### User Story 3 — Missed and Skipped are tracked separately in statistics (Priority: P1)

As a user, I want missed occurrences (forgot/couldn't do it) and skipped occurrences (chose not to do it) tracked separately, so that my statistics accurately reflect my adherence and intentional rest days don't count against me.

**Why this priority**: Accurate statistics are the foundation of habit identity reinforcement. Conflating missed and skipped makes data meaningless and punishes intentional rest.

**Independent Test**: Complete some cycles, let others lapse, manually skip others, then view statistics and verify each category is counted correctly.

**Acceptance Scenarios**:

1. **Given** a user has completed 20 cycles, missed 3, and skipped 2 in a period, **When** viewing statistics, **Then** the display shows three separate counts: Completed (20), Missed (3), Skipped (2).
2. **Given** a user skipped cycles intentionally, **When** viewing their completion rate, **Then** skipped cycles are excluded from the denominator (completion rate = 20/23 = 87%, not 20/25 = 80%).
3. **Given** a cycle was auto-lapsed (missed), **When** the next cycle appears in the list, **Then** the task shows a contextual indicator: "Last occurrence: Missed on [date]."

---

### User Story 4 — One-tap completion from any open state (Priority: P2)

As a user, I want to mark a habit as done with a single tap regardless of whether it's upcoming, due, or overdue, so that logging my habits is as frictionless as possible and I never miss recording a completed habit due to unnecessary steps.

**Why this priority**: Friction kills habits. Requiring start-then-complete for simple binary habits (take vitamins, drink water, make bed) doubles the interaction cost for the most frequent actions.

**Independent Test**: Attempt to complete a cycle from each time phase (upcoming, due, overdue) with a single action and verify each succeeds.

**Acceptance Scenarios**:

1. **Given** a cycle is in "Due Now" phase, **When** the user taps the complete action, **Then** the cycle resolves as "done" in one tap without requiring a separate "start" step.
2. **Given** a cycle is in "Overdue" phase, **When** the user taps the complete action, **Then** the cycle resolves as "done" in one tap.
3. **Given** a cycle is in "Upcoming" phase, **When** the user taps the complete action, **Then** the cycle resolves as "done" (early completion is allowed).
4. **Given** a cycle has been auto-lapsed as missed, **When** the user taps "I actually did this", **Then** the cycle resolution changes from "lapsed" to "done" (retroactive completion).

---

### User Story 5 — Unified visual status across all screens (Priority: P2)

As a user, I want the task status to look and feel consistent everywhere — the task list, task detail page, and statistics — so that I never see conflicting information about the same task.

**Why this priority**: The current system derives status differently in three places, leading to a cycle showing as "Completed" on one screen and "Pending" on another.

**Independent Test**: View the same task in the list view, detail view, and statistics view, and verify the status label, color, and icon are identical across all three.

**Acceptance Scenarios**:

1. **Given** a cycle in any display state, **When** the user views it in the task list, **Then** it shows the same label, color, and icon as in the task detail page.
2. **Given** the system derives display state, **When** any screen needs to show a cycle's status, **Then** it uses the same single derivation function — no screen-specific status logic.
3. **Given** the seven display states (Upcoming, Due Now, Overdue, Completed, Missed, Skipped, and the optional started variant), **When** each is rendered, **Then** each has a distinct and consistent color and icon.

---

### User Story 6 — Task association with contacts is preserved (Priority: P2)

As a user, I want to link tasks to specific contacts/customers and filter my task list by contact, so that I can manage relationship-based routines (monthly check-in with client X, quarterly review with Y).

**Why this priority**: Contact-linked tasks are a differentiating feature of this app. The redesign must preserve this existing capability.

**Independent Test**: Create a task linked to a contact, view the task list filtered by that contact, and verify the task appears correctly.

**Acceptance Scenarios**:

1. **Given** a task is linked to a contact, **When** the user views the task detail, **Then** the contact name is displayed.
2. **Given** multiple tasks linked to the same contact, **When** the user filters by that contact, **Then** only those tasks appear.

---

### User Story 7 — Notification options work with new lifecycle (Priority: P2)

As a user, I want notifications (push, email, SMS, or silent) to fire at the cycle's due time and integrate correctly with the new lifecycle, so that the notification serves as the habit cue when the cycle transitions to the "Due" phase.

**Why this priority**: Notifications are the habit cue mechanism. They must align with the cycle's dueAt timestamp.

**Independent Test**: Create a task with push notification, wait for dueAt, and verify the notification fires and the cycle displays as "Due Now."

**Acceptance Scenarios**:

1. **Given** a task has push notifications enabled and a cycle has a dueAt time, **When** dueAt arrives, **Then** a local notification is delivered on the device.
2. **Given** the app is relaunched after a device restart, **When** the app initializes, **Then** all pending notifications for active tasks are rescheduled.
3. **Given** a task is paused, **When** the next cycle's dueAt would normally fire, **Then** no notification is delivered.

---

### Edge Cases

- What happens when a user is away for multiple cycle periods (e.g., daily task, user gone for 5 days without pausing)? Each missed period should be recorded individually, but the task list should only show the latest (next) cycle, with a badge indicating the count of missed occurrences.
- What happens if the app is not opened for days and multiple cycles' hardDeadlines have passed? On next app open, all expired open cycles should be auto-lapsed in sequence, each creating the next cycle, until one cycle covers the current period.
- What happens when a paused task is archived? The task moves to archived state. On restore, it returns to paused (user must explicitly resume).
- What happens if the user completes a cycle early (before dueAt)? The cycle resolves as "done" and the next cycle is created from the next scheduled period, not from "now."
- What happens if the user retroactively completes a lapsed (missed) cycle? The resolution changes from "lapsed" to "done", statistics are updated, and the existing next cycle remains unaffected.
- How are buffer and grace periods determined? Buffer (softDeadline) and grace (hardDeadline) are calculated as offsets from dueAt based on the task's frequency (e.g., daily: buffer=30min, grace=5h; weekly: buffer=2h, grace=24h). These should be configurable globally.
- How is existing data handled during migration? Cycle history is wiped (clean slate). Task definitions are preserved and migrated to the new schema (new `state` field defaulting to Active, new cycle timestamps model). Fresh initial cycles are created for all active tasks on first launch after upgrade.

## Requirements *(mandatory)*

### Functional Requirements

**Task Definition States**

- **FR-001**: System MUST support three task definition states: Active, Paused, and Archived.
- **FR-002**: System MUST allow users to transition a task between Active and Paused in both directions.
- **FR-003**: System MUST allow users to archive a task from either Active or Paused state, and restore an archived task to Active state.
- **FR-004**: System MUST NOT generate new cycles or auto-lapse existing open cycles for paused tasks.
- **FR-005**: System MUST NOT deliver notifications for paused or archived tasks.
- **FR-006**: When a task is resumed from paused, system MUST create a new cycle starting from the next future due time, not retroactively.

**Cycle Resolution Model**

- **FR-007**: Each cycle MUST store a resolution value of exactly one of: `open`, `done`, `lapsed`, or `skipped`. A task MUST have at most one cycle with resolution `open` at any time.
- **FR-008**: Each cycle MUST store three fixed timestamps at creation: `dueAt`, `softDeadline`, and `hardDeadline`.
- **FR-009**: System MUST derive the display state from the combination of stored resolution, optional `startedAt` timestamp, and current time — using a single derivation function.
- **FR-010**: The derivation function MUST produce exactly one of seven display states: Upcoming, Due Now, Overdue, Completed, Missed, Skipped (plus the optional "started" variants for cycles with a `startedAt`).
- **FR-011**: System MUST allow users to complete a cycle (set resolution to `done`) from any open time phase — upcoming, due, or overdue — in a single action.
- **FR-012**: System MUST allow users to skip a cycle (set resolution to `skipped`) from any open time phase, with a confirmation prompt.
- **FR-013**: System MUST auto-lapse open cycles (set resolution to `lapsed`) when the current time passes the hardDeadline, evaluated on app open and task list load.
- **FR-014**: After any terminal resolution (done, lapsed, skipped), system MUST automatically create the next cycle for recurring tasks (daily, weekly, monthly, yearly) with appropriate timestamps. For one-time tasks (frequency: 'once'), no next cycle is created and the task definition auto-transitions to Archived.
- **FR-015**: System MUST allow users to retroactively change the most recent lapsed cycle's resolution to `done` for a given task. Older lapsed cycles are final and cannot be changed.

**Cycle Timestamps**

- **FR-016**: `dueAt` MUST be calculated from the cycle's start date and the task's notification time.
- **FR-017**: `softDeadline` MUST be calculated as dueAt plus a frequency-dependent buffer period.
- **FR-018**: `hardDeadline` MUST be calculated as dueAt plus a frequency-dependent grace period.
- **FR-019**: Buffer and grace period durations MUST be configurable at the global/settings level.

**Statistics**

- **FR-020**: Statistics MUST display completed, missed, and skipped cycle counts as three separate categories.
- **FR-021**: Completion rate calculations MUST exclude skipped cycles from the denominator.
- **FR-022**: Statistics MUST exclude paused periods from all calculations.

**Contact Association & Notifications**

- **FR-023**: Tasks MUST remain linkable to a contact/customer entity with optional association.
- **FR-024**: Task list MUST support filtering by contact.
- **FR-025**: System MUST support push, email, SMS, and silent notification types per task.
- **FR-026**: Push notifications MUST fire at the cycle's `dueAt` time.
- **FR-027**: System MUST reschedule pending push notifications on app launch to handle device restarts.

**Display Consistency**

- **FR-028**: Every screen that shows cycle status (task list, task detail, statistics) MUST use the same derivation function and visual configuration (label, color, icon) for each display state.

### Key Entities

- **Task**: A habit or routine definition. Has a state (active/paused/archived), a frequency, notification preferences, and an optional link to a contact/customer. Generates cycles when active.
- **Cycle**: One occurrence of a task within a time window. Has fixed timestamps (dueAt, softDeadline, hardDeadline), a mutable resolution (open/done/lapsed/skipped), an optional startedAt, and an optional completedAt. Display state is derived from resolution + time.
- **Contact/Customer**: A person associated with one or more tasks. Used for filtering and display context.
- **Notification**: A scheduled reminder tied to a cycle's dueAt time. Type (push/email/SMS/silent) is configured on the task.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete any due habit in a single tap from the task list or detail view.
- **SC-002**: A task's displayed status is identical across the task list, task detail, and statistics views — zero inconsistencies.
- **SC-003**: After a missed occurrence, the next cycle's task list entry shows context about the miss (date of last miss) without requiring the user to navigate to statistics.
- **SC-004**: Pausing a task for any duration and resuming it results in zero missed cycles during the paused period.
- **SC-005**: Statistics accurately separate completed, missed, and skipped counts, with completion rate excluding intentional skips from the denominator.
- **SC-006**: A user returning after multiple days offline sees all missed cycles correctly recorded and the current cycle at the correct phase — within 3 seconds of app launch.
- **SC-007**: Notifications fire within 60 seconds of the cycle's dueAt time when the app is in the background.
- **SC-008**: Retroactively completing a missed cycle updates statistics immediately, reflecting the correction.
