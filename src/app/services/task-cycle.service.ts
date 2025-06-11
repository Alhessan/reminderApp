import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { TaskCycle, TaskCycleStatus, TaskListItem } from '../models/task-cycle.model';
import { Task, Frequency } from '../models/task.model';
import { BehaviorSubject, Observable, map } from 'rxjs';

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

@Injectable({
  providedIn: 'root'
})
export class TaskCycleService {
  private taskListSubject = new BehaviorSubject<TaskListItem[]>([]);
  public taskList$ = this.taskListSubject.asObservable();

  constructor(private db: DatabaseService) {}

  // Full workaround: bypass CTE regex by pre-fetching in JS (avoid complex SQL for web)
async loadTaskList(view: 'all' | 'overdue' | 'in_progress' | 'upcoming' = 'all'): Promise<void> {
  try {
    const now = new Date().toISOString();

    // Fetch all tasks
    const tasksResult = await this.db.executeQuery('SELECT * FROM tasks WHERE isArchived = 0');
    const allTasks = tasksResult.values || [];

    // Fetch all cycles
    const cyclesResult = await this.db.executeQuery('SELECT * FROM task_cycles');
    const allCycles = cyclesResult.values || [];

    // Compute latest cycle for each task
    const latestCycleMap = new Map<number, any>();
    for (const cycle of allCycles) {
      const current = latestCycleMap.get(cycle.taskId);
      if (!current || new Date(cycle.cycleStartDate) > new Date(current.cycleStartDate)) {
        latestCycleMap.set(cycle.taskId, cycle);
      }
    }

    // Assemble task list
    const taskList: TaskListItem[] = allTasks.map((task: any) => {
      const cycle = latestCycleMap.get(task.id);

      const cycleData = cycle ? {
        id: cycle.id,
        taskId: cycle.taskId,
        cycleStartDate: cycle.cycleStartDate,
        cycleEndDate: cycle.cycleEndDate,
        status: cycle.status,
        progress: cycle.progress,
        completedAt: cycle.completedAt
      } : {
        taskId: task.id,
        cycleStartDate: new Date().toISOString(),
        cycleEndDate: this.calculateCycleEnd(new Date().toISOString(), task.frequency),
        status: 'pending' as TaskCycleStatus,
        progress: 0
      };

      return {
        task: {
          id: task.id,
          title: task.title,
          type: task.type,
          frequency: task.frequency,
          startDate: task.startDate,
          notificationTime: task.notificationTime,
          notificationType: task.notificationType,
          notes: task.notes,
          isArchived: task.isArchived === 1
        },
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

      // Build the update object with proper string values
      const updates = {
        status: `'${status}'`, // Wrap status in quotes since it's a string
        ...(progress !== undefined && { progress: progress }), // Don't quote progress since it's a number
        ...(status === 'completed' && { completedAt: `'${new Date().toISOString()}'` }) // Quote ISO string
      };

      // Create SET clause without additional quotes
      const setClause = Object.entries(updates)
        .map(([key, value]) => `${key} = ${value}`)
        .join(', ');

      console.log('Update query:', setClause);

      await this.db.executeQuery(`
        UPDATE task_cycles
        SET ${setClause}
        WHERE id = ?
      `, [cycleId]);

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
} 