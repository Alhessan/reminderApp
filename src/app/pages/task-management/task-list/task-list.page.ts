import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AlertController, IonContent, IonItemSliding, NavController, SegmentChangeEventDetail, ActionSheetController, IonicModule, ActionSheetButton, ToastController, Platform } from '@ionic/angular';
import { Task } from '../../../models/task.model';
import { TaskService } from '../../../services/task.service';
import { DatabaseService } from '../../../services/database.service';
import { CustomerService } from '../../../services/customer.service';
import { Customer } from '../../../models/customer.model';
import { CommonModule, DatePipe } from '@angular/common'; // Added CommonModule, DatePipe
import { FormsModule } from '@angular/forms'; // Added FormsModule
import { TaskListItemComponent } from './components/task-list-item.component';
import { TaskCycleService } from '../../../services/task-cycle.service';
import { Cycle, TaskListItem } from '../../../models/task-cycle.model';
import { BehaviorSubject, Subscription } from 'rxjs';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.page.html',
  styleUrls: [ './task-list.page.scss' ],
  standalone: true, // Mark as standalone
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    DatePipe,
    TaskListItemComponent,
    RouterModule
  ]
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
  private routeParamSubscription?: Subscription;
  @ViewChild(IonContent) content?: IonContent;

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
    private toastController: ToastController,
    private modalController: ModalController,
    public platform: Platform
  ) { }

  /** Shorter title on narrow screens to avoid "Upco..." truncation */
  get headerTitle(): string {
    return this.platform.width() < 768 ? 'Routines' : 'Upcoming Routines';
  }

  async ngOnInit() {
    await this.databaseService.initializeDatabase();
    await this.loadCustomers();

    this.routeParamSubscription = this.route.paramMap.subscribe(async params => {
      const id = params.get('customerId');
      if (id) {
        this.customerIdFilter = +id;
        const customer = await this.customerService.getCustomerById(this.customerIdFilter);
        this.customerNameFilter = customer?.name ?? undefined;
      } else {
        this.customerIdFilter = undefined;
        this.customerNameFilter = undefined;
      }
      await this.loadTasks();
    });

    this.taskListSubscription = this.taskCycleService.taskList$.subscribe({
      next: (tasks) => {
        this.filteredTasks = this.customerIdFilter != null
          ? tasks.filter(t => t.task.customerId === this.customerIdFilter)
          : tasks;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error in task list subscription:', error);
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy() {
    this.taskListSubscription?.unsubscribe();
    this.routeParamSubscription?.unsubscribe();
  }

  async ionViewWillEnter() {
    // Refresh list when returning to page (e.g. from detail); route params already handled by ngOnInit subscription
    await this.loadTasks();
  }

  ionViewDidEnter() {
    // Restore scroll when returning from task detail (Ionic can lose scroll after nav back)
    if (this.content) {
      this.content.scrollToTop(0).catch(() => {});
      setTimeout(() => this.content?.scrollToTop(0).catch(() => {}), 100);
    }
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
    console.log('TaskListPage: Loading tasks with filter:', this.filterSegment);
    try {
      await this.taskCycleService.loadTaskList(this.filterSegment as 'all' | 'due' | 'upcoming' | 'overdue');
      console.log('TaskListPage: Task list loaded successfully');
      console.log('TaskListPage: Current filtered tasks:', this.filteredTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.presentErrorAlert('Failed to load tasks. Please try again.');
    }
  }

  async segmentChanged(event: any) {
    this.filterSegment = event.detail.value;
    const view = this.filterSegment as 'all' | 'due' | 'upcoming' | 'overdue';
    await this.taskCycleService.loadTaskList(view);
  }

  async presentSortOptions() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Sort Tasks By',
      cssClass: 'accessible-action-sheet',
      buttons: [
        {
          text: 'Due Date (Asc)',
          handler: () => { this.setSort('startDate', 'asc'); }
        },
        {
          text: 'Due Date (Desc)',
          handler: () => { this.setSort('startDate', 'desc'); }
        },
        {
          text: 'Title (A-Z)',
          handler: () => { this.setSort('title', 'asc'); }
        },
        {
          text: 'Title (Z-A)',
          handler: () => { this.setSort('title', 'desc'); }
        },
        {
          text: 'Type (A-Z)',
          handler: () => { this.setSort('type', 'asc'); }
        },
        {
          text: 'Type (Z-A)',
          handler: () => { this.setSort('type', 'desc'); }
        },
        {
          text: 'Customer (A-Z)',
          handler: () => { this.setSort('customerName', 'asc'); },
          disabled: !!this.customerIdFilter
        },
        {
          text: 'Customer (Z-A)',
          handler: () => { this.setSort('customerName', 'desc'); },
          disabled: !!this.customerIdFilter
        },
        {
          text: 'Cancel',
          role: 'cancel'
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

  // Add this method to debug navigation issues
debugNavigation() {
  console.log('Current route:', this.router.url);
  console.log('Route configuration:', this.router.config);
  
  // Test navigation with promise to catch errors
  this.router.navigate(['/tasks/new']).then(
    (success) => console.log('Navigation success:', success),
    (error) => console.error('Navigation error:', error)
  );
}

// Update your navigation methods to include error handling
async navigateAddTask() {
  try {
    // Remove focus from any active element before navigation
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      activeElement.blur();
    }
    
    // Use root direction for cleaner transitions
    await this.navController.navigateRoot('/tasks/new', {
      animated: true,
      animationDirection: 'forward'
    });
  } catch (error) {
    console.error('Navigation error:', error);
  }
}

async navigateToEditTask(taskId: number) {
  try {
    // Remove focus from any active element before navigation
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      activeElement.blur();
    }

    await this.navController.navigateForward(`/tasks/edit/${taskId}`, {
      animated: true,
      animationDirection: 'forward'
    });
  } catch (error) {
    console.error('Navigation error:', error);
  }
}

async navigateToTaskDetail(taskId: number) {
  try {
    // Remove focus from any active element before navigation
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      activeElement.blur();
  }

    await this.navController.navigateForward(`/tasks/detail/${taskId}`, {
      animated: true,
      animationDirection: 'forward'
    });
  } catch (error) {
    console.error('Navigation error:', error);
  }
}

async navigateToArchive() {
  try {
    // Remove focus from any active element before navigation
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      activeElement.blur();
    }

    await this.navController.navigateForward('/tasks/archive', {
      animated: true,
      animationDirection: 'forward'
    });
  } catch (error) {
    console.error('Navigation error:', error);
  }
}

  // Add lifecycle hooks to handle page transitions
  ionViewWillLeave() {
    // Remove focus and make page inert when leaving
    const pageElement = document.querySelector('ion-content');
    if (pageElement) {
      pageElement.setAttribute('inert', '');
    }
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      activeElement.blur();
    }
  }

  ionViewDidLeave() {
    // Clean up when page is fully left
    const pageElement = document.querySelector('ion-content');
    if (pageElement) {
      pageElement.removeAttribute('inert');
    }
  }

  async toggleCompletion(_task: Task, _event: any) {
    // Completion is per-cycle; use openStatusActionSheet or detail page Complete button
    await this.loadTasks();
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
    const resolution = taskItem.currentCycle.resolution;
    const buttons: ActionSheetButton[] = [];

    if (resolution === 'open') {
      buttons.push({
        text: 'Complete',
        icon: 'checkmark-outline',
        handler: () => this.updateTaskStatus(taskItem, 'done')
      });
      buttons.push({
        text: 'Skip',
        icon: 'forward-outline',
        handler: () => this.updateTaskStatus(taskItem, 'skipped')
      });
    }

    buttons.push({ text: 'Cancel', icon: 'close-outline', role: 'cancel' });

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Update Status',
      cssClass: 'accessible-action-sheet',
      buttons
    });
    await actionSheet.present();
  }

  async updateTaskStatus(taskItem: TaskListItem, resolution: 'done' | 'skipped') {
    try {
      const cycleId = taskItem.currentCycle?.id;
      if (!cycleId) return;
      await this.taskCycleService.resolveCycle(cycleId, resolution);
      await this.loadTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      this.presentErrorAlert('Failed to update task status. Please try again.');
    }
  }

  async updateProgress(taskItem: TaskListItem) {
    const cycleId = taskItem.currentCycle?.id;
    if (!cycleId || taskItem.currentCycle.resolution !== 'open') return;
    try {
      await this.taskCycleService.resolveCycle(cycleId, 'done');
      const toast = await this.toastController.create({
        message: `"${taskItem.task.title}" completed.`,
        duration: 2000,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
      await this.loadTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      this.presentErrorAlert('Failed to complete. Please try again.');
    }
  }

  /** One-tap complete from list item (Phase 6 US4). */
  async onQuickComplete(cycleId: number) {
    try {
      await this.taskCycleService.resolveCycle(cycleId, 'done');
      const toast = await this.toastController.create({
        message: 'Routine completed.',
        duration: 2000,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
      await this.loadTasks();
    } catch (error) {
      console.error('Error on quick complete:', error);
      this.presentErrorAlert('Failed to complete. Please try again.');
    }
  }

  async openTaskMenu(taskItem: TaskListItem) {
    const buttons: ActionSheetButton[] = [
      {
        text: 'View Details',
        icon: 'eye-outline',
        handler: () => {
          this.navigateToTaskDetail(taskItem.task.id);
        }
      },
      ...(taskItem.task.state === 'active'
        ? [{ text: 'Pause', icon: 'pause-outline', handler: () => this.pauseTaskFromList(taskItem) }]
        : taskItem.task.state === 'paused'
          ? [{ text: 'Resume', icon: 'play-outline', handler: () => this.resumeTaskFromList(taskItem) }]
          : []),
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
        icon: 'close-outline',
          role: 'cancel'
        }
    ];

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Task Options',
      cssClass: 'accessible-action-sheet',
      buttons
    });

    await actionSheet.present();
  }

  async pauseTaskFromList(taskItem: TaskListItem) {
    try {
      await this.taskService.pauseTask(taskItem.task.id!);
      await this.loadTasks();
    } catch (error) {
      console.error('Error pausing task:', error);
      this.presentErrorAlert('Failed to pause task. Please try again.');
    }
  }

  async resumeTaskFromList(taskItem: TaskListItem) {
    try {
      await this.taskService.resumeTask(taskItem.task.id!);
      await this.loadTasks();
    } catch (error) {
      console.error('Error resuming task:', error);
      this.presentErrorAlert('Failed to resume task. Please try again.');
    }
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

  // Database operations moved to main menu for better UX
}

