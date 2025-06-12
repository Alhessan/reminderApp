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

@Injectable({
  providedIn: 'root'
})
export class TaskCycleService {
  private taskListSubject = new BehaviorSubject<TaskListItem[]>([]);
  public taskList$ = this.taskListSubject.asObservable();

  constructor(private db: DatabaseService, private taskService: TaskService) {}

  // Full workaround: bypass CTE regex by pre-fetching in JS (avoid complex SQL for web)
async loadTaskList(view: 'all' | 'overdue' | 'in_progress' | 'upcoming' = 'all'): Promise<void> {
  try {
    console.log('Loading task list with view:', view);
    const now = new Date().toISOString();

    // Basic query without complex joins
    const tasksResult = await this.db.executeQuery(`
      SELECT * FROM tasks
    `);
    console.log('Tasks query result:', tasksResult);
    
    // Convert raw DB results to properly typed tasks first
    const allTasks: DbTask[] = (tasksResult.values || []).map((raw: RawDbTask) => ({
      ...raw,
      id: Number(raw.id),
      customerId: raw.customerId ? Number(raw.customerId) : undefined,
      frequency: raw.frequency as Frequency,
      isArchived: normalizeIsArchived(raw.isArchived)
    }));

    // Then filter non-archived tasks
    const nonArchivedTasks = allTasks.filter(t => t.isArchived === 0);
    console.log('Non-archived tasks:', nonArchivedTasks);

    // Get cycles in a separate query
    const cyclesResult = await this.db.executeQuery(`
      SELECT * FROM task_cycles ORDER BY cycleStartDate DESC
    `);
    console.log('Cycles query result:', cyclesResult);
    const cycles = cyclesResult.values || [];

    // Create a map of latest cycles
    const latestCycles = new Map<number, any>();
    cycles.forEach((cycle: { taskId: number; id: number; cycleStartDate: string; cycleEndDate: string; status: string; progress: number; completedAt?: string }) => {
      if (!latestCycles.has(cycle.taskId)) {
        latestCycles.set(cycle.taskId, cycle);
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
      const cycleData = latestCycle ? {
        id: latestCycle.id,
        taskId: task.id!,
        cycleStartDate: latestCycle.cycleStartDate,
        cycleEndDate: latestCycle.cycleEndDate,
        status: latestCycle.status as TaskCycleStatus,
        progress: latestCycle.progress || 0,
        completedAt: latestCycle.completedAt
      } : {
        taskId: task.id!,
        cycleStartDate: task.startDate,
        cycleEndDate: this.calculateCycleEnd(task.startDate, task.frequency),
        status: 'pending' as TaskCycleStatus,
        progress: 0
      };

      return {
        task,
        currentCycle: cycleData,
        isOverdue: new Date(cycleData.cycleEndDate) < new Date() && cycleData.status !== 'completed',
        nextDueDate: cycleData.cycleEndDate,
        daysSinceLastCompletion: cycleData.completedAt ? 
          Math.floor((new Date().getTime() - new Date(cycleData.completedAt).getTime()) / (1000 * 60 * 60 * 24)) : 
          undefined
      };
    })
    .filter((item: TaskListItem) => {
      const c = item.currentCycle;
      switch (view) {
        case 'overdue':
          return c.cycleEndDate < now && c.status !== 'completed';
        case 'in_progress':
          return c.status === 'in_progress';
        case 'upcoming':
          return c.cycleStartDate > now && c.status === 'pending';
        default:
          return true;
      }
    })
    .sort((a: TaskListItem, b: TaskListItem) => {
      const aEnd = a.currentCycle.cycleEndDate;
      const bEnd = b.currentCycle.cycleEndDate;

      const aPriority = a.isOverdue ? 1 : a.currentCycle.status === 'in_progress' ? 2 : 3;
      const bPriority = b.isOverdue ? 1 : b.currentCycle.status === 'in_progress' ? 2 : 3;

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

      // Validate status
      const validStatuses = ['pending', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Build the query parameters
      const params: any[] = [];
      let setClause = 'status = ?';
      params.push(status);

      if (progress !== undefined) {
        setClause += ', progress = ?';
        params.push(progress);
      }

      if (status === 'completed') {
        setClause += ', completedAt = ?';
        params.push(new Date().toISOString());
      }

      // Add the cycleId as the last parameter
      params.push(cycleId);

      console.log('Update query:', setClause, params);

      await this.db.executeQuery(`
        UPDATE task_cycles
        SET ${setClause}
        WHERE id = ?
      `, params);

      console.log('Status updated successfully');

      // Reload the task list to reflect changes
      await this.loadTaskList();
    } catch (error) {
      console.error('Error updating task cycle status:', error);
      throw new Error('Failed to update task cycle status');
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
      if (latestCycle && (latestCycle.status === 'pending' || latestCycle.status === 'in_progress')) {
        console.log('Using existing cycle:', latestCycle.id);
        return latestCycle.id!;
      }

      const startDate = previousCycle ? 
        this.calculateNextCycleStart(previousCycle.cycleEndDate, task.frequency) :
        new Date().toISOString();

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
        ) VALUES (?, ?, ?, 'pending', 0)
      `, [task.id, startDate, endDate]);
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
    const date = new Date(previousEnd);
    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return date.toISOString();
  }

  private calculateCycleEnd(startDate: string, frequency: string): string {
    const date = new Date(startDate);
    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return date.toISOString();
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
      console.log('Getting archived tasks');
      
      // First check if any tasks are archived
      const checkResult = await this.db.executeQuery(`
        SELECT COUNT(*) as count FROM tasks WHERE isArchived = 1
      `);
      console.log('Number of archived tasks:', checkResult.values?.[0]?.count);

      // Query only archived tasks
      const result = await this.db.executeQuery(`
        SELECT * FROM tasks WHERE isArchived = 1
      `);
      
      if (!result.values?.length) {
        console.log('No archived tasks found');
        return [];
      }

      // Convert raw DB results to properly typed tasks
      const tasks: DbTask[] = (result.values || []).map((raw: RawDbTask) => ({
        ...raw,
        id: Number(raw.id),
        customerId: raw.customerId ? Number(raw.customerId) : undefined,
        frequency: raw.frequency as Frequency,
        isArchived: normalizeIsArchived(raw.isArchived)
      }));
      console.log('Raw archived tasks:', tasks);

      // If no archived tasks found, return empty array
      if (tasks.length === 0) {
        return [];
      }

      // Get cycles for each task individually to avoid IN clause
      const latestCycles = new Map<number, any>();
      for (const task of tasks) {
        const cycleResult = await this.db.executeQuery(`
          SELECT * FROM task_cycles 
          WHERE taskId = ?
          ORDER BY cycleStartDate DESC
          LIMIT 1
        `, [task.id]);
        
        if (cycleResult.values?.length > 0) {
          latestCycles.set(task.id, cycleResult.values[0]);
        }
      }
      console.log('Latest cycles map:', latestCycles);

      const archivedTasks = tasks.map((taskData: DbTask) => {
        console.log('Processing archived task data:', taskData);
        
        // Since we queried for isArchived = 1, we should only have archived tasks
        // But let's verify and fix any inconsistencies
        if (taskData.isArchived === 0) {
          console.warn('Found task with incorrect isArchived value:', taskData);
          // Auto-correct the value in the database
          this.db.executeQuery(`
            UPDATE tasks 
            SET isArchived = 1
            WHERE id = ?
          `, [taskData.id]).catch(err => 
            console.error('Error correcting isArchived value:', err)
          );
        }

        const task: Task = {
          id: taskData.id,
          title: taskData.title,
          type: taskData.type,
          customerId: taskData.customerId,
          frequency: taskData.frequency,
          startDate: taskData.startDate,
          notificationType: taskData.notificationType,
          notificationTime: taskData.notificationTime,
          notes: taskData.notes,
          isArchived: true,  // We know it's archived since we queried for isArchived = 1
          isCompleted: false
        };

        const latestCycle = latestCycles.get(task.id!);
        let currentCycle: TaskCycle;
        if (latestCycle) {
          currentCycle = {
            id: latestCycle.id,
            taskId: task.id!,
            cycleStartDate: latestCycle.cycleStartDate,
            cycleEndDate: latestCycle.cycleEndDate,
            status: latestCycle.status as TaskCycleStatus,
            progress: latestCycle.progress || 0,
            completedAt: latestCycle.completedAt
          };
        } else {
          currentCycle = {
            taskId: task.id!,
            cycleStartDate: task.startDate,
            cycleEndDate: this.calculateCycleEnd(task.startDate, task.frequency),
            status: 'pending',
            progress: 0
          };
        }

        return {
          task,
          currentCycle,
          isOverdue: new Date(currentCycle.cycleEndDate) < new Date() && currentCycle.status !== 'completed',
          nextDueDate: currentCycle.cycleEndDate,
          daysSinceLastCompletion: currentCycle.completedAt ? 
            Math.floor((new Date().getTime() - new Date(currentCycle.completedAt).getTime()) / (1000 * 60 * 60 * 24)) : 
            undefined
        };
      });

      console.log('Final processed archived tasks:', archivedTasks);
      return archivedTasks;
    } catch (error) {
      console.error('Error getting archived tasks:', error);
      throw error;
    }
  }
}