import { Injectable } from '@angular/core';
import { Task } from '../models/task.model';
import { Cycle } from '../models/task-cycle.model';
import { TaskCycleService } from './task-cycle.service';
import { SituationalMessageLevel, SITUATIONAL_MESSAGES } from '../models/situational-message.model';

export interface SituationalMessageResult {
  level: SituationalMessageLevel;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class SituationalMessageService {
  constructor(private taskCycleService: TaskCycleService) {}

  async getLevel(taskId: number): Promise<SituationalMessageResult> {
    const task = await this.taskCycleService.getTask(taskId);
    if (!task) return { level: 'not_started', message: SITUATIONAL_MESSAGES.not_started };
    const resolved = await this.taskCycleService.getResolvedCycles(taskId, 10, 0);
    const lastAction = resolved.length > 0 ? (resolved[0].resolution as 'done' | 'lapsed' | 'skipped') : null;
    return this.getLevelSync(task, resolved, lastAction);
  }

  getLevelSync(
    task: Task,
    resolvedCycles: Cycle[],
    lastAction: 'done' | 'lapsed' | 'skipped' | null
  ): SituationalMessageResult {
    if (resolvedCycles.length === 0)
      return { level: 'not_started', message: SITUATIONAL_MESSAGES.not_started };

    const doneCount = resolvedCycles.filter((c) => c.resolution === 'done').length;
    const missedCount = resolvedCycles.filter((c) => c.resolution === 'lapsed').length;
    const denominator = doneCount + missedCount;
    const achievementRate = denominator > 0 ? doneCount / denominator : 0;

    if (lastAction === 'lapsed') {
      const level: SituationalMessageLevel = achievementRate >= 0.5 ? 'recovery_after_miss' : 'recent_miss';
      return { level, message: SITUATIONAL_MESSAGES[level] };
    }
    if (lastAction === 'skipped') {
      const level: SituationalMessageLevel = achievementRate >= 0.5 ? 'skipped_recent' : 'mixed';
      return { level, message: SITUATIONAL_MESSAGES[level] };
    }
    if (lastAction === 'done') {
      if (resolvedCycles.length === 1)
        return { level: 'first_completion', message: SITUATIONAL_MESSAGES.first_completion };
      if (achievementRate >= 0.8)
        return { level: 'strong_streak', message: SITUATIONAL_MESSAGES.strong_streak };
      if (achievementRate >= 0.5)
        return { level: 'good_progress', message: SITUATIONAL_MESSAGES.good_progress };
      if (achievementRate >= 0.3)
        return { level: 'steady', message: SITUATIONAL_MESSAGES.steady };
      return { level: 'low_achievement', message: SITUATIONAL_MESSAGES.low_achievement };
    }
    return { level: 'not_started', message: SITUATIONAL_MESSAGES.not_started };
  }
}
