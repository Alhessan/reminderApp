import { Customer } from './customer.model';

export type NotificationType = 'push/local' | 'silent reminder';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Task {
  id?: number;
  title: string;
  type: string; // Now references TaskType name from task-type.service.ts
  customerId?: number; // Foreign key to Customer
  customer?: Customer; // Optional: for easier access to customer details
  frequency: Frequency;
  startDate: string; // ISO 8601 date string
  notificationType: NotificationType;
  notificationTime: string; // HH:mm format for notification time
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

