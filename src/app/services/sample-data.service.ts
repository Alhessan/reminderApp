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
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
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
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
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
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        notificationType: 'email',
        notificationTime: '14:00',
        notes: '',
        state: 'active'
      }
    ];

    for (const task of sampleTasks) {
      const taskId = await this.taskCycleService.createTask(task);
      const createdTask = { ...task, id: taskId };

      // Clear any auto-created cycles so we can build exact sequence
      await this.taskCycleService.deleteCyclesForTask(taskId);

      // Build exact cycle sequence per task:
      // resolveCycle(auto-creates next) → createNextCycle(auto-creates another) = 2 cycles per call
      // markCycleLapsed(no auto-create) → createNextCycle = 1 cycle per call
      switch (task.title) {
        case 'Daily Check':
          // Sequence: done, done, done, lapsed, open (= 3 done + 1 lapsed + 1 open, but auto-creates)
          // resolveCycle(done) auto-creates next → after 3 done calls: 4 cycles (3 done + 1 open)
          // markCycleLapsed → no auto-create
          // createNextCycle → 1 cycle (open)
          // Total: 4 done + 1 lapsed + 2 open? No. Let me trace:
          // After 3 resolveCycle(done): 4 cycles (0,1,2,3: all done; 3 was auto-created by resolveCycle of 2)
          // After markCycleLapsed(3): 4 cycles, 3 is lapsed
          // After createNextCycle: 5 cycles (0,1,2 done; 3 lapsed; 4 open)
          // Current = 4 (open)
          // getMostRecentLapsedCycle → 3 (lapsed) ✅
          await this.taskCycleService.resolveCycle((await this.taskCycleService.getCurrentCycle(taskId))!.id!, 'done');
          await this.taskCycleService.resolveCycle((await this.taskCycleService.getCurrentCycle(taskId))!.id!, 'done');
          await this.taskCycleService.resolveCycle((await this.taskCycleService.getCurrentCycle(taskId))!.id!, 'done');
          await this.taskCycleService.markCycleLapsed((await this.taskCycleService.getCurrentCycle(taskId))!.id!);
          await this.taskCycleService.createNextCycle(createdTask);
          break;

        case 'Weekly Update':
          // Sequence: done, done, skipped, lapsed, open
          // 2 resolveCycle(done) → 3 cycles auto-created (0,1,2 done)
          // resolveCycle(skipped) → 1 cycle auto-created (3 skipped)
          // markCycleLapsed → no auto-create
          // createNextCycle → 1 open cycle
          // Total: 3 done + 1 skipped + 1 lapsed + 1 open = 6 cycles
          await this.taskCycleService.resolveCycle((await this.taskCycleService.getCurrentCycle(taskId))!.id!, 'done');
          await this.taskCycleService.resolveCycle((await this.taskCycleService.getCurrentCycle(taskId))!.id!, 'done');
          await this.taskCycleService.resolveCycle((await this.taskCycleService.getCurrentCycle(taskId))!.id!, 'skipped');
          await this.taskCycleService.markCycleLapsed((await this.taskCycleService.getCurrentCycle(taskId))!.id!);
          await this.taskCycleService.createNextCycle(createdTask);
          break;

        case 'Monthly Review':
          // Sequence: done, lapsed, open
          // 1 resolveCycle(done) → 2 cycles (0 done, 1 open auto-created)
          // markCycleLapsed → 1 lapsed, no auto-create
          // createNextCycle → 1 open
          // Total: 1 done + 1 lapsed + 2 open = 4 cycles
          await this.taskCycleService.resolveCycle((await this.taskCycleService.getCurrentCycle(taskId))!.id!, 'done');
          await this.taskCycleService.markCycleLapsed((await this.taskCycleService.getCurrentCycle(taskId))!.id!);
          await this.taskCycleService.createNextCycle(createdTask);
          break;
      }
    }
  }
}