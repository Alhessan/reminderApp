import { Injectable } from '@angular/core';
import { NativeAudio } from '@capacitor-community/native-audio';
import { Task } from '../models/task.model';
import { NotificationService } from './notification.service';

const ALARM_ASSET_ID = 'alarm_sound';
const ALARM_ASSET_PATH = 'alarm.mp3';
const ALARM_DURATION_MS = 185000; // 3 min 5 sec
const SNOOZE_DURATION_MS = 600000; // 10 min

interface ActiveAlarm {
  taskId: number;
  timeoutId: ReturnType<typeof setTimeout>;
  startTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class AlarmService {
  private activeAlarm: ActiveAlarm | null = null;
  private isPreloaded = false;
  private pendingAlarmTask: Task | null = null;

  constructor(private notificationService: NotificationService) {}

  /** Preload the alarm sound once at app startup. Call from app.component.ngOnInit. */
  async preloadAlarm(): Promise<void> {
    if (this.isPreloaded) return;
    try {
      await NativeAudio.preload({
        assetId: ALARM_ASSET_ID,
        assetPath: ALARM_ASSET_PATH,
        audioChannelNum: 1,
        isUrl: false,
      });
      this.isPreloaded = true;
    } catch (e) {
      console.warn('AlarmService: Could not preload alarm sound', e);
    }
  }

  /** Store the task when scheduling an alarm notification */
  storeAlarmTask(task: Task): void {
    this.pendingAlarmTask = task;
  }

  /** Get the pending alarm task */
  getPendingAlarmTask(): Task | null {
    return this.pendingAlarmTask;
  }

  /** Clear the pending alarm task */
  clearPendingAlarmTask(): void {
    this.pendingAlarmTask = null;
  }

  /** Play the alarm for the given task. Sets auto-snooze timeout. */
  async playAlarm(task: Task): Promise<void> {
    // Preload if not already
    if (!this.isPreloaded) {
      await this.preloadAlarm();
    }

    // Stop any existing alarm first
    this.stopAlarm();

    try {
      await NativeAudio.play({ assetId: ALARM_ASSET_ID });
    } catch (e) {
      console.warn('AlarmService: Could not play alarm sound', e);
    }

    // Set auto-snooze timeout
    const timeoutId = setTimeout(async () => {
      if (this.activeAlarm?.taskId === task.id) {
        await this.snoozeAlarm(task);
      }
    }, ALARM_DURATION_MS);

    this.activeAlarm = {
      taskId: task.id!,
      timeoutId,
      startTime: Date.now(),
    };
  }

  /** Stop the currently playing alarm and clear timeout. */
  stopAlarm(): void {
    if (!this.activeAlarm) return;
    try {
      NativeAudio.stop({ assetId: ALARM_ASSET_ID });
    } catch (e) {
      // Ignore if not playing
    }
    this.clearActiveAlarm();
  }

  /** Snooze the alarm for this task: cancel current notification, reschedule in SNOOZE_DURATION_MS. */
  async snoozeAlarm(task: Task): Promise<void> {
    this.stopAlarm();
    const snoozeTime = new Date(Date.now() + SNOOZE_DURATION_MS);
    await this.notificationService.scheduleNotification(task, false, snoozeTime);
  }

  /** Dismiss alarm: stop + cancel notification. */
  async dismissAlarm(taskId: number): Promise<void> {
    this.stopAlarm();
    await this.notificationService.cancelNotification(taskId);
    if (this.pendingAlarmTask?.id === taskId) {
      this.clearPendingAlarmTask();
    }
  }

  /** Check if alarm is currently playing for the given task. */
  isPlayingFor(taskId: number): boolean {
    return this.activeAlarm?.taskId === taskId;
  }

  /** Handle alarm notification fired - play the alarm */
  async onAlarmNotificationFired(task: Task): Promise<void> {
    await this.playAlarm(task);
  }

  private clearActiveAlarm(): void {
    if (this.activeAlarm) {
      clearTimeout(this.activeAlarm.timeoutId);
      this.activeAlarm = null;
    }
  }
}
