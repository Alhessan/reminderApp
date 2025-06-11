import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TaskCycleService } from '../../services/task-cycle.service';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-form',
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule]
})
export class TaskFormComponent implements OnInit {
  taskForm: FormGroup;
  isEditMode = false;
  taskId?: number;

  frequencies = [
    { value: 'daily', label: 'Daily', icon: 'sunny-outline' },
    { value: 'weekly', label: 'Weekly', icon: 'calendar-outline' },
    { value: 'monthly', label: 'Monthly', icon: 'calendar-number-outline' },
    { value: 'yearly', label: 'Yearly', icon: 'hourglass-outline' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private taskCycleService: TaskCycleService,
    private router: Router,
    private route: ActivatedRoute,
    private modalController: ModalController
  ) {
    this.taskForm = this.formBuilder.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      type: ['', Validators.required],
      customerId: [null],
      frequency: ['daily', Validators.required],
      startDate: [new Date().toISOString(), Validators.required],
      notificationType: ['push', Validators.required],
      notificationTime: ['09:00', Validators.required],
      notificationValue: [''],
      notes: [''],
      isArchived: [false]
    });

    // Add conditional validation for notification value
    this.taskForm.get('notificationType')?.valueChanges.subscribe(type => {
      const notificationValueControl = this.taskForm.get('notificationValue');
      if (type === 'push') {
        notificationValueControl?.clearValidators();
      } else {
        notificationValueControl?.setValidators([Validators.required]);
      }
      notificationValueControl?.updateValueAndValidity();
    });
  }

  ngOnInit() {
    this.taskId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.taskId) {
      this.isEditMode = true;
      this.loadTask(this.taskId);
    }
  }

  async loadTask(id: number) {
    try {
      const task = await this.taskCycleService.getTask(id);
      if (task) {
        this.taskForm.patchValue(task);
      }
    } catch (error) {
      console.error('Error loading task:', error);
    }
  }

  async openDatePicker() {
    const modal = await this.modalController.create({
      component: 'ion-datetime',
      componentProps: {
        value: this.taskForm.get('startDate')?.value,
        presentation: 'date',
        showDefaultButtons: true
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.value) {
      this.taskForm.patchValue({ startDate: data.value });
    }
  }

  async onSubmit() {
    if (this.taskForm.valid) {
      try {
        const taskData: Task = {
          ...this.taskForm.value,
          id: this.isEditMode ? this.taskId : undefined
        };

        if (this.isEditMode) {
          await this.taskCycleService.updateTask(taskData);
        } else {
          await this.taskCycleService.createTask(taskData);
        }

        await this.router.navigate(['/tasks']);
      } catch (error) {
        console.error('Error saving task:', error);
      }
    } else {
      Object.keys(this.taskForm.controls).forEach(key => {
        const control = this.taskForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }
} 