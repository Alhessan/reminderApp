import { Task } from './task.model';

export type TaskCycleStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type TaskStatus = 'Active' | 'Pending' | 'Completed' | 'Overdue';

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
  taskStatus: TaskStatus;  // Derived status for display
  isOverdue: boolean;
  nextDueDate: string;    // ISO 8601
  daysSinceLastCompletion?: number;
  canStartEarly: boolean; // Whether the task can be started before its official start date
  canComplete: boolean;   // Whether the task can be marked as completed
} 