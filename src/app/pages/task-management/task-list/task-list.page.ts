import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonItemSliding, NavController, SegmentChangeEventDetail, ActionSheetController, IonicModule, ActionSheetButton, ToastController } from '@ionic/angular'; // Added IonicModule, ToastController
import { Task } from '../../../models/task.model';
import { TaskService } from '../../../services/task.service';
import { DatabaseService } from '../../../services/database.service';
import { CustomerService } from '../../../services/customer.service';
import { Customer } from '../../../models/customer.model';
import { CommonModule, DatePipe } from '@angular/common'; // Added CommonModule, DatePipe
import { FormsModule } from '@angular/forms'; // Added FormsModule
import { TaskListItemComponent } from './components/task-list-item.component';
import { TaskCycleService } from '../../../services/task-cycle.service';
import { TaskCycle, TaskCycleStatus, TaskListItem } from '../../../models/task-cycle.model';
import { BehaviorSubject, Subscription } from 'rxjs';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.page.html',
  styleUrls: [ './task-list.page.scss' ],
  standalone: true, // Mark as standalone
  imports: [IonicModule, CommonModule, FormsModule, DatePipe, TaskListItemComponent] // Import necessary modules
})
export class TaskListPage implements OnInit {
  allTasks: Task[] = [];
  filteredTasks: TaskListItem[] = [];
  customers: Customer[] = [];
  isLoading = true;
  filterSegment: string = 'all'; // Explicitly type as string
  currentSortBy = 'startDate'; // Default sort
  currentSortOrder = 'asc'; // Default order
  customerIdFilter?: number;
  customerNameFilter?: string;
  private taskListSubscription?: Subscription;

  constructor(
    private taskService: TaskService,
    private customerService: CustomerService, // Added CustomerService
    private router: Router,
    private route: ActivatedRoute, // Added ActivatedRoute
    private alertController: AlertController,
    private navController: NavController,
    private databaseService: DatabaseService,
    private actionSheetCtrl: ActionSheetController,
    private taskCycleService: TaskCycleService,
    private toastController: ToastController
  ) { }

  async ngOnInit() {
    await this.databaseService.initializeDatabase();
    await this.loadCustomers(); // Load customers for filtering and display
    this.route.paramMap.subscribe(async params => {
      const id = params.get('customerId');
      if (id) {
        this.customerIdFilter = +id;
        const customer = await this.customerService.getCustomerById(this.customerIdFilter);
        this.customerNameFilter = customer?.name;
      }
      await this.loadTasks();
    });

    // Subscribe to task list updates
    this.taskListSubscription = this.taskCycleService.taskList$.subscribe(
      tasks => {
        console.log('Received tasks in subscription:', tasks);
        this.filteredTasks = tasks;
        this.isLoading = false;
      },
      error => {
        console.error('Error in task list subscription:', error);
        this.isLoading = false;
      }
    );
  }

  ngOnDestroy() {
    if (this.taskListSubscription) {
      this.taskListSubscription.unsubscribe();
    }
  }

  async ionViewWillEnter() {
    // Check for customerIdFilter again in case of navigation changes
    this.route.paramMap.subscribe(async params => {
      const id = params.get('customerId');
      if (id) {
        this.customerIdFilter = +id;
        const customer = await this.customerService.getCustomerById(this.customerIdFilter);
        this.customerNameFilter = customer?.name;
      } else {
        this.customerIdFilter = undefined;
        this.customerNameFilter = undefined;
      }
      await this.loadTasks();
    });
  }

  async loadCustomers() {
    try {
      this.customers = await this.customerService.getAllCustomers();
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  }

  async loadTasks() {
    this.isLoading = true;
    console.log('Loading tasks with filter:', this.filterSegment);
    try {
      await this.taskCycleService.loadTaskList(this.filterSegment as 'all' | 'overdue' | 'in_progress' | 'upcoming');
      console.log('Task list loaded successfully');
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.presentErrorAlert('Failed to load tasks. Please try again.');
    }
  }

  async segmentChanged(event: any) {
    this.filterSegment = event.detail.value;
    // Map segment values to view values
    let view: 'all' | 'overdue' | 'in_progress' | 'upcoming';
    switch (this.filterSegment) {
      case 'pending':
        view = 'upcoming';
        break;
      case 'in_progress':
        view = 'in_progress';
        break;
      default:
        view = 'all';
    }
    await this.taskCycleService.loadTaskList(view);
  }

  async presentSortOptions() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Sort Tasks By',
      buttons: [
        {
          text: 'Due Date (Asc)', handler: () => { this.setSort('startDate', 'asc'); }
        },
        {
          text: 'Due Date (Desc)', handler: () => { this.setSort('startDate', 'desc'); }
        },
        {
          text: 'Title (A-Z)', handler: () => { this.setSort('title', 'asc'); }
        },
        {
          text: 'Title (Z-A)', handler: () => { this.setSort('title', 'desc'); }
        },
        {
          text: 'Type (A-Z)', handler: () => { this.setSort('type', 'asc'); }
        },
        {
          text: 'Type (Z-A)', handler: () => { this.setSort('type', 'desc'); }
        },
        {
          text: 'Customer (A-Z)', handler: () => { this.setSort('customerName', 'asc'); },
          disabled: !!this.customerIdFilter // Disable if already filtered by a customer
        },
        {
          text: 'Customer (Z-A)', handler: () => { this.setSort('customerName', 'desc'); },
          disabled: !!this.customerIdFilter
        },
        {
          text: 'Cancel', role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  setSort(sortBy: string, sortOrder: string) {
    this.currentSortBy = sortBy;
    this.currentSortOrder = sortOrder;
    this.loadTasks();
  }

  navigateAddTask() {
    this.router.navigate(['/task-form']);
  }

  navigateToEditTask(taskId: number) {
    this.router.navigate(['/task-form', taskId]);
  }

  navigateToTaskDetail(taskId: number) {
    this.router.navigate(['/task-detail', taskId]);
  }

  async toggleCompletion(task: Task, event: any) {
    const isChecked = event.detail.checked;
    task.isCompleted = isChecked;
    task.lastCompletedDate = isChecked ? new Date().toISOString() : undefined;

    try {
      await this.taskService.updateTask(task);
      if (isChecked) {
        await this.taskService.addHistoryEntry(task.id!, 'Completed', `Task "${task.title}" marked as completed.`);
      } else {
        await this.taskService.addHistoryEntry(task.id!, 'Marked Pending', `Task "${task.title}" marked as pending.`);
      }
      this.loadTasks(); 
    } catch (error) {
      console.error('Error updating task completion status:', error);
      task.isCompleted = !isChecked;
      task.lastCompletedDate = !isChecked ? task.lastCompletedDate : undefined; 
      this.presentErrorAlert('Failed to update task status.');
    }
  }

  async deleteTask(taskId: number) {
    const alert = await this.alertController.create({
      header: 'Delete Task',
      message: `Are you sure you want to delete this task?<br><br>This action cannot be undone and will delete:<br>• The task and all its settings<br>• All cycles and progress history<br>• All associated notifications`,
      cssClass: 'delete-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Delete',
          cssClass: 'danger',
          handler: async () => {
            try {
              await this.taskService.deleteTask(taskId);
              await this.loadTasks();
              const toast = await this.toastController.create({
                message: 'Task deleted successfully',
                duration: 2000,
                color: 'success',
                position: 'bottom'
              });
              await toast.present();
            } catch (error) {
              console.error('Error deleting task:', error);
              this.presentErrorAlert('Failed to delete task. Please try again.');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async presentErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  trackTaskById(index: number, taskItem: TaskListItem): number {
    return taskItem.task.id!;
  }

  clearCustomerFilter() {
    this.customerIdFilter = undefined;
    this.customerNameFilter = undefined;
    this.loadTasks(); // Reload all tasks
  }

  async openStatusActionSheet(taskItem: TaskListItem) {
    const buttons = [];
    const currentStatus = taskItem.currentCycle.status;

    // Start option - Only show if:
    // 1. Status is pending AND
    // 2. Either it's within the start date or canStartEarly is true
    if (currentStatus === 'pending' && taskItem.canStartEarly) {
      buttons.push({
        text: 'Start',
        icon: 'play-outline',
        data: 'in_progress',
        handler: () => this.updateTaskStatus(taskItem, 'in_progress')
      });
    }

    // Complete option - Only show if:
    // 1. Status is in_progress AND
    // 2. canComplete is true
    if (currentStatus === 'in_progress' && taskItem.canComplete) {
      buttons.push({
        text: 'Complete',
        icon: 'checkmark-outline',
        data: 'completed',
        handler: () => this.updateTaskStatus(taskItem, 'completed')
      });
    }

    // Skip option - Only show for pending or in_progress tasks
    if (currentStatus === 'pending' || currentStatus === 'in_progress') {
      buttons.push({
        text: 'Skip',
        icon: 'forward-outline',
        data: 'skipped',
        handler: () => this.updateTaskStatus(taskItem, 'skipped')
      });
    }

    // Reset option - Only show for in_progress or skipped tasks
    if (currentStatus === 'in_progress' || currentStatus === 'skipped') {
      buttons.push({
        text: 'Reset',
        icon: 'refresh-outline',
        data: 'pending',
        handler: () => this.updateTaskStatus(taskItem, 'pending')
      });
    }

    // Always add the cancel button
    buttons.push({
      text: 'Cancel',
      icon: 'close-outline',
      role: 'cancel'
    });

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Update Status',
      cssClass: 'task-action-sheet',
      buttons
    });

    await actionSheet.present();
  }

  async updateTaskStatus(taskItem: TaskListItem, status: TaskCycleStatus) {
    try {
      let cycleId: number;

      if (!taskItem.currentCycle?.id) {
        // Create a new cycle if none exists
        cycleId = await this.taskCycleService.createNextCycle(taskItem.task);
      } else {
        cycleId = taskItem.currentCycle.id;
      }

      await this.taskCycleService.updateTaskCycleStatus(cycleId, status);
      
      if (status === 'completed') {
        await this.taskCycleService.createNextCycle(taskItem.task);
      }
      
      await this.loadTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      this.presentErrorAlert('Failed to update task status. Please try again.');
    }
  }

  async updateProgress(taskItem: TaskListItem) {
    const alert = await this.alertController.create({
      header: 'Update Progress',
      inputs: [
        {
          name: 'progress',
          type: 'number',
          min: 0,
          max: 100,
          placeholder: 'Enter progress (0-100)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Update',
          handler: async (data) => {
            const progress = Number(data.progress);
            if (progress >= 0 && progress <= 100) {
              try {
                let cycleId: number;

                if (!taskItem.currentCycle?.id) {
                  // Create a new cycle if none exists
                  cycleId = await this.taskCycleService.createNextCycle(taskItem.task);
                } else {
                  cycleId = taskItem.currentCycle.id;
                }

                await this.taskCycleService.updateTaskCycleStatus(cycleId, 'in_progress', progress);
                await this.loadTasks();
              } catch (error) {
                console.error('Error updating task progress:', error);
                this.presentErrorAlert('Failed to update task progress. Please try again.');
              }
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async openTaskMenu(taskItem: TaskListItem) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Task Options',
      buttons: [
        {
          text: 'Edit',
          icon: 'create-outline',
          handler: () => {
            this.navigateToEditTask(taskItem.task.id);
          }
        },
        {
          text: 'Archive',
          icon: 'archive-outline',
          handler: () => {
            this.archiveTask(taskItem);
          }
        },
        {
          text: 'Delete',
          icon: 'trash-outline',
          cssClass: 'danger',
          handler: () => {
            this.deleteTask(taskItem.task.id!);
          }
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async archiveTask(taskItem: TaskListItem) {
    const alert = await this.alertController.create({
      header: 'Archive Task',
      message: 'Are you sure you want to archive this task?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Archive',
          handler: async () => {
            try {
              await this.taskCycleService.archiveTask(taskItem.task.id!);
              await this.loadTasks();
            } catch (error) {
              console.error('Error archiving task:', error);
              this.presentErrorAlert('Failed to archive task. Please try again.');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  navigateToArchive() {
    this.router.navigate(['/tasks/archive']);
  }

  async reinitializeDatabase() {
    const alert = await this.alertController.create({
      header: 'Reset Database',
      message: 'This will delete all existing data and create new sample data. Are you sure?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reset',
          handler: async () => {
            try {
              this.isLoading = true;
              await this.databaseService.reinitializeDatabase();
              await this.loadTasks();
            } catch (error) {
              console.error('Error reinitializing database:', error);
              this.presentErrorAlert('Failed to reset database. Please try again.');
            } finally {
              this.isLoading = false;
            }
          }
        }
      ]
    });
    await alert.present();
  }
}

