import { Task } from './task.model';

export type TaskCycleStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface TaskCycle {
  id?: number;
  taskId: number;
  task?: Task;  // For easier access when needed
  cycleStartDate: string; // ISO 8601
  cycleEndDate: string;   // ISO 8601
  status: TaskCycleStatus;
  progress: number;       // 0-100
  completedAt?: string;   // ISO 8601
}

export interface TaskProgress {
  id?: number;
  taskCycleId: number;
  progressValue: number;  // 0-100
  timestamp: string;      // ISO 8601
  notes?: string;
}

// View model for task list items
export interface TaskListItem {
  task: Task;
  currentCycle: TaskCycle;
  isOverdue: boolean;
  nextDueDate: string;    // ISO 8601
  daysSinceLastCompletion?: number;
} 