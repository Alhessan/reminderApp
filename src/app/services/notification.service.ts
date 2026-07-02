import { Injectable, Injector } from '@angular/core';
import { LocalNotifications, ScheduleOptions, ScheduleResult, PendingResult, PermissionStatus as LocalNotificationPermissionStatus, LocalNotificationDescriptor } from '@capacitor/local-notifications'; // Use alias for PermissionStatus from local-notifications, Import LocalNotificationDescriptor
import { Task, NotificationPayload, Frequency } from '../models/task.model';
import { Cycle } from '../models/task-cycle.model';
import { calculateDueAt, calculateNextCycleStart } from '../utils/cycle-timestamps.util';
import { Platform } from '@ionic/angular';
import { PermissionState } from '@capacitor/core'; // Import generic PermissionState
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { from, Observable, firstValueFrom } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AlertController } from '@ionic/angular';
import { AlarmService } from './alarm.service';

/** Android notification channel ID for task reminders (must exist or notifications won't show on real devices) */
const REMINDERS_CHANNEL_ID = 'reminders';

/** Local notification IDs = taskId * multiplier + slot (0..COUNT-1). Legacy single-id = taskId still cancelled in cancelNotification. */
export const NOTIFICATION_ID_SLOT_MULTIPLIER = 100;
export const NOTIFICATION_SLOT_COUNT = 20;

export function advanceOccurrenceCount(frequency: Frequency): number {
  switch (frequency) {
    case 'daily':
      return 7;
    case 'weekly':
      return 4;
    case 'monthly':
      return 3;
    case 'yearly':
      return 3;
    default:
      return 7;
  }
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly API_URL = environment.apiUrl + '/notifications/send';
  private channelCreated = false;
  private alarmChannelCreated = false;
  /** Web: pending timeouts keyed by notification id (taskId * multiplier + slot, or legacy taskId). */
  private notificationTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

  constructor(
    private platform: Platform,
    private http: HttpClient,
    private injector: Injector,
    private alertController: AlertController
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
                this.notificationTimeouts.set(task.id! * NOTIFICATION_ID_SLOT_MULTIPLIER, timeoutId);
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

        const slotKey = task.id! * NOTIFICATION_ID_SLOT_MULTIPLIER;
        const existingTimeoutId = this.notificationTimeouts.get(slotKey);
        if (existingTimeoutId) {
          clearTimeout(existingTimeoutId);
          this.notificationTimeouts.delete(slotKey);
        }

        const timeoutId = setTimeout(scheduleNextNotification, timeoutMs);
        this.notificationTimeouts.set(slotKey, timeoutId);
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

      // H5: Handle SCHEDULE_EXACT_ALARM denial gracefully
      try {
        await LocalNotifications.schedule({
          notifications: [{
            id: task.id! * NOTIFICATION_ID_SLOT_MULTIPLIER,
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
      } catch (error) {
        // H5: SCHEDULE_EXACT_ALARM permission denied on Android 12+
        const errorMessage = (error as Error)?.message || '';
        if (errorMessage.includes('SCHEDULE_EXACT_ALARM') || 
            errorMessage.includes('exact alarm') ||
            errorMessage.toLowerCase().includes('permission')) {
          // Show user-facing alert explaining the situation
          try {
            const alert = await this.alertController.create({
              header: 'Exact Alarms Restricted',
              message: 'Exact alarm permission was denied. Your reminders will still work but may be slightly delayed by the system. You can change this in your device settings.',
              buttons: ['OK']
            });
            await alert.present();
          } catch (alertError) {
            // Silent failure if alert cannot be shown
          }

          // Fall back to inexact scheduling
          await LocalNotifications.schedule({
            notifications: [{
              id: task.id! * NOTIFICATION_ID_SLOT_MULTIPLIER,
              title: task.title,
              body: task.notificationType === 'alarm' ? (task.notes || 'Alarm!') : (task.notes || 'Task reminder'),
              channelId: channelId,
              schedule: {
                at: notificationDate,
                allowWhileIdle: false
              },
              extra: {
                taskId: task.id,
                customerId: task.customerId,
                notificationType: task.notificationType
              }
            }]
          });
        } else {
          // Re-throw unrelated errors
          throw error;
        }
      }

      // Store alarm task for when notification fires
      if (task.notificationType === 'alarm') {
        this.injector.get(AlarmService).storeAlarmTask(task);
      }
    } catch (error) {
      console.error('NotificationService: Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Schedule the next N future occurrences (advance scheduling). Cancels all prior slots for this task first.
   */
  async scheduleUpcomingNotifications(task: Task, openCycle: Cycle, isTestMode = false): Promise<void> {
    if (task.state === 'paused') return;

    await this.cancelNotification(task.id!);

    if (isTestMode) {
      await this.scheduleNotification(task, true);
      return;
    }

    try {
      if (this.platform.is('capacitor')) {
        const hasPermission = await this.hasNotificationPermissions();
        if (!hasPermission) {
          throw new Error(NotificationService.NOTIFICATION_PERMISSION_DENIED);
        }
      }

      if (!this.platform.is('capacitor')) {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') return;
        }
      }

      const nowMs = Date.now();
      const n = advanceOccurrenceCount(task.frequency);
      let startDate = openCycle.cycleStartDate;
      let guard = 0;
      while (guard++ < 400) {
        const dueIso = calculateDueAt(startDate, task.notificationTime);
        if (new Date(dueIso).getTime() > nowMs) break;
        startDate = calculateNextCycleStart(startDate, task.frequency);
      }

      const dates: Date[] = [];
      let cursor = startDate;
      for (let i = 0; i < n; i++) {
        const dueIso = calculateDueAt(cursor, task.notificationTime);
        const d = new Date(dueIso);
        if (d.getTime() > nowMs) dates.push(d);
        cursor = calculateNextCycleStart(cursor, task.frequency);
      }

      if (dates.length === 0) return;

      if (!this.platform.is('capacitor')) {
        for (let i = 0; i < dates.length; i++) {
          const slotKey = task.id! * NOTIFICATION_ID_SLOT_MULTIPLIER + i;
          const delay = Math.max(0, dates[i].getTime() - nowMs);
          const existing = this.notificationTimeouts.get(slotKey);
          if (existing) {
            clearTimeout(existing);
            this.notificationTimeouts.delete(slotKey);
          }
          const timeoutId = setTimeout(async () => {
            try {
              await this.showBrowserNotification(task.title, {
                body: task.notes || 'Task reminder',
                icon: '/assets/icon/favicon.png',
                tag: `task-${task.id}-${i}`,
                requireInteraction: true,
                data: { taskId: task.id, customerId: task.customerId },
              });
            } catch (e) {
              console.error('NotificationService: web scheduled notification error', e);
            }
          }, delay);
          this.notificationTimeouts.set(slotKey, timeoutId);
        }
        return;
      }

      const channelId = task.notificationType === 'alarm' ? 'alarm' : REMINDERS_CHANNEL_ID;
      if (task.notificationType === 'alarm') {
        await this.ensureAlarmChannel();
      } else {
        await this.ensureNotificationChannel();
      }

      const notifications = dates.map((at, i) => ({
        id: task.id! * NOTIFICATION_ID_SLOT_MULTIPLIER + i,
        title: task.title,
        body: task.notificationType === 'alarm' ? (task.notes || 'Alarm!') : (task.notes || 'Task reminder'),
        channelId,
        schedule: { at, allowWhileIdle: true as const },
        extra: {
          taskId: task.id,
          customerId: task.customerId,
          notificationType: task.notificationType,
        },
      }));

      try {
        await LocalNotifications.schedule({ notifications });
      } catch (error) {
        const errorMessage = (error as Error)?.message || '';
        if (
          errorMessage.includes('SCHEDULE_EXACT_ALARM') ||
          errorMessage.includes('exact alarm') ||
          errorMessage.toLowerCase().includes('permission')
        ) {
          try {
            const alert = await this.alertController.create({
              header: 'Exact Alarms Restricted',
              message:
                'Exact alarm permission was denied. Your reminders will still work but may be slightly delayed by the system. You can change this in your device settings.',
              buttons: ['OK'],
            });
            await alert.present();
          } catch {
            /* ignore */
          }
          await LocalNotifications.schedule({
            notifications: notifications.map((n) => ({
              ...n,
              schedule: { ...n.schedule, allowWhileIdle: false },
            })),
          });
        } else {
          throw error;
        }
      }

      if (task.notificationType === 'alarm') {
        this.injector.get(AlarmService).storeAlarmTask(task);
      }
    } catch (error) {
      console.error('NotificationService: Error scheduling upcoming notifications:', error);
      throw error;
    }
  }

  async cancelNotification(taskId: number): Promise<void> {
    try {
      if (this.platform.is('capacitor')) {
        const notifications: { id: number }[] = [{ id: taskId }];
        for (let i = 0; i < NOTIFICATION_SLOT_COUNT; i++) {
          notifications.push({ id: taskId * NOTIFICATION_ID_SLOT_MULTIPLIER + i });
        }
        await LocalNotifications.cancel({ notifications });
      } else {
        for (let i = 0; i < NOTIFICATION_SLOT_COUNT; i++) {
          const key = taskId * NOTIFICATION_ID_SLOT_MULTIPLIER + i;
          const tid = this.notificationTimeouts.get(key);
          if (tid) {
            clearTimeout(tid);
            this.notificationTimeouts.delete(key);
          }
        }
        const legacy = this.notificationTimeouts.get(taskId);
        if (legacy) {
          clearTimeout(legacy);
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

    // C2: Disable external notification types (email, sms, whatsapp, telegram) for v1.0
    // These types require an external API that is not available yet
    const externalTypes = ['email', 'sms', 'whatsapp', 'telegram'];
    if (externalTypes.includes(payload.notificationType)) {
      return;
    }

    // API is optional (e.g. no backend on localhost). Never throw — callers must not fail.
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/notifications/send`, payload));
    } catch (error) {
      // Silent failure - external APIs are disabled for v1.0
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

    // C2: Disable external notification types from API for v1.0
    // External types (sms, whatsapp, telegram) require an API that is not available
    // Return only local types - external types are handled separately in notification-types page
    return types;
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

