import { Component, OnInit } from '@angular/core';
import { IonicModule, ActionSheetController, AlertController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TaskCycleService } from '../../services/task-cycle.service';
import { TaskListItem, TaskCycleStatus } from '../../models/task-cycle.model';
import { NotificationService } from '../../services/notification.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { TaskListItemComponent } from '../../components/task-list-item/task-list-item.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, FormsModule, TaskListItemComponent]
})
export class TaskListComponent implements OnInit {
  currentView: 'all' | 'overdue' | 'in_progress' | 'upcoming' = 'all';
  taskList$ = this.taskCycleService.taskList$;

  constructor(
    private taskCycleService: TaskCycleService,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController,
    private notificationService: NotificationService,
    private toastCtrl: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadTasks();
  }

  async loadTasks() {
    await this.taskCycleService.loadTaskList(this.currentView);
  }

  async onViewChange(event: any) {
    this.currentView = event.detail.value;
    await this.loadTasks();
  }

  getStatusColor(status: TaskCycleStatus): string {
    switch (status) {
      case 'pending': return 'medium';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'skipped': return 'warning';
      default: return 'medium';
    }
  }

  getStatusIcon(status: TaskCycleStatus): string {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'in_progress': return 'play-outline';
      case 'completed': return 'checkmark-circle-outline';
      case 'skipped': return 'forward-outline';
      default: return 'help-outline';
    }
  }

  getTypeColor(type: string): string {
    switch (type.toLowerCase()) {
      case 'payment': return 'success';
      case 'update': return 'primary';
      case 'custom': return 'tertiary';
      default: return 'medium';
    }
  }

  async openStatusActionSheet(taskItem: TaskListItem) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Update Status',
      buttons: [
        {
          text: 'Start',
          icon: 'play-outline',
          data: 'in_progress',
          color: 'primary',
          handler: () => this.updateStatus(taskItem, 'in_progress')
        },
        {
          text: 'Complete',
          icon: 'checkmark-outline',
          data: 'completed',
          color: 'success',
          handler: () => this.updateStatus(taskItem, 'completed')
        },
        {
          text: 'Skip',
          icon: 'forward-outline',
          data: 'skipped',
          color: 'warning',
          handler: () => this.updateStatus(taskItem, 'skipped')
        },
        {
          text: 'Reset',
          icon: 'refresh-outline',
          data: 'pending',
          handler: () => this.updateStatus(taskItem, 'pending')
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

  async updateProgress(taskItem: TaskListItem) {
    const alert = await this.alertCtrl.create({
      header: 'Update Progress',
      inputs: [
        {
          name: 'progress',
          type: 'number',
          min: 0,
          max: 100,
          value: taskItem.currentCycle.progress,
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
          handler: (data) => {
            const progress = Number(data.progress);
            if (progress >= 0 && progress <= 100) {
              this.taskCycleService.updateTaskCycleStatus(
                taskItem.currentCycle.id!,
                taskItem.currentCycle.status,
                progress
              );
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
            this.router.navigate(['/task-form', taskItem.task.id]);
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
          color: 'danger',
          handler: () => {
            this.deleteTask(taskItem);
          }
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

  async updateStatus(taskItem: TaskListItem, status: TaskCycleStatus) {
    try {
      await this.taskCycleService.updateTaskCycleStatus(taskItem.currentCycle.id!, status);
      
      if (status === 'completed') {
        // Send notification
        try {
          await this.notificationService.sendNotification({
            title: 'Task Completed',
            body: `${taskItem.task.title} has been marked as completed.`,
            notificationType: taskItem.task.notificationType,
            taskId: taskItem.task.id,
            customerId: taskItem.task.customerId
          });
        } catch (error) {
          console.error('Error sending notification:', error);
          const toast = await this.toastCtrl.create({
            message: 'Task updated but notification could not be sent.',
            duration: 3000,
            position: 'bottom',
            color: 'warning'
          });
          await toast.present();
        }

        // Create next cycle
        await this.taskCycleService.createNextCycle(taskItem.task, taskItem.currentCycle);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      const toast = await this.toastCtrl.create({
        message: 'Failed to update task status. Please try again.',
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }
} 