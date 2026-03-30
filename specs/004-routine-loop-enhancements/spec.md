# Feature Specification: Routine Loop enhancements: cycle corrections, paused tab, branding

**Feature Branch**: `004-routine-loop-enhancements`  
**Created**: 2026-03-11  
**Status**: Draft  
**Input**: User description: "Points: 1) Allow marking future cycles complete before due time (grace period = 0); 2) Missed cycle correction for most recent missed cycle only (all frequencies: daily, weekly, monthly); 3) Paused tasks in separate tab; 4) Branding: theme color, logo, naming Routine Loop, splash screen using assets"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correct the most recent missed cycle (Priority: P1)

As a user, I want to mark the most recent missed cycle as complete so that I can accurately reflect when I actually did a task, even if I forgot to mark it on time.

**Why this priority**: Habit tracking loses value if users cannot correct honest oversights. This directly impacts data accuracy and user trust in statistics.

**Independent Test**: Can be fully tested by creating a task, letting a cycle pass without completing it, and verifying a correction control appears for only the most recent missed cycle.

**Acceptance Scenarios**:

1. **Given** a daily task where yesterday's cycle is missed (resolution = lapsed), **When** the user opens the task detail page, **Then** a "I did yesterday" correction button is shown alongside today's cycle actions.
2. **Given** a weekly task where last week's cycle is missed, **When** the user opens the task detail page, **Then** a correction button for the most recent missed week is shown alongside current cycle actions.
3. **Given** a monthly task where last month's cycle is missed, **When** the user opens the task detail page, **Then** a correction button for the most recent missed month is shown alongside current cycle actions.
4. **Given** a task with multiple consecutive missed cycles (e.g., 3 weeks missed), **When** the user opens the task detail page, **Then** only the most recent missed cycle (1 week ago) shows a correction button; older missed cycles do not.
5. **Given** a task where the most recent missed cycle has been corrected, **When** the user opens the task detail page, **Then** no correction button is shown for that cycle (it is now resolved).

---

### User Story 2 - Mark future cycle complete when no grace period (Priority: P2)

As a user, I want to mark the next upcoming cycle as complete in advance so that I can plan ahead without creating a false "missed" record.

**Why this priority**: Allows users to pre-mark tasks they plan to do early, preventing false missed records when the due time equals the hard deadline (grace period = 0).

**Independent Test**: Can be fully tested by creating a task with notification time equal to due time (no separate soft deadline), and verifying the "Mark complete" action is available before the due time arrives.

**Acceptance Scenarios**:

1. **Given** a task where the due time equals the hard deadline (no soft deadline / grace period = 0), **When** the next cycle is upcoming but not yet due, **Then** the user CAN mark it complete from the task detail page.
2. **Given** a task where a soft deadline exists (grace period > 0), **When** the next cycle is before the soft deadline, **Then** the user CANNOT mark it complete early (only at or after due time).
3. **Given** a task where the current cycle is already resolved (done/skipped), **When** the user views the task detail page, **Then** no early-complete action is shown for the next future cycle.

---

### User Story 3 - Paused tasks in separate tab (Priority: P2)

As a user, I want paused tasks out of my main daily view so that I can focus on active tasks without clutter.

**Why this priority**: Paused tasks are intentionally on hold; they should not distract from the daily routine view. Separating them improves clarity and reduces cognitive load.

**Independent Test**: Can be fully tested by pausing a task and verifying it disappears from the main list and appears in a dedicated Paused tab. Resume action should be available in both the tab and the task detail page.

**Acceptance Scenarios**:

1. **Given** a user has paused tasks, **When** they view the main task list, **Then** only active tasks are shown; paused tasks are not visible.
2. **Given** a user has paused tasks, **When** they navigate to the Paused tab, **Then** all paused tasks are listed with a "Resume" action.
3. **Given** a user is on the task detail page of a paused task, **When** they view the page, **Then** the "Pause" button is replaced with "Resume".
4. **Given** a user resumes a task from the Paused tab, **When** the action completes, **Then** the task reappears in the main active task list.

---

### User Story 4 - Branding: theme, logo, splash screen (Priority: P3)

As a user, I want the app to feel cohesive and branded as "Routine Loop" so that it feels like a professional product I trust.

**Why this priority**: Branding reinforces identity and trust. This is a polish item that impacts first impressions and perceived quality.

**Independent Test**: Can be verified by launching the app and observing the splash screen, app icon/label, and consistent theme color throughout the UI.

**Acceptance Scenarios**:

1. **Given** the app launches, **When** the splash screen displays, **Then** it shows the Routine Loop branding (logo and name).
2. **Given** the app is running, **When** the user views any page, **Then** the theme color is consistently applied (primary color, accents, status colors).
3. **Given** the app is running, **When** the user views the task list or detail pages, **Then** the header/title area reflects the Routine Loop branding.

---

### Edge Cases

- What happens when a user corrects a missed cycle that is no longer the most recent (should never happen via UI, but what if DB state changes)?
- How does the correction interact with the statistics — does correcting a missed cycle retroactively update the achievement rate?
- What if a user pauses a task that has a missed cycle? Does the correction still appear in the Paused tab's task detail?
- Can a user correct a missed cycle while offline (local-first app)?
- What is the naming convention for the app name in headers, menus, and app store listings?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a correction button for the most recent missed cycle (resolution = lapsed) in the task detail page, regardless of task frequency (daily, weekly, monthly).
- **FR-002**: System MUST allow correction of only one missed cycle at a time — the most recent one.
- **FR-003**: System MUST NOT show correction buttons for older missed cycles when a more recent missed cycle exists for the same task.
- **FR-004**: System MUST allow a user to mark the upcoming cycle as complete when the task's due time equals its hard deadline (no grace period).
- **FR-005**: System MUST NOT allow early completion of a future cycle when a soft deadline (grace period) exists before the hard deadline.
- **FR-006**: System MUST hide paused tasks from the main active task list.
- **FR-007**: System MUST display all paused tasks in a dedicated "Paused" tab or section accessible from the task list.
- **FR-008**: System MUST show a "Resume" action for paused tasks in both the Paused tab and the task detail page.
- **FR-009**: System MUST display the "Routine Loop" branding (name, logo, theme) on the splash screen, app header, and consistently throughout the UI.
- **FR-010**: System MUST apply a consistent primary theme color across all components.

### Key Entities *(include if relevant)*

- **Cycle**: Represents a single occurrence of a routine, with resolution status (open, done, lapsed, skipped) and date fields (cycleStartDate, dueAt, softDeadline, hardDeadline).
- **Task**: Represents a routine with frequency (daily, weekly, monthly), state (active, paused, archived), and notification settings.
- **CycleCorrection**: A retroactive action that changes a lapsed cycle's resolution to done, with the correction timestamp recorded.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can correct the most recent missed cycle from the task detail page in under 2 taps.
- **SC-002**: No correction button is visible for non-most-recent missed cycles.
- **SC-003**: Paused tasks do not appear in the main task list; 100% of paused tasks are visible in the Paused tab.
- **SC-004**: The Routine Loop branding (logo, name, theme) is visible on the splash screen and app header within 3 seconds of launch.
- **SC-005**: The app theme color is consistent across at least 90% of UI components (measured by visual inspection).
