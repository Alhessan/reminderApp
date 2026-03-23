# Contract: Task Cycle Timeline Data

**Feature**: 003-task-ux-improvements  
**Consumer**: TaskCycleTimelineComponent

## Data source

- **TaskCycleService** (existing): methods that return cycles for a task.  
- Timeline uses **same** cycle model (dueAt, softDeadline, hardDeadline, resolution) and **same** derivation for display state (e.g. `deriveDisplayState`) so list, detail, and timeline are consistent (FR-004).

## Slice and pagination

- **Default visible**: Last N resolved cycles (N = 10 per research.md) + one upcoming cycle if present.  
- **Order**: Chronological (oldest of visible at top or left; newest or upcoming at bottom or right—implementation chooses layout).  
- **Load more**: When user performs horizontal slide (or "Load more" / "See full history"), return next batch (e.g. next 10) or all remaining. Component receives a **slice** of cycles and a flag or callback for "hasMore".

## Per-cycle display

- **dueAt**: Shown (e.g. date/time).  
- **Resolution**: completed | missed | skipped (and upcoming for open cycle).  
- **Visual**: Label, color, or icon consistent with `cycle-display.model.ts` (STATUS_CONFIG). Missed cycles use **white (or light) + border/shadow** per FR-016–FR-018.

## Interface (advisory)

```text
TimelineInput = {
  taskId: number;
  cycles: Array<{ cycle: Cycle; displayStatus: CycleDisplayStatus }>;  // visible slice
  upcomingCycle: Cycle | null;
  hasMore: boolean;
  loadMore: () => void;  // or event when user slides / taps Load more
}
```

Component does not fetch; parent (task-detail page or service) fetches and passes the slice.
