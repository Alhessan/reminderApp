# Tasks: Routine Loop enhancements (004)

**Feature**: 004-routine-loop-enhancements  
**Branch**: `004-routine-loop-enhancements`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

## Implementation Strategy

- **MVP first**: Deliver US1 (most recent missed cycle correction), then US2, US3, US4.
- **Incremental delivery**: Each user story is independently testable. Complete one, verify, then move to the next.
- **Parallel execution**: Since all stories modify different UI areas, US2/US3/US4 can run in parallel (different files) after US1.

---

## Phase 1: Setup (Minimal — project exists)

No setup needed. The project structure and stack are already in place.

---

## Phase 2: Foundational (Blocking Prerequisites)

**No foundational tasks.** All services and models already exist. Implementation can begin immediately with User Stories.

---

## Phase 3: User Story 1 — Most recent missed cycle correction (Priority: P1) 🎯 MVP

**Goal**: Display a correction button for the most recent missed cycle on the task detail page, allowing users to mark it as done. Works for all frequencies (daily, weekly, monthly).

**Independent Test**: Create a task, let a cycle pass, open the task detail page, verify correction button appears for only the most recent missed cycle.

- [X] T001 [US1] Verify `getMostRecentLapsedCycle` in `src/app/services/task-cycle.service.ts` returns the correct cycle (ORDER BY hardDeadline DESC LIMIT 1). Add console.log to confirm behavior with multiple lapsed cycles.
- [X] T002 [US1] Add dynamic correction button to task-detail page work-bench in `src/app/pages/task-management/task-detail/task-detail.page.ts`: add `canShowRetroactiveComplete` getter that checks `mostRecentLapsedCycle?.resolution === 'lapsed'` (already exists, verify it's wired correctly).
- [X] T003 [US1] Update correction button label in `src/app/pages/task-management/task-detail/task-detail.page.html` to be dynamic based on frequency: "I did yesterday" for daily, "I did last week" for weekly, "I did last month" for monthly. Use `task.frequency` to determine label. **Updated**: label now shows actual cycle date (e.g. "I did Mon, Mar 23") with section label "Missed cycle" and date sub-label "Due Mon, Mar 23".
- [X] T004 [US1] Fix sample data to produce exactly one most recent lapsed cycle per task (was creating many due to auto-create in loop). Added `deleteCyclesForTask()` and `markCycleLapsed()` methods. Regenerate sample data to verify.

---

## Phase 4: User Story 2 — Early completion when grace period = 0 (Priority: P2)

**Goal**: Allow users to mark a cycle complete before the due time when the soft deadline equals the hard deadline (grace period = 0).

**Independent Test**: Create a task where dueAt === hardDeadline (no soft deadline), verify "Mark complete" is available before the cycle is due.

- [X] T005 [P] [US2] Modify `canMarkComplete` getter in `src/app/pages/task-management/task-detail/task-detail.page.ts` to also check: `!currentCycle.softDeadline || currentCycle.softDeadline === currentCycle.dueAt`. This allows marking complete when grace period = 0.
- [X] T006 [P] [US2] Add explanatory text in `src/app/pages/task-management/task-detail/task-detail.page.html` for the "Mark complete" button: show a small hint when early completion is not allowed (grace period > 0).
- [ ] T007 [US2] Test: create a task with grace period > 0 (soft deadline before hard deadline), verify "Mark complete" is NOT available until due time.

- [X] T008 [P] [US3] Add "Paused" tab/segment to task list in `src/app/pages/task-management/task-list/task-list.page.ts`: add a `currentListView` state ('active' | 'paused'), modify the list query/filter to show only active or paused based on view.
- [X] T009 [P] [US3] Update task list template in `src/app/pages/task-management/task-list/task-list.page.html`: add an `ion-segment` or tab buttons with "Active" and "Paused" options. Show filtered list based on `currentListView`.
- [X] T010 [P] [US3] Change "Pause" to "Resume" in task detail page `src/app/pages/task-management/task-detail/task-detail.page.ts`: in the work-bench section, change button label from "Pause" to "Resume" when `task.state === 'paused'`. Update `canPause` and `canResume` getters accordingly.
- [X] T011 [US3] Update Resume button in `src/app/pages/task-management/task-detail/task-detail.page.html`: show "Resume" button (with play icon) instead of "Pause" when task is paused.
- [X] T012 [US3] Test: pause a task, verify it disappears from Active tab and appears in Paused tab. Resume from Paused tab, verify task returns to Active tab. **Also blocked**: `canMarkComplete` and `canSkip` now return false when `task.state === 'paused'`. `scheduleNotification()` returns early when task is paused. Pause/Resume now work correctly (fixed hardcoded string bug in UPDATE queries).

- [X] T013 [P] [US4] Configure Capacitor splash screen in `capacitor.config.ts`: set `plugins.SplashScreen` to use the logo from `src/assets/logo/text-logo-light.png` and `text-logo-dark.png` for dark mode. Use existing `--app-primary: #7c4dff` color.
- [X] T014 [P] [US4] Update app display name in `android/app/src/main/res/values/strings.xml`: verify app name is "Routine Loop" or "RoutineLoop".
- [X] T015 [US4] Add logo to app header in `src/app/app.component.ts` or toolbar template: import `text-logo-light.png` / `text-logo-dark.png` and display in the header. Support dark/light mode switching.
- [X] T016 [US4] Verify theme consistency: ensure `--app-primary: #7c4dff` is used for toolbar background, primary buttons, and accent elements throughout the app. Update `src/theme/variables.scss` if any color references are inconsistent. **Updated**: theme changed to teal/green from logo (#2CB996). Updated `global.scss` (--ion-color-primary: #2CB996, --ion-color-primary-shade: #1EABAB, --ion-color-primary-tint: #5DD9BE), `variables.scss` (--app-primary: #2CB996), `colors.xml` (colorPrimary: #2CB996), `capacitor.config.ts` (backgroundColor: '0xFF2CB996').
- [ ] T017 [US4] Test: launch app on device/emulator, verify splash screen shows Routine Loop branding, header shows logo, theme color is consistent across UI. **Fixed**: installed `@capacitor/splash-screen@7` (was missing), added `launchAutoHide`, hex color `0xFF2CB996`, `launchTheme: '@drawable/splash'`.

- [ ] T018 Verify all new UI works in dark mode (correction button, paused tab, branding)
- [ ] T019 Run full app manual test: create task, complete cycle, pause/resume, correct missed cycle, verify no regressions
- [ ] T020 Clean up any debug console.log statements added during implementation

---

## Dependencies & Execution Order

### Story Dependencies

| Story | Depends On | Notes |
|-------|------------|-------|
| US1 (Correction) | None | First to implement |
| US2 (Early completion) | None | Independent |
| US3 (Paused tab) | None | Independent |
| US4 (Branding) | None | Independent |

### Within Each Story

- Models: N/A (no new models needed)
- Services: Verify existing query (T001)
- UI: Task-detail modifications, Task-list modifications, Branding config

---

## Parallel Execution Examples

**After US1 is done, these can all run in parallel (different files):**

```
US2: T005 (task-detail.page.ts) + T006 (task-detail.page.html)
US3: T008 (task-list.page.ts) + T009 (task-list.page.html) + T010 (task-detail.page.ts) + T011 (task-detail.page.html)
US4: T013 (capacitor.config.ts) + T014 (strings.xml) + T015 (app.component.ts) + T016 (variables.scss)
```

---

## Task Summary

| Phase | Story | Tasks |
|-------|-------|-------|
| Setup | — | 0 |
| Foundational | — | 0 |
| US1 | Correction | 4 |
| US2 | Early completion | 3 |
| US3 | Paused tab | 5 |
| US4 | Branding | 5 |
| Polish | — | 3 |
| **Total** | | **20** |

**Suggested MVP scope**: US1 (T001–T004) — delivers the core missed correction feature.

---

## Files to Modify

| File | Tasks |
|------|-------|
| `src/app/services/task-cycle.service.ts` | T001 |
| `src/app/pages/task-management/task-detail/task-detail.page.ts` | T002, T003, T005, T010 |
| `src/app/pages/task-management/task-detail/task-detail.page.html` | T003, T006, T011 |
| `src/app/pages/task-management/task-list/task-list.page.ts` | T008 |
| `src/app/pages/task-management/task-list/task-list.page.html` | T009 |
| `src/app/app.component.ts` | T015 |
| `src/theme/variables.scss` | T016 |
| `capacitor.config.ts` | T013 |
| `android/app/src/main/res/values/strings.xml` | T014 |

**No new files required.** All changes are modifications to existing files.
