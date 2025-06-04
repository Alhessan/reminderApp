import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, NavController, IonicModule, ModalController, AlertInput } from '@ionic/angular';
import { TaskService } from '../../../services/task.service';
import { CustomerService } from '../../../services/customer.service';
import { TaskTypeService } from '../../../services/task-type.service';
import { NotificationTypeService } from '../../../services/notification-type.service';
import { Task, Frequency } from '../../../models/task.model';
import { NotificationType } from '../../../models/notification-type.model';
import { TaskType } from '../../../services/task-type.service';
import { Customer } from '../../../models/customer.model';
import { DatabaseService } from '../../../services/database.service';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-task-form',
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.scss'],
  standalone: true,
  imports: [
    IonicModule, 
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule
  ]
})
export class TaskFormComponent implements OnInit {
  taskForm!: FormGroup;
  isEditMode = false;
  taskId?: number;
  customers: Customer[] = [];
  formInitialized = false;
  selectedNotificationTypes: NotificationType[] = [];
  private lastNotificationType: string = 'silent reminder';

  frequencies: Frequency[] = ['daily', 'weekly', 'monthly', 'yearly'];
  taskTypes$ = this.taskTypeService.getTaskTypes();
  enabledNotificationTypes$ = this.notificationTypeService.getNotificationTypes().pipe(
    map(types => types.filter(type => type.isEnabled))
  );

  // New properties for improved form
  minDate = new Date().toISOString();
  maxDate = new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString();

  constructor(
    private taskTypeService: TaskTypeService,
    private notificationTypeService: NotificationTypeService,
    private fb: FormBuilder,
    private taskService: TaskService,
    private customerService: CustomerService,
    private route: ActivatedRoute,
    private navController: NavController,
    private alertController: AlertController,
    private databaseService: DatabaseService,
    private router: Router,
    private modalController: ModalController
  ) {
    this.initializeForm();
  }

  private initializeForm() {
    console.log('TaskForm: Initializing form');
    const baseForm = {
      title: ['', Validators.required],
      type: ['', Validators.required],
      customerId: [null as number | null],
      frequency: ['daily' as Frequency, Validators.required],
      startDate: [new Date().toISOString(), Validators.required],
      notificationTime: ['09:00', [Validators.required, Validators.pattern('^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')]],
      notes: [''],
      isCompleted: [false],
      notificationType: ['push'],
      notificationValue: ['']
    };

    this.taskForm = this.fb.group(baseForm);
    console.log('TaskForm: Form created with initial values:', this.taskForm.value);

    // Watch for notificationType changes
    this.taskForm.get('notificationType')?.valueChanges.subscribe(value => {
      console.log('TaskForm: Notification type changed to:', value);
      if (value === 'manage') {
        this.manageNotificationTypes();
        // Reset back to previous value after opening management
        setTimeout(() => {
          console.log('TaskForm: Resetting notification type to:', this.lastNotificationType || 'push');
          this.taskForm.patchValue({ notificationType: this.lastNotificationType || 'push' }, { emitEvent: false });
        });
      } else {
        this.lastNotificationType = value;
        // Handle validation for notification value based on type
        const type = this.getNotificationTypeDetails(value);
        console.log('TaskForm: Notification type details:', type);
        if (type?.requiresValue) {
          this.taskForm.get('notificationValue')?.setValidators([
            Validators.required,
            Validators.pattern(type.validationPattern || '')
          ]);
        } else {
          this.taskForm.get('notificationValue')?.clearValidators();
        }
        this.taskForm.get('notificationValue')?.updateValueAndValidity();
      }
    });

    // Watch for notification time changes
    this.taskForm.get('notificationTime')?.valueChanges.subscribe(value => {
      console.log('TaskForm: Notification time changed to:', value);
    });

    // Watch for start date changes
    this.taskForm.get('startDate')?.valueChanges.subscribe(value => {
      console.log('TaskForm: Start date changed to:', value);
    });

    // Subscribe to enabled notification types to set default if needed
    this.enabledNotificationTypes$.subscribe(types => {
      if (types.length > 0) {
        if (!this.lastNotificationType || this.lastNotificationType === 'manage' || !types.some(t => t.key === this.lastNotificationType)) {
          // If push is enabled, use it as default, otherwise use silent
          const pushType = types.find(t => t.key === 'push');
          const defaultType = pushType ? 'push/local' : 'silent';
          this.taskForm.patchValue({ notificationType: defaultType }, { emitEvent: false });
          this.lastNotificationType = defaultType;
        }
      }
    });
  }

  getNotificationTypeDetails(typeKey: string): any {
    let types: any[] = [];
    this.enabledNotificationTypes$.subscribe(t => types = t).unsubscribe();
    return types.find(t => t.key === typeKey);
  }

  async manageNotificationTypes() {
    await this.router.navigate(['/notification-types']);
  }

  onNotificationTypeChange(type: NotificationType) {
    const isSelected = this.taskForm.get(`notification_${type.key}`)?.value;
    
    if (isSelected) {
      this.selectedNotificationTypes.push(type);
      if (type.requiresValue) {
        this.taskForm.get(`notificationValue_${type.key}`)?.setValidators([Validators.required]);
      }
    } else {
      this.selectedNotificationTypes = this.selectedNotificationTypes.filter(t => t.key !== type.key);
      if (type.requiresValue) {
        this.taskForm.get(`notificationValue_${type.key}`)?.clearValidators();
        this.taskForm.get(`notificationValue_${type.key}`)?.setValue('');
      }
    }
    
    if (type.requiresValue) {
      this.taskForm.get(`notificationValue_${type.key}`)?.updateValueAndValidity();
    }
  }

  onNotificationTabChange(event: any) {
    if (event.detail.value === 'manage') {
      // Navigate to notification types management
      this.router.navigate(['/notification-types']);
      // Reset back to previous value
      const previousValue = this.taskForm.get('notificationType')?.value;
      if (previousValue && previousValue !== 'manage') {
        setTimeout(() => {
          this.taskForm.patchValue({ notificationType: previousValue });
        });
      } else {
        this.taskForm.patchValue({ notificationType: 'push/local' });
      }
    }
  }

  async ngOnInit() {
    await this.databaseService.initializeDatabase();
    await this.loadCustomers();

    this.route.paramMap.subscribe(async params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.taskId = +id;
        await this.loadTaskData(+id);
      }
    });
  }

  async loadCustomers() {
    try {
      this.customers = await this.customerService.getAllCustomers();
    } catch (error) {
      console.error('Error loading customers for form:', error);
      this.presentErrorAlert('Failed to load customer list.');
    }
  }

  async loadTaskData(id: number) {
    console.log('TaskForm: Loading task data for ID:', id);
    try {
      const task = await this.taskService.getTaskById(id);
      if (task) {
        console.log('TaskForm: Retrieved task data:', task);
        const taskDataForForm = {
          ...task,
          startDate: task.startDate ? new Date(task.startDate).toISOString().substring(0, 10) : null,
          notificationTime: task.notificationTime || '09:00',
          notes: task.notes || '',
          customerId: task.customerId || null,
          notificationType: task.notificationType || 'push',
          notificationValue: task.notificationValue || ''
        };
        console.log('TaskForm: Formatted task data for form:', taskDataForForm);
        this.taskForm.patchValue(taskDataForForm);
      } else {
        console.log('TaskForm: Task not found');
        this.presentErrorAlert('Task not found.');
        this.navController.navigateBack('/task-list');
      }
    } catch (error) {
      console.error('TaskForm: Error loading task data:', error);
      this.presentErrorAlert('Failed to load task data.');
      this.navController.navigateBack('/task-list');
    }
  }

  async onSubmit() {
    console.log('TaskForm: Starting form submission');
    if (this.taskForm.invalid) {
      console.log('TaskForm: Form is invalid', this.taskForm.errors);
      this.taskForm.markAllAsTouched();
      return;
    }

    try {
      const formValues = this.taskForm.value;
      console.log('TaskForm: Form values:', formValues);
      
      // Validate and format notification time
      const notificationTime = formValues.notificationTime || '09:00';
      if (!notificationTime.match('^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')) {
        console.log('TaskForm: Invalid notification time format:', notificationTime);
        this.presentErrorAlert('Invalid notification time format. Please use HH:mm format.');
        return;
      }

      console.log('TaskForm: Creating task data object');
      // Handle the date value properly
      let startDate = formValues.startDate;
      if (typeof startDate === 'object' && startDate !== null) {
        // If it's an object, get the first value
        startDate = Object.values(startDate)[0];
      }
      
      const taskData: Task = {
        ...formValues,
        startDate: new Date(startDate).toISOString(), // Use the processed startDate
        notificationTime,
        notes: formValues.notes || '',
        isCompleted: this.isEditMode && this.taskId ? 
          (await this.taskService.getTaskById(this.taskId))?.isCompleted : false,
        lastCompletedDate: this.isEditMode && this.taskId ? 
          (await this.taskService.getTaskById(this.taskId))?.lastCompletedDate : undefined
      };

      console.log('TaskForm: Final task data:', taskData);

      if (this.isEditMode && this.taskId) {
        console.log('TaskForm: Updating existing task:', this.taskId);
        taskData.id = this.taskId;
        await this.taskService.updateTask(taskData);
        this.presentSuccessAlert('Task updated successfully!');
      } else {
        console.log('TaskForm: Creating new task');
        await this.taskService.addTask(taskData);
        this.presentSuccessAlert('Task added successfully!');
      }
      
      console.log('TaskForm: Task saved successfully, navigating back');
      this.navController.navigateBack('/task-list');
    } catch (error) {
      console.error('TaskForm: Error saving task:', error);
      this.presentErrorAlert('Failed to save task. Please try again.');
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

  async presentSuccessAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Success',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async addNewTaskType() {
    const alert = await this.alertController.create({
      header: 'Add Task Type',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Name',
          label: 'Name'
        },
        {
          name: 'description',
          type: 'text',
          placeholder: 'Description',
          label: 'Description'
        },
        {
          name: 'icon',
          type: 'text',
          placeholder: 'Icon name (e.g., create-outline)',
          label: 'Icon'
        },
        {
          name: 'color',
          type: 'text',
          placeholder: 'Color (e.g., #FF0000)',
          label: 'Color'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Add',
          handler: async (data) => {
            if (!data.name) {
              this.presentErrorAlert('Name is required for task type.');
              return false;
            }
            try {
              await this.taskTypeService.addTaskType({
                name: data.name,
                description: data.description || '',
                isDefault: 0,
                icon: data.icon || 'create-outline',
                color: data.color || '#3880ff'
              });
              // Set the new type as the selected type
              this.taskForm.patchValue({ type: data.name });
              return true;
            } catch (error) {
              console.error('Error creating task type:', error);
              this.presentErrorAlert('Failed to create task type. Please try again.');
              return false;
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // New methods for improved form functionality
  setQuickTime(time: string) {
    this.taskForm.patchValue({ notificationTime: time });
  }

  isSelectedTime(time: string): boolean {
    return this.taskForm.get('notificationTime')?.value === time;
  }

  formatTime(time: string): string {
    if (!time) return '';
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting time:', error);
      return time;
    }
  }

  async showProfileSelection() {
    const inputs: AlertInput[] = [
      {
        type: 'radio',
        label: 'None',
        value: null,
        checked: true
      },
      ...this.customers.map(customer => ({
        type: 'radio' as const,
        label: customer.name,
        value: customer.id
      }))
    ];

    const alert = await this.alertController.create({
      header: 'Select Profile',
      message: 'Choose a profile for this task',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Select',
          handler: (customerId) => {
            if (customerId) {
              this.taskForm.patchValue({ customerId });
            }
          }
        }
      ],
      inputs
    });
    await alert.present();
  }

  async openDatePicker() {
    const alert = await this.alertController.create({
      header: 'Select Start Date',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'OK',
          handler: (dateValue) => {
            if (dateValue && dateValue[0]) {
              // Extract the actual date string from the object
              const dateString = dateValue[0];
              this.taskForm.patchValue({ startDate: dateString });
            }
          }
        }
      ],
      inputs: [
        {
          type: 'date',
          value: this.taskForm.get('startDate')?.value || new Date().toISOString().split('T')[0],
          min: this.minDate.split('T')[0],
          max: this.maxDate.split('T')[0]
        }
      ]
    });
    await alert.present();
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Today';
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString(undefined, { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }
}
