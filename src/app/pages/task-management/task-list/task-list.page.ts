import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonItemSliding, NavController, SegmentChangeEventDetail, ActionSheetController, IonicModule, ActionSheetButton } from '@ionic/angular'; // Added IonicModule
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
    private taskCycleService: TaskCycleService
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

  segmentChanged(event: CustomEvent<SegmentChangeEventDetail>) {
    this.filterSegment = event.detail.value as string || 'all'; // Cast to string
    this.loadTasks();
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

  navigateToEditTask(taskId: number, slidingItem?: IonItemSliding) {
    if (slidingItem) {
      slidingItem.close();
    }
    this.router.navigate(['/task-form', taskId]);
  }

  navigateToTaskDetail(taskId: number, slidingItem?: IonItemSliding) {
    if (slidingItem) {
      slidingItem.close();
    }
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

  async presentDeleteConfirm(taskId: number, taskTitle: string, slidingItem?: IonItemSliding) {
    if (slidingItem) {
      slidingItem.close();
    }
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete task "${taskTitle}"? This will also delete its history.`, 
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          handler: async () => {
            await this.deleteTask(taskId);
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteTask(taskId: number) {
    try {
      await this.taskService.deleteTask(taskId);
      this.allTasks = this.allTasks.filter(t => t.id !== taskId);
      this.loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      this.presentErrorAlert('Failed to delete task. Please try again.');
    }
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
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Update Status',
      cssClass: 'task-action-sheet',
      buttons: [
        {
          text: 'Start',
          icon: 'play-outline',
          data: 'in_progress',
          handler: () => this.updateTaskStatus(taskItem, 'in_progress')
        },
        {
          text: 'Complete',
          icon: 'checkmark-outline',
          data: 'completed',
          handler: () => this.updateTaskStatus(taskItem, 'completed')
        },
        {
          text: 'Skip',
          icon: 'forward-outline',
          data: 'skipped',
          handler: () => this.updateTaskStatus(taskItem, 'skipped')
        },
        {
          text: 'Reset',
          icon: 'refresh-outline',
          data: 'pending',
          handler: () => this.updateTaskStatus(taskItem, 'pending')
        },
        {
          text: 'Cancel',
          icon: 'close-outline',
          role: 'cancel'
        }
      ]
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

  async openTaskMenu(taskItem: TaskListItem, event: Event) {
    event.stopPropagation(); // Prevent event bubbling
    
    // Get click coordinates
    const mouseEvent = event as MouseEvent;
    document.documentElement.style.setProperty('--click-x', `${mouseEvent.clientX}px`);
    document.documentElement.style.setProperty('--click-y', `${mouseEvent.clientY}px`);
    
    const popover = await this.actionSheetCtrl.create({
      header: 'Task Options',
      cssClass: 'task-action-sheet',
      buttons: [
        {
          text: 'Edit',
          icon: 'create-outline',
          handler: () => {
            this.navigateToEditTask(taskItem.task.id!);
          }
        },
        {
          text: 'View Details',
          icon: 'information-circle-outline',
          handler: () => {
            this.navigateToTaskDetail(taskItem.task.id!);
          }
        },
        {
          text: 'Delete',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => {
            this.presentDeleteConfirm(taskItem.task.id!, taskItem.task.title);
          }
        },
        {
          text: 'Cancel',
          icon: 'close-outline',
          role: 'cancel'
        }
      ],
      translucent: true,
      animated: true,
      keyboardClose: true,
      backdropDismiss: true
    });
    
    await popover.present();
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

