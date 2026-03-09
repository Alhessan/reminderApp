import { Injectable } from '@angular/core';
import { TaskCycleService } from './task-cycle.service';
import { Task } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class SampleDataService {
  constructor(private taskCycleService: TaskCycleService) {}

  async generateSampleTasks() {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const sampleTasks: Task[] = [
      {
        id: 1,
        title: 'Overdue Payment Reminder',
        type: 'Payment',
        frequency: 'monthly',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        notificationType: 'email',
        notificationTime: '09:00',
        notes: 'This task is overdue and needs attention',
        state: 'active'
      },
      {
        id: 2,
        title: 'Due Task',
        type: 'Update',
        frequency: 'weekly',
        startDate: new Date().toISOString(),
        notificationType: 'push',
        notificationTime: '10:00',
        notificationValue: 'Update status',
        notes: 'This task is due',
        state: 'active'
      },
      {
        id: 3,
        title: 'Completed Daily Check',
        type: 'Custom',
        frequency: 'daily',
        startDate: new Date().toISOString(),
        notificationType: 'push',
        notificationTime: '08:00',
        notes: 'This task was completed and generated next cycle',
        state: 'active'
      },
      {
        id: 4,
        title: 'Upcoming Monthly Review',
        type: 'Payment',
        frequency: 'monthly',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        notificationType: 'email',
        notificationTime: '14:00',
        notes: 'This task is scheduled for the future',
        state: 'active'
      },
      {
        id: 5,
        title: 'Skipped Weekly Task',
        type: 'Update',
        frequency: 'weekly',
        startDate: new Date().toISOString(),
        notificationType: 'push',
        notificationTime: '15:00',
        notes: 'This task was skipped',
        state: 'active'
      }
    ];

    // Create tasks and their cycles
    for (const task of sampleTasks) {
      const taskId = await this.taskCycleService.createTask(task);
      const createdTask = { ...task, id: taskId };
      
      // Set different states for the cycles
      const cycle = await this.taskCycleService.getCurrentCycle(taskId);
      if (cycle) {
        switch (task.title) {
          case 'Completed Daily Check':
            await this.taskCycleService.resolveCycle(cycle.id!, 'done');
            await this.taskCycleService.createNextCycle(createdTask);
            break;
          case 'Skipped Weekly Task':
            await this.taskCycleService.resolveCycle(cycle.id!, 'skipped');
            break;
        }
      }
    }
  }
} 