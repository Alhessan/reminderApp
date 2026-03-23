import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { AlertController, NavController, IonicModule } from "@ionic/angular";
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
    private cdr: ChangeDetectorRef
  ) { }

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
      console.log("[TaskDetail] paramMap", { id, hasId: !!id });
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
    const log = (msg: string, ...args: unknown[]) => console.log('[TaskDetail]', msg, ...args);
    this.isLoading = true;

    // ── Core phase (blocking) ──────────────────────────────────────────────
    // If this fails, navigate away. Core = task, cycle, status, history.
    try {
      log('loadTaskDetails start', { id });
      const taskData = await this.taskService.getTaskById(id);
      if (!taskData) {
        log('getTaskById returned null/undefined', { id });
        this.task = null;
        this.currentCycle = null;
        this.mostRecentLapsedCycle = null;
        this.taskHistory = [];
        await this.presentErrorAlert("Task not found.");
        this.navController.navigateBack("/tasks");
        return;
      }
      log('getTaskById ok', { title: taskData.title });
      this.task = taskData;

      this.currentCycle = await this.taskCycleService.getCurrentCycle(id);
      log('getCurrentCycle ok', this.currentCycle ? { id: this.currentCycle.id, resolution: this.currentCycle.resolution } : 'null');

      this.mostRecentLapsedCycle = await this.taskCycleService.getMostRecentLapsedCycle(id);
      log('getMostRecentLapsedCycle ok', this.mostRecentLapsedCycle ? { id: this.mostRecentLapsedCycle.id } : 'null');

      this.displayStatus = this.task && this.currentCycle
        ? deriveDisplayState(this.currentCycle, this.task)
        : '';
      log('displayStatus', this.displayStatus);

      this.taskHistory = await this.taskService.getTaskHistory(id);
      log('getTaskHistory ok', { count: this.taskHistory?.length ?? 0 });

      this.hasLoadedDetailOnce = true;
      log('loadTaskDetails core complete');
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
      console.log('[TaskDetail] isLoading = false (core done)');
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
      console.log('[TaskDetail] loadTimelineSlice resolved', { count: resolved?.length ?? 0, totalCount });
      this.timelineHasMore = totalCount > this.timelineLimit;
      this.timelineTotalCount = totalCount;
      this.timelineCycles = resolved.map((c) => ({
        cycle: c,
        displayStatus: (c.resolution === "done" ? "completed" : c.resolution === "lapsed" ? "missed" : "skipped") as CycleDisplayStatus,
      }));
      this.timelineUpcomingCycle = this.currentCycle?.resolution === "open" ? this.currentCycle : null;
      console.log('[TaskDetail] loadTimelineSlice done');
    } catch (err) {
      console.error('[TaskDetail] loadTimelineSlice failed', err);
    }
  }

  /** Load hero message only when resolvedCycles.length >= 3 (US4: hide for new tasks). */
  private async loadHeroMessage(): Promise<void> {
    if (!this.taskId) return;
    try {
      const resolved = await this.taskCycleService.getResolvedCycles(this.taskId, 3, 0);
      console.log('[TaskDetail] loadHeroMessage resolved(3)', { count: resolved?.length ?? 0 });
      if (resolved.length < 3) {
        this.heroMessage = '';
        return;
      }
      const result = await this.situationalMessageService.getLevel(this.taskId);
      this.heroMessage = result.message;
      console.log('[TaskDetail] loadHeroMessage ok', { messageLength: this.heroMessage?.length ?? 0 });
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
    this.timelineCycles = [...this.timelineCycles, ...more];
    this.timelineHasMore = this.timelineCycles.length < totalCount;
    this.timelineTotalCount = totalCount;
  }

  /** One-tap complete: show when current cycle is open. */
  get canMarkComplete(): boolean {
    return !!this.currentCycle?.id && this.currentCycle.resolution === 'open';
  }

  get canSkip(): boolean {
    return !!this.currentCycle?.id && this.currentCycle.resolution === 'open';
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
    if (!this.currentCycle?.id || !this.taskId || this.actionInProgress) return;
    this.actionInProgress = true;
    try {
      await this.taskCycleService.resolveCycle(this.currentCycle.id, 'done');
      this.cycleTransitionState = "out";
      await new Promise((r) => setTimeout(r, 250));
      await this.loadTaskDetails(this.taskId);
      this.cycleTransitionState = "in";
    } catch (e) {
      console.error("Mark complete failed", e);
      await this.presentErrorAlert("Could not mark complete. Try again.");
      this.cycleTransitionState = "in";
    } finally {
      this.actionInProgress = false;
    }
  }

  async markRetroactiveComplete() {
    if (!this.mostRecentLapsedCycle?.id || !this.taskId || this.actionInProgress) return;
    this.actionInProgress = true;
    try {
      await this.taskCycleService.resolveCycle(this.mostRecentLapsedCycle.id!, 'done');
      await this.loadTaskDetails(this.taskId);
    } catch (e) {
      console.error('Retroactive complete failed', e);
      await this.presentErrorAlert('Could not mark as done. Try again.');
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

}
