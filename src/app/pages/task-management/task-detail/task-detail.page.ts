import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
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
  imports: [IonicModule, CommonModule, FormsModule, DatePipe] // Import necessary modules
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
        this.presentErrorAlert("Task ID not found in URL.");
        this.navController.navigateBack("/task-list");
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
        this.presentErrorAlert("Task not found.");
        // Optionally navigate back if task is crucial for this view
        // this.navController.navigateBack("/task-list");
      }
    } catch (error) {
      console.error("Error loading task details or history:", error);
      this.presentErrorAlert("Failed to load task details. Please try again.");
      this.task = null;
      this.taskHistory = [];
    } finally {
      this.isLoading = false;
    }
  }

  navigateToEditTask() {
    if (this.taskId) {
      this.router.navigate(['/task-form', this.taskId]);
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

  goBack() { // Added goBack method as it was in the original template but removed in the failed replacement attempt
    this.navController.back();
  }
}
