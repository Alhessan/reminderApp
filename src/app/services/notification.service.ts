import { Injectable } from '@angular/core';
import { LocalNotifications, ScheduleOptions, ScheduleResult, PendingResult, PermissionStatus as LocalNotificationPermissionStatus, LocalNotificationDescriptor } from '@capacitor/local-notifications'; // Use alias for PermissionStatus from local-notifications, Import LocalNotificationDescriptor
import { Task, NotificationPayload } from '../models/task.model';
import { Platform } from '@ionic/angular';
import { PermissionState } from '@capacitor/core'; // Import generic PermissionState
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { from, Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly API_URL = environment.apiUrl + '/notify';

  constructor(private platform: Platform, private http: HttpClient) { }

  async hasNotificationPermissions(): Promise<boolean> {
    if (this.platform.is('capacitor')) {
      const status = await LocalNotifications.checkPermissions();
      console.log('Capacitor notification permission status:', status);
      return status.display === 'granted';
    } else {
      const supported = 'Notification' in window;
      const permission = supported ? Notification.permission : 'denied';
      console.log('Browser notification support:', { supported, permission });
      return supported && permission === 'granted';
    }
  }

  async requestNotificationPermissions(): Promise<boolean> {
    if (this.platform.is('capacitor')) {
      const status = await LocalNotifications.requestPermissions();
      console.log('Capacitor permission request result:', status);
      return status.display === 'granted';
    } else if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log('Browser permission request result:', permission);
      return permission === 'granted';
  }
    console.log('Notifications not supported in this environment');
      return false;
  }

  private async showBrowserNotification(title: string, options: NotificationOptions) {
    console.log('NotificationService: Attempting to show browser notification');
    
    try {
      // Try ServiceWorker notification first if available
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        console.log('NotificationService: Using ServiceWorker for notification');
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          ...options,
          requireInteraction: true,
          badge: '/assets/icon/favicon.png',
          icon: '/assets/icon/favicon.png'
        });
        return;
      }

      // Fallback to regular Notification API
      console.log('NotificationService: Using regular Notification API');
      const notification = new Notification(title, {
        ...options,
        requireInteraction: true,
        icon: '/assets/icon/favicon.png'
      });

      // Add event handlers
      notification.onclick = () => {
        console.log('NotificationService: Notification clicked');
        window.focus();
        notification.close();
      };

      notification.onshow = () => {
        console.log('NotificationService: Notification shown');
      };

      notification.onerror = (error) => {
        console.error('NotificationService: Notification error:', error);
      };

    } catch (error) {
      console.error('NotificationService: Error showing notification:', error);
      throw error;
    }
  }

  async scheduleNotification(task: Task, isTestMode: boolean = false): Promise<void> {
    try {
      console.log('NotificationService: Starting notification scheduling for task:', task);

      // Check browser notification support and permissions first
      if (!this.platform.is('capacitor')) {
        if (!('Notification' in window)) {
          console.log('NotificationService: Browser does not support notifications');
          return;
        }

        // Request permission if not granted
        if (Notification.permission !== 'granted') {
          console.log('NotificationService: Requesting notification permission');
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.log('NotificationService: Notification permission denied');
            return;
          }
        }
        console.log('NotificationService: Notification permission granted');
      }

      const now = new Date();
      let notificationDate: Date;
      let repeatInterval: number | null = null;

      if (isTestMode) {
        // In test mode:
        // - First notification after 10 seconds
        // - For daily tasks, repeat every minute for testing
        notificationDate = new Date(now.getTime() + 10000); // 10 seconds
        if (task.frequency === 'daily') {
          repeatInterval = 60000; // 1 minute
        }
        console.log('NotificationService: Test Mode -', {
          firstNotification: notificationDate.toLocaleString(),
          repeating: !!repeatInterval,
          repeatInterval: repeatInterval ? 'every minute' : 'none'
        });
      } else {
        // Normal mode - use the task's scheduled time
        const [hours, minutes] = task.notificationTime.split(':').map(Number);
        notificationDate = new Date(task.startDate);
        notificationDate.setHours(hours, minutes, 0, 0);

        // If the time is in the past and it's a daily task, adjust to today/tomorrow
        if (notificationDate < now) {
          if (task.frequency === 'daily') {
            notificationDate = new Date(now);
            notificationDate.setHours(hours, minutes, 0, 0);
            if (notificationDate < now) {
              notificationDate.setDate(notificationDate.getDate() + 1);
            }
          } else {
            console.log('NotificationService: Non-daily notification time is in the past, skipping');
            return;
          }
        }
      }

      if (!this.platform.is('capacitor')) {
        // Handle web browser notifications
        const scheduleNextNotification = async () => {
          console.log('NotificationService: Creating notification now at:', new Date().toLocaleString());
          try {
            await this.showBrowserNotification(task.title, {
              body: task.notes || 'Task reminder',
              icon: '/assets/icon/favicon.png',
              tag: `task-${task.id}`,
              requireInteraction: true,
              data: {
                taskId: task.id,
                customerId: task.customerId
              }
            });
            console.log('NotificationService: Browser notification created successfully');
            
            // Schedule next notification based on mode and frequency
            if (task.frequency === 'daily') {
              if (isTestMode && repeatInterval) {
                // In test mode, schedule next notification after the repeat interval
                const nextNotification = new Date(Date.now() + repeatInterval);
                console.log('NotificationService: Test Mode - Scheduling next notification for:', nextNotification.toLocaleString());
                const timeoutId = setTimeout(scheduleNextNotification, repeatInterval);
                this.notificationTimeouts.set(task.id!, timeoutId);
              } else {
                // In normal mode, schedule for next day
                const nextNotification = new Date(notificationDate);
                nextNotification.setDate(nextNotification.getDate() + 1);
                const nextTask = { ...task, startDate: nextNotification.toISOString() };
                await this.scheduleNotification(nextTask, false);
              }
            }
          } catch (error) {
            console.error('NotificationService: Error creating browser notification:', error);
          }
        };

        // Calculate initial timeout
        const timeoutMs = notificationDate.getTime() - now.getTime();
        
        console.log('NotificationService: Scheduling notification:', {
          mode: isTestMode ? 'TEST' : 'NORMAL',
          timeoutMs,
          scheduledTime: notificationDate.toLocaleString(),
          currentTime: now.toLocaleString(),
          repeating: !!repeatInterval
        });

        // Clear any existing timeout for this task
        const existingTimeoutId = this.notificationTimeouts.get(task.id!);
        if (existingTimeoutId) {
          clearTimeout(existingTimeoutId);
          this.notificationTimeouts.delete(task.id!);
          console.log('NotificationService: Cleared existing timeout for task:', task.id);
        }

        // Schedule the initial notification
        const timeoutId = setTimeout(scheduleNextNotification, timeoutMs);
        this.notificationTimeouts.set(task.id!, timeoutId);
        return;
      }

      // Handle mobile notifications using Capacitor
      console.log('NotificationService: Scheduling Capacitor notification for:', notificationDate.toLocaleString());
      await LocalNotifications.schedule({
        notifications: [{
          id: task.id!,
          title: task.title,
          body: task.notes || 'Task reminder',
          schedule: { at: notificationDate },
          extra: {
            taskId: task.id,
            customerId: task.customerId
          }
        }]
      });

      console.log('NotificationService: Successfully scheduled notification');
    } catch (error) {
      console.error('NotificationService: Error scheduling notification:', error);
      throw error;
    }
  }

  // Add this at the class level
  private notificationTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

  async cancelNotification(taskId: number): Promise<void> {
    try {
      if (this.platform.is('capacitor')) {
        await LocalNotifications.cancel({
          notifications: [{ id: taskId }]
        });
        } else {
        // Clear any pending web notification timeout
        const timeoutId = this.notificationTimeouts.get(taskId);
        if (timeoutId) {
          clearTimeout(timeoutId);
          this.notificationTimeouts.delete(taskId);
          console.log('NotificationService: Cancelled pending web notification for task:', taskId);
        }
      }
    } catch (error) {
      console.error('NotificationService: Error canceling notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    if (!this.platform.is('capacitor')) {
      console.warn('Cannot cancel notifications: Not a capacitor platform.');
      return;
    }
    try {
      const pending: PendingResult = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        const notificationsToCancel: LocalNotificationDescriptor[] = pending.notifications.map(n => {
          // Ensure id is a number
          const idAsNumber = typeof n.id === 'string' ? parseInt(n.id, 10) : n.id;
          return { id: idAsNumber };
        }).filter(n => !isNaN(n.id)); // Filter out any that couldn't be parsed

        if (notificationsToCancel.length > 0) {
            await LocalNotifications.cancel({ notifications: notificationsToCancel });
            console.log('All valid pending notifications cancelled.');
        } else {
            console.log('No valid pending notifications to cancel after parsing IDs.');
        }
      } else {
        console.log('No pending notifications to cancel.');
      }
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  async registerNotificationListeners() {
    if (!this.platform.is('capacitor')) return;

    LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('Local notification received:', notification);
    });

    LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
      console.log('Local notification action performed:', notificationAction);
      const taskId = notificationAction.notification.extra?.taskId;
      if (taskId) {
        console.log('Navigate to task:', taskId);
      }
    });
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    // Skip API call for local push notifications
    if (payload.notificationType === 'push') {
      return;
    }

    try {
      await this.http.post(`${environment.apiUrl}/notifications/send`, payload).toPromise();
    } catch (error) {
      console.error('Error sending notification through API:', error);
      throw error;
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (!this.platform.is('capacitor')) {
      return false;
    }

    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async getEnabledNotificationTypes(): Promise<any[]> {
    const hasLocalPermission = await this.requestPermissions();
    
    const types = [
      { 
        key: 'silent',
        label: 'No Notification',
        requiresValue: false
      },
      {
        key: 'push',
        label: 'Push Notification',
        requiresValue: false,
        enabled: hasLocalPermission
      },
      {
        key: 'email',
        label: 'Email Notification',
        requiresValue: true,
        validationPattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
        enabled: true
      }
    ];

    try {
      // Get available notification types from API (SMS, WhatsApp, etc.)
      const apiTypes = await this.http.get<any[]>(`${environment.apiUrl}/notifications/types`).toPromise();
      return [...types, ...(apiTypes || [])];
    } catch (error) {
      console.error('Error fetching notification types:', error);
      return types;
    }
  }

  // Helper method to format notification body based on task details
  formatNotificationBody(task: any): string {
    let body = `Reminder: ${task.title}`;
    if (task.notes) {
      body += `\n${task.notes}`;
    }
    return body;
  }
}

