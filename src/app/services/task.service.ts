import { Injectable } from "@angular/core";
import { DatabaseService } from "./database.service";
import { Task, TaskHistoryEntry, CreateTaskDTO } from "../models/task.model";
import { NotificationService } from "./notification.service";
import { TaskCycleService } from "./task-cycle.service";
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import {
  getFirstCycleStartDate,
  calculateDueAt,
  calculateSoftDeadline,
  calculateHardDeadline,
} from '../utils/cycle-timestamps.util';

@Injectable({
  providedIn: "root"
})
export class TaskService {

  private tasks = new BehaviorSubject<Task[]>([]);
  tasks$ = this.tasks.asObservable();

  constructor(
    private dbService: DatabaseService,
    private notificationService: NotificationService,
    private taskCycleService: TaskCycleService,
    private platform: Platform
  ) {
    this.loadTasks();
  }

  private async loadTasks() {
    try {
      const result = await this.dbService.executeQuery(
        "SELECT * FROM tasks WHERE (state IS NULL OR state != 'archived') AND (isArchived = 0 OR isArchived IS NULL) ORDER BY startDate ASC",
        []
      );
      const rows = (result.values || []) as any[];
      const tasks: Task[] = rows.map((row: any) => this.mapRowToTask(row));
      this.tasks.next(tasks);
    } catch (error) {
      console.error('TaskService: Error loading tasks:', error);
      throw error;
    }
  }

  private mapRowToTask(row: any): Task {
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
    };
  }

  async createTask(taskData: CreateTaskDTO): Promise<number> {
    const state = taskData.state || 'active';
    const values = [
      taskData.title?.trim() || null,
      taskData.type?.trim() || null,
      taskData.customerId || null,
      taskData.frequency?.trim() || null,
      taskData.startDate || null,
      taskData.notificationType?.trim() || null,
      taskData.notificationTime?.trim() || null,
      taskData.notificationValue?.trim() || null,
      taskData.notes?.trim() || null,
      state === 'archived' ? 1 : 0,
      state,
    ];
    const result = await this.dbService.executeQuery(
      `INSERT INTO tasks (title, type, customerId, frequency, startDate, notificationType, notificationTime, notificationValue, notes, isArchived, state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values
    );
    const taskId = result.changes?.lastId;
    if (!taskId) throw new Error('Failed to get inserted task ID');

    const firstStart = getFirstCycleStartDate(taskData.startDate, taskData.notificationTime || '00:00', taskData.frequency);
    const dueAt = calculateDueAt(firstStart, taskData.notificationTime || '00:00');
    const softDeadline = calculateSoftDeadline(dueAt, taskData.frequency);
    const hardDeadline = calculateHardDeadline(dueAt, taskData.frequency);
    await this.dbService.executeQuery(
      `INSERT INTO task_cycles (taskId, cycleStartDate, dueAt, softDeadline, hardDeadline, resolution)
       VALUES (?, ?, ?, ?, ?, 'open')`,
      [taskId, firstStart, dueAt, softDeadline, hardDeadline]
    );

    const task = await this.getTaskById(taskId);
    if (task && task.state === 'active' && task.notificationType === 'push') {
      this.scheduleTaskNotification(task).catch(err =>
        console.warn('TaskService: Could not schedule notification for new task', err)
      );
    }
    return taskId;
  }

  async pauseTask(id: number): Promise<void> {
    await this.dbService.executeQuery("UPDATE tasks SET state = 'paused' WHERE id = ?", [id]);
    await this.addHistoryEntry(id, 'paused');
  }

  async resumeTask(id: number): Promise<void> {
    await this.dbService.executeQuery("UPDATE tasks SET state = 'active' WHERE id = ?", [id]);
    await this.addHistoryEntry(id, 'resumed');
    const task = await this.getTaskById(id);
    if (task) await this.taskCycleService.createNextCycle(task);
  }

  async sendTaskNotification(task: Task): Promise<void> {
    try {
      // Convert customerId to the correct type for NotificationPayload
      const customerId = task.customerId !== null ? task.customerId : undefined;
      
      const payload = {
        title: task.title,
        body: task.notes || 'Task notification',
        notificationType: task.notificationType,
        taskId: task.id,
        customerId,
        receiver: task.notificationValue
      };

      await this.notificationService.sendNotification(payload);
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  async completeTask(task: Task): Promise<void> {
    const cycle = await this.taskCycleService.getCurrentCycle(task.id!);
    if (cycle && cycle.resolution === 'open') {
      await this.taskCycleService.resolveCycle(cycle.id!, 'done');
    }
  }

  async getTaskById(id: number): Promise<Task | null> {
    try {
      console.log('Getting task by ID:', id);
      const result = await this.dbService.executeQuery(
        'SELECT * FROM tasks WHERE id = ?',
        [id]
      );
      
      console.log('Database result:', result);
      
      if (!result?.values || !Array.isArray(result.values) || result.values.length === 0) {
        console.log('No task found with ID:', id);
        return null;
      }

      const taskData = result.values[0];
      console.log('Raw task data:', taskData);
      
      // Ensure we return a properly typed Task object
      const task = this.mapRowToTask(taskData);

      console.log('Returning task:', task);
      return task;
    } catch (error) {
      console.error('Error getting task by ID:', error);
      throw error;
    }
  }

  /** Returns active tasks that use push notifications (Phase 9: only state='active'). */
  async getTasksWithPushNotifications(): Promise<Task[]> {
    const result = await this.dbService.executeQuery(
      "SELECT * FROM tasks WHERE (state = 'active' OR (state IS NULL AND (isArchived = 0 OR isArchived IS NULL))) AND notificationType = ?",
      ['push']
    );
    const tasks = ((result.values || []) as any[]).map((row: any) => this.mapRowToTask(row));
    return tasks.filter(t => t.state === 'active');
  }

  /**
   * Reschedule all push notifications (e.g. after app launch or device restart). Non-blocking; logs per-task errors.
   */
  /** Reschedule push notifications for active tasks using current cycle dueAt (Phase 9). */
  async rescheduleAllPendingNotifications(): Promise<void> {
    try {
      const tasks = await this.getTasksWithPushNotifications();
      for (const task of tasks) {
        if (task.state !== 'active') continue;
        try {
          await this.scheduleTaskNotification(task);
        } catch (err) {
          console.warn('TaskService: Failed to reschedule notification for task', task.id, err);
        }
      }
    } catch (error) {
      console.error('TaskService: Error rescheduling notifications:', error);
    }
  }

  async getAllTasks(): Promise<Task[]> {
    const result = await this.dbService.executeQuery(
      "SELECT t.*, c.name as customerName FROM tasks t LEFT JOIN customers c ON t.customerId = c.id WHERE (state IS NULL OR state != 'archived') AND (isArchived = 0 OR isArchived IS NULL) ORDER BY startDate ASC",
      []
    );
    return ((result.values || []) as any[]).map((row: any) => this.mapRowToTask(row));
  }

  async updateTask(taskData: Task): Promise<void> {
    const state = taskData.state || 'active';
    const isArchived = state === 'archived' ? 1 : 0;
    await this.dbService.executeQuery(
      `UPDATE tasks SET title = ?, type = ?, customerId = ?, frequency = ?, startDate = ?, notificationType = ?, notificationTime = ?, notificationValue = ?, notes = ?, state = ?, isArchived = ? WHERE id = ?`,
      [
        taskData.title.trim(),
        taskData.type.trim(),
        taskData.customerId || null,
        taskData.frequency.trim(),
        taskData.startDate,
        taskData.notificationType.trim(),
        taskData.notificationTime.trim(),
        taskData.notificationValue?.trim() || '',
        taskData.notes?.trim() || '',
        state,
        isArchived,
        taskData.id,
      ]
    );
    const task = await this.getTaskById(taskData.id);
    if (task && task.state === 'active' && task.notificationType === 'push') {
      this.scheduleTaskNotification(task).catch(err =>
        console.warn('TaskService: Could not schedule notification for updated task', err)
      );
    }
  }

  private async scheduleTaskNotification(task: Task): Promise<void> {
    if (task.state === 'paused' || task.state === 'archived') return;
    console.log('TaskService: Starting scheduleTaskNotification for task:', task);
    try {
      let scheduledAt: Date | undefined;
      const cycle = await this.taskCycleService.getCurrentCycle(task.id!);
      if (cycle?.resolution === 'open' && cycle.dueAt) scheduledAt = new Date(cycle.dueAt);
      if (task.notificationType === 'push' && this.platform.is('capacitor')) {
        console.log('TaskService: Scheduling local push notification');
        await this.notificationService.scheduleNotification(task, false, scheduledAt);
      } else if (task.notificationType === 'push') {
        console.log('TaskService: Scheduling web push notification');
        await this.notificationService.scheduleNotification(task, false, scheduledAt);
      } else if (task.notificationType !== 'silent') {
        console.log('TaskService: Sending notification through API');
        // Send other types of notifications through the API
        const payload = {
          title: task.title,
          body: task.notes || '',
          notificationType: task.notificationType,
          taskId: task.id,
          customerId: task.customerId !== null ? task.customerId : undefined,
          receiver: task.notificationValue
        };
        await this.notificationService.sendNotification(payload);
      } else {
        console.log('TaskService: Silent notification type, no notification scheduled');
      }
    } catch (error) {
      console.error('TaskService: Error scheduling notification:', error);
      throw error;
    }
  }

  async deleteTask(id: number): Promise<number | undefined> {
    const query = "DELETE FROM tasks WHERE id = ?";
    try {
      const result = await this.dbService.executeQuery(query, [id]);
      if (result.changes?.changes) {
        await this.notificationService.cancelNotification(id);
      }
      return result.changes?.changes;
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  }

  async addHistoryEntry(taskId: number, action: string, details?: string): Promise<number | undefined> {
    const query = "INSERT INTO task_history (taskId, timestamp, action, details) VALUES (?, ?, ?, ?)";
    const timestamp = new Date().toISOString();
    const values: any[] = [taskId, timestamp, action, details];
    try {
      const result = await this.dbService.executeQuery(query, values);
      return result.changes?.lastId;
    } catch (error) {
      console.error("Error adding task history entry:", error);
      throw error;
    }
  }

  async getTaskHistory(taskId: number): Promise<TaskHistoryEntry[]> {
    const query = "SELECT * FROM task_history WHERE taskId = ? ORDER BY timestamp DESC";
    try {
      const result = await this.dbService.executeQuery(query, [taskId]);
      return result.values || [];
    } catch (error) {
      console.error("Error getting task history:", error);
      throw error;
    }
  }

  async getCustomerTasks(customerId: number): Promise<Task[]> {
    const result = await this.dbService.executeQuery(
      "SELECT t.*, c.name as customerName FROM tasks t LEFT JOIN customers c ON t.customerId = c.id WHERE t.customerId = ? AND (state IS NULL OR state != 'archived') AND (isArchived = 0 OR isArchived IS NULL)",
      [customerId]
    );
    return ((result.values || []) as any[]).map((row: any) => this.mapRowToTask(row));
  }
}

