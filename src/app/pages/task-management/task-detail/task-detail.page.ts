import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { AlertController, NavController, IonicModule } from "@ionic/angular";
import { Task, TaskHistoryEntry } from "../../../models/task.model";
import { TaskService } from "../../../services/task.service";
import { TaskCycleService } from "../../../services/task-cycle.service";
import { DatabaseService } from "../../../services/database.service";
import { CommonModule, DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TaskHistoryComponent } from "./components/task-history.component";
import { TaskStatisticsComponent } from "./components/task-statistics.component";
import { CycleStatusBadgeComponent } from "../../../components/cycle-status-badge/cycle-status-badge.component";
import { Cycle } from "../../../models/task-cycle.model";
import { deriveDisplayState, STATUS_CONFIG, CycleDisplayStatus } from "../../../models/cycle-display.model";

@Component({
  selector: "app-task-detail",
  templateUrl: "./task-detail.page.html",
  styleUrls: ["./task-detail.page.scss"],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, DatePipe, RouterModule, TaskHistoryComponent, TaskStatisticsComponent, CycleStatusBadgeComponent]
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

  /** Human-readable label from STATUS_CONFIG for template. */
  get displayStatusLabel(): string {
    const config = this.displayStatus ? STATUS_CONFIG[this.displayStatus as CycleDisplayStatus] : null;
    return config?.label ?? this.displayStatus ?? '—';
  }

  constructor(
    private route: ActivatedRoute,
    private taskService: TaskService,
    private taskCycleService: TaskCycleService,
    private router: Router,
    private alertController: AlertController,
    private navController: NavController,
    private databaseService: DatabaseService
  ) { }

  async ngOnInit() {
    await this.databaseService.initializeDatabase();
    this.route.paramMap.subscribe(async params => {
      const id = params.get("id");
      if (id) {
        this.taskId = +id;
        await this.loadTaskDetails(+id);
      } else {
        this.isLoading = false;
        await this.presentErrorAlert("Task ID not found in URL.");
        this.navController.navigateBack("/tasks");
      }
    });
  }

  async ionViewWillEnter() {
    // Refresh data if task ID is available, in case of updates
    if (this.taskId) {
      await this.loadTaskDetails(this.taskId);
    }
  }

  async loadTaskDetails(id: number) {
    this.isLoading = true;
    try {
      const taskData = await this.taskService.getTaskById(id);
      if (taskData) {
        this.task = taskData;
        this.currentCycle = await this.taskCycleService.getCurrentCycle(id);
        this.mostRecentLapsedCycle = await this.taskCycleService.getMostRecentLapsedCycle(id);
        this.displayStatus = this.task && this.currentCycle
          ? deriveDisplayState(this.currentCycle, this.task)
          : '';
        this.taskHistory = await this.taskService.getTaskHistory(id);
      } else {
        this.task = null;
        this.currentCycle = null;
        this.mostRecentLapsedCycle = null;
        this.taskHistory = [];
        await this.presentErrorAlert("Task not found.");
        this.navController.navigateBack("/tasks");
      }
    } catch (error) {
      console.error("Error loading task details or history:", error);
      await this.presentErrorAlert("Failed to load task details. Please try again.");
      this.task = null;
      this.currentCycle = null;
      this.mostRecentLapsedCycle = null;
      this.taskHistory = [];
      this.navController.navigateBack("/tasks");
    } finally {
      this.isLoading = false;
    }
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
      await this.loadTaskDetails(this.taskId);
    } catch (e) {
      console.error("Mark complete failed", e);
      await this.presentErrorAlert("Could not mark complete. Try again.");
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

}
