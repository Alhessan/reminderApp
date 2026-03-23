import { Injectable } from '@angular/core';
import { TaskCycleService } from './task-cycle.service';
import { Task } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class SampleDataService {
  constructor(private taskCycleService: TaskCycleService) {}

  async generateSampleTasks() {
    // Delete existing sample tasks first
    await this.taskCycleService.deleteAllTasks();
    
    const sampleTasks: Task[] = [
      {
        id: 1,
        title: 'Daily Check',
        type: 'Custom',
        frequency: 'daily',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        notificationType: 'push',
        notificationTime: '08:00',
        notes: '',
        state: 'active'
      },
      {
        id: 2,
        title: 'Weekly Update',
        type: 'Update',
        frequency: 'weekly',
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
        notificationType: 'push',
        notificationTime: '10:00',
        notes: '',
        state: 'active'
      },
      {
        id: 3,
        title: 'Monthly Review',
        type: 'Payment',
        frequency: 'monthly',
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
        notificationType: 'email',
        notificationTime: '14:00',
        notes: '',
        state: 'active'
      }
    ];

    for (const task of sampleTasks) {
      const taskId = await this.taskCycleService.createTask(task);
      const createdTask = { ...task, id: taskId };
      const cycle = await this.taskCycleService.getCurrentCycle(taskId);
      if (!cycle) continue;

      // Create many cycles based on frequency
      switch (task.title) {
        case 'Daily Check':
          // Create 25 completed cycles
          for (let i = 0; i < 25; i++) {
            const current = await this.taskCycleService.getCurrentCycle(taskId);
            if (!current) break;
            // Mix of completed, missed, and skipped
            if (i % 5 === 0) {
              // Missed every 5th
            } else if (i % 7 === 0) {
              await this.taskCycleService.resolveCycle(current.id!, 'skipped');
            } else {
              await this.taskCycleService.resolveCycle(current.id!, 'done');
            }
            await this.taskCycleService.createNextCycle(createdTask);
          }
          break;
        case 'Weekly Update':
          // Create 8 weekly cycles
          for (let i = 0; i < 8; i++) {
            const current = await this.taskCycleService.getCurrentCycle(taskId);
            if (!current) break;
            if (i % 3 === 0) {
              await this.taskCycleService.resolveCycle(current.id!, 'skipped');
            } else {
              await this.taskCycleService.resolveCycle(current.id!, 'done');
            }
            await this.taskCycleService.createNextCycle(createdTask);
          }
          break;
        case 'Monthly Review':
          // Create 3 monthly cycles
          for (let i = 0; i < 3; i++) {
            const current = await this.taskCycleService.getCurrentCycle(taskId);
            if (!current) break;
            await this.taskCycleService.resolveCycle(current.id!, 'done');
            await this.taskCycleService.createNextCycle(createdTask);
          }
          break;
      }
    }
  }
} 