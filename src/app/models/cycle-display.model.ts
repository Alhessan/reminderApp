import { Cycle } from './task-cycle.model';
import { Task } from './task.model';

/** Display state derived from cycle resolution + time. Used for label, color, icon everywhere. */
export type CycleDisplayStatus =
  | 'upcoming'
  | 'due'
  | 'overdue'
  | 'completed'
  | 'missed'
  | 'skipped';

export interface CycleStatusConfig {
  label: string;
  color: string;
  icon: string;
}

export const STATUS_CONFIG: Record<CycleDisplayStatus, CycleStatusConfig> = {
  upcoming: { label: 'Upcoming', color: 'medium', icon: 'time-outline' },
  due: { label: 'Due Now', color: 'primary', icon: 'notifications-outline' },
  overdue: { label: 'Overdue', color: 'warning', icon: 'alert-circle-outline' },
  completed: { label: 'Completed', color: 'success', icon: 'checkmark-circle' },
  missed: { label: 'Missed', color: 'medium', icon: 'close-circle-outline' },
  skipped: { label: 'Skipped', color: 'medium', icon: 'play-forward-outline' },
};

/**
 * Derives the display state from stored resolution + current time.
 * Single source of truth for list, detail, and statistics.
 */
export function deriveDisplayState(
  cycle: Cycle,
  task: Task,
  now: Date = new Date()
): CycleDisplayStatus {
  if (!cycle) return 'upcoming';
  if (cycle.resolution === 'done') return 'completed';
  if (cycle.resolution === 'lapsed') return 'missed';
  if (cycle.resolution === 'skipped') return 'skipped';

  // resolution === 'open' — derive from time
  const dueMs = new Date(cycle.dueAt).getTime();
  const softMs = new Date(cycle.softDeadline).getTime();
  const hardMs = new Date(cycle.hardDeadline).getTime();
  const t = now.getTime();

  if (t >= hardMs) return 'missed'; // should be auto-lapsed; safety net
  if (t >= softMs) return 'overdue';
  if (t >= dueMs) return 'due';
  return 'upcoming';
}
