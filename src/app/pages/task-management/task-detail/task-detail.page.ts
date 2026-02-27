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
import { TaskCycle, TaskListItem } from "../../../models/task-cycle.model";

@Component({
  selector: "app-task-detail",
  templateUrl: "./task-detail.page.html",
  styleUrls: ["./task-detail.page.scss"],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, DatePipe, RouterModule, TaskHistoryComponent, TaskStatisticsComponent]
})
export class TaskDetailPage implements OnInit {
  task: Task | null = null;
  currentCycle: TaskCycle | null = null;
  taskHistory: TaskHistoryEntry[] = [];
  isLoading = true;
  taskId?: number;
  actionInProgress = false;
  /** For inline progress when cycle is in_progress */
  progressValue = 0;

  constructor(
    private route: ActivatedRoute,
    private taskService: TaskService,
    private taskCycleService: TaskCycleService,
    private router: Router,
    private alertController: AlertController,
    private navController: NavController,
    private databaseService: DatabaseService
  ) { }

  setProgressQuick(percent: number): void {
    this.progressValue = Math.min(100, Math.max(0, percent));
  }

  /** Build list item for progress modal and action sheet */
  get taskListItem(): TaskListItem | null {
    if (!this.task || !this.currentCycle) return null;
    const cycle = this.currentCycle;
    const now = new Date();
    const cycleStart = new Date(cycle.cycleStartDate);
    const cycleEnd = new Date(cycle.cycleEndDate);
    const isOverdue = cycle.status === "in_progress" && now > cycleEnd;
    const canStart = cycle.status === "pending" && this.taskCycleService.canStartCycle(cycle);
    const canComplete = cycle.status === "in_progress" && this.taskCycleService.canCompleteCycle(cycle);
    let taskStatus: "Active" | "Pending" | "Completed" | "Overdue" = "Pending";
    if (cycle.status === "completed" || cycle.status === "skipped") taskStatus = "Completed";
    else if (cycle.status === "in_progress") taskStatus = isOverdue ? "Overdue" : "Active";
    return {
      task: this.task,
      currentCycle: { ...cycle, progress: (this.progressValue ?? cycle.progress) ?? 0 },
      taskStatus,
      isOverdue,
      nextDueDate: cycle.cycleEndDate,
      canStartEarly: canStart,
      canComplete,
    };
  }

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
        this.progressValue = this.currentCycle?.progress ?? 0;
        this.taskHistory = await this.taskService.getTaskHistory(id);
      } else {
        this.task = null;
        this.currentCycle = null;
        this.taskHistory = [];
        await this.presentErrorAlert("Task not found.");
        this.navController.navigateBack("/tasks");
      }
    } catch (error) {
      console.error("Error loading task details or history:", error);
      await this.presentErrorAlert("Failed to load task details. Please try again.");
      this.task = null;
      this.currentCycle = null;
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

  get canStart(): boolean {
    return !!(
      this.currentCycle &&
      this.currentCycle.status === "pending" &&
      this.taskCycleService.canStartCycle(this.currentCycle)
    );
  }

  get canMarkComplete(): boolean {
    return !!(
      this.currentCycle &&
      this.currentCycle.status === "in_progress" &&
      this.taskCycleService.canCompleteCycle(this.currentCycle)
    );
  }

  /** Can skip when there is a pending or in-progress cycle. */
  get canSkip(): boolean {
    if (!this.currentCycle?.id || !this.taskId) return false;
    const s = this.currentCycle.status;
    return s === "pending" || s === "in_progress";
  }

  async startCycle() {
    if (!this.currentCycle?.id || !this.taskId || this.actionInProgress) return;
    this.actionInProgress = true;
    try {
      await this.taskCycleService.updateTaskCycleStatus(this.currentCycle.id, "in_progress");
      await this.loadTaskDetails(this.taskId);
    } catch (e) {
      console.error("Start cycle failed", e);
      await this.presentErrorAlert("Could not start. Try again.");
    } finally {
      this.actionInProgress = false;
    }
  }

  async markComplete() {
    if (!this.currentCycle?.id || !this.taskId || this.actionInProgress) return;
    this.actionInProgress = true;
    try {
      await this.taskCycleService.updateTaskCycleStatus(this.currentCycle.id, "completed");
      await this.loadTaskDetails(this.taskId);
    } catch (e) {
      console.error("Mark complete failed", e);
      await this.presentErrorAlert("Could not mark complete. Try again.");
    } finally {
      this.actionInProgress = false;
    }
  }

  async skipCycle() {
    if (!this.currentCycle?.id || !this.taskId || this.actionInProgress) return;
    const alert = await this.alertController.create({
      header: "Skip this occurrence?",
      message: "The next occurrence will be created. You can still see this one as missed in statistics.",
      buttons: [
        { text: "Cancel", role: "cancel" },
        { text: "Skip", handler: async () => {
          this.actionInProgress = true;
          try {
            await this.taskCycleService.updateTaskCycleStatus(this.currentCycle!.id!, "skipped");
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

  async updateProgressInline() {
    if (!this.currentCycle?.id || this.actionInProgress) return;
    this.actionInProgress = true;
    try {
      await this.taskCycleService.updateTaskCycleStatus(
        this.currentCycle.id,
        "in_progress",
        this.progressValue
      );
      await this.loadTaskDetails(this.taskId!);
    } catch (e) {
      console.error("Progress update failed", e);
      await this.presentErrorAlert("Could not update progress. Try again.");
    } finally {
      this.actionInProgress = false;
    }
  }
}
