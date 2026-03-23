# Research: Task View UX Improvements (003) — Revised

**Branch**: `003-task-ux-improvements`  
**Date**: 2026-03-10  
**Context**: First implementation was not convincing. Focus: timeline design (daily-sample style), messaging UX, realistic sample data.

---

## 1. Timeline Design (Daily Sample Style)

**Reference**: User-provided "DAILY SAMPLE TIMELINE" image — horizontal layout with day columns, each event has time, title, optional subtitle, and distinctive icon.

### Decision: Per-task timeline with day-grouped layout

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Layout** | Horizontal day columns (scrollable) | Matches reference; each day is a vertical column with date header (e.g. "OCT 21 MON") |
| **Event display** | Time + status label + icon per cycle | Time (e.g. 08:00), status (Completed/Skipped/Missed), icon from STATUS_CONFIG |
| **Scope** | One task only (per-task timeline) | Spec: "timeline for one task (later we might implement general timeline for all tasks)" |
| **Always updated** | Refresh on: page load, markComplete, skipCycle, markRetroactiveComplete | Timeline MUST reflect latest data; no stale state |
| **Empty state** | "Complete or skip an occurrence to get started" | Only when no resolved cycles and no upcoming |
| **Load more** | "See full history" button; horizontal scroll or vertical expand | Fixed default N (e.g. 10); expand to load next batch |

### Alternatives considered

- **Vertical list (previous attempt)**: Simpler but looked "dirty" and showed only last cycle; user rejected.
- **Full horizontal scroll (like reference)**: More complex; start with day-grouped vertical sections that mimic the reference structure (day header + events under it).

### Implementation notes

- Group resolved cycles by calendar day (same as previous dayGroups logic, but ensure data is correct).
- Use `getResolvedCycles(taskId, limit, offset)` — verify it returns all resolved cycles for the task (done, lapsed, skipped).
- Timeline component receives `cycles` and `upcomingCycle`; parent refreshes these after every cycle-resolving action.

---

## 2. Messaging UX (Hero / Situational Messages)

**Problem**: Messages felt "stupid" and "not in right place (of human experience context)".

### Decision: Hide message for new/just-started tasks

| Condition | Show message? | Rationale |
|-----------|---------------|-----------|
| Task has 0 resolved cycles | **No** | "Not started" message feels generic and out of place for a brand-new task |
| Task has 1–2 resolved cycles | **Optional** (configurable) | User said "maybe better not to show for first few cycles" |
| Task has 3+ resolved cycles | **Yes** | Enough history for message to feel contextual |

### Message placement

- Keep hero at top of task content (below header) — spec requires it.
- Tone: encouraging, non-shaming (Atomic Habits). No guilt.
- Update after cycle end when state changes.

### Alternatives considered

- **Always show**: Rejected — user explicitly said skip for new tasks.
- **Move message elsewhere**: Spec says hero at top; we keep placement but hide when inappropriate.

---

## 3. Realistic Sample Data

**Problem**: Sample data looked "stupid" (e.g. "1. Strong history (many completed)").

### Decision: Professional names + varied timeline states

| Task | Name | Timeline state | Purpose |
|------|------|----------------|---------|
| 1 | Daily Check | 4 completed + 1 open | See multiple completed cycles in timeline |
| 2 | Weekly Update | 1 done, 2 skipped, 1 open | See mixed completed/skipped |
| 3 | Monthly Review | 0 resolved, 1 open | See empty-timeline / just-started state |

### Implementation

- Use `SampleDataService.generateSampleTasks()`.
- Create cycles via `resolveCycle` + `createNextCycle` so data is consistent with app protocol.
- Ensure `getResolvedCycles` returns correct data for each task (no filtering bugs).

---

## 4. Technical Context (Resolved)

| Item | Value |
|------|-------|
| Language/Version | TypeScript 5.x, Angular 19 |
| Primary Dependencies | Ionic 8, Capacitor 7, sql.js / @capacitor-community/sqlite |
| Storage | SQLite (native) / in-memory web store |
| Testing | Jasmine/Karma |
| Target Platform | Web, Android (Capacitor) |
| Project Type | Mobile-first web app (Ionic Angular) |

---

## 5. Lessons from First Attempt

1. **Timeline**: Simple vertical list was insufficient; user wanted day-grouped, reference-style layout. Ensure all resolved cycles are shown, not just last one.
2. **Hero message**: Do not show for tasks with 0 resolved cycles; consider hiding for 1–2 cycles.
3. **Info card**: Removed in rollback; keep minimal (frequency · notify in header).
4. **Sample data**: Use professional names; ensure sample creates cycles that populate timeline correctly.
5. **Icons**: Register all ionicons used in task-detail (pause-outline, etc.) in app.component to avoid white screen.
