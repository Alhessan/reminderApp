import { Customer } from './customer.model';

export type NotificationType = string; // This allows any notification type key
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'once';

/** Task definition state. isArchived is derived as (state === 'archived'). */
export type TaskState = 'active' | 'paused' | 'archived';

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
  /** active | paused | archived. Replaces isArchived (derived as state === 'archived'). */
  state: TaskState;
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

export interface CreateTaskDTO {
  title: string;
  type: string;
  customerId?: number | null;
  frequency: Frequency;
  startDate: string;
  notificationType: string;
  notificationTime: string;
  notificationValue?: string;
  notes?: string;
  state?: TaskState;
}

