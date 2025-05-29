import { Injectable } from "@angular/core";
import { DatabaseService } from "./database.service";
import { Task, TaskHistoryEntry } from "../models/task.model";
import { NotificationService } from "./notification.service"; // Import NotificationService

@Injectable({
  providedIn: "root"
})
export class TaskService {

  constructor(
    private dbService: DatabaseService,
    private notificationService: NotificationService // Inject NotificationService
  ) { }

  async addTask(task: Task): Promise<number | undefined> {
    const query = "INSERT INTO tasks (title, type, customerId, frequency, startDate, notificationTime, notificationType, notes, isCompleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const values: any[] = [
      task.title,
      task.type,
      task.customerId,
      task.frequency,
      task.startDate,
      task.notificationTime,
      task.notificationType,
      task.notes,
      task.isCompleted ? 1 : 0
    ];
    try {
      const result = await this.dbService.executeQuery(query, values);
      const taskId = result.changes?.lastId;
      if (taskId) {
        await this.addHistoryEntry(taskId, "Created", `Task "${task.title}" created.`);
        const newTask = await this.getTaskById(taskId); // Fetch the full task to pass to notification service
        if (newTask && newTask.notificationType === "push/local") {
          await this.notificationService.scheduleNotification(newTask);
        }
      }
      return taskId;
    } catch (error) {
      console.error("Error adding task:", error);
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

  async updateTask(task: Task): Promise<number | undefined> {
    if (!task.id) {
      throw new Error("Task ID is required for update");
    }
    const query = "UPDATE tasks SET title = ?, type = ?, customerId = ?, frequency = ?, startDate = ?, notificationTime = ?, notificationType = ?, notes = ?, isCompleted = ?, lastCompletedDate = ? WHERE id = ?";
    const values: any[] = [
      task.title,
      task.type,
      task.customerId,
      task.frequency,
      task.startDate,
      task.notificationTime,
      task.notificationType,
      task.notes,
      task.isCompleted ? 1 : 0,
      task.lastCompletedDate,
      task.id
    ];
    try {
      const result = await this.dbService.executeQuery(query, values);
      if (result.changes?.changes) {
        await this.addHistoryEntry(task.id, "Updated", `Task "${task.title}" updated.`);
        // Cancel previous notification and schedule new one if applicable
        await this.notificationService.cancelNotification(task.id);
        if (!task.isCompleted && task.notificationType === "push/local") {
          await this.notificationService.scheduleNotification(task);
        }
      }
      return result.changes?.changes;
    } catch (error) {
      console.error("Error updating task:", error);
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

  async markTaskAsCompleted(taskId: number, completedDate: string): Promise<number | undefined> {
    const task = await this.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found.`);
    }
    task.isCompleted = true;
    task.lastCompletedDate = completedDate;
    const result = await this.updateTask(task); // updateTask will handle history and notification cancellation
    // No need to add history entry here as updateTask does it.
    // updateTask also cancels notification if task is completed.
    return result;
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

