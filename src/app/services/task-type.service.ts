import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { BehaviorSubject, Observable } from 'rxjs';

export interface TaskType {
  id?: number;
  name: string;
  description: string;
  isDefault: number;
  icon: string;
  color: string;
}

@Injectable({
  providedIn: 'root'
})
export class TaskTypeService {
  private taskTypes = new BehaviorSubject<TaskType[]>([]);
  
  constructor(private db: DatabaseService) {
    this.loadTaskTypes();
  }

  private async loadTaskTypes() {
    const result = await this.db.executeQuery('SELECT * FROM task_types ORDER BY name');
    this.taskTypes.next(result.values);
  }

  getTaskTypes(): Observable<TaskType[]> {
    return this.taskTypes.asObservable();
  }

  async addTaskType(taskType: Omit<TaskType, 'id'>): Promise<number> {
    const result = await this.db.executeQuery(
      'INSERT INTO task_types (name, description, isDefault, icon, color) VALUES (?, ?, ?, ?, ?)',
      [taskType.name, taskType.description, taskType.isDefault, taskType.icon, taskType.color]
    );
    await this.loadTaskTypes();
    return result.changes.lastId;
  }

  async updateTaskType(id: number, taskType: Partial<TaskType>): Promise<void> {
    await this.db.executeQuery(
      'UPDATE task_types SET name = ?, description = ?, isDefault = ?, icon = ?, color = ? WHERE id = ?',
      [taskType.name, taskType.description, taskType.isDefault, taskType.icon, taskType.color, id]
    );
    await this.loadTaskTypes();
  }

  private async isTaskTypeInUse(taskTypeName: string): Promise<boolean> {
    const result = await this.db.executeQuery(
      'SELECT COUNT(*) as count FROM tasks WHERE type = ?',
      [taskTypeName]
    );
    return result.values[0].count > 0;
  }

  async deleteTaskType(id: number): Promise<void> {
    // Check if it's a default task type
    const typeResult = await this.db.executeQuery('SELECT name, isDefault FROM task_types WHERE id = ?', [id]);
    if (typeResult.values.length === 0) {
      throw new Error('Task type not found');
    }

    const taskType = typeResult.values[0];
    if (taskType.isDefault === 1) {
      throw new Error('Cannot delete a default task type');
    }

    // Check if the task type is in use
    if (await this.isTaskTypeInUse(taskType.name)) {
      throw new Error('Cannot delete task type that is in use');
    }
    
    await this.db.executeQuery('DELETE FROM task_types WHERE id = ?', [id]);
    await this.loadTaskTypes();
  }
}
