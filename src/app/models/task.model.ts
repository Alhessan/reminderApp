import { Customer } from './customer.model';

export type TaskType = 'Payment' | 'Update' | 'Custom';
export type NotificationType = 'push/local' | 'silent reminder';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Task {
  id?: number;
  title: string;
  type: TaskType;
  customerId?: number; // Foreign key to Customer
  customer?: Customer; // Optional: for easier access to customer details
  frequency: Frequency;
  startDate: string; // ISO 8601 date string
  notificationType: NotificationType;
  notes?: string;
  isCompleted?: boolean;
  lastCompletedDate?: string; // ISO 8601 date string
}

export interface TaskHistoryEntry {
  id?: number;
  taskId: number;
  timestamp: string; // ISO 8601 date string
  action: string; // e.g., "Created", "Completed", "Updated"
  details?: string;
}

