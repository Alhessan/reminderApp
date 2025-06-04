import { Injectable } from "@angular/core";
import { DatabaseService } from "./database.service";
import { Task, TaskHistoryEntry } from "../models/task.model";
import { NotificationService } from "./notification.service"; // Import NotificationService
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: "root"
})
export class TaskService {

  constructor(
    private dbService: DatabaseService,
    private notificationService: NotificationService, // Inject NotificationService
    private platform: Platform
  ) { }

  async addTask(task: Task): Promise<void> {
    console.log('TaskService: Adding new task:', task);
    try {
      const query = `
        INSERT INTO tasks (
          title, type, customerId, frequency, startDate, 
          notificationTime, notificationType, notes, isCompleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
      task.title,
      task.type,
        task.customerId || null,
      task.frequency,
      task.startDate,
        task.notificationTime,
      task.notificationType,
        task.notes || '',
      task.isCompleted ? 1 : 0
    ];
      const result = await this.dbService.executeQuery(query, params);
      const taskId = result.changes?.lastId;
      
      if (taskId) {
        console.log('TaskService: Task added successfully with ID:', taskId);
        task.id = taskId;
        await this.scheduleTaskNotification(task);
      } else {
        console.error('TaskService: Failed to get task ID after insert');
      }
    } catch (error) {
      console.error('TaskService: Error adding task:', error);
      throw error;
    }
  }

  async getTaskById(id: number): Promise<Task | null> {
    const query = "SELECT t.*, c.name as customerName FROM tasks t LEFT JOIN customers c ON t.customerId = c.id WHERE t.id = ?";
    try {
      const result = await this.dbService.executeQuery(query, [id]);
      if (result.values && result.values.length > 0) {
        const task = result.values[0] as Task;
        task.isCompleted = !!task.isCompleted;
        return task;
      }
      return null;
    } catch (error) {
      console.error("Error getting task by ID:", error);
      throw error;
    }
  }

  async getAllTasks(): Promise<Task[]> {
    const query = `
      SELECT t.*, c.name as customerName 
      FROM tasks t
      LEFT JOIN customers c ON t.customerId = c.id
      ORDER BY t.startDate ASC
    `;
    try {
      const result = await this.dbService.executeQuery(query);
      return (result.values || []).map((task: any) => ({
        ...task,
        isCompleted: !!task.isCompleted
      }));
    } catch (error) {
      console.error("Error getting all tasks:", error);
      throw error;
    }
  }

  async updateTask(task: Task): Promise<void> {
    console.log('TaskService: Updating task:', task);
    try {
      // First cancel any existing notification
      if (task.id) {
        console.log('TaskService: Cancelling existing notification for task:', task.id);
        await this.notificationService.cancelNotification(task.id);
    }

      const query = `
        UPDATE tasks 
        SET title = ?, 
            type = ?, 
            customerId = ?, 
            frequency = ?, 
            startDate = ?, 
            notificationTime = ?,
            notificationType = ?,
            notes = ?, 
            isCompleted = ?
        WHERE id = ?
      `;
      const params = [
      task.title,
      task.type,
        task.customerId || null,
      task.frequency,
      task.startDate,
        task.notificationTime,
      task.notificationType,
        task.notes || '',
      task.isCompleted ? 1 : 0,
      task.id
    ];
      await this.dbService.executeQuery(query, params);
      console.log('TaskService: Task updated successfully');
      
      // Schedule new notification
      await this.scheduleTaskNotification(task);
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
        await this.notificationService.scheduleNotification(task, false);
      } else if (task.notificationType === 'push') {
        console.log('TaskService: Scheduling web push notification');
          await this.notificationService.scheduleNotification(task, true);
      } else if (task.notificationType !== 'silent') {
        console.log('TaskService: Sending notification through API');
        // Send other types of notifications through the API
        const payload = {
          title: task.title,
          body: task.notes || '',
          notificationType: task.notificationType,
          taskId: task.id,
          customerId: task.customerId,
          receiver: task.notificationValue // Email for notifications, phone for SMS, etc.
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

  async markTaskAsCompleted(taskId: number, completedDate: string): Promise<void> {
    const task = await this.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found.`);
    }
    task.isCompleted = true;
    task.lastCompletedDate = completedDate;
    await this.updateTask(task);
    await this.addHistoryEntry(taskId, "Completed", `Task completed on ${completedDate}`);
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
    const query = "SELECT t.*, c.name as customerName FROM tasks t LEFT JOIN customers c ON t.customerId = c.id WHERE t.customerId = ? ORDER BY t.startDate ASC";
    try {
      const result = await this.dbService.executeQuery(query, [customerId]);
      return (result.values || []).map((task: any) => ({
        ...task,
        isCompleted: !!task.isCompleted
      }));
    } catch (error) {
      console.error(`Error getting tasks for customer ${customerId}:`, error);
      throw error;
    }
  }
}

