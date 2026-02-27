# Feature Specification: Fix notifications on device, missed routine handling, and task view layout

**Feature Branch**: `001-fix-notifications-routine-taskview`  
**Created**: 2026-02-19  
**Status**: Draft  
**Input**: User description: "notifications not shown on phone; if a routine bypassed its time it should end current cycle and enter next cycle after suitable margin of time, so I can see it in statistics as missed; in task view page info part is not designed well and takes extra space - add task controls here (start, mark as complete, etc.)"

## Clarifications

### Session 2026-02-19

- Q: Margin period configuration approach → A: Percentage of routine period (margin = X% of the routine's interval, e.g., 5% of daily = 72 min)

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Device notifications appear when scheduled (Priority: P1)

As a user, I want to receive local notifications on my phone when a task or routine is due, so that I am reminded to complete my tasks even when the app is not open.

**Why this priority**: Without notifications, users cannot rely on the app for reminders, making the core purpose of the app ineffective.

**Independent Test**: Can be fully tested by scheduling a task with a notification and verifying the notification appears on the device at the scheduled time.

**Acceptance Scenarios**:

1. **Given** a task has been created with a scheduled notification time, **When** the scheduled time arrives while the app is in the background, **Then** the user receives a visible notification on the device.
2. **Given** notification permissions are granted, **When** the app launches and has pending notifications to deliver, **Then** those notifications are delivered at their scheduled times.
3. **Given** the device is restarted, **When** the app has stored scheduled notifications, **Then** the notifications are re-scheduled and delivered as originally intended.

---

### User Story 2 - Missed routines are tracked and displayed in statistics (Priority: P1)

As a user, I want the app to automatically detect when I miss a routine cycle and show it in my statistics, so that I can track my consistency and identify habits I need to improve.

**Why this priority**: This addresses the core value proposition of habit/routine tracking - users need accurate data about their compliance to understand their patterns.

**Independent Test**: Can be fully tested by creating a routine with a scheduled time, allowing that time to pass without completing the routine, waiting for the margin period, and verifying the missed occurrence appears in statistics.

**Acceptance Scenarios**:

1. **Given** a routine was scheduled at a specific time but not completed, **When** a suitable margin period (default 15 minutes) has passed, **Then** the current cycle ends, the next cycle begins, and the missed occurrence is recorded.
2. **Given** a routine was missed by more than one complete cycle, **When** the margin period has passed for each missed cycle, **Then** each missed cycle is recorded separately in statistics.
3. **Given** the user views their statistics dashboard, **When** they filter by a specific time period, **Then** missed routine occurrences are visible alongside completed occurrences.

---

### User Story 3 - Task detail view is compact with accessible controls (Priority: P2)

As a user, I want the task detail view to display information efficiently with primary actions visible without scrolling, so that I can quickly view and act on my tasks.

**Why this priority**: Poor layout wastes user time and creates friction. Users should be able to see key information and take actions immediately.

**Independent Test**: Can be fully tested by opening the task detail page on different screen sizes and verifying controls are visible and accessible without excessive scrolling.

**Acceptance Scenarios**:

1. **Given** a user opens a task detail page, **When** viewing the page on a standard mobile screen, **Then** key task controls (start, mark complete, delete, edit) are visible within the first viewport without scrolling.
2. **Given** a user opens a task detail page, **When** the page loads, **Then** the info section uses space efficiently without redundant whitespace or overly large text blocks.
3. **Given** a task is in progress, **When** the user views the detail page, **Then** there is a clear "Mark Complete" action prominently displayed.

---

### User Story 4 - Notification permissions are properly requested and handled (Priority: P2)

As a user, I want the app to gracefully handle notification permissions, so that I understand why I may not be receiving notifications if permissions are denied.

**Why this priority**: Without proper permission handling, users may not receive notifications without understanding why.

**Independent Test**: Can be tested by checking the notification permission state and verifying appropriate behavior when permissions are granted, denied, or not yet requested.

**Acceptance Scenarios**:

1. **Given** the app is launched for the first time, **When** notifications are needed, **Then** the user is prompted to grant notification permissions.
2. **Given** notification permissions are denied, **When** the user attempts to schedule a notification, **Then** the user is informed that notifications require permission.

---

### Edge Cases

- What happens when the device is in Do Not Disturb mode and a notification is scheduled?
- How does the system handle multiple missed cycles in sequence (e.g., user was away for multiple days)?
- What is the default margin period when a routine is bypassed? [NEEDS CLARIFICATION: Is 15 minutes acceptable, or should it be configurable?]
- How are notifications handled when the device date/time is changed manually?
- What happens if the app is force-closed before a notification fires - are notifications restored on next launch?
- How does the task view layout adapt on tablets versus phones?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST deliver local notifications on the device at their scheduled times when the app is in the background.
- **FR-002**: System MUST request notification permissions from the user before scheduling notifications.
- **FR-003**: System MUST gracefully handle denied notification permissions by informing the user.
- **FR-004**: System MUST end the current routine cycle and start the next cycle after a margin period equal to a configurable percentage of the routine's interval when a routine is bypassed.
- **FR-005**: System MUST record missed routine occurrences in persistent storage for display in statistics.
- **FR-006**: System MUST display missed routine occurrences in the statistics view with appropriate filtering by time period.
- **FR-007**: System MUST display task controls (start, mark complete, delete, edit) within the first viewport of the task detail page on standard mobile screens.
- **FR-008**: System MUST use space efficiently in the task detail info section to avoid unnecessary vertical scrolling.
- **FR-009**: System MUST reschedule pending notifications on app launch to ensure delivery after device restart.
- **FR-010**: System MUST handle multiple consecutive missed cycles by recording each one separately.

*Example of marking unclear requirements:*

- **FR-011**: System MUST calculate the margin period as a percentage of the routine's interval (e.g., 5% of a daily routine = 72 minutes) and make this percentage configurable via global settings.

### Key Entities *(include if relevant)*

- **Task**: Represents a task with schedule, status, and notification settings
- **Routine**: Represents a recurring task with cycle-based scheduling
- **Cycle**: A single occurrence of a routine, with start time, completion status, and missed flag
- **Notification**: A scheduled reminder delivered via the device's notification system
- **Statistics**: Aggregated data showing completed vs missed routine occurrences over time

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Notifications appear on the device within 60 seconds of their scheduled time when the app is in the background.
- **SC-002**: Missed routine occurrences are visible in the statistics view within 30 minutes after the margin period has passed.
- **SC-003**: Task controls are visible without scrolling on devices with screen heights of 640px or greater.
- **SC-004**: The info section of the task detail page uses no more than 40% of the initial viewport height on standard mobile devices.
- **SC-005**: All notification-related functionality works correctly after app restart without manual reconfiguration.
