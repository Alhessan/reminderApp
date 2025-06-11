import { Injectable } from "@angular/core";
import { DatabaseService } from "./database.service";
import { Task, TaskHistoryEntry } from "../models/task.model";
import { NotificationService } from "./notification.service"; // Import NotificationService
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: "root"
})
export class TaskService {

  private tasks = new BehaviorSubject<Task[]>([]);
  tasks$ = this.tasks.asObservable();

  constructor(
    private dbService: DatabaseService,
    private notificationService: NotificationService, // Inject NotificationService
    private platform: Platform
  ) {
    this.loadTasks();
  }

  private async loadTasks() {
    try {
      const result = await this.dbService.executeQuery(
        'SELECT * FROM tasks WHERE isArchived = 0 ORDER BY startDate ASC',
        []
      );
      this.tasks.next(result);
    } catch (error) {
      console.error('TaskService: Error loading tasks:', error);
      throw error;
    }
  }

  async createTask(taskData: Partial<Task>): Promise<void> {
    try {
      // Generate task with defaults and provided data
      const task: Task = {
        id: 0, // Will be replaced by DB
        title: taskData.title || '',
        type: taskData.type || 'custom',
        customerId: taskData.customerId,
        customerName: taskData.customerName,
        frequency: taskData.frequency || 'once',
        startDate: taskData.startDate || new Date().toISOString(),
        notificationTime: taskData.notificationTime || '09:00',
        notificationType: taskData.notificationType || 'push',
        notificationValue: taskData.notificationValue,
        notes: taskData.notes || '',
        isCompleted: false,
        isArchived: false
      };

      const result = await this.dbService.executeQuery(
        `INSERT INTO tasks (
          title, type, customerId, frequency, startDate,
          notificationTime, notificationType, notificationValue,
          notes, isCompleted, isArchived
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          task.title,
          task.type,
          task.customerId,
          task.frequency,
          task.startDate,
          task.notificationTime,
          task.notificationType,
          task.notificationValue,
          task.notes,
          task.isCompleted ? 1 : 0,
          task.isArchived ? 1 : 0
        ]
      );

      // Get the inserted ID and schedule notification
      task.id = result.insertId;
      await this.scheduleTaskNotification(task);
      
      // Refresh task list
      await this.loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
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

  async completeTask(task: Task, isCompleted: boolean): Promise<void> {
    const completedDate = isCompleted ? new Date().toISOString() : undefined;
    
    const updatedTask: Task = {
      ...task,
      isCompleted,
      lastCompletedDate: completedDate
    };

    await this.updateTask(updatedTask);
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
      const task: Task = {
        id: Number(taskData.id),
        title: taskData.title,
        type: taskData.type,
        customerId: taskData.customerId ? Number(taskData.customerId) : null,
        frequency: taskData.frequency,
        startDate: taskData.startDate,
        notificationTime: taskData.notificationTime,
        notificationType: taskData.notificationType,
        notificationValue: taskData.notificationValue,
        notes: taskData.notes,
        isCompleted: Boolean(taskData.isCompleted),
        lastCompletedDate: taskData.lastCompletedDate,
        isArchived: Boolean(taskData.isArchived)
      };

      console.log('Returning task:', task);
      return task;
    } catch (error) {
      console.error('Error getting task by ID:', error);
      throw error;
    }
  }

  async getAllTasks(): Promise<Task[]> {
    console.log('TaskService: Getting all tasks');
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
      LEFT JOIN task_cycles tc ON t.id = tc.taskId
      WHERE t.isArchived = 0
      ORDER BY tc.cycleStartDate DESC
    `;
    try {
      const result = await this.dbService.executeQuery(query);
      const tasks = (result.values || []).map((taskData: any) => ({
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
        isArchived: taskData.isArchived === 1
      }));
      console.log('TaskService: Retrieved tasks:', tasks);
      return tasks;
    } catch (error) {
      console.error("Error getting all tasks:", error);
      throw error;
    }
  }

  async updateTask(task: Task): Promise<void> {
    console.log('TaskService: Updating task:', task);
    
    // Ensure proper data types
    const sanitizedTask: Task = {
      ...task,
      id: Number(task.id),
      customerId: task.customerId !== undefined ? (task.customerId !== null ? Number(task.customerId) : null) : undefined,
      isCompleted: Boolean(task.isCompleted)
    };
    
    try {
      // First cancel any existing notification
      if (sanitizedTask.id) {
        console.log('TaskService: Cancelling existing notification for task:', sanitizedTask.id);
        await this.notificationService.cancelNotification(sanitizedTask.id);
      }

      await this.dbService.executeQuery(
        `UPDATE tasks SET 
          title = ?, 
          type = ?,
          customerId = ?,
          frequency = ?,
          startDate = ?,
          notificationTime = ?,
          notificationType = ?,
          notificationValue = ?,
          notes = ?,
          isCompleted = ?
        WHERE id = ?`,
        [
          sanitizedTask.title,
          sanitizedTask.type,
          sanitizedTask.customerId,
          sanitizedTask.frequency,
          sanitizedTask.startDate,
          sanitizedTask.notificationTime,
          sanitizedTask.notificationType,
          sanitizedTask.notificationValue,
          sanitizedTask.notes || '',
          sanitizedTask.isCompleted,
          sanitizedTask.id
        ]
      );
      
      // Schedule new notification
      await this.scheduleTaskNotification(sanitizedTask);
      
      // Refresh the task list after update
      await this.loadTasks();
      
      console.log('TaskService: Task updated successfully');
    } catch (error) {
      console.error('TaskService: Error updating task:', error);
      throw error;
    }
  }

  private async scheduleTaskNotification(task: Task): Promise<void> {
    console.log('TaskService: Starting scheduleTaskNotification for task:', task);
    try {
      if (task.notificationType === 'push' && this.platform.is('capacitor')) {
        console.log('TaskService: Scheduling local push notification');
        await this.notificationService.scheduleNotification(task);
      } else if (task.notificationType === 'push') {
        console.log('TaskService: Scheduling web push notification');
        await this.notificationService.scheduleNotification(task);
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
    console.log('TaskService: Getting tasks for customer:', customerId);
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
      LEFT JOIN task_cycles tc ON t.id = tc.taskId
      WHERE t.customerId = ? AND t.isArchived = 0
      ORDER BY tc.cycleStartDate DESC
    `;
    try {
      const result = await this.dbService.executeQuery(query, [customerId]);
      const tasks = (result.values || []).map((taskData: any) => ({
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
        isArchived: taskData.isArchived === 1
      }));
      console.log('TaskService: Retrieved customer tasks:', tasks);
      return tasks;
    } catch (error) {
      console.error("Error getting customer tasks:", error);
      throw error;
    }
  }
}

