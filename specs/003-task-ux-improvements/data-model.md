# Data Model: Task View UX (003)

**Branch**: `003-task-ux-improvements`  
**Scope**: No new entities; uses existing Cycle and Task models. Documents how timeline and messaging consume them.

---

## Existing Entities (Unchanged)

### Cycle
- `id`, `taskId`, `cycleStartDate`, `dueAt`, `softDeadline`, `hardDeadline`
- `resolution`: `'open' | 'done' | 'lapsed' | 'skipped'`
- `completedAt`, `skippedAt` (timestamps when resolved)

### Task
- `id`, `title`, `type`, `frequency`, `startDate`, `notificationType`, `notificationTime`, `state`, etc.

---

## Timeline Data Flow

```
TaskCycleService.getResolvedCycles(taskId, limit, offset)
  → Cycle[] (done, lapsed, skipped; ordered by hardDeadline DESC)
  → map to TimelineCycleItem { cycle, displayStatus }
  → group by calendar day (optional, for day-column layout)
  → render in TaskCycleTimelineComponent
```

**Refresh triggers**: loadTaskDetails, markComplete, skipCycle, markRetroactiveComplete, ionViewWillEnter

---

## Situational Message State

| Input | Output |
|-------|--------|
| `resolvedCycles.length === 0` | **Do not show** (new task) |
| `resolvedCycles.length <= 2` | **Optional**: hide or show "not_started" / "first_completion" |
| `resolvedCycles.length >= 3` | Show level from `SituationalMessageService.getLevel(taskId)` |

**Level derivation**: last action (done/lapsed/skipped) + achievement rate (done / (done + lapsed) over last 10).

---

## Sample Data Contract

| Task title | Resolved cycles | Open cycles |
|------------|-----------------|-------------|
| Daily Check | 4 done | 1 |
| Weekly Update | 1 done, 2 skipped | 1 |
| Monthly Review | 0 | 1 |

Cycles created via `resolveCycle` + `createNextCycle` so `getResolvedCycles` returns them.
