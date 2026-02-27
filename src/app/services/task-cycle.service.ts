import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { TaskCycle, TaskCycleStatus, TaskListItem } from '../models/task-cycle.model';
import { Task, Frequency } from '../models/task.model';
import { BehaviorSubject, Observable, map } from 'rxjs';
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

/** Margin as percentage of routine interval (fallback). Prefer allowed delay in hours for consistency. */
const MARGIN_PERCENT = 0.05;
/** Allowed delay after due time before marking as MISSED (hours). e.g. daily: due+5h = end of allowed window. */
const ALLOWED_DELAY_HOURS: Record<string, number> = {
  daily: 5,
  weekly: 24,
  monthly: 48,
  yearly: 168,
  once: 24
};

@Injectable({
  providedIn: 'root'
})
export class TaskCycleService {
  private taskListSubject = new BehaviorSubject<TaskListItem[]>([]);
  public taskList$ = this.taskListSubject.asObservable();

  constructor(private db: DatabaseService, private taskService: TaskService) {}

  /** Margin in ms: X% of the routine interval (daily, weekly, etc.) – used when no ALLOWED_DELAY_HOURS. */
  private getMarginMs(frequency: string): number {
    const oneDayMs = 24 * 60 * 60 * 1000;
    let intervalMs: number;
    switch (frequency) {
      case 'daily': intervalMs = oneDayMs; break;
      case 'weekly': intervalMs = 7 * oneDayMs; break;
      case 'monthly': intervalMs = 30 * oneDayMs; break;
      case 'yearly': intervalMs = 365 * oneDayMs; break;
      default: intervalMs = oneDayMs;
    }
    return Math.round(intervalMs * MARGIN_PERCENT);
  }

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
  getDueDatetime(cycleStartDate: string, notificationTime: string): string {
    const d = new Date(cycleStartDate);
    if (isNaN(d.getTime())) return cycleStartDate;
    const parts = (notificationTime || '00:00').split(':').map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  /**
   * End of allowed delay (deadline) after which cycle is marked MISSED. Due + N hours (e.g. daily: 5h).
   */
  private getMissedDeadlineMs(cycleStartDate: string, notificationTime: string, frequency: string): number {
    const dueIso = this.getDueDatetime(cycleStartDate, notificationTime);
    const dueMs = new Date(dueIso).getTime();
    const hours = ALLOWED_DELAY_HOURS[frequency] ?? ALLOWED_DELAY_HOURS['once'];
    return dueMs + hours * 60 * 60 * 1000;
  }

  /**
   * Close cycles that are past due + allowed delay (mark as skipped = MISSED) and create the next cycle.
   */
  private async closeMissedCycles(): Promise<void> {
    const cyclesResult = await this.db.executeQuery(`
      SELECT * FROM task_cycles WHERE status IN ('pending', 'in_progress')
    `);
    const cycles = (cyclesResult.values || []) as Array<{ id: number; taskId: number; cycleStartDate: string; cycleEndDate: string; status: string }>;
    const now = Date.now();

    for (const cycle of cycles) {
      const task = await this.getTask(cycle.taskId);
      if (!task) continue;
      const deadlineMs = this.getMissedDeadlineMs(cycle.cycleStartDate, task.notificationTime, task.frequency);
      if (now <= deadlineMs) continue;

      await this.db.executeQuery(
        'UPDATE task_cycles SET status = ? WHERE id = ?',
        ['skipped', cycle.id]
      );
      const cycleObj: TaskCycle = {
        id: cycle.id,
        taskId: cycle.taskId,
        cycleStartDate: cycle.cycleStartDate,
        cycleEndDate: cycle.cycleEndDate,
        status: 'skipped',
        progress: 0
      };
      await this.createNextCycle(task, cycleObj);
    }
  }

  // Full workaround: bypass CTE regex by pre-fetching in JS (avoid complex SQL for web)
async loadTaskList(view: 'all' | 'overdue' | 'in_progress' | 'upcoming' = 'all'): Promise<void> {
  try {
    await this.closeMissedCycles();

    // Debug query to check raw tasks data
    const debugResult = await this.db.executeQuery('SELECT * FROM tasks');
    console.log('Debug - All tasks in database:', debugResult.values);

    console.log('Loading task list with view:', view);
    const now = new Date().toISOString();

    // Get non-archived tasks with their latest cycles
    const tasksResult = await this.db.executeQuery(`
      SELECT t.*, tc.id as cycle_id, tc.cycleStartDate, tc.cycleEndDate, 
             tc.status, tc.progress, tc.completedAt
      FROM tasks t
      LEFT JOIN (
        SELECT tc2.*,
               ROW_NUMBER() OVER (
                 PARTITION BY tc2.taskId 
                 ORDER BY 
                   tc2.cycleStartDate DESC,
                   CASE tc2.status 
                     WHEN 'pending' THEN 0
                     WHEN 'in_progress' THEN 1
                     WHEN 'skipped' THEN 2
                     WHEN 'completed' THEN 3
                   END
               ) as rn
        FROM task_cycles tc2
      ) tc ON t.id = tc.taskId AND tc.rn = 1
      WHERE t.isArchived = 0 OR t.isArchived IS NULL
    `);
    console.log('Tasks query result:', tasksResult);
    const nonArchivedTasks = tasksResult.values || [];
    console.log('Non-archived tasks:', nonArchivedTasks);

    // Get cycles in a separate query - prioritize active cycles
    const cyclesResult = await this.db.executeQuery(`
      SELECT * FROM task_cycles 
      ORDER BY 
        CASE 
          WHEN status = 'pending' THEN 0
          WHEN status = 'in_progress' THEN 1
          WHEN status = 'skipped' THEN 2
          WHEN status = 'completed' THEN 3
          ELSE 4
        END ASC,
        cycleStartDate DESC
    `);
    console.log('Cycles query result:', cyclesResult);
    const cycles = cyclesResult.values || [];

    // Create a map of latest ACTIVE cycles (prefer pending/in_progress over completed)
    const latestCycles = new Map<number, any>();
    cycles.forEach((cycle: { taskId: number; id: number; cycleStartDate: string; cycleEndDate: string; status: string; progress: number; completedAt?: string }) => {
      const existing = latestCycles.get(cycle.taskId);
      
      if (!existing) {
        // No cycle yet, use this one
        latestCycles.set(cycle.taskId, {
          ...cycle,
          status: cycle.status as TaskCycleStatus
        });
      } else {
        // Prefer active cycles (pending/in_progress) over completed ones
        const isActiveStatus = cycle.status === 'pending' || cycle.status === 'in_progress';
        const existingIsActive = existing.status === 'pending' || existing.status === 'in_progress';
        
        if (isActiveStatus && !existingIsActive) {
          // This cycle is active and existing is completed - use this one
          latestCycles.set(cycle.taskId, {
            ...cycle,
            status: cycle.status as TaskCycleStatus
          });
        } else if (isActiveStatus === existingIsActive) {
          // Both are same type (both active or both completed), use the newer one
          if (new Date(cycle.cycleStartDate) > new Date(existing.cycleStartDate)) {
            latestCycles.set(cycle.taskId, {
              ...cycle,
              status: cycle.status as TaskCycleStatus
            });
          }
        }
        // If existing is active and this is completed, keep existing
      }
    });

    // Assemble task list
    const taskList: TaskListItem[] = nonArchivedTasks.map((taskData: any) => {
      console.log('Processing task data:', taskData);
      const task: Task = {
        id: taskData.id,
        title: taskData.title,
        type: taskData.type,
        customerId: taskData.customerId,
        frequency: taskData.frequency,
        startDate: taskData.startDate,
        notificationTime: taskData.notificationTime,
        notificationType: taskData.notificationType,
        notes: taskData.notes,
        isArchived: taskData.isArchived === 1,
        isCompleted: false
      };

      const latestCycle = latestCycles.get(task.id!);
      const cycleData: TaskCycle = latestCycle ? {
        id: latestCycle.id,
        taskId: task.id!,
        cycleStartDate: latestCycle.cycleStartDate,
        cycleEndDate: latestCycle.cycleEndDate,
        status: latestCycle.status,
        progress: latestCycle.progress || 0,
        completedAt: latestCycle.completedAt
      } : (() => {
        const firstStart = this.getFirstCycleStartDate(task);
        return {
          taskId: task.id!,
          cycleStartDate: firstStart,
          cycleEndDate: this.calculateCycleEnd(firstStart, task.frequency),
          status: 'pending' as TaskCycleStatus,
          progress: 0
        };
      })();

      const nextDueDate = this.getDueDatetime(cycleData.cycleStartDate, task.notificationTime);
      const isOverdue = new Date(nextDueDate) < new Date() && cycleData.status !== 'completed' && cycleData.status !== 'skipped';
      
      return {
        task,
        currentCycle: cycleData,
        taskStatus: this.getTaskStatus(cycleData),
        isOverdue,
        nextDueDate,
        daysSinceLastCompletion: cycleData.completedAt ? 
          Math.floor((new Date().getTime() - new Date(cycleData.completedAt).getTime()) / (1000 * 60 * 60 * 24)) : 
          undefined,
        canStartEarly: this.canStartEarly(cycleData),
        canComplete: this.canComplete(cycleData)
      };
    })
    .filter((item: TaskListItem) => {
      const c = item.currentCycle;
      const now = new Date().toISOString();
      const completed: TaskCycleStatus = 'completed';
      const inProgress: TaskCycleStatus = 'in_progress';
      const pending: TaskCycleStatus = 'pending';
      const skipped: TaskCycleStatus = 'skipped';

      switch (view) {
        case 'overdue':
          return c.cycleEndDate < now && c.status !== completed && c.status !== skipped;
        case 'in_progress':
          return c.status === inProgress;
        case 'upcoming':
          return c.status === pending;
        default:
          // 'all': do not show missed (skipped) tasks in the main list
          return c.status !== skipped;
      }
    })
    .sort((a: TaskListItem, b: TaskListItem) => {
      const aEnd = a.currentCycle.cycleEndDate;
      const bEnd = b.currentCycle.cycleEndDate;
      const inProgress: TaskCycleStatus = 'in_progress';

      const aPriority = a.isOverdue ? 1 : a.currentCycle.status === inProgress ? 2 : 3;
      const bPriority = b.isOverdue ? 1 : b.currentCycle.status === inProgress ? 2 : 3;

      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(aEnd).getTime() - new Date(bEnd).getTime();
    });

    console.log('Processed task list:', taskList);
    this.taskListSubject.next(taskList);
  } catch (error) {
    console.error('Error loading task list:', error);
    throw error;
  }
}

  async updateTaskCycleStatus(cycleId: number, status: TaskCycleStatus, progress?: number): Promise<void> {
    try {
      console.log('Updating cycle status:', { cycleId, status, progress });

      // Get current cycle
      const currentCycle = await this.db.executeQuery(
        'SELECT * FROM task_cycles WHERE id = ?',
        [cycleId]
      );

      if (!currentCycle.values?.length) {
        throw new Error('Cycle not found');
      }

      const cycle: TaskCycle = {
        id: currentCycle.values[0].id,
        taskId: currentCycle.values[0].taskId,
        cycleStartDate: currentCycle.values[0].cycleStartDate,
        cycleEndDate: currentCycle.values[0].cycleEndDate,
        status: currentCycle.values[0].status,
        progress: currentCycle.values[0].progress || 0,
        completedAt: currentCycle.values[0].completedAt
      };

      // Validate status transition
      const validStatuses: TaskCycleStatus[] = ['pending', 'in_progress', 'completed', 'skipped'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Apply business rules
      if (status === 'completed' && !this.canComplete(cycle)) {
        throw new Error('Cannot complete cycle before its start date');
      }

      if (status === 'in_progress' && cycle.status === 'pending' && !this.canStartEarly(cycle)) {
        throw new Error('Cannot start this cycle early - too far from start date');
      }

      // Build the SET clause and parameters
      const setClauses = ['status = ?'];
      const params: (string | number)[] = [status];

      if (progress !== undefined) {
        setClauses.push('progress = ?');
        params.push(progress);
      }

      if (status === 'completed') {
        setClauses.push('completedAt = ?');
        params.push(new Date().toISOString());
      }

      // Add the cycleId as the last parameter
      params.push(cycleId);

      const query = `
        UPDATE task_cycles
        SET ${setClauses.join(', ')}
        WHERE id = ?
      `;

      console.log('Update query:', query, params);

      await this.db.executeQuery(query, params);
      console.log('Status updated successfully');

      // If completing or manually skipping a cycle, create next cycle (so task stays in list with new occurrence)
      if (status === 'completed' || status === 'skipped') {
        const task = await this.getTask(cycle.taskId);
        if (task) {
          await this.createNextCycle(task, { ...cycle, status });
        }
      }

      // Reload the task list to reflect changes
      await this.loadTaskList();
    } catch (error) {
      console.error('Error updating task cycle status:', error);
      throw error;
    }
  }

  async createNextCycle(task: Task, previousCycle?: TaskCycle): Promise<number> {
    try {
      if (!task.id) {
        throw new Error('Task ID is required to create cycle');
      }

      console.log('Creating next cycle for task:', task);

      // Get the latest cycle for this task
      const latestCycle = await this.getCurrentCycle(task.id);
      console.log('Latest cycle:', latestCycle);
      
      // If there's a latest cycle and it's pending or in_progress, return its ID
      const pending: TaskCycleStatus = 'pending';
      const inProgress: TaskCycleStatus = 'in_progress';
      if (latestCycle && (latestCycle.status === pending || latestCycle.status === inProgress)) {
        console.log('Using existing cycle:', latestCycle.id);
        return latestCycle.id!;
      }

      // For skipped: use cycle start so next cycle has a later due date (not the same as skipped one)
      const skipped: TaskCycleStatus = 'skipped';
      const startDate = previousCycle
        ? (previousCycle.status === skipped
            ? this.calculateNextCycleStart(previousCycle.cycleStartDate, task.frequency)
            : this.calculateNextCycleStart(previousCycle.cycleEndDate, task.frequency))
        : this.getFirstCycleStartDate(task);

      const endDate = this.calculateCycleEnd(startDate, task.frequency);
      console.log('New cycle dates:', { startDate, endDate });

      // Insert the new cycle
      const insertResult = await this.db.executeQuery(`
        INSERT INTO task_cycles (
          taskId,
          cycleStartDate,
          cycleEndDate,
          status,
          progress
        ) VALUES (?, ?, ?, ?, 0)
      `, [task.id, startDate, endDate, pending]);
      console.log('Insert result:', insertResult);

      if (!insertResult.changes?.lastId) {
        console.error('No lastId in insert result');
        throw new Error('Failed to get new cycle ID');
      }

      const newCycleId = insertResult.changes.lastId;
      console.log('New cycle created with ID:', newCycleId);

      // Verify the cycle exists
      const verifyResult = await this.db.executeQuery(`
        SELECT * FROM task_cycles WHERE id = ?
      `, [newCycleId]);
      console.log('Verify result:', verifyResult);

      if (!verifyResult.values?.length) {
        console.error('Could not verify new cycle');
        throw new Error('Failed to verify new cycle');
      }

      // Reload the task list to reflect changes
      await this.loadTaskList();
      
      return newCycleId;
    } catch (error) {
      console.error('Error creating next cycle:', error);
      throw new Error('Failed to create new cycle for task');
    }
  }

  private calculateNextCycleStart(previousEnd: string, frequency: string): string {
    try {
      // Parse the date string and ensure it's valid
      const parsedDate = new Date(previousEnd);
      if (isNaN(parsedDate.getTime())) {
        console.error('Invalid previous end date:', previousEnd);
        // If invalid, use current date as fallback
        parsedDate.setTime(Date.now());
      }

      // Create a new date object to avoid modifying the original
      const startDate = new Date(parsedDate);
      
      switch (frequency) {
        case 'daily':
          startDate.setDate(startDate.getDate() + 1);
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() + 7);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() + 1);
          break;
        case 'yearly':
          startDate.setFullYear(startDate.getFullYear() + 1);
          break;
        default:
          console.warn('Unknown frequency:', frequency);
          // Default to daily if frequency is unknown
          startDate.setDate(startDate.getDate() + 1);
      }

      // Ensure the date is valid before converting to ISO string
      if (isNaN(startDate.getTime())) {
        console.error('Invalid start date calculated');
        return new Date().toISOString(); // Fallback to current date
      }

      return startDate.toISOString();
    } catch (error) {
      console.error('Error calculating next cycle start date:', error);
      return new Date().toISOString(); // Fallback to current date
    }
  }

  private calculateCycleEnd(startDate: string, frequency: string): string {
    try {
      // Parse the date string and ensure it's valid
      const parsedDate = new Date(startDate);
      if (isNaN(parsedDate.getTime())) {
        console.error('Invalid start date:', startDate);
        // If invalid, use current date as fallback
        parsedDate.setTime(Date.now());
      }

      // Create a new date object to avoid modifying the original
      const endDate = new Date(parsedDate);
      
      switch (frequency) {
        case 'daily':
          endDate.setDate(endDate.getDate() + 1);
          break;
        case 'weekly':
          endDate.setDate(endDate.getDate() + 7);
          break;
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'yearly':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          console.warn('Unknown frequency:', frequency);
          // Default to daily if frequency is unknown
          endDate.setDate(endDate.getDate() + 1);
      }

      // Ensure the date is valid before converting to ISO string
      if (isNaN(endDate.getTime())) {
        console.error('Invalid end date calculated');
        return new Date().toISOString(); // Fallback to current date
      }

      return endDate.toISOString();
    } catch (error) {
      console.error('Error calculating cycle end date:', error);
      return new Date().toISOString(); // Fallback to current date
    }
  }

  async getTask(id: number): Promise<Task | null> {
    try {
      const result = await this.db.executeQuery(`
        SELECT * FROM tasks WHERE id = ?
      `, [id]);

      if (result.values?.length) {
        return result.values[0] as Task;
      }
      return null;
    } catch (error) {
      console.error('Error getting task:', error);
      throw error;
    }
  }

  async createTask(task: Task): Promise<number> {
    try {
      // Insert the task
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
          isArchived
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        task.isArchived ? 1 : 0
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
        task.isArchived ? 1 : 0,
        task.id
      ]);

      // Update current cycle if frequency changed
      const currentCycle = await this.getCurrentCycle(task.id);
      if (currentCycle && currentCycle.status === 'pending') {
        const endDate = this.calculateCycleEnd(currentCycle.cycleStartDate, task.frequency);
        await this.db.executeQuery(`
          UPDATE task_cycles
          SET cycleEndDate = ?
          WHERE id = ?
        `, [endDate, currentCycle.id]);
      }

      // Reload the task list
      await this.loadTaskList();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async getCurrentCycle(taskId: number): Promise<TaskCycle | null> {
    try {
      const result = await this.db.executeQuery(`
        SELECT *
        FROM task_cycles
        WHERE taskId = ?
        ORDER BY cycleStartDate DESC
        LIMIT 1
      `, [taskId]);

      if (result.values?.length) {
        const cycle = result.values[0];
        return {
          id: cycle.id,
          taskId: cycle.taskId,
          cycleStartDate: cycle.cycleStartDate,
          cycleEndDate: cycle.cycleEndDate,
          status: cycle.status as TaskCycleStatus,
          progress: cycle.progress || 0,
          completedAt: cycle.completedAt
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting current cycle:', error);
      throw new Error('Failed to get current cycle');
    }
  }

  async archiveTask(taskId: number): Promise<void> {
    try {
      console.log('Archiving task:', taskId);

      // First verify the task exists
      const checkResult = await this.db.executeQuery(`
        SELECT isArchived FROM tasks WHERE id = ?
      `, [taskId]);
      console.log('Task check result:', checkResult);

      if (!checkResult.values?.length) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Update the task's isArchived status
      const updateResult = await this.db.executeQuery(`
        UPDATE tasks 
        SET isArchived = ?
        WHERE id = ?
      `, [1, taskId]);
      console.log('Archive update result:', updateResult);

      // Verify the update was successful
      const verifyResult = await this.db.executeQuery(`
        SELECT isArchived FROM tasks WHERE id = ?
      `, [taskId]);
      console.log('Archive verification result:', verifyResult);

      // Check if the value exists and is truthy (1, '1', true)
      const archivedValue = verifyResult.values?.[0]?.isArchived;
      if (!verifyResult.values?.[0] || ![1, '1', true].includes(archivedValue)) {
        console.error('Archive operation failed verification:', verifyResult);
        throw new Error('Failed to archive task - verification failed');
      }

      // Update task list after archiving
      await this.loadTaskList();
    } catch (error) {
      console.error('Error archiving task:', error);
      throw error;
    }
  }

  async unarchiveTask(taskId: number): Promise<void> {
    try {
      console.log('TaskCycleService: Unarchiving task:', taskId);
      
      // First verify the task exists and is archived
      const taskResult = await this.db.executeQuery(`
        SELECT isArchived FROM tasks WHERE id = ?
      `, [taskId]);
      
      if (!taskResult.values?.length) {
        throw new Error(`Task with ID ${taskId} not found`);
      }
      
      // Use our normalizeIsArchived function to handle the value consistently
      const isArchived = normalizeIsArchived(taskResult.values[0].isArchived);
      if (isArchived === 0) {
        console.log('Task is not archived');
        return;
      }

      // Update the task's archived status
      const result = await this.db.executeQuery(`
        UPDATE tasks 
        SET isArchived = ?
        WHERE id = ?
      `, [0, taskId]);
      console.log('TaskCycleService: Unarchive query result:', result);

      // Verify the update was successful
      const verifyResult = await this.db.executeQuery(`
        SELECT isArchived FROM tasks WHERE id = ?
      `, [taskId]);
      console.log('Unarchive verification result:', verifyResult);

      // Verify using our normalized value and handle web database boolean values
      const rawValue = verifyResult.values?.[0]?.isArchived;
      console.log('Raw isArchived value after update:', rawValue);
      
      // Check all possible falsy values that indicate successful unarchive
      if (![0, '0', false, 'false', null, undefined].includes(rawValue)) {
        console.error('Unarchive operation failed verification:', verifyResult);
        throw new Error('Failed to unarchive task - verification failed');
      }

      await this.loadTaskList();
      console.log('TaskCycleService: Task list reloaded after unarchive');
    } catch (error) {
      console.error('Error unarchiving task:', error);
      throw error;
    }
  }

  private calculateDaysSince(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private async calculateNextDueDate(task: Task, currentCycle?: TaskCycle): Promise<string> {
    if (currentCycle?.cycleEndDate) {
      return currentCycle.cycleEndDate;
    }

    // If no current cycle, calculate based on start date
    const startDate = new Date(task.startDate);
    const today = new Date();
    
    switch (task.frequency) {
      case 'daily':
        startDate.setDate(startDate.getDate() + 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() + 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() + 1);
        break;
      case 'yearly':
        startDate.setFullYear(startDate.getFullYear() + 1);
        break;
    }

    return startDate.toISOString();
  }

  private isOverdue(date: string): boolean {
    return new Date(date) < new Date();
  }

  async getArchivedTasks(): Promise<TaskListItem[]> {
    try {
      const query = `
        SELECT 
          t.*,
          c.name as customerName,
          tc.id as cycle_id,
          tc.cycleStartDate,
          tc.cycleEndDate,
          tc.status,
          tc.progress,
          tc.completedAt
        FROM tasks t
        LEFT JOIN customers c ON t.customerId = c.id
        LEFT JOIN (
          SELECT tc2.*,
            ROW_NUMBER() OVER (
              PARTITION BY tc2.taskId 
              ORDER BY tc2.cycleStartDate DESC
            ) as rn
          FROM task_cycles tc2
        ) tc ON t.id = tc.taskId AND tc.rn = 1
        WHERE t.isArchived = 1
        ORDER BY t.title ASC
      `;

      const result = await this.db.executeQuery(query);
      const archivedTasks = (result.values || []).map((taskData: any) => {
        const task = {
          id: taskData.id,
          title: taskData.title,
          type: taskData.type,
          customerId: taskData.customerId,
          customerName: taskData.customerName || undefined,
          frequency: taskData.frequency,
          startDate: taskData.startDate,
          notificationTime: taskData.notificationTime,
          notificationType: taskData.notificationType,
          notificationValue: taskData.notificationValue,
          notes: taskData.notes,
          isArchived: true
        };

        const currentCycle = taskData.cycle_id ? {
          id: taskData.cycle_id,
          taskId: task.id!,
          cycleStartDate: taskData.cycleStartDate,
          cycleEndDate: taskData.cycleEndDate,
          status: taskData.status as TaskCycleStatus,
          progress: taskData.progress || 0,
          completedAt: taskData.completedAt
        } : {
          taskId: task.id!,
          cycleStartDate: task.startDate,
          cycleEndDate: this.calculateCycleEnd(task.startDate, task.frequency),
          status: 'pending' as TaskCycleStatus,
          progress: 0
        };

        return {
          task,
          currentCycle,
          taskStatus: this.getTaskStatus(currentCycle),
          isOverdue: false, // Archived tasks are not considered overdue
          nextDueDate: currentCycle.cycleEndDate,
          daysSinceLastCompletion: currentCycle.completedAt ? 
            Math.floor((new Date().getTime() - new Date(currentCycle.completedAt).getTime()) / (1000 * 60 * 60 * 24)) : 
            undefined,
          canStartEarly: false, // Archived tasks cannot be started
          canComplete: false // Archived tasks cannot be completed
        };
      });

      return archivedTasks;
    } catch (error) {
      console.error('Error getting archived tasks:', error);
      throw error;
    }
  }

  // Add new methods for task status management
  private getTaskStatus(cycle: TaskCycle): 'Active' | 'Pending' | 'Completed' | 'Overdue' {
    const now = new Date();
    const cycleStart = new Date(cycle.cycleStartDate);
    const cycleEnd = new Date(cycle.cycleEndDate);

    if (cycle.status === 'completed') {
      return 'Completed';
    }

    if (cycle.status === 'in_progress') {
      return cycleEnd < now ? 'Overdue' : 'Active';
    }

    if (cycle.status === 'pending') {
      return cycleEnd < now ? 'Overdue' : 'Pending';
    }

    // For skipped status, we don't show in main view
    return 'Pending';
  }

  /** Public for use in task detail: whether the cycle can be started early */
  canStartCycle(cycle: TaskCycle): boolean {
    return this.canStartEarly(cycle);
  }

  /** Public for use in task detail: whether the cycle can be marked complete */
  canCompleteCycle(cycle: TaskCycle): boolean {
    return this.canComplete(cycle);
  }

  private canStartEarly(cycle: TaskCycle): boolean {
    const now = new Date();
    const cycleStart = new Date(cycle.cycleStartDate);
    
    // Can start early if:
    // 1. Status is pending
    // 2. Within reasonable timeframe (e.g., 3 days) before cycle start
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    return cycle.status === 'pending' && 
           (cycleStart.getTime() - now.getTime()) <= threeDaysMs;
  }

  private canComplete(cycle: TaskCycle): boolean {
    const now = new Date();
    const cycleStart = new Date(cycle.cycleStartDate);
    
    // Can complete if:
    // 1. Status is in_progress
    // 2. Cycle has officially started
    return cycle.status === 'in_progress' && now >= cycleStart;
  }
}