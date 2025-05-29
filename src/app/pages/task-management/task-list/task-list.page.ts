import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonItemSliding, NavController, SegmentChangeEventDetail, ActionSheetController, IonicModule } from '@ionic/angular'; // Added IonicModule
import { Task } from '../../../models/task.model';
import { TaskService } from '../../../services/task.service';
import { DatabaseService } from '../../../services/database.service';
import { CustomerService } from '../../../services/customer.service';
import { Customer } from '../../../models/customer.model';
import { CommonModule, DatePipe } from '@angular/common'; // Added CommonModule, DatePipe
import { FormsModule } from '@angular/forms'; // Added FormsModule

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.page.html',
  styleUrls: [ './task-list.page.scss' ],
  standalone: true, // Mark as standalone
  imports: [IonicModule, CommonModule, FormsModule, DatePipe] // Import necessary modules
})
export class TaskListPage implements OnInit {
  allTasks: Task[] = [];
  filteredTasks: Task[] = [];
  customers: Customer[] = [];
  isLoading = true;
  filterSegment: string = 'all'; // Explicitly type as string
  currentSortBy = 'startDate'; // Default sort
  currentSortOrder = 'asc'; // Default order
  customerIdFilter?: number;
  customerNameFilter?: string;

  constructor(
    private taskService: TaskService,
    private customerService: CustomerService, // Added CustomerService
    private router: Router,
    private route: ActivatedRoute, // Added ActivatedRoute
    private alertController: AlertController,
    private navController: NavController,
    private databaseService: DatabaseService,
    private actionSheetCtrl: ActionSheetController
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
    try {
      if (this.customerIdFilter) {
        this.allTasks = await this.taskService.getCustomerTasks(this.customerIdFilter);
      } else {
        this.allTasks = await this.taskService.getAllTasks();
      }
      this.applyFiltersAndSorting();
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.presentErrorAlert('Failed to load tasks. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  applyFiltersAndSorting() {
    let tasksToProcess = [...this.allTasks];

    // Apply status filter
    if (this.filterSegment === 'pending') {
      tasksToProcess = tasksToProcess.filter(task => !task.isCompleted);
    } else if (this.filterSegment === 'completed') {
      tasksToProcess = tasksToProcess.filter(task => task.isCompleted);
    }

    // Apply sorting
    tasksToProcess.sort((a, b) => {
      let valA: any, valB: any;

      switch (this.currentSortBy) {
        case 'title':
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case 'type':
          valA = a.type.toLowerCase();
          valB = b.type.toLowerCase();
          break;
        case 'customerName':
          valA = a.customer?.name?.toLowerCase() || ''; // Use customer.name
          valB = b.customer?.name?.toLowerCase() || ''; // Use customer.name
          break;
        case 'startDate':
        default:
          valA = new Date(a.startDate).getTime();
          valB = new Date(b.startDate).getTime();
          break;
      }

      if (valA < valB) {
        return this.currentSortOrder === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return this.currentSortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });

    this.filteredTasks = tasksToProcess;
  }

  segmentChanged(event: CustomEvent<SegmentChangeEventDetail>) {
    this.filterSegment = event.detail.value as string || 'all'; // Cast to string
    this.applyFiltersAndSorting();
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
    this.applyFiltersAndSorting();
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
      this.applyFiltersAndSorting(); 
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
      this.applyFiltersAndSorting();
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

  trackTaskById(index: number, task: Task): number {
    return task.id!;
  }

  clearCustomerFilter() {
    this.customerIdFilter = undefined;
    this.customerNameFilter = undefined;
    this.loadTasks(); // Reload all tasks
  }
}

