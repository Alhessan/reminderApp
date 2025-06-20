import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { AlertController, NavController, IonicModule } from "@ionic/angular"; // Added IonicModule
import { Task, TaskHistoryEntry } from "../../../models/task.model";
import { TaskService } from "../../../services/task.service";
import { DatabaseService } from "../../../services/database.service";
import { CommonModule, DatePipe } from "@angular/common"; // Added CommonModule, DatePipe
import { FormsModule } from "@angular/forms"; // Added FormsModule

@Component({
  selector: "app-task-detail",
  templateUrl: "./task-detail.page.html",
  styleUrls: ["./task-detail.page.scss"],
  standalone: true, // Mark as standalone
  imports: [IonicModule, CommonModule, FormsModule, DatePipe, RouterModule] // Import necessary modules
})
export class TaskDetailPage implements OnInit {
  task: Task | null = null;
  taskHistory: TaskHistoryEntry[] = [];
  isLoading = true;
  taskId?: number;

  constructor(
    private route: ActivatedRoute,
    private taskService: TaskService,
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
      // Fetch task details (which might include customerName from the service)
      const taskData = await this.taskService.getTaskById(id);
      if (taskData) {
        this.task = taskData;
        // Fetch task history
        this.taskHistory = await this.taskService.getTaskHistory(id);
      } else {
        this.task = null;
        this.taskHistory = [];
        await this.presentErrorAlert("Task not found.");
        this.navController.navigateBack("/tasks");
      }
    } catch (error) {
      console.error("Error loading task details or history:", error);
      await this.presentErrorAlert("Failed to load task details. Please try again.");
      this.task = null;
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
}
