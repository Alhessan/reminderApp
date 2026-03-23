# Implementation Plan: Task View UX Improvements (003) — Revised

**Branch**: `003-task-ux-improvements`  
**Date**: 2026-03-10  
**Spec**: [spec.md](./spec.md)  
**Research**: [research.md](./research.md)

**Input**: First attempt was not convincing. Revised focus: timeline design (daily-sample style), messaging UX (hide for new tasks), realistic sample data.

---

## Summary

Improve task view UX with: (1) **timeline** in daily-sample style (day columns, time + status + icon per cycle, always updated); (2) **situational messages** hidden for new/just-started tasks; (3) **realistic sample data** to exercise timeline states. Reuses existing Cycle/Task models; no schema changes.

---

## Technical Context

| Item | Value |
|------|-------|
| **Language/Version** | TypeScript 5.x, Angular 19 |
| **Primary Dependencies** | Ionic 8, Capacitor 7, @angular/animations |
| **Storage** | SQLite (native) / in-memory web store (sql.js) |
| **Testing** | Jasmine/Karma |
| **Target Platform** | Web, Android (Capacitor) |
| **Project Type** | Mobile-first web app (Ionic Angular) |
| **Constraints** | Offline-capable; icons must be registered (addIcons) |

---

## Constitution Check

*No constitution file found. Proceeding with plan.*

---

## Project Structure

```text
specs/003-task-ux-improvements/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── spec.md
└── tasks.md

src/app/
├── pages/task-management/task-detail/
│   ├── task-detail.page.ts
│   ├── task-detail.page.html
│   └── components/
│       ├── task-cycle-timeline.component.ts
│       └── task-hero-message.component.ts
├── services/
│   ├── task-cycle.service.ts
│   ├── situational-message.service.ts
│   └── sample-data.service.ts
└── models/
    └── situational-message.model.ts
```

---

## Phase 0: Research (Complete)

See [research.md](./research.md):
- Timeline: day-grouped layout, per-task scope, always refreshed
- Messaging: hide for 0 resolved cycles; optional for 1–2
- Sample data: Daily Check, Weekly Update, Monthly Review with varied cycle counts

---

## Phase 1: Design (Complete)

See [data-model.md](./data-model.md). No new DB tables; timeline and hero consume existing Cycle/Task.

---

## Phase 2: Implementation Priorities

1. **Timeline redesign** (US2): Day-grouped layout, ensure `getResolvedCycles` returns full history, refresh on every cycle action.
2. **Messaging rules** (US4): Do not show hero when `resolvedCycles.length === 0`; consider hiding for 1–2.
3. **Sample data**: Professional names; ensure cycles populate timeline correctly.
4. **Cycle transition** (US1), **correct-step** (US3), **missed styling** (US5): Keep as implemented; polish if needed.

---

## Key Revisions vs First Attempt

| Area | First attempt | Revised |
|------|---------------|---------|
| Timeline | Simple vertical list; showed only last cycle | Day-grouped layout; all resolved cycles; always updated |
| Hero message | Always shown | Hidden for new tasks (0 resolved); optional for 1–2 |
| Sample data | "1. Strong history...", "2. Mixed...", "3. Just started..." | "Daily Check", "Weekly Update", "Monthly Review" |
| Info card | Full TYPE/FREQUENCY/START/NOTIFY card | Removed; frequency · notify in header |
