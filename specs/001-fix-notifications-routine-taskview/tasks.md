# Tasks: Fix notifications on device, missed routine handling, and task view layout

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)  
**Branch**: 001-fix-notifications-routine-taskview

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: US1, US2, US3, US4

---

## Phase 1: Notifications on device (US1, US4)

### US1 – Device notifications + reschedule on launch

- [x] T001 [US1] Add `rescheduleAllPendingNotifications()` in `src/app/services/task.service.ts`: fetch all non-archived tasks with `notificationType === 'push'`, call existing `scheduleNotification` for each (catch per-task errors, log, continue).
- [x] T002 [US1] In `src/app/app.component.ts`, after DB init and notification permission request/register, call `taskService.rescheduleAllPendingNotifications()` (non-blocking, fire-and-forget or await in background).
- [x] T003 [US4] When scheduling a notification and permission is denied, inform user: in `NotificationService.scheduleNotification` or caller, if Capacitor and permission denied, return or throw so caller can show toast; add toast in task create/edit flow when push is selected and permission denied.

**Checkpoint**: Notifications reschedule on launch; user informed if permission denied.

---

## Phase 2: Missed routine – margin and auto-skip (US2)

- [x] T004 [US2] Add margin calculation in `src/app/services/task-cycle.service.ts`: margin = configurable percentage of routine interval (e.g. 5% of daily = 72 min). Add constant or read from a simple setting (e.g. `MARGIN_PERCENT = 5` or from DB/key-value).
- [x] T005 [US2] In `TaskCycleService.loadTaskList()` (or a method it calls), before building the list: for each task with a current cycle that is `pending` or `in_progress` and `cycleEndDate + margin < now`, update that cycle to `status = 'skipped'`, then call `createNextCycle(task, currentCycle)` so the next cycle starts. Ensure no double-processing (only one "latest" cycle per task).
- [x] T006 [US2] Ensure statistics already show skipped cycles as "Missed" or "Skipped" in `src/app/pages/task-management/task-detail/components/task-statistics.component.ts` (legend already has "Skipped"; optionally rename display to "Missed" for clarity).

**Checkpoint**: Bypassed routines are marked skipped after margin and next cycle created; statistics show missed.

---

## Phase 3: Task detail compact info + controls (US3)

- [x] T007 [US3] Redesign task detail info section in `src/app/pages/task-management/task-detail/task-detail.page.html`: make "Task Information" compact (e.g. 2-column grid or inline rows, reduce padding), and in `task-detail.page.scss` limit height / use compact typography so info uses &lt;40% viewport where possible.
- [x] T008 [US3] Add task control buttons on task detail page: **Start** (start cycle – call TaskCycleService.updateTaskCycleStatus(cycleId, 'in_progress') when canStartEarly), **Mark complete** (update status to 'completed'), **Delete** (confirm then delete or archive), **Edit** (existing). Place controls in first viewport (e.g. below status card or in toolbar). Load current cycle in `TaskDetailPage` via TaskCycleService.getCurrentCycle(taskId) and pass to template for button visibility (show Start when pending/canStartEarly, Mark complete when in_progress/canComplete).
- [x] T009 [US3] Wire Start/Mark complete/Delete in `task-detail.page.ts`: inject TaskCycleService and TaskService; implement startCycle(), markComplete(), deleteOrArchive() with refresh of task and cycle after action.

**Checkpoint**: Task detail has compact info and visible Start / Mark complete / Delete / Edit without excessive scrolling.

---

## Dependencies

- T001, T002, T003 can be done in parallel after context read.
- T004 must be before T005. T005 before T006 (optional).
- T007, T008, T009 can be done together; T008/T009 depend on task-detail component.
