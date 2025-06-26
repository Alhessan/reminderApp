import { Component, OnInit } from '@angular/core';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { TaskCycleService } from '../../../services/task-cycle.service';
import { TaskListItem } from '../../../models/task-cycle.model';
import { TaskListItemComponent } from '../task-list/components/task-list-item.component';

@Component({
  selector: 'app-task-archive',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tasks"></ion-back-button>
        </ion-buttons>
        <ion-title>Archived Tasks</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item-sliding *ngFor="let taskItem of archivedTasks">
          <app-task-list-item
            [taskItem]="taskItem"
            (optionsClick)="openTaskOptions(taskItem)">
          </app-task-list-item>
          
          <ion-item-options side="end">
            <ion-item-option (click)="unarchiveTask(taskItem)" color="primary">
              <ion-icon slot="icon-only" name="archive-outline"></ion-icon>
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="archivedTasks.length === 0">
        <ion-icon name="archive-outline" color="medium"></ion-icon>
        <h3>No Archived Tasks</h3>
        <p>Tasks you archive will appear here</p>
      </div>
    </ion-content>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 32px;
      text-align: center;
      
      ion-icon {
        font-size: 64px;
        margin-bottom: 16px;
      }

      h3 {
        margin: 0;
        color: var(--ion-color-medium);
        font-size: 20px;
      }

      p {
        margin: 8px 0 24px;
        color: var(--ion-color-medium-shade);
      }
    }
  `],
  standalone: true,
  imports: [IonicModule, CommonModule, TaskListItemComponent]
})
export class TaskArchivePage implements OnInit {
  archivedTasks: TaskListItem[] = [];

  constructor(
    private taskCycleService: TaskCycleService,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    await this.loadArchivedTasks();
  }

  async loadArchivedTasks() {
    try {
      this.archivedTasks = await this.taskCycleService.getArchivedTasks();
    } catch (error) {
      console.error('Error loading archived tasks:', error);
    }
  }

  async unarchiveTask(taskItem: TaskListItem) {
    // Direct unarchive for swipe action (no confirmation needed since it's a swipe gesture)
    try {
      await this.taskCycleService.unarchiveTask(taskItem.task.id!);
      await this.loadArchivedTasks();
    } catch (error) {
      console.error('Error unarchiving task:', error);
    }
  }

  async openTaskOptions(taskItem: TaskListItem) {
    const alert = await this.alertController.create({
      header: 'Unarchive Task',
      message: 'Are you sure you want to unarchive this task?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Unarchive',
          handler: async () => {
            try {
              await this.taskCycleService.unarchiveTask(taskItem.task.id!);
              await this.loadArchivedTasks();
            } catch (error) {
              console.error('Error unarchiving task:', error);
            }
          }
        }
      ]
    });
    await alert.present();
  }
} 