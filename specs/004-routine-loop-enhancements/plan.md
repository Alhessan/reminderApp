# Implementation Plan: Routine Loop enhancements

**Branch**: `004-routine-loop-enhancements` | **Date**: 2026-03-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-routine-loop-enhancements/spec.md`

## Summary

Four enhancements to the Routine Loop app: (1) correct the most recent missed cycle, (2) allow early completion when no grace period, (3) separate paused tasks into their own tab, (4) apply Routine Loop branding (logo, theme, splash). All are service and UI changes — no external integrations, no new entities, no stack changes.

## Technical Context

| Field | Value |
|-------|-------|
| **Language/Version** | TypeScript 5.x, Angular 19 |
| **Primary Dependencies** | Ionic 8, Angular Animations |
| **Storage** | SQLite (Capacitor Community SQLite + sql.js) — local-only |
| **Testing** | Angular unit tests + manual browser testing |
| **Target Platform** | Android/iOS via Capacitor 7 |
| **Project Type** | Mobile app (local-first, offline-capable) |
| **Performance Goals** | No new performance requirements — existing performance must not degrade |
| **Constraints** | Local-first; no backend; must support dark and light modes |
| **Scale/Scope** | Small feature set; ~4 user-facing changes |

**Existing assets available:**
- `src/assets/logo/text-logo-light.png`, `text-logo-dark.png`
- `src/assets/video/splash_man.mp4`
- `src/assets/icon/favicon.png`
- App name already set to `RoutineLoop` in `capacitor.config.ts`
- Primary theme color already defined: `--app-primary: #7c4dff` (purple)

**No external integrations** — all features use existing services and SQLite.

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| Service-First Architecture | ✅ Pass | All business logic in TaskCycleService; no SQL in page components |
| Stack Fidelity | ✅ Pass | Ionic 8, Angular 19, Capacitor 7, SQLite only |
| Theme and Design System | ✅ Pass | Uses existing `--app-primary` variable; dark/light mode supported |
| Feature-Based Structure | ✅ Pass | Changes scoped to task-management feature area |
| Test and Review Gates | ✅ Pass | Manual testing required; no new services |

No violations. No amendments needed.

## Project Structure

### Source Code (repository root)

```
src/
├── app/
│   ├── pages/
│   │   └── task-management/
│   │       ├── task-list/
│   │       │   ├── task-list.page.ts       # Modify: add Paused tab/segment
│   │       │   └── task-list.page.html     # Modify: add Paused tab UI
│   │       ├── task-detail/
│   │       │   ├── task-detail.page.ts     # Modify: most-recent missed correction, early completion, Pause→Resume
│   │       │   └── task-detail.page.html   # Modify: correction button, Resume label
│   │       └── task-management.page.ts     # May need routing update for Paused tab
│   ├── services/
│   │   └── task-cycle.service.ts          # Modify: getMostRecentLapsedCycle query
│   └── components/                         # No changes
├── assets/
│   └── logo/
│       ├── text-logo-light.png            # Existing: for light mode branding
│       └── text-logo-dark.png             # Existing: for dark mode branding
├── theme/
│   └── variables.scss                      # Minor: ensure --app-primary is applied consistently
├── global.scss                            # Minor: update app name if hardcoded
android/                                    # Modify: splash screen config
capacitor.config.ts                        # Already has RoutineLoop name
```

## Complexity Tracking

No violations requiring justification.

---

## Phase 0: Research

**No external research needed.** All features use existing APIs and patterns:
- Missed correction: `getMostRecentLapsedCycle` already exists; needs query order change (most recent = highest hardDeadline)
- Early completion: check if `softDeadline` is null/equal to `dueAt` before showing "Mark complete"
- Paused tab: follow pattern from existing `task-archive.page.ts`
- Branding: update capacitor splash config and global.scss app name

---

## Phase 1: Design & Contracts

### Data Model Changes

**No new entities.** `CycleCorrection` is not a new entity — it reuses the existing `Cycle` entity by updating `resolution` from `lapsed` to `done`.

Existing entities (unchanged):
- **Task**: `state` field already supports `'active' | 'paused' | 'archived'`
- **Cycle**: `resolution` field already supports `'open' | 'done' | 'lapsed' | 'skipped'`

### Service Changes (TaskCycleService)

**`getMostRecentLapsedCycle(taskId)`** — already exists but may return wrong cycle:
- Current query: `ORDER BY hardDeadline DESC LIMIT 1` — this IS correct for "most recent"
- Verify: returns the cycle with the highest (most recent) hardDeadline where resolution = 'lapsed'
- If multiple lapsed cycles exist, this returns the most recent — correct per spec

**No new service methods needed.**

### UI Contracts (Page changes)

**Task detail page — correction panel:**
- Input: `mostRecentLapsedCycle: Cycle | null`
- Condition to show: `mostRecentLapsedCycle?.resolution === 'lapsed'`
- Action: `resolveCycle(mostRecentLapsedCycle.id, 'done')` — same as existing retroactive complete

**Task detail page — early completion:**
- Condition to show "Mark complete": when `currentCycle.resolution === 'open'` AND (`softDeadline === null` OR `softDeadline === dueAt`)
- This allows marking complete before due time only when grace period = 0

**Task list — Paused tab:**
- New tab/segment: "Paused"
- Filter: `tasks WHERE state = 'paused'`
- Follow same item layout as existing task list items
- Action: "Resume" button

---

## Implementation Phases

### Phase A: Most Recent Missed Cycle Correction (US1)

**Tasks:**
1. Verify `getMostRecentLapsedCycle` returns correct cycle (most recent by hardDeadline DESC)
2. Add correction button to task-detail page work-bench section
3. Button label: dynamic based on frequency (e.g., "I did yesterday", "I did last week")
4. Implement `markRetroactiveComplete()` — already exists, verify it works with `mostRecentLapsedCycle`
5. Test with sample data: generate multiple missed cycles, verify only most recent shows correction

**Files:**
- `src/app/services/task-cycle.service.ts` — verify query
- `src/app/pages/task-management/task-detail/task-detail.page.ts` — add correction button
- `src/app/pages/task-management/task-detail/task-detail.page.html` — add correction button UI

### Phase B: Early Completion When Grace Period = 0 (US2)

**Tasks:**
1. Modify `canMarkComplete` getter to also check: `softDeadline === null || softDeadline === dueAt`
2. Add explanatory text if completion is blocked by grace period
3. Test: create task with grace period > 0, verify early completion is blocked

**Files:**
- `src/app/pages/task-management/task-detail/task-detail.page.ts` — modify `canMarkComplete`

### Phase C: Paused Tasks in Separate Tab (US3)

**Tasks:**
1. Add "Paused" segment/tab to task list page (follow task-archive pattern)
2. Create separate filtered list for paused tasks
3. In task detail page: change "Pause" button to "Resume" when task.state === 'paused'
4. Test: pause a task, verify it disappears from main list and appears in Paused tab
5. Test: resume from Paused tab, verify task returns to main list

**Files:**
- `src/app/pages/task-management/task-list/task-list.page.ts` — add Paused tab
- `src/app/pages/task-management/task-list/task-list.page.html` — add Paused tab UI
- `src/app/pages/task-management/task-detail/task-detail.page.ts` — Pause→Resume logic
- `src/app/pages/task-management/task-detail/task-detail.page.html` — Resume button

### Phase D: Branding (US4)

**Tasks:**
1. Update Capacitor splash screen configuration to use logo
2. Update app display name in Android manifest (already "RoutineLoop")
3. Ensure theme primary color is applied to header/toolbar
4. Add logo to app header or intro screen
5. Test: launch app, verify splash screen and header branding

**Files:**
- `android/app/src/main/res/values/strings.xml` — app display name
- `android/app/src/main/res/drawable*/splash.xml` or Capacitor splash config
- `src/global.scss` — app name in header if hardcoded
- `src/app/app.component.ts` or toolbar — add logo

---

## Files Summary

| File | Phase | Action |
|------|-------|--------|
| `task-cycle.service.ts` | A | Verify getMostRecentLapsedCycle |
| `task-detail.page.ts` | A, B, C | Correction button, canMarkComplete, Pause→Resume |
| `task-detail.page.html` | A, C | Correction UI, Resume button |
| `task-list.page.ts` | C | Add Paused tab filtering |
| `task-list.page.html` | C | Add Paused tab UI |
| `capacitor.config.ts` | D | Splash screen config |
| `android/strings.xml` | D | App display name |
| `global.scss` | D | App name if hardcoded |
| `app.component.ts` | D | Add logo to header |

**No new files required.** All changes are modifications to existing files.

---

## Verification Checklist

- [ ] Most recent missed cycle correction shows for daily/weekly/monthly tasks
- [ ] Only most recent missed cycle shows correction (older missed cycles hidden)
- [ ] Early completion works when grace period = 0
- [ ] Early completion blocked when grace period > 0
- [ ] Paused tasks hidden from main task list
- [ ] Paused tasks visible in Paused tab
- [ ] Resume action works from Paused tab
- [ ] Resume action works from task detail page
- [ ] Splash screen shows Routine Loop branding
- [ ] App header/toolbar shows Routine Loop branding
- [ ] Theme primary color consistently applied
- [ ] No regression in existing task list and detail functionality
- [ ] Dark mode works correctly for all new UI
