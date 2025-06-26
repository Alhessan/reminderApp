import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskTypeService, TaskType } from '../../../services/task-type.service';
import { AlertController, ModalController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { TaskTypeDialogComponent } from '../../../components/task-type-dialog/task-type-dialog.component';
import { addIcons } from 'ionicons';
import { 
  add, createOutline, trashOutline, folderOpenOutline,
  // All task icons that might be used in the list
  fitnessOutline, walkOutline, bicycleOutline,
  bookOutline, cafeOutline, restaurantOutline, waterOutline,
  bedOutline, alarmOutline, calendarOutline, cashOutline,
  heartOutline, medkitOutline, callOutline, mailOutline,
  businessOutline, homeOutline, schoolOutline, briefcaseOutline,
  barbellOutline, basketballOutline, musicalNotesOutline, brushOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-settings-task-types',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  styleUrls: ['./task-types.page.scss'],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Task Types</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="addTaskType()">
            <ion-icon name="add" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Page Header -->
      <div class="page-header">
        <h2>Task Categories</h2>
        <p>Manage your custom task types and categories</p>
      </div>

      <!-- Task Types List -->
      <ion-list>
        <ion-item-sliding *ngFor="let type of taskTypes$ | async; trackBy: trackByTaskType">
          <ion-item>
            <div slot="start" class="icon-container" [style.background-color]="type.color + '20'">
              <ion-icon [name]="type.icon" [style.color]="type.color"></ion-icon>
            </div>
            <ion-label>
              <h2>{{ type.name }}</h2>
              <p>{{ type.description || 'No description' }}</p>
              <ion-chip *ngIf="type.isDefault === 1" color="medium" outline>
                <ion-label>Default</ion-label>
              </ion-chip>
            </ion-label>
          </ion-item>

          <ion-item-options side="end">
            <ion-item-option color="primary" (click)="editTaskType(type)">
              <ion-icon name="create-outline" slot="icon-only"></ion-icon>
              <ion-label>Edit</ion-label>
            </ion-item-option>
            <ion-item-option 
              color="danger" 
              (click)="deleteTaskType(type)" 
              [disabled]="type.isDefault === 1">
              <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
              <ion-label>Delete</ion-label>
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <!-- Empty State -->
      <div *ngIf="(taskTypes$ | async)?.length === 0" class="empty-state">
        <ion-icon name="folder-open-outline" color="medium"></ion-icon>
        <h3>No Custom Task Types</h3>
        <p>Create your first custom task type to get started</p>
        <ion-button (click)="addTaskType()" fill="outline">
          <ion-icon name="add" slot="start"></ion-icon>
          Add Task Type
        </ion-button>
      </div>
    </ion-content>
  `
})
export class TaskTypesPage implements OnInit {
  taskTypes$: Observable<TaskType[]>;

  constructor(
    private taskTypeService: TaskTypeService,
    private alertController: AlertController,
    private modalController: ModalController
  ) {
    console.log('TaskTypesPage constructor');
    this.taskTypes$ = this.taskTypeService.getTaskTypes();
    
    // Register required icons including all possible task icons
    addIcons({
      'add': add,
      'create-outline': createOutline,
      'trash-outline': trashOutline,
      'folder-open-outline': folderOpenOutline,
      // All task icons that might appear in the list
      'fitness-outline': fitnessOutline,
      'walk-outline': walkOutline,
      'bicycle-outline': bicycleOutline,
      'book-outline': bookOutline,
      'cafe-outline': cafeOutline,
      'restaurant-outline': restaurantOutline,
      'water-outline': waterOutline,
      'bed-outline': bedOutline,
      'alarm-outline': alarmOutline,
      'calendar-outline': calendarOutline,
      'cash-outline': cashOutline,
      'heart-outline': heartOutline,
      'medkit-outline': medkitOutline,
      'call-outline': callOutline,
      'mail-outline': mailOutline,
      'business-outline': businessOutline,
      'home-outline': homeOutline,
      'school-outline': schoolOutline,
      'briefcase-outline': briefcaseOutline,
      'barbell-outline': barbellOutline,
      'basketball-outline': basketballOutline,
      'musical-notes-outline': musicalNotesOutline,
      'brush-outline': brushOutline
    });
  }

  ngOnInit() {
    console.log('TaskTypesPage ngOnInit');
    // Trigger a refresh of task types
    this.taskTypeService.getTaskTypes();
  }

  // TrackBy function for better performance
  trackByTaskType(index: number, taskType: TaskType): number | undefined {
    return taskType.id;
  }

  async addTaskType() {
    const modal = await this.modalController.create({
      component: TaskTypeDialogComponent,
      cssClass: 'enhanced-modal'
    });

    await modal.present();
    
    const { data: result, role } = await modal.onWillDismiss();
    
    if (role === 'confirm' && result) {
      try {
        await this.taskTypeService.addTaskType(result);
        // Show success message
        const successAlert = await this.alertController.create({
          header: 'Success',
          message: 'Task type created successfully!',
          buttons: ['OK']
        });
        await successAlert.present();
      } catch (error) {
        // Show error message
        const errorAlert = await this.alertController.create({
          header: 'Error',
          message: 'Failed to create task type. Please try again.',
          buttons: ['OK']
        });
        await errorAlert.present();
      }
    }
  }

  async editTaskType(type: TaskType) {
    const modal = await this.modalController.create({
      component: TaskTypeDialogComponent,
      cssClass: 'enhanced-modal',
      componentProps: {
        taskType: type,
        isEditMode: true
      }
    });

    await modal.present();
    
    const { data: result, role } = await modal.onWillDismiss();
    
    if (role === 'confirm' && result) {
      try {
        await this.taskTypeService.updateTaskType(type.id!, {
          ...result,
          isDefault: type.isDefault // Preserve the isDefault flag
        });
        // Show success message
        const successAlert = await this.alertController.create({
          header: 'Success',
          message: 'Task type updated successfully!',
          buttons: ['OK']
        });
        await successAlert.present();
      } catch (error) {
        // Show error message
        const errorAlert = await this.alertController.create({
          header: 'Error',
          message: 'Failed to update task type. Please try again.',
          buttons: ['OK']
        });
        await errorAlert.present();
      }
    }
  }

  async deleteTaskType(type: TaskType) {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete "${type.name}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          handler: () => {
            if (type.id) {
              this.taskTypeService.deleteTaskType(type.id);
            }
          }
        }
      ]
    });

    await alert.present();
  }
} 