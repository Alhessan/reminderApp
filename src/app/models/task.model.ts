import { Customer } from './customer.model';

export type NotificationType = string; // This allows any notification type key
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'once';
export type TaskCycleStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
  id: number;
  title: string;
  type: string; // Now references TaskType name from task-type.service.ts
  customerId?: number | null; // Foreign key to Customer
  customer?: Customer; // Optional: for easier access to customer details
  customerName?: string; // Optional: for displaying customer name directly
  frequency: Frequency;
  startDate: string; // ISO 8601 date string
  notificationType: string;
  notificationTime: string; // HH:mm format for notification time
  notificationValue?: string; // Email for email notifications, phone for SMS, etc.
  notes?: string;
  isCompleted: boolean;
  lastCompletedDate?: string;
  isArchived?: boolean; // Flag for archived tasks
}

export interface TaskCycle {
  id?: number;
  taskId: number;
  cycleStartDate: string;
  cycleEndDate: string;
  status: TaskCycleStatus;
  progress: number;
  completedAt?: string;
}

export interface TaskListItem {
  task: Task;
  currentCycle: TaskCycle;
  isOverdue: boolean;
  nextDueDate: string;
  daysSinceLastCompletion?: number;
}

export interface TaskHistoryEntry {
  id?: number;
  taskId: number;
  timestamp: string; // ISO 8601 date string
  action: string; // e.g., "Created", "Completed", "Updated"
  details?: string;
}

// Add interface for notification payload
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  receiver?: string;
  notificationType: string;
  taskId?: number;
  customerId?: number;
}

