# Implementation Plan: Fix notifications on device, missed routine handling, and task view layout

**Branch**: `001-fix-notifications-routine-taskview` | **Date**: 2025-02-19 | **Spec**: [spec.md](./spec.md)

## Summary

Deliver three fixes: (1) Ensure local notifications appear on device (Capacitor) including reschedule on app launch; (2) When a routine bypasses its due time, end current cycle after a configurable margin (percentage of interval), create next cycle, and show missed as "skipped" in statistics; (3) Make task detail info section compact and add task controls (Start, Mark complete, Delete, Edit) in the first viewport.

## Technical Context

**Language/Version**: TypeScript 5.6, Angular 19  
**Primary Dependencies**: Ionic 8, Capacitor 7, @capacitor/local-notifications  
**Storage**: SQLite via DatabaseService (local only)  
**Testing**: Jasmine/Karma (ng test)  
**Target Platform**: Android (Capacitor), Web (fallback)  
**Project Type**: Single (src/app: pages, services, components)  
**Constraints**: No backend; offline-capable; constitution stack only  
**Scale**: Single-user mobile app

## Constitution Check

- Service-first: Logic in NotificationService, TaskCycleService, TaskService; pages only orchestrate. ✓
- Stack: Ionic 8, Angular 19, Capacitor 7 only. ✓
- Theme/design: Use existing variables and components. ✓
- Feature-based: Changes in task-management and app init. ✓

## Project Structure

**Source**: `src/app/` — pages (task-management/task-detail, task-list), services (notification.service, task-cycle.service, task.service), components (task-statistics). No new top-level folders.

## Implementation approach

1. **Notifications (US1, US4)**  
   - Reschedule all push notifications on app launch: add `rescheduleAllPendingNotifications()` in TaskService (fetch non-archived tasks with notificationType === 'push', call existing scheduleNotification for each). Call from app.component after DB init and permission request.  
   - Ensure Capacitor path is used on native (existing); optional: ensure Android channel created if required by plugin.  
   - When permission denied and user tries to schedule: show toast or inline message (inform user).

2. **Missed routine (US2)**  
   - Margin = X% of routine interval (spec: e.g. 5% of daily = 72 min). Add config: constant or settings (e.g. in settings or DatabaseService key).  
   - In TaskCycleService: when loading task list (or in a dedicated "check missed" step), for each task with current cycle status pending/in_progress and cycleEndDate + margin < now, mark that cycle as status 'skipped', then create next cycle.  
   - Statistics: already show "skipped" in task-statistics; treat "skipped" as "missed" for display (optional label in UI).

3. **Task detail (US3)**  
   - Redesign info block: compact layout (e.g. grid or inline rows), reduce card padding, aim &lt;40% viewport.  
   - Add control buttons: Start (start cycle), Mark complete, Delete (or archive), Edit (existing). Place in first viewport; keep status card but compact.

## Key files

- `src/app/app.component.ts` — call rescheduleAllPendingNotifications after init  
- `src/app/services/task.service.ts` — rescheduleAllPendingNotifications, get all tasks for push  
- `src/app/services/notification.service.ts` — no API change; ensure Capacitor used on native  
- `src/app/services/task-cycle.service.ts` — margin calculation, detect bypassed cycles, mark skipped, create next  
- `src/app/pages/task-management/task-detail/task-detail.page.ts` — load current cycle, expose start/complete/delete  
- `src/app/pages/task-management/task-detail/task-detail.page.html` — compact info, add control buttons  
- `src/app/pages/task-management/task-detail/task-detail.page.scss` — compact styles  
- `src/app/pages/task-management/task-detail/components/task-statistics.component.ts` — optional "Missed" label for skipped
