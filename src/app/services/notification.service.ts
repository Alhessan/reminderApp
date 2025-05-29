import { Injectable } from '@angular/core';
import { LocalNotifications, ScheduleOptions, ScheduleResult, PendingResult, PermissionStatus as LocalNotificationPermissionStatus, LocalNotificationDescriptor } from '@capacitor/local-notifications'; // Use alias for PermissionStatus from local-notifications, Import LocalNotificationDescriptor
import { Task } from '../models/task.model';
import { Platform } from '@ionic/angular';
import { PermissionState } from '@capacitor/core'; // Import generic PermissionState

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(private platform: Platform) { }

  async hasNotificationPermissions(): Promise<boolean> {
    if (this.platform.is('capacitor')) {
      const status: LocalNotificationPermissionStatus = await LocalNotifications.checkPermissions();
      return status.display === 'granted';
    } else {
      return 'Notification' in window && Notification.permission === 'granted';
    }
  }

  async requestNotificationPermissions(): Promise<boolean> {
    if (this.platform.is('capacitor')) {
      const status: LocalNotificationPermissionStatus = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } else if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  async scheduleNotification(task: Task): Promise<number | null> {
    console.log('Starting notification scheduling process...', {
      task,
      currentTime: new Date().toLocaleString(),
      platform: this.platform.platforms()
    });

    try {
      // Ensure we have notification permissions
      let hasPermission = await this.hasNotificationPermissions();
      if (!hasPermission) {
        console.log('Requesting notification permissions...');
        hasPermission = await this.requestNotificationPermissions();
        if (!hasPermission) {
          console.warn('Notification permission not granted');
          return null;
        }
      }

      if (!task.id) {
        throw new Error('Task ID is undefined');
      }

      // Parse notification time
      const [hours, minutes] = task.notificationTime.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error('Invalid notification time format');
      }

      // Create notification date by combining start date with notification time
      const scheduleDate = new Date(task.startDate);
      scheduleDate.setHours(hours, minutes, 0, 0);

      console.log('Notification timing details:', {
        taskId: task.id,
        title: task.title,
        scheduledFor: scheduleDate.toLocaleString(),
        timeUntilNotification: Math.round((scheduleDate.getTime() - new Date().getTime()) / 1000 / 60) + ' minutes'
      });

      if (scheduleDate.getTime() <= new Date().getTime()) {
        console.warn(`Task "${task.title}" notification time is in the past`);
        return null;
      }

      const notificationId = task.id;

      if (!this.platform.is('capacitor')) {
        const timeoutMs = scheduleDate.getTime() - new Date().getTime();
        console.log(`Setting browser notification timeout for ${timeoutMs}ms from now`);
        
        setTimeout(() => {
          new Notification(`Reminder: ${task.title}`, {
            body: `Your task "${task.title}" is due now. Type: ${task.type}. Notes: ${task.notes || 'N/A'}`,
            icon: '/assets/icon/favicon.png'
          });
        }, timeoutMs);
        
        return notificationId;
      }

      const options: ScheduleOptions = {
        notifications: [{
          id: notificationId,
          title: `Reminder: ${task.title}`,
          body: `Your task "${task.title}" is due now. Type: ${task.type}. Notes: ${task.notes || 'N/A'}`,
          schedule: { at: scheduleDate },
          sound: undefined,
          attachments: undefined,
          actionTypeId: '',
          extra: { taskId: task.id },
          smallIcon: 'res://mipmap/ic_launcher',
        }]
      };

      console.log('Scheduling notification with options:', options);

      const result = await LocalNotifications.schedule(options);
      console.log('Notification scheduled successfully:', {
        taskId: task.id,
        notificationId: result.notifications[0]?.id,
        scheduledTime: scheduleDate.toLocaleString()
      });
      
      const scheduledNotif = result.notifications[0];
      return scheduledNotif?.id ? (typeof scheduledNotif.id === 'string' ? parseInt(scheduledNotif.id, 10) : scheduledNotif.id) : null;

    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async cancelNotification(taskId: number): Promise<void> {
    if (!this.platform.is('capacitor')) {
      console.warn('Cannot cancel notification: Not a capacitor platform.');
      return;
    }
    try {
      const pending: PendingResult = await LocalNotifications.getPending();
      // Plugin's pending.notifications have `id` as string | number. taskId is number.
      // The LocalNotificationDescriptor expects id to be a number for cancellation.
      const notificationToCancel = pending.notifications.find(notif => {
        // Ensure robust comparison by converting notif.id to number if it's a string
        const notifIdAsNumber = typeof notif.id === 'string' ? parseInt(notif.id, 10) : notif.id;
        return notifIdAsNumber === taskId;
      });

      if (notificationToCancel) {
        // LocalNotifications.cancel expects id to be a number.
        // Ensure notificationToCancel.id is a number before passing.
        const idToCancel = typeof notificationToCancel.id === 'string' ? parseInt(notificationToCancel.id, 10) : notificationToCancel.id;
        if (!isNaN(idToCancel)) {
            await LocalNotifications.cancel({ notifications: [{ id: idToCancel }] });
            console.log(`Notification cancelled for task ID: ${taskId} (Notification ID: ${idToCancel})`);
        } else {
            console.error(`Could not parse notification ID to number for cancellation: ${notificationToCancel.id}`);
        }
      } else {
        console.log(`No pending notification found for task ID: ${taskId}`);
      }
    } catch (error) {
      console.error('Error cancelling notification:', error);
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
}

