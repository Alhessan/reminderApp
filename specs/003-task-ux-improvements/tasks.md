# Tasks: Task View User Experience Improvements (003)

**Feature**: 003-task-ux-improvements  
**Branch**: `003-task-ux-improvements`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

## Implementation strategy

- **MVP first**: Deliver US1 (cycle transition), then US2 (timeline). Each phase is independently testable.
- **Incremental delivery**: Timeline and messaging depend on foundational getResolvedCycles and situational-message model. Sample data enables verification.

---

## Phase 1: Setup

- [x] T001 Verify feature branch and dependencies: ensure @angular/animations is available and task-detail page can import it in src/app/pages/task-management/task-detail/task-detail.page.ts
- [x] T002 [P] Register all ionicons used in task-detail (pause-outline, play-outline, play-forward-outline, checkmark-done-outline, alert-circle-outline, arrow-back-outline) in src/app/app.component.ts addIcons to avoid white screen

---

## Phase 2: Foundational (blocking for US2 and US4)

- [x] T003 Add or verify getResolvedCycles(taskId: number, limit?: number, offset?: number) in src/app/services/task-cycle.service.ts returning resolved cycles (done, lapsed, skipped) for timeline; ensure it returns all cycles for the task with no filtering bug
- [x] T004 [P] Create or verify situational-message.model.ts with SituationalMessageLevel enum and message map (~10 levels) in src/app/models/situational-message.model.ts

---

## Phase 3: User Story 1 — Noticeable transition when moving to the next cycle (P1)

**Goal**: User clearly sees a geometric transition when the view switches from current cycle to next after "Mark complete".  
**Independent test**: Complete a cycle from task view; verify slide/fade transition and next cycle (upcoming) clearly indicated.

- [x] T005 [US1] Add slide+fade animation trigger to task-detail cycle block (status card + work-bench primary actions) in src/app/pages/task-management/task-detail/task-detail.page.ts and task-detail.page.html
- [x] T006 [US1] Trigger geometric transition after markComplete when view updates to next cycle in src/app/pages/task-management/task-detail/task-detail.page.ts

---

## Phase 4: User Story 2 — Timeline view inside the task view (P1)

**Goal**: Timeline in daily-sample style — day-grouped layout with date header (e.g. "Mar 10, 2026 · MON"), time + status + icon per cycle; always shows full history; always updated after cycle actions.  
**Independent test**: Open task with mixed cycles; verify timeline shows each occurrence with correct resolution and timing; verify refresh after markComplete/skip.

- [x] T007 [P] [US2] Create or restore TaskCycleTimelineComponent with day-grouped layout: day header (e.g. "Mar 10, 2026 · MON"), events under each day with time (date:'short' or date:'HH:mm'), status chip, icon from STATUS_CONFIG in src/app/pages/task-management/task-detail/components/task-cycle-timeline.component.ts
- [x] T008 [US2] Implement loadTimelineSlice in task-detail page; call getResolvedCycles with default limit 10; pass cycles and upcomingCycle to TaskCycleTimelineComponent in src/app/pages/task-management/task-detail/task-detail.page.ts
- [x] T009 [US2] Ensure timeline refreshes on loadTaskDetails, markComplete, skipCycle, markRetroactiveComplete, ionViewWillEnter in src/app/pages/task-management/task-detail/task-detail.page.ts
- [x] T010 [US2] Add "See full history" / "Load more" control to expand timeline when more cycles exist than default N (10) in src/app/pages/task-management/task-detail/components/task-cycle-timeline.component.ts
- [x] T011 [US2] Integrate TaskCycleTimelineComponent into task-detail template (section order: after statistics) in src/app/pages/task-management/task-detail/task-detail.page.html

---

## Phase 5: User Story 3 — Clear "correct previous step" control (P2)

**Goal**: Retroactive-complete control in main action area but visually distinct from Mark complete / Skip.  
**Independent test**: Task with missed cycle; verify control label and placement clearly indicate "past occurrence".

- [x] T012 [US3] Ensure retroactive-complete button is in a distinct section in work-bench (separate row or visual group) with label "I did it last time" in src/app/pages/task-management/task-detail/task-detail.page.html and task-detail.page.scss

---

## Phase 6: User Story 4 — Situational messages (P2) — Revised: hide for new tasks

**Goal**: Hero section with situational message; do NOT show when task has 0 resolved cycles; show only when resolvedCycles.length >= 3.  
**Independent test**: Open Monthly Review (0 resolved) — no hero; open Daily Check (4+ resolved) — hero shown and encouraging.

- [x] T013 [P] [US4] Create or verify SituationalMessageService with getLevel(taskId) and sync derivation from last action + achievement rate in src/app/services/situational-message.service.ts
- [x] T014 [P] [US4] Create or verify TaskHeroMessageComponent that displays situational message in src/app/pages/task-management/task-detail/components/task-hero-message.component.ts
- [x] T015 [US4] In task-detail: fetch resolved count; only fetch and display hero when resolvedCycles.length >= 3; skip hero section entirely when 0 resolved in src/app/pages/task-management/task-detail/task-detail.page.ts and task-detail.page.html
- [x] T016 [US4] Refresh hero message when cycle ends (markComplete, skipCycle, markRetroactiveComplete) only when hero is shown in src/app/pages/task-management/task-detail/task-detail.page.ts

---

## Phase 7: User Story 5 — Missed cycles styled for clarity (P2)

**Goal**: Missed cycles use white (or light) + border/shadow in list, detail, and timeline.  
**Independent test**: View missed cycles in list, detail, and timeline; verify consistent styling.

- [x] T017 [P] [US5] Apply missed-cycle styling (white or light surface + border or shadow) in cycle-status-badge when status is missed in src/app/components/cycle-status-badge/cycle-status-badge.component.ts and cycle-status-badge.component.scss
- [x] T018 [P] [US5] Apply same missed-cycle styling in task-list-item for missed cycles in src/app/pages/task-management/task-list/components/task-list-item.component.ts and task-list-item.component.scss
- [x] T019 [US5] Apply same missed-cycle styling to timeline cycle items when displayStatus is missed in src/app/pages/task-management/task-detail/components/task-cycle-timeline.component.ts

---

## Phase 8: Sample data (enables verification)

**Goal**: Professional names; cycles that populate timeline correctly for all three states.  
**Independent test**: After Generate Sample Data — Daily Check: 4 completed + 1 upcoming; Weekly Update: 1 done, 2 skipped, 1 upcoming; Monthly Review: empty timeline with upcoming only.

- [x] T020 Update SampleDataService.generateSampleTasks() with names "Daily Check", "Weekly Update", "Monthly Review" and cycle creation (resolveCycle + createNextCycle) per data-model.md in src/app/services/sample-data.service.ts
- [x] T021 Verify getResolvedCycles returns correct data for each sample task; fix any filtering bug if timeline shows wrong counts in src/app/services/task-cycle.service.ts

---

## Phase 9: Polish & cross-cutting

- [x] T022 Add theme variable or utility class for missed-cycle surface (light in dark mode) in src/theme/variables.scss or src/global.scss
- [x] T023 Ensure task-detail section order: hero (when shown), header, status card, work-bench, notes (if any), statistics, timeline in src/app/pages/task-management/task-detail/task-detail.page.html

---

## Dependencies (story completion order)

1. **Phase 1–2** must complete before any user story.
2. **US1** (T005–T006): Depends on Phase 1. No dependency on US2–US5.
3. **US2** (T007–T011): Depends on T003 (getResolvedCycles). Independent of US1, US3, US4, US5.
4. **US3** (T012): Depends only on Phase 1. Can run in parallel with US1/US2 after Phase 2.
5. **US4** (T013–T016): Depends on T003, T004. Independent of US1, US2, US3; US5 can follow.
6. **US5** (T017–T019): T017–T018 independent; T019 depends on US2 (timeline exists).
7. **Sample data** (T020–T021): After T003; T020 can run in parallel with US2–US5.
8. **Polish** (T022–T023): After US1–US5.

---

## Parallel execution examples

- **After Phase 2**: T005 (US1), T007 (US2), T012 (US3), T013 (US4), T017 (US5), T020 (sample data) can run in parallel (different files).
- **Within US2**: T007 and T008 can overlap; T009–T011 after T007–T008.
- **Within US4**: T013 and T014 in parallel; T015–T016 after both.
- **Within US5**: T017 and T018 in parallel; T019 after T007 (timeline component exists).

---

## Task summary

| Phase | Story | Task count |
|-------|-------|------------|
| Phase 1 | Setup | 2 |
| Phase 2 | Foundational | 2 |
| Phase 3 | US1 | 2 |
| Phase 4 | US2 | 5 |
| Phase 5 | US3 | 1 |
| Phase 6 | US4 | 4 |
| Phase 7 | US5 | 3 |
| Phase 8 | Sample data | 2 |
| Phase 9 | Polish | 2 |
| **Total** | | **23** |

**Suggested MVP scope**: Phase 1 + Phase 2 + Phase 3 (US1 only) = T001–T006. Delivers visible cycle transition; then add timeline (US2), correct-step (US3), hero with hide-for-new rule (US4), missed styling (US5), sample data, and polish.
