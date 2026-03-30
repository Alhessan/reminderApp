# Research: Routine Loop enhancements

**Feature**: 004-routine-loop-enhancements
**Date**: 2026-03-11

## Summary

No external research required. All features use existing services, patterns, and APIs already present in the codebase.

## Findings

### US1: Most Recent Missed Cycle Correction

- **Decision**: Use existing `getMostRecentLapsedCycle` query, verify it orders by `hardDeadline DESC` to return the most recent.
- **Rationale**: Already exists in `TaskCycleService.ts`. The query `ORDER BY hardDeadline DESC LIMIT 1` correctly returns the most recent lapsed cycle.
- **Alternatives**: None — the service already has the right query.

### US2: Early Completion When Grace Period = 0

- **Decision**: Check `softDeadline === null || softDeadline === dueAt` before showing "Mark complete" button.
- **Rationale**: The cycle model has `softDeadline` and `dueAt` fields. When `softDeadline` is null or equals `dueAt`, the hard deadline is the same as the due time — no grace period.
- **Alternatives**: None — cycle model already has the fields needed.

### US3: Paused Tasks in Separate Tab

- **Decision**: Add a segment/tab in task-list page, filtered by `state = 'paused'`, following pattern from existing `task-archive.page.ts`.
- **Rationale**: Task state already supports `'paused'`. Archive page provides a template for filtering by state. Minimal changes needed.
- **Alternatives**: None — existing pattern is optimal.

### US4: Branding

- **Assets found**:
  - `src/assets/logo/text-logo-light.png` — for light mode
  - `src/assets/logo/text-logo-dark.png` — for dark mode
  - `src/assets/video/splash_man.mp4` — splash video
  - `src/assets/icon/favicon.png` — app icon
- **App name**: Already "RoutineLoop" in `capacitor.config.ts`
- **Primary color**: Already `#7c4dff` (purple) in `src/theme/variables.scss`
- **Decision**: Update Capacitor splash config and ensure theme is applied consistently
- **Rationale**: App name and primary color already set. Only splash screen and logo placement need work.

## Conclusion

All decisions are internal to the existing codebase. No external APIs, libraries, or patterns need research. Implementation can proceed directly to Phase 1 design.
