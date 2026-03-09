import { Task } from './task.model';

/** Stored resolution for a cycle. At most one open cycle per task. */
export type CycleResolution = 'open' | 'done' | 'lapsed' | 'skipped';

export interface Cycle {
  id?: number;
  taskId: number;
  /** Cycle window start (used for recurrence). */
  cycleStartDate: string;
  /** When the cue fires (notification time). */
  dueAt: string;
  /** dueAt + buffer; after this, display = overdue. */
  softDeadline: string;
  /** dueAt + grace; after this, cycle is auto-lapsed (missed). */
  hardDeadline: string;
  resolution: CycleResolution;
  startedAt?: string;
  completedAt?: string;
  skippedAt?: string;
}

export interface TaskProgress {
  id?: number;
  taskCycleId: number;
  progressValue: number;
  timestamp: string;
  notes?: string;
}

/** View model for task list items. displayStatus and lastMissedDate set by service. */
export interface TaskListItem {
  task: Task;
  currentCycle: Cycle;
  /** Derived from deriveDisplayState(); same across list, detail, statistics. */
  displayStatus?: string;
  isOverdue: boolean;
  nextDueDate: string;
  daysSinceLastCompletion?: number;
  /** Set when the most recent resolved cycle for this task was lapsed. */
  lastMissedDate?: string;
}
