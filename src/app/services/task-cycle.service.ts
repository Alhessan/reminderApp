import { Injectable, Injector } from '@angular/core';
import { DatabaseService } from './database.service';
import { CycleRepository } from '../repositories/cycle.repository';
import { Cycle, CycleResolution, TaskListItem } from '../models/task-cycle.model';
import { Task, Frequency } from '../models/task.model';
import { deriveDisplayState, CycleDisplayStatus } from '../models/cycle-display.model';
import {
  calculateDueAt,
  calculateSoftDeadline,
  calculateHardDeadline,
  calculateNextCycleStart,
  calculatePreviousCycleStart,
  getFirstCycleStartDate,
} from '../utils/cycle-timestamps.util';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { TaskService } from './task.service';

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

  constructor(
    private db: DatabaseService,
    private cycleRepo: CycleRepository,
    private injector: Injector
  ) {}

  private async maybeRescheduleAllNotifications(): Promise<void> {
    try {
      const taskService = this.injector.get(TaskService);
      await taskService.rescheduleAllPendingNotifications();
    } catch (e) {
      console.warn('[TaskCycleService] reschedule after loadTaskList:', e);
    }
  }

  /**
   * After shifting open-cycle timestamps backward (dev only), runs lapse + backfill + list reload.
   */
  async simulateDaysElapsed(days: number): Promise<void> {
    if (environment.production) {
      console.warn('[TaskCycleService] simulateDaysElapsed disabled in production');
      return;
    }
    if (days <= 0 || !Number.isFinite(days)) return;
    const ms = days * 86400000;
    const shiftIso = (iso: string) => {
      const t = new Date(iso).getTime();
      if (isNaN(t)) return iso;
      return new Date(t - ms).toISOString();
    };
    const openCycles = await this.cycleRepo.findOpenCycles();
    for (const row of openCycles) {
      await this.cycleRepo.shiftOpenCycleDates(
        row.id!,
        shiftIso(row.cycleStartDate),
        shiftIso(row.dueAt),
        shiftIso(row.softDeadline),
        shiftIso(row.hardDeadline)
      );
    }
    await this.loadTaskList();
  }

  /**
   * Auto-lapse open cycles past hardDeadline (mark as lapsed = missed), backfill missed periods, create next open cycle.
   * @returns number of cycles that were auto-lapsed in this pass.
   */
  private async closeLapsedCycles(): Promise<number> {
    const now = Date.now();
    let lapsedCount = 0;

    const cycles = await this.cycleRepo.findOpenCycles();

    const taskIds = [...new Set(cycles.map(c => c.taskId))];
    const taskRows = await this.db.getTasksByIds(taskIds);
    const taskMap = new Map(taskRows.map((t: any) => [Number(t.id), t]));

    for (const row of cycles) {
      const taskRow = taskMap.get(row.taskId);
      if (!taskRow) continue;
      const task = await this.getTask(row.taskId);
      if (!task || task.state !== 'active') continue;
      const hardMs = new Date(row.hardDeadline).getTime();
      if (now <= hardMs) continue;

      await this.cycleRepo.updateResolution(row.id!, 'lapsed');
      lapsedCount++;

      const cycleObj: Cycle = { ...row, resolution: 'lapsed' };
      const previousForCreate = await this.backfillMissedLapsedRows(task, cycleObj, now);
      await this.createNextCycle(task, previousForCreate, true);
    }

    return lapsedCount;
  }

  /**
   * Insert lapsed rows for each fully missed period after `lapsedCycle`, until the current period.
   * Returns the synthetic or last-inserted cycle to pass as `previousCycle` into createNextCycle.
   */
  private async backfillMissedLapsedRows(task: Task, lapsedCycle: Cycle, nowMs: number): Promise<Cycle> {
    let lastInserted: Cycle = { ...lapsedCycle, resolution: 'lapsed' };
    let cursorStart = calculateNextCycleStart(lapsedCycle.cycleStartDate, task.frequency);
    const maxFill = 30;

    for (let i = 0; i < maxFill; i++) {
      const dueAt = calculateDueAt(cursorStart, task.notificationTime);
      const softDeadline = calculateSoftDeadline(dueAt, task.frequency);
      const hardDeadline = calculateHardDeadline(dueAt, task.frequency);
      const hardT = new Date(hardDeadline).getTime();

      if (hardT >= nowMs) {
        const prevStart = calculatePreviousCycleStart(cursorStart, task.frequency);
        return {
          ...lapsedCycle,
          id: lapsedCycle.id,
          taskId: task.id!,
          resolution: 'lapsed',
          cycleStartDate: prevStart,
          dueAt,
          softDeadline,
          hardDeadline,
        };
      }

      const { id, inserted } = await this.cycleRepo.insertOrIgnore({
        taskId: task.id!,
        cycleStartDate: cursorStart,
        dueAt,
        softDeadline,
        hardDeadline,
        resolution: 'lapsed',
      });
      if (inserted) {
        lastInserted = {
          id,
          taskId: task.id!,
          cycleStartDate: cursorStart,
          dueAt,
          softDeadline,
          hardDeadline,
          resolution: 'lapsed',
        };
      }
      cursorStart = calculateNextCycleStart(cursorStart, task.frequency);
    }

    return lastInserted;
  }

  async loadTaskList(view: 'all' | 'overdue' | 'due' | 'upcoming' | 'paused' = 'all'): Promise<void> {
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
        latestCycleByTask.set(taskId, this.cycleRepo.mapRowToCycle(row));
      }

      const allTaskIds = taskRows.map((r: any) => Number(r.id));
      const taskRowsBatch = await this.db.getTasksByIds(allTaskIds);
      const taskMap = new Map(
        taskRowsBatch.map((t: any) => [Number(t.id), t as Task])
      );

      const taskList: TaskListItem[] = [];
      for (const row of taskRows) {
        const taskRow = taskMap.get(Number(row.id));
        if (!taskRow) continue;
        const task = await this.getTask(Number(row.id));
        if (!task) continue;
        let cycle = latestCycleByTask.get(task.id!);
        if (!cycle) {
          const firstStart = getFirstCycleStartDate(
            task.startDate,
            task.notificationTime,
            task.frequency
          );
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
        if (view === 'all' && task.state !== 'paused') taskList.push(item);
        else if (view === 'due' && displayStatus === 'due' && task.state !== 'paused') taskList.push(item);
        else if (view === 'upcoming' && displayStatus === 'upcoming' && task.state !== 'paused') taskList.push(item);
        else if (view === 'overdue' && displayStatus === 'overdue' && task.state !== 'paused') taskList.push(item);
        else if (view === 'paused' && task.state === 'paused') taskList.push(item);
      }

      taskList.sort((a, b) => {
        const priority = (s: string) => (s === 'due' ? 0 : s === 'overdue' ? 1 : 2);
        const pa = priority(a.displayStatus || '');
        const pb = priority(b.displayStatus || '');
        if (pa !== pb) return pa - pb;
        return new Date(a.currentCycle.dueAt).getTime() - new Date(b.currentCycle.dueAt).getTime();
      });

      this.taskListSubject.next(taskList);
      await this.maybeRescheduleAllNotifications();
    } catch (error) {
      console.error('Error loading task list:', error);
      throw error;
    }
  }

  /** @deprecated Use cycleRepo.mapRowToCycle directly in new code. */
  private mapRowToCycle(row: any): Cycle {
    return this.cycleRepo.mapRowToCycle(row);
  }

  /** Resolve a cycle (done or skipped). For lapsed cycles, only 'done' is allowed (retroactive). */
  async resolveCycle(cycleId: number, resolution: 'done' | 'skipped'): Promise<void> {
    const cycle = await this.cycleRepo.findById(cycleId);
    if (!cycle) {
      console.error('[TaskCycleService] resolveCycle: cycle not found', cycleId);
      throw new Error('Cycle not found');
    }
    const task = await this.getTask(cycle.taskId);
    if (!task) {
      console.error('[TaskCycleService] resolveCycle: task not found', cycle.taskId);
      throw new Error('Task not found');
    }

    const now = new Date().toISOString();
    if (resolution === 'done') {
      await this.cycleRepo.updateResolution(cycleId, 'done', { completedAt: now });
    } else {
      if (cycle.resolution === 'lapsed') throw new Error('Cannot skip a lapsed cycle');
      await this.cycleRepo.updateResolution(cycleId, 'skipped', { skippedAt: now });
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

  /** Mark a specific cycle as lapsed (used for retroactive correction + sample data). */
  async markCycleLapsed(cycleId: number): Promise<void> {
    await this.cycleRepo.updateResolution(cycleId, 'lapsed');
  }

  async createNextCycle(task: Task, previousCycle?: Cycle, skipReload?: boolean): Promise<number> {
    if (!task.id) throw new Error('Task ID is required to create cycle');

    if (task.frequency === 'once') {
      await this.db.executeQuery(
        "UPDATE tasks SET state = ?, isArchived = ? WHERE id = ?",
        ['archived', 1, task.id]
      );
      if (!skipReload) await this.loadTaskList();
      return 0;
    }

    const latestCycle = await this.cycleRepo.getCurrentCycle(task.id);
    if (latestCycle && latestCycle.resolution === 'open') return latestCycle.id!;

    let startDate = previousCycle
      ? (previousCycle.resolution === 'skipped' || previousCycle.resolution === 'lapsed'
          ? calculateNextCycleStart(previousCycle.cycleStartDate, task.frequency)
          : calculateNextCycleStart(previousCycle.hardDeadline, task.frequency))
      : getFirstCycleStartDate(task.startDate, task.notificationTime, task.frequency);

    const dueAt = calculateDueAt(startDate, task.notificationTime);
    const hardDeadline = calculateHardDeadline(dueAt, task.frequency);
    const softDeadline = calculateSoftDeadline(dueAt, task.frequency);

    const { id: newCycleId } = await this.cycleRepo.insertOrIgnore({
      taskId: task.id,
      cycleStartDate: startDate,
      dueAt,
      softDeadline,
      hardDeadline,
      resolution: 'open',
    });

    if (!skipReload) await this.loadTaskList();

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
        state,
      ]);

      const taskId = result.changes?.lastId;
      if (!taskId) throw new Error('Failed to get inserted task ID');

      await this.createNextCycle({ ...task, id: taskId });
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
        task.id,
      ]);

      const currentCycle = await this.cycleRepo.getCurrentCycle(task.id);
      if (currentCycle && currentCycle.resolution === 'open') {
        const dueAt = calculateDueAt(currentCycle.cycleStartDate, task.notificationTime);
        const softDeadline = calculateSoftDeadline(dueAt, task.frequency);
        const hardDeadline = calculateHardDeadline(dueAt, task.frequency);
        await this.cycleRepo.updateOpenCycleTimestamps(
          currentCycle.id!,
          dueAt,
          softDeadline,
          hardDeadline
        );
      }

      await this.loadTaskList();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async getCurrentCycle(taskId: number): Promise<Cycle | null> {
    return this.cycleRepo.getCurrentCycle(taskId);
  }

  async getMostRecentLapsedCycle(taskId: number): Promise<Cycle | null> {
    const result = await this.db.executeQuery(
      `SELECT * FROM task_cycles WHERE taskId = ? AND resolution = 'lapsed' ORDER BY hardDeadline DESC LIMIT 1`,
      [taskId]
    );
    if (!result.values?.length) return null;
    return this.mapRowToCycle(result.values[0]);
  }

  async getResolvedCycles(taskId: number, limit: number = 10, offset: number = 0): Promise<Cycle[]> {
    const result = await this.db.executeQuery(
      `SELECT * FROM task_cycles WHERE taskId = ? AND resolution IN ('done','lapsed','skipped')
       ORDER BY COALESCE(hardDeadline, cycleStartDate) DESC LIMIT ? OFFSET ?`,
      [taskId, limit, offset]
    );
    const rows = (result.values || []) as any[];
    return rows.map((row: any) => this.mapRowToCycle(row));
  }

  async getResolvedCyclesCount(taskId: number): Promise<number> {
    const result = await this.db.executeQuery(
      `SELECT COUNT(*) as cnt FROM task_cycles WHERE taskId = ? AND resolution IN ('done','lapsed','skipped')`,
      [taskId]
    );
    const row = (result.values || [])[0] as { cnt: number };
    return row?.cnt ?? 0;
  }

  async archiveTask(taskId: number): Promise<void> {
    const check = await this.db.executeQuery('SELECT id FROM tasks WHERE id = ?', [taskId]);
    if (!check.values?.length) throw new Error(`Task ${taskId} not found`);
    await this.db.executeQuery("UPDATE tasks SET state = ?, isArchived = ? WHERE id = ?", ['archived', 1, taskId]);
    await this.loadTaskList();
  }

  async unarchiveTask(taskId: number): Promise<void> {
    const taskResult = await this.db.executeQuery('SELECT state, isArchived FROM tasks WHERE id = ?', [taskId]);
    if (!taskResult.values?.length) throw new Error(`Task ${taskId} not found`);
    const row = taskResult.values[0] as any;
    if (row.state !== 'archived' && normalizeIsArchived(row.isArchived) === 0) return;
    await this.db.executeQuery("UPDATE tasks SET state = ?, isArchived = ? WHERE id = ?", ['active', 0, taskId]);
    await this.loadTaskList();
  }

  private calculateDaysSince(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

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
        await this.createNextCycle(task, undefined, true);
      }
    }
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
      const firstStart = getFirstCycleStartDate(
        task.startDate,
        task.notificationTime,
        task.frequency
      );
      const currentCycle: Cycle = cycle || {
        taskId: task.id!,
        cycleStartDate: firstStart,
        dueAt: calculateDueAt(firstStart, task.notificationTime),
        softDeadline: calculateSoftDeadline(calculateDueAt(firstStart, task.notificationTime), task.frequency),
        hardDeadline: calculateHardDeadline(calculateDueAt(firstStart, task.notificationTime), task.frequency),
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

  async deleteAllTasks(): Promise<void> {
    await this.db.executeQuery('DELETE FROM task_cycles');
    await this.db.executeQuery('DELETE FROM task_history');
    await this.db.executeQuery('DELETE FROM tasks');
  }

  async deleteCyclesForTask(taskId: number): Promise<void> {
    await this.db.executeQuery('DELETE FROM task_cycles WHERE taskId = ?', [taskId]);
  }
}
