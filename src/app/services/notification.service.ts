import { Injectable, Injector } from '@angular/core';
import { LocalNotifications, ScheduleOptions, ScheduleResult, PendingResult, PermissionStatus as LocalNotificationPermissionStatus, LocalNotificationDescriptor } from '@capacitor/local-notifications'; // Use alias for PermissionStatus from local-notifications, Import LocalNotificationDescriptor
import { Task, NotificationPayload } from '../models/task.model';
import { Platform } from '@ionic/angular';
import { PermissionState } from '@capacitor/core'; // Import generic PermissionState
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { from, Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AlarmService } from './alarm.service';

/** Android notification channel ID for task reminders (must exist or notifications won't show on real devices) */
const REMINDERS_CHANNEL_ID = 'reminders';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly API_URL = environment.apiUrl + '/notifications/send';
  private channelCreated = false;
  private alarmChannelCreated = false;

  constructor(
    private platform: Platform,
    private http: HttpClient,
    private injector: Injector
  ) { }

  /**
   * Create the reminders notification channel on Android (required for notifications to show on real devices).
   * Safe to call multiple times; channel is created once.
   */
  private async ensureNotificationChannel(): Promise<void> {
    if (!this.platform.is('capacitor') || this.channelCreated) return;
    try {
      await LocalNotifications.createChannel({
        id: REMINDERS_CHANNEL_ID,
        name: 'Reminders',
        description: 'Task and routine reminders',
        importance: 4, // IMPORTANCE_HIGH so they show and make sound on real devices
        vibration: true
      });
      this.channelCreated = true;
    } catch (e) {
      console.warn('NotificationService: Could not create channel (may be non-Android)', e);
    }
  }

  private async ensureAlarmChannel(): Promise<void> {
    if (!this.platform.is('capacitor') || this.alarmChannelCreated) return;
    try {
      await LocalNotifications.createChannel({
        id: 'alarm',
        name: 'Alarm Reminders',
        description: 'High-priority alarm notifications',
        importance: 5, // IMPORTANCE_HIGH = 4, IMPORTANCE_MAX = 5
        vibration: true,
        sound: 'alarm'  // references res/raw/alarm.mp3 without extension
      });
      this.alarmChannelCreated = true;
    } catch (e) {
      console.warn('NotificationService: Could not create alarm channel', e);
    }
  }

  async hasNotificationPermissions(): Promise<boolean> {
    if (this.platform.is('capacitor')) {
      const status = await LocalNotifications.checkPermissions();
      return status.display === 'granted';
    } else {
      const supported = 'Notification' in window;
      const permission = supported ? Notification.permission : 'denied';
      return supported && permission === 'granted';
    }
  }

  async requestNotificationPermissions(): Promise<boolean> {
    if (this.platform.is('capacitor')) {
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } else if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  private async showBrowserNotification(title: string, options: NotificationOptions) {
    try {
      // Try ServiceWorker notification first if available
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
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
      const notification = new Notification(title, {
        ...options,
        requireInteraction: true,
        icon: '/assets/icon/favicon.png'
      });

      // Add event handlers
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      notification.onshow = () => {
      };

      notification.onerror = (error) => {
        console.error('NotificationService: Notification error:', error);
      };

    } catch (error) {
      console.error('NotificationService: Error showing notification:', error);
      throw error;
    }
  }

  /** Thrown when scheduling on Capacitor and notification permission is not granted */
  static readonly NOTIFICATION_PERMISSION_DENIED = 'NOTIFICATION_PERMISSION_DENIED';

  /** When scheduledAt is provided (e.g. cycle.dueAt), use it instead of computing from task.startDate+notificationTime. */
  async scheduleNotification(task: Task, isTestMode: boolean = false, scheduledAt?: Date): Promise<void> {
    // Do not schedule notifications for paused tasks
    if (task.state === 'paused') {
      return;
    }

    try {

      if (this.platform.is('capacitor')) {
        const hasPermission = await this.hasNotificationPermissions();
        if (!hasPermission) {
          throw new Error(NotificationService.NOTIFICATION_PERMISSION_DENIED);
        }
      }

      // Check browser notification support and permissions first
      if (!this.platform.is('capacitor')) {
        if (!('Notification' in window)) {
          return;
        }

        // Request permission if not granted
        if (Notification.permission !== 'granted') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            return;
          }
        }
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
      } else {
        // Normal mode - use cycle dueAt when provided, else task's scheduled time
        if (scheduledAt) {
          notificationDate = new Date(scheduledAt);
          if (notificationDate < now) {
            return;
          }
        } else {
          const [hours, minutes] = task.notificationTime.split(':').map(Number);
          notificationDate = new Date(task.startDate);
          notificationDate.setHours(hours, minutes, 0, 0);
          if (notificationDate < now) {
            if (task.frequency === 'daily') {
              notificationDate = new Date(now);
              notificationDate.setHours(hours, minutes, 0, 0);
              if (notificationDate < now) notificationDate.setDate(notificationDate.getDate() + 1);
            } else {
              return;
            }
          }
        }
      }

      if (!this.platform.is('capacitor')) {
        // Handle web browser notifications
        const scheduleNextNotification = async () => {
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
            
            // Schedule next notification based on mode and frequency
            if (task.frequency === 'daily') {
              if (isTestMode && repeatInterval) {
                // In test mode, schedule next notification after the repeat interval
                const nextNotification = new Date(Date.now() + repeatInterval);
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

        // Clear any existing timeout for this task
        const existingTimeoutId = this.notificationTimeouts.get(task.id!);
        if (existingTimeoutId) {
          clearTimeout(existingTimeoutId);
          this.notificationTimeouts.delete(task.id!);
        }

        // Schedule the initial notification
        const timeoutId = setTimeout(scheduleNextNotification, timeoutMs);
        this.notificationTimeouts.set(task.id!, timeoutId);
        return;
      }

      // Handle mobile notifications using Capacitor (channel + allowWhileIdle for real devices)
      // Determine channel based on notificationType
      const channelId = task.notificationType === 'alarm' ? 'alarm' : REMINDERS_CHANNEL_ID;

      if (task.notificationType === 'alarm') {
        await this.ensureAlarmChannel();
      } else {
        await this.ensureNotificationChannel();
      }

      await LocalNotifications.schedule({
        notifications: [{
          id: task.id!,
          title: task.title,
          body: task.notificationType === 'alarm' ? (task.notes || 'Alarm!') : (task.notes || 'Task reminder'),
          channelId: channelId,
          schedule: {
            at: notificationDate,
            allowWhileIdle: true
          },
          extra: {
            taskId: task.id,
            customerId: task.customerId,
            notificationType: task.notificationType
          }
        }]
      });

      // Store alarm task for when notification fires
      if (task.notificationType === 'alarm') {
        this.injector.get(AlarmService).storeAlarmTask(task);
      }
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
        }
      }
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  async registerNotificationListeners() {
    if (!this.platform.is('capacitor')) return;

    await this.ensureNotificationChannel();

    LocalNotifications.addListener('localNotificationReceived', async (notification) => {
      const extra = notification.extra as any;
      if (extra?.notificationType === 'alarm') {
        // Get the stored alarm task
        const task = this.injector.get(AlarmService).getPendingAlarmTask();
        if (task) {
          await this.injector.get(AlarmService).onAlarmNotificationFired(task);
        }
      }
    });

    LocalNotifications.addListener('localNotificationActionPerformed', async (notificationAction) => {
      const extra = notificationAction.notification.extra as any;
      const taskId = extra?.taskId;
      const notificationType = extra?.notificationType;

      if (taskId) {
        // For alarm notifications, stop the alarm when user taps
        if (notificationType === 'alarm') {
          await this.injector.get(AlarmService).dismissAlarm(taskId);
        }
      }
    });
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    // Skip API call for local push notifications
    if (payload.notificationType === 'push') {
      return;
    }

    // API is optional (e.g. no backend on localhost). Never throw — callers must not fail.
    try {
      await this.http.post(`${environment.apiUrl}/notifications/send`, payload).toPromise();
    } catch (error) {
      console.warn('Notification API unavailable (ignored):', (error as any)?.message || error);
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

