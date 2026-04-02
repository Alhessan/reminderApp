import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { AlertController, NavController, IonicModule } from "@ionic/angular";
import { addIcons } from "ionicons";
import { stopCircleOutline, stopCircle } from "ionicons/icons";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { Task, TaskHistoryEntry } from "../../../models/task.model";
import { TaskService } from "../../../services/task.service";
import { TaskCycleService } from "../../../services/task-cycle.service";
import { DatabaseService } from "../../../services/database.service";
import { CommonModule, DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TaskHistoryComponent } from "./components/task-history.component";
import { TaskStatisticsComponent } from "./components/task-statistics.component";
import { TaskCycleTimelineComponent, TimelineCycleItem } from "./components/task-cycle-timeline.component";
import { TaskHeroMessageComponent } from "./components/task-hero-message.component";
import { CycleStatusBadgeComponent } from "../../../components/cycle-status-badge/cycle-status-badge.component";
import { SituationalMessageService } from "../../../services/situational-message.service";
import { Cycle } from "../../../models/task-cycle.model";
import { deriveDisplayState, STATUS_CONFIG, CycleDisplayStatus } from "../../../models/cycle-display.model";
import { AlarmService } from "../../../services/alarm.service";

@Component({
  selector: "app-task-detail",
  templateUrl: "./task-detail.page.html",
  styleUrls: ["./task-detail.page.scss"],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, DatePipe, RouterModule, TaskHistoryComponent, TaskStatisticsComponent, TaskCycleTimelineComponent, TaskHeroMessageComponent, CycleStatusBadgeComponent],
  providers: [DatePipe],
  animations: [
    trigger("cycleTransition", [
      state("in", style({ opacity: 1, transform: "translateX(0)" })),
      state("out", style({ opacity: 0, transform: "translateX(-24px)" })),
      transition("in => out", animate("220ms ease-out")),
      transition("out => in", [
        style({ opacity: 0, transform: "translateX(24px)" }),
        animate("220ms ease-out", style({ opacity: 1, transform: "translateX(0)" })),
      ]),
    ]),
  ],
})
export class TaskDetailPage implements OnInit {
  task: Task | null = null;
  currentCycle: Cycle | null = null;
  /** Most recent lapsed cycle for this task (for retroactive "I actually did this"). */
  mostRecentLapsedCycle: Cycle | null = null;
  taskHistory: TaskHistoryEntry[] = [];
  isLoading = true;
  taskId?: number;
  actionInProgress = false;
  /** Derived display status for current cycle (e.g. upcoming, due, overdue, completed, missed, skipped). */
  displayStatus: string = '';
  /** Drives geometric transition when cycle changes after Mark complete. */
  cycleTransitionState: "in" | "out" = "in";
  /** Timeline: resolved cycles + upcoming. Refreshed on load and every cycle action. */
  timelineCycles: TimelineCycleItem[] = [];
  timelineUpcomingCycle: Cycle | null = null;
  timelineHasMore = false;
  timelineTotalCount = 0;
  private timelineLimit = 10;
  private timelineOffset = 0;
  /** Hero message: only shown when resolvedCycles.length >= 3 (US4). */
  heroMessage = '';
  /** True while secondary sections (timeline, hero) are loading after core. */
  secondaryLoading = false;
  /** Set to true if timeline failed to load; shows inline error in template. */
  timelineError = false;
  /** Set to true if hero message failed; hero stays hidden (no visible error needed). */
  heroError = false;
  /** True after first load; used to avoid double load on open and to refresh only on re-enter. */
  private hasLoadedDetailOnce = false;

  // Inside your TaskDetailPage class

get totalCount(): number {
  return this.timelineTotalCount || 0;
}

get completedCount(): number {
  return this.timelineCycles.filter(c => c.displayStatus === 'completed').length;
}

get missedCount(): number {
  return this.timelineCycles.filter(c => c.displayStatus === 'missed').length;
}

  /** Human-readable label from STATUS_CONFIG for template. */
  get displayStatusLabel(): string {
    const config = this.displayStatus ? STATUS_CONFIG[this.displayStatus as CycleDisplayStatus] : null;
    return config?.label ?? this.displayStatus ?? '—';
  }

  constructor(
    private route: ActivatedRoute,
    private taskService: TaskService,
    private taskCycleService: TaskCycleService,
    private situationalMessageService: SituationalMessageService,
    private router: Router,
    private alertController: AlertController,
    private navController: NavController,
    private databaseService: DatabaseService,
    private datePipe: DatePipe,
    private cdr: ChangeDetectorRef,
    private alarmService: AlarmService
  ) {
    addIcons({ stopCircleOutline, stopCircle });
  }

  async ngOnInit() {
    try {
      await this.databaseService.initializeDatabase();
    } catch (e) {
      console.error("[TaskDetail] Database init failed", e);
      this.isLoading = false;
      return;
    }
    this.route.paramMap.subscribe((params) => {
      const id = params.get("id");

      if (id) {
        this.taskId = +id;
        this.loadTaskDetails(+id).catch((err) => {
          console.error("[TaskDetail] loadTaskDetails promise rejected", err);
          this.isLoading = false;
        });
      } else {
        console.warn("[TaskDetail] no id in route, navigating back");
        this.isLoading = false;
        this.presentErrorAlert("Task ID not found in URL.").then(() =>
          this.navController.navigateBack("/tasks")
        );
      }
    });
  }

  async ionViewWillEnter() {
    // Refresh only when re-entering (e.g. back from edit); first load is done in ngOnInit
    if (this.taskId && this.hasLoadedDetailOnce) {
      await this.loadTaskDetails(this.taskId);
    }
  }

  async loadTaskDetails(id: number) {
    this.isLoading = true;

    // ── Core phase (blocking) ──────────────────────────────────────────────
    // If this fails, navigate away. Core = task, cycle, status, history.
    try {
      const taskData = await this.taskService.getTaskById(id);
      if (!taskData) {
        this.task = null;
        this.currentCycle = null;
        this.mostRecentLapsedCycle = null;
        this.taskHistory = [];
        await this.presentErrorAlert("Task not found.");
        this.navController.navigateBack("/tasks");
        return;
      }
      this.task = taskData;

      this.currentCycle = await this.taskCycleService.getCurrentCycle(id);

      this.mostRecentLapsedCycle = await this.taskCycleService.getMostRecentLapsedCycle(id);

      this.displayStatus = this.task && this.currentCycle
        ? deriveDisplayState(this.currentCycle, this.task)
        : '';

      this.taskHistory = await this.taskService.getTaskHistory(id);

      this.hasLoadedDetailOnce = true;
    } catch (error) {
      console.error('[TaskDetail] loadTaskDetails failed', error);
      console.error('[TaskDetail] error stack', error instanceof Error ? error.stack : 'no stack');
      await this.presentErrorAlert("Failed to load task details. Please try again.");
      this.task = null;
      this.currentCycle = null;
      this.mostRecentLapsedCycle = null;
      this.taskHistory = [];
      this.navController.navigateBack("/tasks");
      return;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }

    // ── Secondary phase (non-blocking) ────────────────────────────────────
    // Fire-and-forget: timeline + hero each have their own try/catch.
    this.loadSecondarySections();
  }

  private async loadSecondarySections(): Promise<void> {
    if (!this.taskId) return;
    this.secondaryLoading = true;
    this.timelineError = false;
    this.heroError = false;
    this.cdr.detectChanges();

    // Timeline — independent try/catch
    try {
      await this.loadTimelineSlice();
    } catch (err) {
      console.error('[TaskDetail] timeline section failed', err);
      this.timelineError = true;
    }

    // Hero — independent try/catch (loadHeroMessage already has internal try/catch,
    // but wrap outer too for any unexpected throws)
    try {
      await this.loadHeroMessage();
    } catch (err) {
      console.error('[TaskDetail] hero section failed', err);
      this.heroError = true;
      this.heroMessage = '';
    }

    this.secondaryLoading = false;
    this.cdr.detectChanges();
  }

  retryTimeline(): void {
    this.timelineError = false;
    this.loadSecondarySections();
  }

  navigateToEditTask() {
    if (this.taskId) {
      this.router.navigate(['/tasks/edit', this.taskId]);
    }
  }

  async presentErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: "Error",
      message: message,
      buttons: ["OK"]
    });
    await alert.present();
  }

  goBack() {
    this.navController.navigateBack("/tasks");
  }

  /** Load timeline slice (resolved cycles + upcoming). Called on load and after every cycle action. */
  async loadTimelineSlice(): Promise<void> {
    if (!this.taskId) {
      console.warn('[TaskDetail] loadTimelineSlice skipped: no taskId');
      return;
    }
    this.timelineOffset = 0;
    try {
      const [resolved, totalCount] = await Promise.all([
        this.taskCycleService.getResolvedCycles(this.taskId, this.timelineLimit, 0),
        this.taskCycleService.getResolvedCyclesCount(this.taskId),
      ]);
      this.timelineHasMore = totalCount > this.timelineLimit;
      this.timelineTotalCount = totalCount;
      this.timelineCycles = resolved.map((c) => ({
        cycle: c,
        displayStatus: (c.resolution === "done" ? "completed" : c.resolution === "lapsed" ? "missed" : "skipped") as CycleDisplayStatus,
      })).reverse();
      this.timelineUpcomingCycle = this.currentCycle?.resolution === "open" ? this.currentCycle : null;
    } catch (err) {
      console.error('[TaskDetail] loadTimelineSlice failed', err);
    }
  }

  /** Load hero message only when resolvedCycles.length >= 3 (US4: hide for new tasks). */
  private async loadHeroMessage(): Promise<void> {
    if (!this.taskId) return;
    try {
      const resolved = await this.taskCycleService.getResolvedCycles(this.taskId, 3, 0);
      if (resolved.length < 3) {
        this.heroMessage = '';
        return;
      }
      const result = await this.situationalMessageService.getLevel(this.taskId);
      this.heroMessage = result.message;
    } catch (err) {
      console.error('[TaskDetail] loadHeroMessage failed', err);
      this.heroMessage = '';
    }
  }

  async onTimelineLoadMore(): Promise<void> {
    if (!this.taskId) return;
    this.timelineOffset += this.timelineLimit;
    const [resolved, totalCount] = await Promise.all([
      this.taskCycleService.getResolvedCycles(this.taskId, this.timelineLimit, this.timelineOffset),
      this.taskCycleService.getResolvedCyclesCount(this.taskId),
    ]);
    const more: TimelineCycleItem[] = resolved.map((c) => ({
      cycle: c,
      displayStatus: (c.resolution === "done" ? "completed" : c.resolution === "lapsed" ? "missed" : "skipped") as CycleDisplayStatus,
    }));
    this.timelineCycles = [...more.reverse(), ...this.timelineCycles];
    this.timelineHasMore = this.timelineCycles.length < totalCount;
    this.timelineTotalCount = totalCount;
  }

  get canSkip(): boolean {
    // Block when paused — no cycle actions while task is on hold
    return !!this.currentCycle?.id && this.currentCycle.resolution === 'open' && this.task?.state !== 'paused';
  }

  get canPause(): boolean {
    return !!this.task && this.task.state === 'active';
  }

  get canResume(): boolean {
    return !!this.task && this.task.state === 'paused';
  }

  /** Show "I actually did this" when the most recent resolved cycle is lapsed (Phase 6 US4). */
  get canShowRetroactiveComplete(): boolean {
    return !!this.mostRecentLapsedCycle?.id && !this.actionInProgress;
  }

  /** Dynamic button label with cycle date — shows which specific cycle is being corrected. */
  get retroactiveButtonLabel(): string {
    if (!this.mostRecentLapsedCycle?.dueAt) return 'I actually did this';
    const dueDate = new Date(this.mostRecentLapsedCycle.dueAt);
    const formatted = this.datePipe.transform(dueDate, 'EEE, MMM d') ?? '';
    const freq = this.task?.frequency;
    if (freq === 'daily') return `I did ${formatted}`;
    if (freq === 'weekly') return `I did ${formatted}`;
    if (freq === 'monthly') return `I did ${formatted}`;
    return `I did ${formatted}`;
  }

  /** Check if early completion is blocked by grace period (soft deadline in future). */
  get isBlockedByGracePeriod(): boolean {
    if (!this.currentCycle?.softDeadline) return false;
    return new Date(this.currentCycle.softDeadline).getTime() > Date.now();
  }

  /** Allow completion when cycle is open and due time (or soft deadline if set) has passed. */
  get canMarkComplete(): boolean {
    // Block when paused — no cycle actions while task is on hold
    if (!this.currentCycle?.id || this.currentCycle.resolution !== 'open' || this.task?.state === 'paused') return false;
    const soft = this.currentCycle.softDeadline;
    const due = new Date(this.currentCycle.dueAt).getTime();
    const now = Date.now();
    // No soft deadline (grace period = 0) — allow at or after due time
    if (soft === null || soft === undefined) return due <= now;
    // Soft deadline set — allow when due time OR soft deadline has passed (covers "Due Now" and "Overdue")
    const softMs = new Date(soft).getTime();
    return due <= now || softMs <= now;
  }

  async pauseTask() {
    if (!this.taskId || this.actionInProgress) return;
    this.actionInProgress = true;
    try {
      await this.taskService.pauseTask(this.taskId);
      await this.loadTaskDetails(this.taskId);
    } catch (e) {
      console.error("Pause failed", e);
      await this.presentErrorAlert("Could not pause. Try again.");
    } finally {
      this.actionInProgress = false;
    }
  }

  async resumeTask() {
    if (!this.taskId || this.actionInProgress) return;
    this.actionInProgress = true;
    try {
      await this.taskService.resumeTask(this.taskId);
      await this.loadTaskDetails(this.taskId);
    } catch (e) {
      console.error("Resume failed", e);
      await this.presentErrorAlert("Could not resume. Try again.");
    } finally {
      this.actionInProgress = false;
    }
  }

  async markComplete() {
    if (!this.currentCycle?.id || !this.taskId || this.actionInProgress) {
      console.warn('[TaskDetail] markComplete early return - missing data', {
        hasCycleId: !!this.currentCycle?.id,
        hasTaskId: !!this.taskId,
        actionInProgress: this.actionInProgress
      });
      return;
    }
    this.actionInProgress = true;
    try {
      await this.taskCycleService.resolveCycle(this.currentCycle.id, 'done');
      this.cycleTransitionState = "out";
      await new Promise((r) => setTimeout(r, 250));
      await this.loadTaskDetails(this.taskId!);
      this.cycleTransitionState = "in";
    } catch (e) {
      console.error("[TaskDetail] Mark complete failed", e);
      await this.presentErrorAlert("Could not mark complete. Try again.");
      this.cycleTransitionState = "in";
    } finally {
      this.actionInProgress = false;
    }
  }

  async markRetroactiveComplete() {
    if (!this.mostRecentLapsedCycle?.id || !this.taskId || this.actionInProgress) {
      console.warn('[TaskDetail] markRetroactiveComplete early return - missing data');
      return;
    }
    this.actionInProgress = true;
    try {
      await this.taskCycleService.resolveCycle(this.mostRecentLapsedCycle.id!, 'done');
      await this.loadTaskDetails(this.taskId!);
    } catch (e) {
      console.error('[TaskDetail] Retroactive complete FAILED:', e);
      await this.presentErrorAlert('Could not mark as done. Please try again.');
    } finally {
      this.actionInProgress = false;
    }
  }

  async skipCycle() {
    if (!this.currentCycle?.id || !this.taskId || this.actionInProgress) return;
    const alert = await this.alertController.create({
      header: "Skip this occurrence?",
      message: "The next occurrence will be scheduled. This one will be recorded as skipped.",
      buttons: [
        { text: "Cancel", role: "cancel" },
        { text: "Skip", handler: async () => {
          this.actionInProgress = true;
          try {
            await this.taskCycleService.resolveCycle(this.currentCycle!.id!, 'skipped');
            await this.loadTaskDetails(this.taskId!);
          } catch (e) {
            console.error("Skip failed", e);
            await this.presentErrorAlert("Could not skip. Try again.");
          } finally {
            this.actionInProgress = false;
          }
        } }
      ]
    });
    await alert.present();
  }

  async deleteTask() {
    if (!this.taskId || this.actionInProgress) return;
    const alert = await this.alertController.create({
      header: "Delete task?",
      message: "This cannot be undone.",
      buttons: [
        { text: "Cancel", role: "cancel" },
        { text: "Delete", role: "destructive", handler: async () => {
          this.actionInProgress = true;
          try {
            await this.taskService.deleteTask(this.taskId!);
            this.navController.navigateBack("/tasks");
          } catch (e) {
            console.error("Delete failed", e);
            await this.presentErrorAlert("Could not delete. Try again.");
          } finally {
            this.actionInProgress = false;
          }
        } }
      ]
    });
    await alert.present();
  }

  /** Safe date string for template (avoids date pipe throw on invalid values). */
  formatCycleDate(value: string | undefined | null, format: 'short' | 'medium'): string {
    if (value == null || value === '') return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return this.datePipe.transform(d, format) ?? '—';
  }

  /** Check if alarm is currently playing for this task. */
  get isAlarmActive(): boolean {
    return this.taskId ? this.alarmService.isPlayingFor(this.taskId) : false;
  }

  /** Stop the currently playing alarm for this task. */
  async stopAlarm() {
    if (!this.taskId) return;
    this.alarmService.stopAlarm();
    // Optionally dismiss the notification as well
    await this.alarmService.dismissAlarm(this.taskId);
    this.cdr.detectChanges(); // Force UI update
  }

}
