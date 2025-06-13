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
    console.log('Loading task types...');
    const result = await this.db.executeQuery('SELECT * FROM task_types ORDER BY name');
    console.log('Task types loaded:', result.values);
    this.taskTypes.next(result.values);
  }

  getTaskTypes(): Observable<TaskType[]> {
    console.log('Getting task types...');
    this.loadTaskTypes(); // Refresh the data
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

  async deleteTaskType(id: number): Promise<void> {
    // Only allow deletion of non-default task types
    const result = await this.db.executeQuery('SELECT isDefault FROM task_types WHERE id = ?', [id]);
    if (result.values.length > 0 && result.values[0].isDefault === 1) {
      throw new Error('Cannot delete a default task type');
    }
    
    await this.db.executeQuery('DELETE FROM task_types WHERE id = ?', [id]);
    await this.loadTaskTypes();
  }
}
