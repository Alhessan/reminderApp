import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, NavController, IonicModule } from '@ionic/angular';
import { TaskService } from '../../../services/task.service';
import { CustomerService } from '../../../services/customer.service';
import { Task, TaskType, Frequency, NotificationType } from '../../../models/task.model';
import { Customer } from '../../../models/customer.model';
import { DatabaseService } from '../../../services/database.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-task-form',
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, FormsModule]
})
export class TaskFormComponent implements OnInit {
  taskForm: FormGroup; // Initialize in constructor instead of ngOnInit
  isEditMode = false;
  taskId?: number;
  customers: Customer[] = [];
  formInitialized = false; // Flag to track form initialization

  // To make enum values accessible in the template if needed, though direct binding is used here
  taskTypes: TaskType[] = ['Payment', 'Update', 'Custom'];
  frequencies: Frequency[] = ['daily', 'weekly', 'monthly', 'yearly'];
  notificationTypes: NotificationType[] = ['push/local', 'silent reminder'];

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService,
    private customerService: CustomerService,
    private route: ActivatedRoute,
    private navController: NavController,
    private alertController: AlertController,
    private databaseService: DatabaseService
  ) {
    // Initialize form in constructor to ensure it's available before template renders
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      type: [null as TaskType | null, Validators.required],
      customerId: [null as number | null], // Optional
      frequency: [null as Frequency | null, Validators.required],
      startDate: [new Date().toISOString().substring(0, 10), Validators.required], // Default to today, format for <input type="date">
      notificationType: [null as NotificationType | null, Validators.required],
      notes: [''],
      isCompleted: [false] // Not directly on form, but part of model
    });
    this.formInitialized = true;
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
    try {
      const task = await this.taskService.getTaskById(id);
      if (task) {
        // Adjust for form binding, especially date
        const taskDataForForm = {
          ...task,
          startDate: task.startDate ? new Date(task.startDate).toISOString().substring(0, 10) : null,
          customerId: task.customerId || null // Ensure null if undefined
        };
        this.taskForm.patchValue(taskDataForForm);
      } else {
        this.presentErrorAlert('Task not found.');
        this.navController.navigateBack('/task-list');
      }
    } catch (error) {
      console.error('Error loading task data:', error);
      this.presentErrorAlert('Failed to load task data.');
      this.navController.navigateBack('/task-list');
    }
  }

  async onSubmit() {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched(); // Mark all fields as touched to show errors
      return;
    }

    const formValues = this.taskForm.value;
    const taskData: Task = {
      ...formValues,
      startDate: new Date(formValues.startDate).toISOString(), // Ensure ISO string for DB
      isCompleted: this.isEditMode && this.taskId ? (await this.taskService.getTaskById(this.taskId))?.isCompleted : false, // Preserve completion status on edit
      lastCompletedDate: this.isEditMode && this.taskId ? (await this.taskService.getTaskById(this.taskId))?.lastCompletedDate : undefined
    };

    try {
      if (this.isEditMode && this.taskId) {
        taskData.id = this.taskId;
        await this.taskService.updateTask(taskData);
        this.presentSuccessAlert('Task updated successfully!');
      } else {
        await this.taskService.addTask(taskData);
        this.presentSuccessAlert('Task added successfully!');
      }
      this.navController.navigateBack('/task-list');
    } catch (error) {
      console.error('Error saving task:', error);
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
}
