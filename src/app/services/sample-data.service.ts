import { Injectable } from '@angular/core';
import { TaskCycleService } from './task-cycle.service';
import { DatabaseService } from './database.service';
import { Task, Frequency } from '../models/task.model';
import {
  calculateDueAt,
  calculateSoftDeadline,
  calculateHardDeadline,
  calculateNextCycleStart,
} from '../utils/cycle-timestamps.util';

interface CycleSpec {
  resolution: 'done' | 'skipped' | 'lapsed' | 'open';
}

interface TaskSpec {
  title: string;
  type: string;
  frequency: Frequency;
  notificationTime: string;
  notificationType: string;
  startDateDaysAgo: number;
  cycles: CycleSpec[];
}

@Injectable({
  providedIn: 'root'
})
export class SampleDataService {
  constructor(
    private taskCycleService: TaskCycleService,
    private db: DatabaseService
  ) {}

  async generateSampleTasks(): Promise<void> {
    // Delete existing tasks first
    await this.taskCycleService.deleteAllTasks();

    const now = new Date();

    const taskSpecs: TaskSpec[] = [
      {
        title: 'Morning Workout',
        type: 'Health and Sports',
        frequency: 'daily',
        notificationTime: '07:00',
        notificationType: 'push',
        startDateDaysAgo: 22,
        // 17 done + 2 skipped + 2 lapsed + 1 open = 22
        cycles: [
          // done×5
          { resolution: 'done' }, { resolution: 'done' }, { resolution: 'done' },
          { resolution: 'done' }, { resolution: 'done' },
          // skipped
          { resolution: 'skipped' },
          // done×4
          { resolution: 'done' }, { resolution: 'done' }, { resolution: 'done' },
          { resolution: 'done' },
          // lapsed
          { resolution: 'lapsed' },
          // done×3
          { resolution: 'done' }, { resolution: 'done' }, { resolution: 'done' },
          // skipped
          { resolution: 'skipped' },
          // done×4
          { resolution: 'done' }, { resolution: 'done' }, { resolution: 'done' },
          { resolution: 'done' },
          // lapsed
          { resolution: 'lapsed' },
          // open (current)
          { resolution: 'open' },
        ]
      },
      {
        title: 'Meet Friends',
        type: 'Social Activity',
        frequency: 'weekly',
        notificationTime: '18:00',
        notificationType: 'push',
        startDateDaysAgo: 35,
        // 3 done + 1 skipped + 1 open = 5
        cycles: [
          { resolution: 'done' },
          { resolution: 'done' },
          { resolution: 'skipped' },
          { resolution: 'done' },
          { resolution: 'open' },
        ]
      },
      {
        title: 'Read a Book',
        type: 'Culture and Learning',
        frequency: 'monthly',
        notificationTime: '20:00',
        notificationType: 'push',
        startDateDaysAgo: 120,
        // 2 done + 1 lapsed + 1 open = 4
        cycles: [
          { resolution: 'done' },
          { resolution: 'done' },
          { resolution: 'lapsed' },
          { resolution: 'open' },
        ]
      },
    ];

    for (const spec of taskSpecs) {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - spec.startDateDaysAgo);
      const startDateIso = startDate.toISOString();

      const task: Task = {
        id: 0,
        title: spec.title,
        type: spec.type,
        frequency: spec.frequency,
        startDate: startDateIso,
        notificationType: spec.notificationType,
        notificationTime: spec.notificationTime,
        notes: '',
        state: 'active'
      };

      // Create task via service (auto-creates first cycle)
      const taskId = await this.taskCycleService.createTask(task);

      // Delete the auto-created cycle so we can insert full history
      await this.taskCycleService.deleteCyclesForTask(taskId);

      // Build cycle history
      let cycleStart = startDateIso;
      for (const cycleSpec of spec.cycles) {
        const dueAt = calculateDueAt(cycleStart, spec.notificationTime);
        const softDeadline = calculateSoftDeadline(dueAt, spec.frequency);
        const hardDeadline = calculateHardDeadline(dueAt, spec.frequency);

        let completedAt: string | null = null;
        let skippedAt: string | null = null;
        const resolution = cycleSpec.resolution;

        if (resolution === 'done') {
          // completedAt = dueAt + random(0-60) minutes
          const doneDate = new Date(dueAt);
          doneDate.setMinutes(doneDate.getMinutes() + Math.floor(Math.random() * 61));
          completedAt = doneDate.toISOString();
        } else if (resolution === 'skipped') {
          // skippedAt = dueAt + random(0-30) minutes
          const skipDate = new Date(dueAt);
          skipDate.setMinutes(skipDate.getMinutes() + Math.floor(Math.random() * 31));
          skippedAt = skipDate.toISOString();
        }
        // lapsed and open: leave completedAt and skippedAt null

        await this.db.executeQuery(
          `INSERT INTO task_cycles (taskId, cycleStartDate, dueAt, softDeadline, hardDeadline, resolution, startedAt, completedAt, skippedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            taskId,
            cycleStart,
            dueAt,
            softDeadline,
            hardDeadline,
            resolution,
            cycleStart, // startedAt = cycleStartDate
            completedAt,
            skippedAt,
          ]
        );

        // Advance to next period
        cycleStart = calculateNextCycleStart(cycleStart, spec.frequency);
      }
    }

    // Refresh the task list
    await this.taskCycleService.loadTaskList();
  }
}
