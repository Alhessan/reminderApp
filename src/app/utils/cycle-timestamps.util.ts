import { Frequency } from '../models/task.model';

/** Buffer (minutes) from due time before showing "Overdue". Configurable per frequency. */
export const BUFFER_MINUTES: Record<string, number> = {
  daily: 30,
  weekly: 120,
  monthly: 120,
  yearly: 120,
  once: 30,
};

/** Grace period (hours) from due time before auto-lapsing to missed. */
export const GRACE_HOURS: Record<string, number> = {
  daily: 5,
  weekly: 24,
  monthly: 48,
  yearly: 168,
  once: 24,
};

/**
 * Due datetime for a cycle: cycle start date + notification time (HH:mm).
 * Returns ISO string.
 */
export function calculateDueAt(cycleStartDate: string, notificationTime: string): string {
  const d = new Date(cycleStartDate);
  if (isNaN(d.getTime())) return cycleStartDate;
  const parts = (notificationTime || '00:00').split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/**
 * Soft deadline: dueAt + buffer. After this time, display state is "overdue".
 */
export function calculateSoftDeadline(dueAt: string, frequency: string): string {
  const d = new Date(dueAt);
  if (isNaN(d.getTime())) return dueAt;
  const minutes = BUFFER_MINUTES[frequency] ?? BUFFER_MINUTES['once'];
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

/**
 * Hard deadline: dueAt + grace period. After this time, cycle is auto-lapsed (missed).
 */
export function calculateHardDeadline(dueAt: string, frequency: string): string {
  const d = new Date(dueAt);
  if (isNaN(d.getTime())) return dueAt;
  const hours = GRACE_HOURS[frequency] ?? GRACE_HOURS['once'];
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d.toISOString();
}

/**
 * First cycle start so that due (start + notificationTime) is not in the past.
 */
export function getFirstCycleStartDate(
  startDate: string,
  notificationTime: string,
  frequency: Frequency
): string {
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return new Date().toISOString();
  const [h, m] = (notificationTime || '00:00').split(':').map(Number);
  const setDue = (d: Date) => d.setHours(h ?? 0, m ?? 0, 0, 0);
  const now = new Date();
  let due = new Date(start);
  setDue(due);
  if (due.getTime() >= now.getTime()) return start.toISOString().split('T')[0] + 'T00:00:00.000Z';
  const maxIter = 1000;
  let iter = 0;
  while (due.getTime() < now.getTime() && iter++ < maxIter) {
    switch (frequency) {
      case 'daily':
        start.setDate(start.getDate() + 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() + 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() + 1);
        break;
      case 'yearly':
        start.setFullYear(start.getFullYear() + 1);
        break;
      default:
        start.setDate(start.getDate() + 1);
    }
    due = new Date(start);
    setDue(due);
  }
  return start.toISOString();
}

/**
 * Next cycle start date from previous cycle start (for recurrence).
 * For skipped/lapsed we advance from cycle start; for done we could use cycle end — caller passes the appropriate base.
 */
export function calculateNextCycleStart(previousStart: string, frequency: Frequency): string {
  const start = new Date(previousStart);
  if (isNaN(start.getTime())) return new Date().toISOString();
  switch (frequency) {
    case 'daily':
      start.setDate(start.getDate() + 1);
      break;
    case 'weekly':
      start.setDate(start.getDate() + 7);
      break;
    case 'monthly':
      start.setMonth(start.getMonth() + 1);
      break;
    case 'yearly':
      start.setFullYear(start.getFullYear() + 1);
      break;
    case 'once':
      return start.toISOString();
    default:
      start.setDate(start.getDate() + 1);
  }
  return start.toISOString();
}
