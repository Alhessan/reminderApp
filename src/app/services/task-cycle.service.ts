import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Cycle, CycleResolution, TaskListItem } from '../models/task-cycle.model';
import { Task, Frequency } from '../models/task.model';
import { deriveDisplayState, CycleDisplayStatus } from '../models/cycle-display.model';
import {
  calculateDueAt,
  calculateSoftDeadline,
  calculateHardDeadline,
  calculateNextCycleStart,
} from '../utils/cycle-timestamps.util';
import { BehaviorSubject } from 'rxjs';
interface DbRow {
  id: number;
  title: string;
  type: string;
  frequency: string;
  startDate: string;
  notificationTime: string;
  notificationType: string;
  notificationValue?: string;
  notes?: string;
  isCompleted?: number;
  lastCompletedDate?: string;
  isArchived?: number;
  cycle_id?: number;
  cycleStartDate?: string;
  cycleEndDate?: string;
  status?: string;
  progress?: number;
  completedAt?: string;
}

// Update the DbTask interface to be more strict
type DbTask = {
  id: number;
  title: string;
  type: string;
  customerId?: number;
  frequency: Frequency;  // Use the proper Frequency type
  startDate: string;
  notificationType: string;
  notificationTime: string;
  notificationValue?: string;
  notes?: string;
  isArchived: 0 | 1;  // Restrict to only valid values
};

// Type for raw database results
type RawDbTask = {
  id: string | number;
  title: string;
  type: string;
  customerId?: string | number;
  frequency: string;
  startDate: string;
  notificationType: string;
  notificationTime: string;
  notificationValue?: string;
  notes?: string;
  isArchived: string | number;
};

// Helper function to normalize isArchived values
function normalizeIsArchived(value: string | number): 0 | 1 {
  // First convert to string to handle all cases uniformly
  const strValue = String(value).trim();
  // Then check against known "truthy" values
  switch (strValue) {
    case '1':
    case 'true':
    case 'yes':
      return 1;
    default:
      return 0;
  }
}

@Injectable({
  providedIn: 'root'
})
export class TaskCycleService {
  private taskListSubject = new BehaviorSubject<TaskListItem[]>([]);
  public taskList$ = this.taskListSubject.asObservable();

  constructor(private db: DatabaseService) {}

  /**
   * First cycle start date so that due (start + notificationTime) is not in the past.
   * Used when creating the initial cycle for a new task and when displaying a task with no cycles.
   */
  getFirstCycleStartDate(task: Task): string {
    const start = new Date(task.startDate);
    if (isNaN(start.getTime())) return new Date().toISOString();
    const [h, m] = (task.notificationTime || '00:00').split(':').map(Number);
    const setDue = (d: Date) => { d.setHours(h ?? 0, m ?? 0, 0, 0); };
    const now = new Date();
    let due = new Date(start);
    setDue(due);
    if (due.getTime() >= now.getTime()) return start.toISOString();
    const maxIter = 1000;
    let iter = 0;
    while (due.getTime() < now.getTime() && iter++ < maxIter) {
      switch (task.frequency) {
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
   * Due datetime for a cycle: cycle start date + task notification time (HH:mm).
   * Returns ISO string so list can show the real due time, not a fixed midnight.
   */
  /**
   * Auto-lapse open cycles past hardDeadline (mark as lapsed = missed) and create next cycle.
   * Skips tasks that are paused. Max 365 iterations to handle multi-day offline.
   */
  private async closeLapsedCycles(): Promise<void> {
    const now = Date.now();
    let iterations = 0;
    const maxIterations = 365;

    while (iterations++ < maxIterations) {
      const cyclesResult = await this.db.executeQuery(
        "SELECT * FROM task_cycles WHERE resolution = 'open'"
      );
      const cycles = (cyclesResult.values || []) as Array<{
        id: number;
        taskId: number;
        cycleStartDate: string;
        dueAt: string;
        softDeadline: string;
        hardDeadline: string;
        resolution: string;
      }>;
      let lapsedAny = false;
      for (const row of cycles) {
        const task = await this.getTask(row.taskId);
        if (!task || task.state !== 'active') continue;
        const hardMs = new Date(row.hardDeadline).getTime();
        if (now <= hardMs) continue;
        await this.db.executeQuery(
          'UPDATE task_cycles SET resolution = ?, completedAt = NULL WHERE id = ?',
          ['lapsed', row.id]
        );
        const cycleObj: Cycle = {
          id: row.id,
          taskId: row.taskId,
          cycleStartDate: row.cycleStartDate,
          dueAt: row.dueAt,
          softDeadline: row.softDeadline,
          hardDeadline: row.hardDeadline,
          resolution: 'lapsed',
        };
        await this.createNextCycle(task, cycleObj);
        lapsedAny = true;
      }
      if (!lapsedAny) break;
    }
  }

  async loadTaskList(view: 'all' | 'overdue' | 'due' | 'upcoming' = 'all'): Promise<void> {
    try {
      await this.closeLapsedCycles();
      const now = new Date();

      const tasksResult = await this.db.executeQuery(
        `SELECT * FROM tasks WHERE (state IS NULL OR state != 'archived') AND (isArchived = 0 OR isArchived IS NULL) ORDER BY startDate ASC`,
        []
      );
      const taskRows = (tasksResult.values || []) as any[];
      const cyclesResult = await this.db.executeQuery(
        `SELECT * FROM task_cycles ORDER BY CASE WHEN resolution = 'open' THEN 0 ELSE 1 END, cycleStartDate DESC`,
        []
      );
      const allCycles = (cyclesResult.values || []) as any[];

      const latestCycleByTask = new Map<number, Cycle>();
      for (const row of allCycles) {
        const taskId = row.taskId;
        if (latestCycleByTask.has(taskId)) continue;
        latestCycleByTask.set(taskId, this.mapRowToCycle(row));
      }

      const taskList: TaskListItem[] = [];
      for (const row of taskRows) {
        const task = await this.getTask(row.id);
        if (!task) continue;
        let cycle = latestCycleByTask.get(task.id!);
        if (!cycle) {
          const firstStart = this.getFirstCycleStartDate(task);
          const dueAt = calculateDueAt(firstStart, task.notificationTime);
          cycle = {
            taskId: task.id!,
            cycleStartDate: firstStart,
            dueAt,
            softDeadline: calculateSoftDeadline(dueAt, task.frequency),
            hardDeadline: calculateHardDeadline(dueAt, task.frequency),
            resolution: 'open',
          };
        }
        const displayStatus = deriveDisplayState(cycle, task, now);
        const isOverdue = displayStatus === 'overdue';
        let lastMissedDate: string | undefined;
        const taskCyclesForTask = allCycles.filter((c: any) => c.taskId === task.id);
        const resolvedCycles = taskCyclesForTask.filter((c: any) => c.resolution !== 'open');
        const resolutionDate = (c: any) => c.resolution === 'done' ? (c.completedAt || c.cycleStartDate) : c.resolution === 'skipped' ? (c.skippedAt || c.cycleStartDate) : (c.hardDeadline || c.cycleStartDate);
        const mostRecentResolved = resolvedCycles.length > 0
          ? resolvedCycles.sort((a: any, b: any) => new Date(resolutionDate(b)).getTime() - new Date(resolutionDate(a)).getTime())[0]
          : null;
        if (mostRecentResolved?.resolution === 'lapsed') lastMissedDate = mostRecentResolved.dueAt || mostRecentResolved.hardDeadline;

        const item: TaskListItem = {
          task,
          currentCycle: cycle,
          displayStatus,
          isOverdue: displayStatus === 'overdue',
          nextDueDate: cycle.dueAt,
          daysSinceLastCompletion: cycle.completedAt
            ? Math.floor((now.getTime() - new Date(cycle.completedAt).getTime()) / (1000 * 60 * 60 * 24))
            : undefined,
          lastMissedDate,
        };
        if (view === 'all') taskList.push(item);
        else if (view === 'due' && displayStatus === 'due') taskList.push(item);
        else if (view === 'upcoming' && displayStatus === 'upcoming') taskList.push(item);
        else if (view === 'overdue' && displayStatus === 'overdue') taskList.push(item);
      }

      taskList.sort((a, b) => {
        const priority = (s: string) => (s === 'due' ? 0 : s === 'overdue' ? 1 : 2);
        const pa = priority(a.displayStatus || '');
        const pb = priority(b.displayStatus || '');
        if (pa !== pb) return pa - pb;
        return new Date(a.currentCycle.dueAt).getTime() - new Date(b.currentCycle.dueAt).getTime();
      });

      this.taskListSubject.next(taskList);
    } catch (error) {
      console.error('Error loading task list:', error);
      throw error;
    }
  }

  private mapRowToCycle(row: any): Cycle {
    return {
      id: row.id,
      taskId: row.taskId,
      cycleStartDate: row.cycleStartDate,
      dueAt: row.dueAt,
      softDeadline: row.softDeadline,
      hardDeadline: row.hardDeadline,
      resolution: (row.resolution || 'open') as CycleResolution,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      skippedAt: row.skippedAt,
    };
  }

  /** Resolve a cycle (done or skipped). For lapsed cycles, only 'done' is allowed (retroactive). */
  async resolveCycle(cycleId: number, resolution: 'done' | 'skipped'): Promise<void> {
    const res = await this.db.executeQuery('SELECT * FROM task_cycles WHERE id = ?', [cycleId]);
    if (!res.values?.length) throw new Error('Cycle not found');
    const row = res.values[0] as any;
    const cycle = this.mapRowToCycle(row);
    const task = await this.getTask(cycle.taskId);
    if (!task) throw new Error('Task not found');

    const now = new Date().toISOString();
    if (resolution === 'done') {
      await this.db.executeQuery(
        'UPDATE task_cycles SET resolution = ?, completedAt = ? WHERE id = ?',
        ['done', now, cycleId]
      );
    } else {
      if (cycle.resolution === 'lapsed') throw new Error('Cannot skip a lapsed cycle');
      await this.db.executeQuery(
        'UPDATE task_cycles SET resolution = ?, skippedAt = ? WHERE id = ?',
        ['skipped', now, cycleId]
      );
    }

    if (cycle.resolution === 'open') {
      await this.createNextCycle(task, { ...cycle, resolution });
    } else if (cycle.resolution === 'lapsed' && resolution === 'done') {
      await this.loadTaskList();
    }
  }

  /** @deprecated Use resolveCycle(cycleId, 'done'|'skipped'). Kept for compatibility during migration. */
  async updateTaskCycleStatus(cycleId: number, status: string, _progress?: number): Promise<void> {
    if (status === 'completed') await this.resolveCycle(cycleId, 'done');
    else if (status === 'skipped') await this.resolveCycle(cycleId, 'skipped');
  }

  async createNextCycle(task: Task, previousCycle?: Cycle): Promise<number> {
    if (!task.id) throw new Error('Task ID is required to create cycle');

    if (task.frequency === 'once') {
      await this.db.executeQuery(
        "UPDATE tasks SET state = 'archived', isArchived = 1 WHERE id = ?",
        [task.id]
      );
      await this.loadTaskList();
      return 0;
    }

    const latestCycle = await this.getCurrentCycle(task.id);
    if (latestCycle && latestCycle.resolution === 'open') return latestCycle.id!;

    const startDate = previousCycle
      ? (previousCycle.resolution === 'skipped' || previousCycle.resolution === 'lapsed'
          ? calculateNextCycleStart(previousCycle.cycleStartDate, task.frequency)
          : calculateNextCycleStart(previousCycle.hardDeadline, task.frequency))
      : this.getFirstCycleStartDate(task);

    const dueAt = calculateDueAt(startDate, task.notificationTime);
    const softDeadline = calculateSoftDeadline(dueAt, task.frequency);
    const hardDeadline = calculateHardDeadline(dueAt, task.frequency);

    const insertResult = await this.db.executeQuery(
      `INSERT INTO task_cycles (taskId, cycleStartDate, dueAt, softDeadline, hardDeadline, resolution)
       VALUES (?, ?, ?, ?, ?, 'open')`,
      [task.id, startDate, dueAt, softDeadline, hardDeadline]
    );
    const newCycleId = insertResult.changes?.lastId;
    if (!newCycleId) throw new Error('Failed to get new cycle ID');
    await this.loadTaskList();
    return newCycleId;
  }

  async getTask(id: number): Promise<Task | null> {
    try {
      const result = await this.db.executeQuery(
        'SELECT * FROM tasks WHERE id = ?',
        [id]
      );
      if (!result.values?.length) return null;
      const row = result.values[0] as any;
      const state = row.state || (row.isArchived ? 'archived' : 'active');
      return {
        id: Number(row.id),
        title: row.title,
        type: row.type,
        customerId: row.customerId != null ? Number(row.customerId) : null,
        frequency: row.frequency,
        startDate: row.startDate,
        notificationTime: row.notificationTime,
        notificationType: row.notificationType,
        notificationValue: row.notificationValue,
        notes: row.notes,
        state,
      } as Task;
    } catch (error) {
      console.error('Error getting task:', error);
      throw error;
    }
  }

  async createTask(task: Task): Promise<number> {
    try {
      // Insert the task
      const state = task.state || 'active';
      const result = await this.db.executeQuery(`
        INSERT INTO tasks (
          title,
          type,
          customerId,
          frequency,
          startDate,
          notificationType,
          notificationTime,
          notificationValue,
          notes,
          isArchived,
          state
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        task.title,
        task.type,
        task.customerId,
        task.frequency,
        task.startDate,
        task.notificationType,
        task.notificationTime,
        task.notificationValue,
        task.notes,
        state === 'archived' ? 1 : 0,
        state
      ]);

      const taskId = result.changes?.lastId;
      if (!taskId) throw new Error('Failed to get inserted task ID');

      // Create the first cycle for this task
      await this.createNextCycle({ ...task, id: taskId });

      // Reload the task list
      await this.loadTaskList();

      return taskId;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(task: Task): Promise<void> {
    try {
      if (!task.id) throw new Error('Task ID is required for update');

      const state = task.state || 'active';
      const isArchived = state === 'archived' ? 1 : 0;
      await this.db.executeQuery(`
        UPDATE tasks
        SET title = ?,
            type = ?,
            customerId = ?,
            frequency = ?,
            startDate = ?,
            notificationType = ?,
            notificationTime = ?,
            notificationValue = ?,
            notes = ?,
            state = ?,
            isArchived = ?
        WHERE id = ?
      `, [
        task.title,
        task.type,
        task.customerId,
        task.frequency,
        task.startDate,
        task.notificationType,
        task.notificationTime,
        task.notificationValue,
        task.notes,
        state,
        isArchived,
        task.id
      ]);

      // Update current cycle timestamps if frequency changed and cycle is open
      const currentCycle = await this.getCurrentCycle(task.id);
      if (currentCycle && currentCycle.resolution === 'open') {
        const dueAt = calculateDueAt(currentCycle.cycleStartDate, task.notificationTime);
        const softDeadline = calculateSoftDeadline(dueAt, task.frequency);
        const hardDeadline = calculateHardDeadline(dueAt, task.frequency);
        await this.db.executeQuery(
          'UPDATE task_cycles SET dueAt = ?, softDeadline = ?, hardDeadline = ? WHERE id = ?',
          [dueAt, softDeadline, hardDeadline, currentCycle.id]
        );
      }

      // Reload the task list
      await this.loadTaskList();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async getCurrentCycle(taskId: number): Promise<Cycle | null> {
    const result = await this.db.executeQuery(
      `SELECT * FROM task_cycles WHERE taskId = ? ORDER BY CASE WHEN resolution = 'open' THEN 0 ELSE 1 END, cycleStartDate DESC LIMIT 1`,
      [taskId]
    );
    if (!result.values?.length) return null;
    return this.mapRowToCycle(result.values[0]);
  }

  /** Most recent cycle with resolution=lapsed for this task (for retroactive "I actually did this"). */
  async getMostRecentLapsedCycle(taskId: number): Promise<Cycle | null> {
    const result = await this.db.executeQuery(
      `SELECT * FROM task_cycles WHERE taskId = ? AND resolution = 'lapsed' ORDER BY hardDeadline DESC LIMIT 1`,
      [taskId]
    );
    if (!result.values?.length) return null;
    return this.mapRowToCycle(result.values[0]);
  }

  async archiveTask(taskId: number): Promise<void> {
    const check = await this.db.executeQuery('SELECT id FROM tasks WHERE id = ?', [taskId]);
    if (!check.values?.length) throw new Error(`Task ${taskId} not found`);
    await this.db.executeQuery("UPDATE tasks SET state = 'archived', isArchived = 1 WHERE id = ?", [taskId]);
    await this.loadTaskList();
  }

  async unarchiveTask(taskId: number): Promise<void> {
    const taskResult = await this.db.executeQuery('SELECT state, isArchived FROM tasks WHERE id = ?', [taskId]);
    if (!taskResult.values?.length) throw new Error(`Task ${taskId} not found`);
    const row = taskResult.values[0] as any;
    if (row.state !== 'archived' && normalizeIsArchived(row.isArchived) === 0) return;
    await this.db.executeQuery("UPDATE tasks SET state = 'active', isArchived = 0 WHERE id = ?", [taskId]);
    await this.loadTaskList();
  }

  private calculateDaysSince(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * After DB migration (v6), ensure every active task has exactly one open cycle.
   * Call once on app launch so upgraded users get initial cycles.
   */
  async ensureOpenCyclesForActiveTasks(): Promise<void> {
    const result = await this.db.executeQuery(
      `SELECT id FROM tasks WHERE (state = 'active' OR (state IS NULL AND (isArchived = 0 OR isArchived IS NULL))) AND frequency != 'once'`,
      []
    );
    const rows = (result.values || []) as Array<{ id: number }>;
    for (const row of rows) {
      const task = await this.getTask(row.id);
      if (!task) continue;
      const cycle = await this.getCurrentCycle(task.id!);
      if (!cycle || cycle.resolution !== 'open') {
        await this.createNextCycle(task);
      }
    }
    await this.loadTaskList();
  }

  async getArchivedTasks(): Promise<TaskListItem[]> {
    const result = await this.db.executeQuery(
      `SELECT t.*, c.name as customerName FROM tasks t LEFT JOIN customers c ON t.customerId = c.id WHERE t.state = 'archived' OR t.isArchived = 1 ORDER BY t.title ASC`,
      []
    );
    const rows = (result.values || []) as any[];
    const list: TaskListItem[] = [];
    for (const row of rows) {
      const task = await this.getTask(row.id);
      if (!task) continue;
      const cycle = await this.getCurrentCycle(task.id!);
      const currentCycle: Cycle = cycle || {
        taskId: task.id!,
        cycleStartDate: task.startDate,
        dueAt: calculateDueAt(task.startDate, task.notificationTime),
        softDeadline: calculateDueAt(task.startDate, task.notificationTime),
        hardDeadline: calculateHardDeadline(calculateDueAt(task.startDate, task.notificationTime), task.frequency),
        resolution: 'open',
      };
      list.push({
        task: { ...task, state: 'archived' },
        currentCycle,
        displayStatus: 'upcoming',
        isOverdue: false,
        nextDueDate: currentCycle.dueAt,
        daysSinceLastCompletion: currentCycle.completedAt
          ? Math.floor((Date.now() - new Date(currentCycle.completedAt).getTime()) / (1000 * 60 * 60 * 24))
          : undefined,
      });
    }
    return list;
  }
}