# Feature Specification: Task View User Experience Improvements

**Feature Branch**: `003-task-ux-improvements`  
**Created**: 2026-03-09  
**Status**: Draft  
**Input**: Improve task view UX: visible transition when moving to next cycle after completion; timeline view for completion/skip history; clearer "correct previous step" control; situational messages at top of task page (Atomic Habits–aligned); missed cycles styled in white with border/shadow.

## Clarifications

### Session 2026-03-09

- Q: How should "recently missed" and "doing well" be defined for choosing the hero message? → A: Update the message after each cycle end when needed. Use multiple situational levels (e.g. ~10), considering last action (e.g. completed, missed, skipped) and achievement rate.
- Q: How should the timeline handle the number of cycles (range or cap)? → A: Show last N by default with "Load more" or "See full history" to expand; use a horizontal slide action for the expansion.
- Q: Should the cycle transition be primarily geometric or color? → A: Geometric (e.g. slide, crossfade, or card swap; color may support but is secondary).
- Q: Where should the "correct previous step" control appear? → A: In the main action area, but distinguished from current-task-related actions (Complete/Skip) so it is clearly separate (e.g. by placement, label, or visual grouping).
- Q: How should the default timeline length (N) be determined? → A: Fixed default (e.g. 10 or 15 cycles) for all users; no user setting.

### Session 2026-03-10 (Revised after first attempt)

- **Timeline design**: Use "daily sample timeline" style — day columns with date header (e.g. "OCT 21 MON"), each event shows time + status + icon. Scope: one task only (per-task timeline). Timeline MUST always reflect latest data (refresh on load, markComplete, skipCycle, markRetroactiveComplete).
- **Messaging**: Do NOT show situational message when task has 0 resolved cycles (new/just-started). Consider hiding for 1–2 resolved cycles. Show only when task has meaningful history (e.g. 3+ resolved).
- **Sample data**: Use professional names (e.g. "Daily Check", "Weekly Update", "Monthly Review"). Generate cycles so timeline shows varied states: multiple completed, mixed completed/skipped, and empty (just-started).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Noticeable transition when moving to the next cycle (Priority: P1)

As a user, when I complete the current cycle and the screen updates to show the next cycle, I want to clearly notice that the context has changed from "current cycle" to "upcoming cycle" so that I am not left wondering whether anything happened or which occurrence I am now looking at.

**Why this priority**: Completing a cycle is a primary action. If the transition to the next cycle is barely noticeable, users lose sense of progress and may repeat or second-guess their action, harming trust and clarity.

**Independent Test**: Complete a cycle from the task view and verify that a clear geometric transition (e.g. slide, crossfade, or card swap) indicates the move from the current cycle to the upcoming one.

**Acceptance Scenarios**:

1. **Given** the user is viewing a task and the current cycle is in focus, **When** the user taps the complete action and the view updates to the next cycle, **Then** a visible geometric transition (e.g. slide, crossfade, or card swap) makes it obvious that the displayed cycle has changed.
2. **Given** the transition runs, **When** it finishes, **Then** the user sees the next cycle (upcoming) clearly indicated, with no ambiguity about which occurrence is shown.
3. **Given** the user has just completed a cycle, **When** the next cycle is shown, **Then** the treatment of "upcoming" is visually distinct from the previous "current" or "due" treatment so the change is recognizable at a glance.

---

### User Story 2 — Timeline view inside the task view (Priority: P1)

As a user, I want to see a timeline within the task view that shows when I could complete the task, when I completed it, and when I skipped, using the same rules and data the application already uses, so that I can understand my pattern over time without leaving the task page.

**Why this priority**: Timeline visibility supports habit awareness and identity (Atomic Habits). Users need to see their history in context of the task without switching to a separate statistics screen.

**Independent Test**: Open a task that has completed, missed, and skipped cycles; verify the timeline shows each occurrence with the correct resolution and timing, consistent with the app’s existing protocol.

**Acceptance Scenarios**:

1. **Given** the user is on a task’s detail view, **When** they view the timeline section, **Then** they see a timeline of cycles (or occurrences) with when each was due, and whether it was completed, missed, or skipped.
2. **Given** the app already defines how cycles and resolutions are stored and derived, **When** the timeline is rendered, **Then** it uses the same protocol (same cycle model, same resolution values and timestamps) so data is consistent everywhere.
3. **Given** the timeline is visible, **When** the user scans it, **Then** they can distinguish completed, missed, and skipped occurrences at a glance (e.g. by label, color, or icon consistent with the rest of the app).
4. **Given** the task has an upcoming cycle, **When** the user views the timeline, **Then** the upcoming occurrence is represented in a way that fits the timeline (e.g. "next" or "upcoming" with due time).
5. **Given** the task has more cycles than the default timeline shows, **When** the user wants to see more, **Then** they can expand the timeline (e.g. via "Load more" or "See full history") using a horizontal slide action to reveal additional cycles.

---

### User Story 3 — Clear "correct previous step" control (Priority: P2)

As a user, I want the control that lets me fix a missed cycle (e.g. "I actually did this") to be clearly presented as correcting a past occurrence, not as part of the normal flow for the current cycle, so that I understand I am fixing history rather than completing the current one.

**Why this priority**: Confusion between "complete current" and "retroactively complete last missed" leads to wrong taps and mistrust. Making the correction action clearly separate improves accuracy and confidence.

**Independent Test**: On a task that has a missed cycle and a current/upcoming cycle, verify that the retroactive-completion control is labeled and/or placed so it is obviously "correct a missed occurrence" and not "complete this cycle."

**Acceptance Scenarios**:

1. **Given** the task has at least one missed (lapsed) cycle that is eligible for retroactive completion, **When** the user sees the task view, **Then** the control to correct that missed cycle is presented in a way that clearly indicates it is for a past occurrence (e.g. label like "I did it last time" or "Mark last occurrence as done").
2. **Given** the same task also has a current or upcoming cycle, **When** the user views the main action area, **Then** the "correct previous step" control is distinguished from current-task actions (Complete, Skip)—e.g. by placement, label, or visual grouping—so the two are clearly separate and the user cannot easily confuse them.
3. **Given** the user taps the correct-previous-step control, **When** the action is confirmed, **Then** the system updates the missed cycle to completed and the timeline (if present) reflects the change.

---

### User Story 4 — Situational messages at the top of the task page (Priority: P2)

As a user, I want to see a short situational message at the top of the task page that fits my current state (derived from my last action and achievement rate, with many possible levels), and I want that message to update after each cycle ends when my situation changes, aligned with encouraging, non-shaming principles (e.g. Atomic Habits), so that I feel supported rather than judged.

**Why this priority**: Messaging sets the tone. Aligning with "never too late," "start small," and encouragement supports habit formation and return after a miss. Updating after each cycle end keeps the message relevant.

**Independent Test**: Open the task page and complete or miss cycles; verify the hero message matches the situation (last action + achievement rate) and updates when a cycle ends if the state changes. Verify messages are encouraging across levels.

**Acceptance Scenarios**:

1. **Given** the user has not yet completed any cycle for this task, **When** they open the task page, **Then** they see a message that encourages starting (e.g. "It’s never too late — you can start today" or similar).
2. **Given** the user's state is derived from last action and achievement rate, **When** the task page is shown or a cycle has just ended, **Then** the hero message corresponds to one of multiple situational levels (e.g. on the order of 10) and is encouraging for that level.
3. **Given** the user has just resolved a cycle (completed, missed, or skipped), **When** the new state warrants a different message level, **Then** the hero message is updated to reflect the new situation.
4. **Given** the task page is laid out with a hero section at the top, **When** the user scrolls, **Then** below the hero they see the usual task content: actions (complete, skip, correct previous) and any statistics or timeline.
5. **Given** any situational message is shown, **When** the user reads it, **Then** the tone is consistent with principles that favor small steps, identity, and encouragement over guilt or blame.

---

### User Story 5 — Missed cycles styled for clarity (Priority: P2)

As a user, I want missed cycles to be shown with a white (or light) base and a clear border or shadow so they remain readable and visually distinct on any background, without color clash.

**Why this priority**: Missed cycles need to be recognizable at a glance. Using white with border/shadow avoids reliance on a single background color and keeps contrast and consistency across themes.

**Independent Test**: View missed cycles in the task list and task detail (and timeline if applicable) and verify they use white (or equivalent light) treatment with border or shadow and remain legible.

**Acceptance Scenarios**:

1. **Given** a cycle is in "Missed" (lapsed) state, **When** it is displayed in the task view or list, **Then** it uses a white (or light) color treatment for the main area.
2. **Given** that treatment, **When** the component is rendered, **Then** a border or shadow is applied so the missed cycle does not blend into the background and remains clearly distinguishable.
3. **Given** the same missed cycle may appear in list, detail, and timeline, **When** displayed in each place, **Then** the missed state is consistently indicated (e.g. same white + border/shadow pattern or the same logical style rules) so the user always recognizes "missed."

---

### Edge Cases

- What happens when the user completes the last cycle of a one-time task? The transition may lead to an "archived" or "no next cycle" state; the transition should still be visible and the message/screen should reflect that the task is complete or archived.
- What happens when the timeline has many cycles? The timeline shows a fixed default number of cycles (e.g. 10 or 15) by default. The user can expand to see more via "Load more" or "See full history," triggered by a horizontal slide action so the timeline remains usable without overload.
- What happens when there is no missed cycle eligible for correction? The "correct previous step" control should be hidden or disabled so the user is not offered an irrelevant action.
- What if the user has no history yet (brand-new task)? Situational message should show the "not started" / "start today" type message; timeline may be empty or show only the upcoming cycle.
- What if the app supports light and dark backgrounds? Missed-cycle styling (white + border/shadow) should be chosen so it works in both; if "white" is literal, dark mode may need an equivalent light surface with border/shadow to avoid mismatch.

## Requirements *(mandatory)*

### Functional Requirements

**Cycle transition**

- **FR-001**: When the user completes a cycle and the view updates to the next cycle, the system MUST present a visible transition that is primarily geometric (e.g. slide, crossfade, or card swap); color may support the change but is secondary. The transition MUST make it obvious the displayed cycle has changed from the previous one to the next (upcoming).
- **FR-002**: The transition MUST result in the next cycle being clearly indicated as "upcoming" (or equivalent) and visually distinct from the previous "current" or "due" treatment.

**Timeline view**

- **FR-003**: The task detail view MUST include a timeline that shows cycle occurrences with their due time and resolution (completed, missed, skipped).
- **FR-004**: The timeline MUST use the same cycle model, resolution values, and timestamps as the rest of the application (same protocol) so that data is consistent.
- **FR-005**: The timeline MUST allow the user to distinguish completed, missed, and skipped occurrences at a glance (e.g. via label, color, or icon consistent with the app).
- **FR-006**: The timeline MUST represent the upcoming cycle (e.g. "next" or "upcoming" with due time) when one exists.
- **FR-006a**: The timeline MUST show a fixed default number of cycles by default (e.g. 10 or 15; same value for all users, no user setting). When more cycles exist, the user MUST be able to expand the timeline (e.g. "Load more" or "See full history"); the expansion MUST be triggered by a horizontal slide action so the user can reveal more history with a clear, consistent gesture.

**Correct previous step**

- **FR-007**: When a task has a missed (lapsed) cycle eligible for retroactive completion, the system MUST show a control in the main action area that is clearly labeled or positioned as correcting a past occurrence (e.g. "I did it last time" or "Mark last occurrence as done"), not as completing the current cycle. The control MUST be distinguished from current-task-related actions (e.g. Complete, Skip)—e.g. by placement, label, or visual grouping—so it is obviously separate from the primary current-cycle actions.
- **FR-008**: The control for completing the current cycle and the control for retroactively completing the last missed cycle MUST be visually or verbally distinct so users do not confuse them.
- **FR-009**: When the user uses the correct-previous-step control and confirms, the system MUST update that missed cycle to completed and refresh any timeline or statistics that show it.

**Situational messages (hero)**

- **FR-010**: The task page MUST show a situational message at the top (hero section) that reflects the user’s current state for that task. State MUST be derived from last action (e.g. completed, missed, skipped) and achievement rate, with multiple message levels (e.g. on the order of 10) so messaging can be nuanced (e.g. not started, various levels of progress, recent miss, recovery, etc.).
- **FR-011**: The situational message MUST be updated when a cycle ends (when a cycle is resolved — completed, missed, or skipped) if the new state warrants a different message, in addition to being correct when the task page is opened.
- **FR-012**: When the user has not completed any cycle for the task, the message MUST encourage starting (e.g. "It’s never too late — you can start today" or similar).
- **FR-013**: Messages for states where the user has been completing cycles MUST be encouraging and reinforce progress; messages after a recent miss or low achievement MUST be supportive and forward-looking, not shaming.
- **FR-014**: The tone of all situational messages MUST align with principles that favor small steps, identity, and encouragement over guilt or blame.
- **FR-015**: Below the hero section, the task page MUST show the main task content: actions (complete, skip, correct previous step when applicable) and any statistics or timeline.

**Missed cycles styling**

- **FR-016**: Cycles in "Missed" (lapsed) state MUST be displayed with a white (or light) color treatment for the main area.
- **FR-017**: Missed cycles MUST have a border or shadow so they remain distinguishable from the background and do not cause color clash.
- **FR-018**: The same missed-cycle styling (white + border/shadow or equivalent) MUST be applied consistently wherever missed cycles are shown (e.g. list, detail, timeline).

### Key Entities

- **Cycle**: One occurrence of a task with due time and resolution (e.g. completed, missed, skipped). The timeline displays a sequence of cycles; transition and "correct previous step" refer to moving or updating cycles.
- **Task**: The habit or routine. The task page includes hero message, actions, timeline, and statistics; situational messages are derived from the task’s cycle history.
- **Situational message**: A short, state-dependent message shown in the hero section; state is derived from last action and achievement rate, with multiple levels (e.g. ~10); message updates when a cycle ends if the new state warrants a different message.

## Assumptions

- The application already has a cycle model with resolutions (e.g. done, lapsed, skipped) and timestamps; the timeline and correct-previous-step behavior build on that model.
- "Same protocol" for the timeline means reusing the same data source and rules for cycle resolution and timing, not introducing a second definition of "completed" or "missed."
- Atomic Habits alignment means: emphasis on identity, small steps, environment, and encouragement; avoiding shame or guilt-based messaging.
- Situational message state uses last action (completed, missed, skipped) and achievement rate; the number of levels and exact achievement-rate definition (e.g. window, formula) are defined at implementation time; the spec expects on the order of 10 distinct message levels.
- "White" for missed cycles may be implemented as a light surface in dark mode if the app supports themes; the requirement is readability and distinctness via border or shadow in all supported themes.
- The hero section is the top block of the task page; layout order is: hero (situational message) first, then actions and statistics/timeline.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After completing a cycle, users can immediately recognize that the view has switched to the next cycle (e.g. via a single, clear transition) without needing to re-read the screen.
- **SC-002**: Users can see when they completed, missed, or skipped past occurrences from within the task view (timeline) without opening a separate statistics screen.
- **SC-003**: Users can distinguish "complete current cycle" from "correct last missed occurrence" without making the wrong tap; the correct-previous-step control is clearly about fixing a past occurrence.
- **SC-004**: Users see a situational message that matches their state (derived from last action and achievement rate, with multiple levels) and that updates after each cycle end when needed; messages are perceived as encouraging rather than judgmental.
- **SC-005**: Missed cycles are consistently recognizable (white + border/shadow or equivalent) across list, detail, and timeline, with no color clash on the supported backgrounds.
- **SC-006**: Task page structure is clear: hero message at top, then actions and statistics/timeline, so users know where to look for motivation vs. actions.
