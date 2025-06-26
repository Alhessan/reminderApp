import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AlertController, NavController, IonicModule, AlertInput, ModalController } from '@ionic/angular';
import { TaskService } from '../../../services/task.service';
import { CustomerService } from '../../../services/customer.service';
import { TaskTypeService } from '../../../services/task-type.service';
import { NotificationTypeService } from '../../../services/notification-type.service';
import { TranslationService } from '../../../services/translation.service';
import { Task } from '../../../models/task.model';
import { NotificationType } from '../../../models/notification-type.model';
import { Customer } from '../../../models/customer.model';
import { DatabaseService } from '../../../services/database.service';
import { TaskTypeDialogComponent } from '../../../components/task-type-dialog/task-type-dialog.component';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import { 
  checkmarkOutline,
  informationCircleOutline,
  repeatOutline,
  documentTextOutline,
  notificationsOutline,
  sunnyOutline,
  calendarOutline,
  calendarNumberOutline,
  hourglassOutline,
  chevronBackOutline,
  addCircleOutline,
  personAddOutline,
  eyeOutline,
  settingsOutline,
  moonOutline,
  sunny,
  close,
  chevronDownOutline
} from 'ionicons/icons';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-task-form',
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.scss'],
  standalone: true,
  imports: [
    IonicModule, 
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule,
    RouterModule
  ]
})
export class TaskFormComponent implements OnInit, OnDestroy {
  taskForm: FormGroup;
  isEditMode = false;
  taskId?: number;
  customers: Customer[] = [];
  isSubmitting = false;

  taskTypes$ = this.taskTypeService.getTaskTypes();
  enabledNotificationTypes$ = this.notificationTypeService.getNotificationTypes().pipe(
    map(types => types.filter(type => type.isEnabled))
  );

  minDate = new Date().toISOString();
  maxDate = new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString();

  private notificationTypes: NotificationType[] = [];
  private notificationTypesSubscription?: Subscription;

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
    private modalController: ModalController,
    private translationService: TranslationService
  ) {
    console.log('TaskFormComponent constructor called');
    // Register Ionic icons
    addIcons({
      'checkmark-outline': checkmarkOutline,
      'information-circle-outline': informationCircleOutline,
      'repeat-outline': repeatOutline,
      'document-text-outline': documentTextOutline,
      'notifications-outline': notificationsOutline,
      'sunny-outline': sunnyOutline,
      'calendar-outline': calendarOutline,
      'calendar-number-outline': calendarNumberOutline,
      'hourglass-outline': hourglassOutline,
      'chevron-back-outline': chevronBackOutline,
      'add-circle-outline': addCircleOutline,
      'person-add-outline': personAddOutline,
      'eye-outline': eyeOutline,
      'settings-outline': settingsOutline,
      'moon-outline': moonOutline,
      'sunny': sunny,
      'close': close,
      'chevron-down-outline': chevronDownOutline
    });

    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      type: ['custom', Validators.required],
      customerId: [null],
      frequency: ['daily', Validators.required],
      startDate: [new Date().toISOString().split('T')[0], Validators.required],
      notificationTime: ['09:00', Validators.required],
      notificationType: ['push'],
      notificationValue: [''],
      notes: ['']
    });

    // Subscribe to notification types
    this.notificationTypesSubscription = this.enabledNotificationTypes$.subscribe(types => {
      this.notificationTypes = types;
    });

    // Handle notification value validation
    this.taskForm.get('notificationType')?.valueChanges.subscribe(value => {
      const type = this.getNotificationTypeDetails(value);
      if (type?.requiresValue) {
        this.taskForm.get('notificationValue')?.setValidators([
          Validators.required,
          Validators.pattern(type.validationPattern || '')
        ]);
      } else {
        this.taskForm.get('notificationValue')?.clearValidators();
      }
      this.taskForm.get('notificationValue')?.updateValueAndValidity();
    });
  }

  ngOnDestroy() {
    console.log('TaskFormComponent ngOnDestroy called');
    if (this.notificationTypesSubscription) {
      this.notificationTypesSubscription.unsubscribe();
    }
  }

  getNotificationTypeDetails(typeKey: string): NotificationType | undefined {
    return this.notificationTypes.find(t => t.key === typeKey);
  }

  // Translation helper method
  t(key: string, params?: { [key: string]: string }): string {
    return this.translationService.t(key, params);
  }

  async manageNotificationTypes() {
    try {
      // Store current form values
      const currentValues = this.taskForm.value;
      
      // Navigate to notification types page
      await this.router.navigate(['/settings/notification-types']);
      
      // When returning, restore form values
      this.taskForm.patchValue(currentValues);
    } catch (error) {
      console.error('Error navigating to notification types:', error);
      await this.presentErrorAlert('Failed to open notification settings.');
    }
  }

  async ngOnInit() {
    console.log('TaskFormComponent ngOnInit called');
    try {
      console.log('Initializing database...');
      await this.databaseService.initializeDatabase();
      
      console.log('Loading customers...');
      await this.loadCustomers();
      console.log('Customers loaded:', this.customers);

      console.log('Loading task types...');
      this.taskTypes$.subscribe(types => {
        console.log('Task types loaded:', types);
      });

      console.log('Loading notification types...');
      this.enabledNotificationTypes$.subscribe(types => {
        console.log('Notification types loaded:', types);
      });

      this.route.paramMap.subscribe(async params => {
        const id = params.get('id');
        console.log('Route params:', params);
        if (id) {
          console.log('Loading task data for id:', id);
          this.isEditMode = true;
          this.taskId = +id;
          await this.loadTaskData(+id);
        } else {
          console.log('Creating new task');
        }
      });
    } catch (error) {
      console.error('Error in ngOnInit:', error);
      await this.presentErrorAlert('Failed to initialize form. Please try again.');
    }
  }

  async loadCustomers() {
    try {
      this.customers = await this.customerService.getAllCustomers();
    } catch (error) {
      console.error('Error loading customers:', error);
      await this.presentErrorAlert('Failed to load customers.');
    }
  }

  async loadTaskData(id: number) {
    try {
      const task = await this.taskService.getTaskById(id);
      if (task) {
        this.taskForm.patchValue({
          title: task.title,
          type: task.type,
          customerId: task.customerId,
          frequency: task.frequency,
          startDate: task.startDate,
          notificationTime: task.notificationTime || '09:00',
          notificationType: task.notificationType || 'push',
          notificationValue: task.notificationValue,
          notes: task.notes
        });
      } else {
        await this.presentErrorAlert(this.t('validation.task.notFound') || 'Task not found.');
        this.navController.navigateBack('/tasks');
      }
    } catch (error) {
      console.error('Error loading task:', error);
      await this.presentErrorAlert(this.t('validation.task.loadError') || 'Failed to load task details.');
      this.navController.navigateBack('/tasks');
    }
  }

  async onSubmit() {
    if (this.taskForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      try {
        const formData = this.taskForm.value;
        if (this.isEditMode && this.taskId) {
          await this.taskService.updateTask({
            id: this.taskId,
            ...formData
          });
          await this.presentSuccessAlert(this.t('validation.task.updated'));
        } else {
          await this.taskService.createTask(formData);
          await this.presentSuccessAlert(this.t('validation.task.created'));
        }
        this.navController.navigateBack('/tasks');
      } catch (error) {
        console.error('Error saving task:', error);
        await this.presentErrorAlert(this.t('validation.task.saveError'));
      } finally {
        this.isSubmitting = false;
      }
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
    try {
      const modal = await this.modalController.create({
        component: TaskTypeDialogComponent,
        cssClass: 'enhanced-modal',
        animated: true,
        showBackdrop: true,
        backdropDismiss: false
      });
  
      await modal.present();
      
      const { data: result, role } = await modal.onWillDismiss();
      
      if (role === 'confirm' && result) {
        try {
          await this.taskTypeService.addTaskType(result);
          this.taskForm.patchValue({ type: result.name });
          
          await this.presentSuccessAlert(
            this.translationService.t('validation.taskType.create.success')
          );
        } catch (error) {
          console.error('Error creating task type:', error);
          await this.presentErrorAlert(
            this.translationService.t('validation.taskType.create.error')
          );
        }
      }
    } catch (error) {
      console.error('Error opening task type dialog:', error);
      await this.presentErrorAlert(
        this.translationService.t('validation.taskType.create.error')
      );
    }
  }
  setQuickTime(time: string) {
    this.taskForm.patchValue({ notificationTime: time });
  }

  isSelectedTime(time: string): boolean {
    return this.taskForm.get('notificationTime')?.value === time;
  }

  formatTime(timeString: string): string {
    if (!timeString) return 'Not set';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  async showProfileSelection() {
    const alert = await this.alertController.create({
      header: 'Select Profile',
      inputs: this.customers.map(customer => ({
        type: 'radio',
        label: customer.name,
        value: customer.id
      })),
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
      ]
    });
    await alert.present();
  }

  async openDatePicker() {
    const alert = await this.alertController.create({
      header: 'Select Start Date',
      inputs: [
        {
          name: 'startDate',
          type: 'date',
          value: this.taskForm.get('startDate')?.value,
          min: this.minDate.split('T')[0],
          max: this.maxDate.split('T')[0]
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Select',
          handler: (data) => {
            if (data.startDate) {
              this.taskForm.patchValue({ startDate: data.startDate });
            }
          }
        }
      ]
    });
    await alert.present();
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Add notification type handling
  async onNotificationTypeChange(event: any) {
    const value = event.detail.value;
    if (value === 'manage') {
      // Reset the segment to the previous value
      this.taskForm.get('notificationType')?.setValue(this.taskForm.get('notificationType')?.value);
      // Navigate to notification types management
      await this.manageNotificationTypes();
      return;
    }
    
    // Handle normal notification type change
    const type = this.getNotificationTypeDetails(value);
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
}
