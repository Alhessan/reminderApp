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

  async scheduleNotification(task: Task): Promise<void> {
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

      // Parse the notification date and time
      const [hours, minutes] = task.notificationTime.split(':').map(Number);
      const notificationDate = new Date(task.startDate);
      notificationDate.setHours(hours, minutes, 0, 0);

      console.log('NotificationService: Calculated notification time:', notificationDate.toLocaleString());
      
      // Check if the notification time is in the past
      const now = new Date();
      if (notificationDate < now) {
        console.log('NotificationService: Notification time is in the past:', {
          notificationTime: notificationDate.toLocaleString(),
          currentTime: now.toLocaleString()
        });
        return;
      }

      if (!this.platform.is('capacitor')) {
        // Handle web browser notifications
        console.log('NotificationService: Scheduling browser notification');
        const timeoutMs = notificationDate.getTime() - now.getTime();
        const timeoutMinutes = Math.floor(timeoutMs / (1000 * 60));
        const timeoutSeconds = Math.floor((timeoutMs % (1000 * 60)) / 1000);
        
        console.log('NotificationService: Scheduling notification for:', {
          timeoutMs,
          timeoutMinutes,
          timeoutSeconds,
          scheduledTime: notificationDate.toLocaleString(),
          currentTime: now.toLocaleString()
        });

        // For testing purposes, show notification after 10 seconds
        const testTimeoutMs = 10000; // 10 seconds
        console.log('NotificationService: Using test timeout of 10 seconds instead of actual time for testing');
        
        // Store the timeout ID so we can clear it if needed
        const timeoutId = setTimeout(async () => {
          console.log('NotificationService: Creating browser notification now');
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
          } catch (error) {
            console.error('NotificationService: Error creating browser notification:', error);
          }
        }, testTimeoutMs);

        // Store the timeout ID in case we need to cancel it later
        this.notificationTimeouts.set(task.id!, timeoutId);
        return;
      }

      // Handle mobile notifications using Capacitor
      console.log('NotificationService: Scheduling Capacitor notification');
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

      console.log('NotificationService: Successfully scheduled notification for:', notificationDate.toLocaleString());
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

