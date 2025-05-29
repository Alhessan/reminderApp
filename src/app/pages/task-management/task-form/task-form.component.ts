import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, NavController, IonicModule } from '@ionic/angular';
import { TaskService } from '../../../services/task.service';
import { CustomerService } from '../../../services/customer.service';
import { TaskTypeService } from '../../../services/task-type.service';
import { Task, Frequency, NotificationType } from '../../../models/task.model';
import { TaskType } from '../../../services/task-type.service';
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
  taskForm: FormGroup;
  isEditMode = false;
  taskId?: number;
  customers: Customer[] = [];
  formInitialized = false;

  frequencies: Frequency[] = ['daily', 'weekly', 'monthly', 'yearly'];
  notificationTypes: NotificationType[] = ['push/local', 'silent reminder'];
  taskTypes$ = this.taskTypeService.getTaskTypes();

  constructor(
    private taskTypeService: TaskTypeService,
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
      type: ['', Validators.required],
      customerId: [null as number | null],
      frequency: [null as Frequency | null, Validators.required],
      startDate: [new Date().toISOString().substring(0, 10), Validators.required],
      notificationTime: ['09:00', [Validators.required, Validators.pattern('^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')]],
      notificationType: [null as NotificationType | null, Validators.required],
      notes: [''], // Optional field for notes
      isCompleted: [false]
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
        const taskDataForForm = {
          ...task,
          startDate: task.startDate ? new Date(task.startDate).toISOString().substring(0, 10) : null,
          notificationTime: task.notificationTime || '09:00',
          notes: task.notes || '',
          customerId: task.customerId || null
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
      this.taskForm.markAllAsTouched();
      return;
    }

    try {
      const formValues = this.taskForm.value;
      
      // Validate and format notification time
      const notificationTime = formValues.notificationTime || '09:00';
      if (!notificationTime.match('^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')) {
        this.presentErrorAlert('Invalid notification time format. Please use HH:mm format.');
        return;
      }

      const taskData: Task = {
        ...formValues,
        startDate: new Date(formValues.startDate).toISOString(),
        notificationTime,
        notes: formValues.notes || '',  // Ensure notes is a string
        isCompleted: this.isEditMode && this.taskId ? 
          (await this.taskService.getTaskById(this.taskId))?.isCompleted : false,
        lastCompletedDate: this.isEditMode && this.taskId ? 
          (await this.taskService.getTaskById(this.taskId))?.lastCompletedDate : undefined
      };

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
}
