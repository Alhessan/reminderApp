import { Component, OnInit } from '@angular/core';
import { NotificationTypeService } from '../../services/notification-type.service';
import { CustomerService } from '../../services/customer.service';
import { TaskService } from '../../services/task.service';
import { Observable } from 'rxjs';
import { NotificationType } from '../../models/notification-type.model';
import { Customer } from '../../models/customer.model';
import { IonicModule, AlertController, NavController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-task-form',
  templateUrl: './task-form.page.html',
  styleUrls: ['./task-form.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TaskFormPage implements OnInit {
  enabledNotificationTypes$: Observable<NotificationType[]>;
  customers$: Observable<Customer[]>;
  taskForm: FormGroup;
  isEditMode = false;
  taskId?: number;

  taskTypes: Array<{key: string, name: string, icon: string, color: string}> = [
    { key: 'payment', name: 'Payment', icon: 'cash-outline', color: 'success' },
    { key: 'update', name: 'Update', icon: 'refresh-outline', color: 'primary' },
    { key: 'custom', name: 'Custom', icon: 'create-outline', color: 'tertiary' }
  ];

  frequencies: Array<{key: string, name: string, icon: string}> = [
    { key: 'daily', name: 'Daily', icon: 'calendar-outline' },
    { key: 'weekly', name: 'Weekly', icon: 'calendar-outline' },
    { key: 'monthly', name: 'Monthly', icon: 'calendar-outline' },
    { key: 'yearly', name: 'Yearly', icon: 'calendar-outline' },
    { key: 'once', name: 'One Time', icon: 'calendar-outline' }
  ];

  constructor(
    private notificationTypeService: NotificationTypeService,
    private customerService: CustomerService,
    private taskService: TaskService,
    private formBuilder: FormBuilder,
    private alertController: AlertController,
    private navController: NavController,
    private route: ActivatedRoute
  ) {
    this.enabledNotificationTypes$ = this.notificationTypeService.getEnabledNotificationTypes();
    this.customers$ = this.customerService.getAllCustomers();
    
    this.taskForm = this.formBuilder.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      type: ['', Validators.required],
      customerId: [null],
      frequency: ['', Validators.required],
      startDate: [new Date().toISOString(), Validators.required],
      notificationTime: [new Date().toISOString(), Validators.required],
      notificationType: ['push', Validators.required],
      notificationValue: [''],
      notes: ['']
    });
  }

  async ngOnInit() {
    // Check if we're in edit mode
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.taskId = +id;
      await this.loadTask(this.taskId);
    }
  }

  async loadTask(id: number) {
    try {
      const task = await this.taskService.getTaskById(id);
      if (task) {
        this.taskForm.patchValue({
          title: task.title,
          type: task.type,
          customerId: task.customerId,
          frequency: task.frequency,
          startDate: task.startDate,
          notificationTime: task.notificationTime,
          notificationType: task.notificationType,
          notificationValue: task.notificationValue,
          notes: task.notes
        });
      } else {
        await this.presentAlert('Error', 'Task not found.');
        this.navController.back();
      }
    } catch (error) {
      console.error('Error loading task:', error);
      await this.presentAlert('Error', 'Failed to load task details.');
      this.navController.back();
    }
  }

  async onSubmit() {
    if (this.taskForm.valid) {
      try {
        if (this.isEditMode && this.taskId) {
          await this.taskService.updateTask({
            id: this.taskId,
            ...this.taskForm.value
          });
        } else {
          await this.taskService.createTask(this.taskForm.value);
        }
        this.navController.back();
      } catch (error) {
        console.error('Error saving task:', error);
        this.presentAlert('Error', 'Failed to save task. Please try again.');
      }
    } else {
      this.presentAlert('Validation Error', 'Please fill in all required fields correctly.');
    }
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
} 