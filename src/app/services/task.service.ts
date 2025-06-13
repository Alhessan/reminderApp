import { Injectable } from "@angular/core";
import { DatabaseService } from "./database.service";
import { Task, TaskHistoryEntry, CreateTaskDTO } from "../models/task.model";
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

  async createTask(taskData: CreateTaskDTO): Promise<number> {
    try {
      // Prepare the values, handling empty strings and null values properly
      const values = [
        taskData.title?.trim() || null,
        taskData.type?.trim() || null,
        taskData.customerId || null,
        taskData.frequency?.trim() || null,
        taskData.startDate || null,
        taskData.notificationType?.trim() || null,
        taskData.notificationTime?.trim() || null,
        taskData.notificationValue?.trim() || null, // Use null instead of empty string
        taskData.notes?.trim() || null, // Use null instead of empty string
        taskData.isArchived ? 1 : 0
      ];
  
      console.log('TaskService: Creating task with values:', values);
  
      const result = await this.dbService.executeQuery(`
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
      `, values);
  
      console.log('TaskService: Insert result:', result);
  
      const taskId = result.changes?.lastId;
      if (!taskId) throw new Error('Failed to get inserted task ID');
  
      // Create initial task cycle
      const cycleEndDate = this.calculateCycleEnd(taskData.startDate, taskData.frequency);
      await this.dbService.executeQuery(`
        INSERT INTO task_cycles (
          taskId,
          cycleStartDate,
          cycleEndDate,
          status,
          progress
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        taskId,
        taskData.startDate,
        cycleEndDate,
        'pending',
        0
      ]);
  
      console.log('TaskService: Task created successfully with ID:', taskId);
      return taskId;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  private calculateCycleEnd(startDate: string, frequency: string): string {
    const start = new Date(startDate);
    let end = new Date(start);

    switch (frequency) {
      case 'daily':
        end.setDate(start.getDate() + 1);
        break;
      case 'weekly':
        end.setDate(start.getDate() + 7);
        break;
      case 'monthly':
        end.setMonth(start.getMonth() + 1);
        break;
      case 'yearly':
        end.setFullYear(start.getFullYear() + 1);
        break;
      case 'once':
        end = start; // For one-time tasks, end date is same as start date
        break;
      default:
        throw new Error(`Invalid frequency: ${frequency}`);
    }

    return end.toISOString().split('T')[0];
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

  async updateTask(taskData: Task): Promise<void> {
    console.log('TaskService: Updating task:', taskData);
    try {
      await this.dbService.executeQuery(`
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
            isArchived = ?,
            isCompleted = ?
        WHERE id = ?
      `, [
        taskData.title.trim(),
        taskData.type.trim(),
        taskData.customerId || null,
        taskData.frequency.trim(),
        taskData.startDate,
        taskData.notificationType.trim(),
        taskData.notificationTime.trim(),
        taskData.notificationValue?.trim() || '',
        taskData.notes?.trim() || '',
        taskData.isArchived ? 1 : 0,
        taskData.isCompleted ? 1 : 0,
        taskData.id
      ]);
    } catch (error) {
      console.error('Error updating task:', error);
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

