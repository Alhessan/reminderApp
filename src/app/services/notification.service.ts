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
    if (!this.platform.is('capacitor')) {
      console.warn('Local notifications not available on this platform.');
      return false;
    }
    const status: LocalNotificationPermissionStatus = await LocalNotifications.checkPermissions();
    return status.display === 'granted';
  }

  async requestNotificationPermissions(): Promise<boolean> {
    if (!this.platform.is('capacitor')) {
      console.warn('Local notifications not available on this platform.');
      return false;
    }
    const status: LocalNotificationPermissionStatus = await LocalNotifications.requestPermissions();
    return status.display === 'granted';
  }

  async scheduleNotification(task: Task): Promise<number | null> {
    if (!this.platform.is('capacitor')) {
      console.warn('Cannot schedule notification: Not a capacitor platform.');
      return null;
    }

    if (!await this.hasNotificationPermissions()) {
      const permissionGranted = await this.requestNotificationPermissions();
      if (!permissionGranted) {
        console.warn('Notification permission not granted. Cannot schedule notification.');
        return null;
      }
    }

    if (!task.id) {
      console.error('Task ID is undefined. Cannot schedule notification.');
      return null;
    }

    const scheduleDate = new Date(task.startDate);
    if (isNaN(scheduleDate.getTime())) {
      console.error('Invalid start date for task. Cannot schedule notification.');
      return null;
    }

    if (scheduleDate.getTime() <= new Date().getTime()) {
        console.warn(`Task "${task.title}" is in the past. Notification will not be scheduled.`);
        return null;
    }

    const notificationId = task.id; // Notification ID is a number

    const options: ScheduleOptions = {
      notifications: [
        {
          id: notificationId, // API expects number here
          title: `Reminder: ${task.title}`,
          body: `Your task "${task.title}" is due today. Type: ${task.type}. Notes: ${task.notes || 'N/A'}`,
          schedule: { at: scheduleDate },
          sound: undefined,
          attachments: undefined,
          actionTypeId: '',
          extra: { taskId: task.id },
          smallIcon: 'res://mipmap/ic_launcher',
        }
      ]
    };

    try {
      const result: ScheduleResult = await LocalNotifications.schedule(options);
      console.log('Notification scheduled:', result.notifications);
      const scheduledNotif = result.notifications[0];
      // The ID returned by schedule can be a string or number, ensure we return number if task.id was number
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

