import { Component, OnInit } from '@angular/core';
import { AlertController, IonicModule, ModalController } from '@ionic/angular';
import { TaskType, TaskTypeService } from '../../../services/task-type.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorIconPickerComponent } from '../../../components/color-icon-picker/color-icon-picker.component';

@Component({
  selector: 'app-task-types',
  templateUrl: './task-types.page.html',
  styleUrls: ['./task-types.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ColorIconPickerComponent]
})
export class TaskTypesPage implements OnInit {
  taskTypes$ = this.taskTypeService.getTaskTypes();
  
  // Expanded icon list for better selection
  availableIcons = [
    'create-outline', 'fitness-outline', 'walk-outline', 'bicycle-outline',
    'book-outline', 'cafe-outline', 'restaurant-outline', 'water-outline',
    'bed-outline', 'alarm-outline', 'calendar-outline', 'cash-outline',
    'heart-outline', 'medkit-outline', 'call-outline', 'mail-outline',
    'business-outline', 'home-outline', 'school-outline', 'briefcase-outline',
    'barbell-outline', 'basketball-outline', 'musical-notes-outline', 'brush-outline'
  ];

  constructor(
    private taskTypeService: TaskTypeService,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() { }

  async addTaskType() {
    // Create a modal for better UX when adding task types
    const modal = await this.modalCtrl.create({
      component: TaskTypeFormModalComponent,
      componentProps: {
        mode: 'add'
      },
      cssClass: 'task-type-modal'
    });
    
    await modal.present();
    
    const { data, role } = await modal.onWillDismiss();
    
    if (role === 'confirm' && data) {
      await this.taskTypeService.addTaskType({
        name: data.name,
        description: data.description,
        isDefault: 0,
        icon: data.icon || 'create-outline',
        color: data.color || '#3880ff'
      });
    }
  }

  async editTaskType(taskType: TaskType) {
    // Create a modal for better UX when editing task types
    const modal = await this.modalCtrl.create({
      component: TaskTypeFormModalComponent,
      componentProps: {
        mode: 'edit',
        taskType: taskType
      },
      cssClass: 'task-type-modal'
    });
    
    await modal.present();
    
    const { data, role } = await modal.onWillDismiss();
    
    if (role === 'confirm' && data) {
      await this.taskTypeService.updateTaskType(taskType.id!, {
        name: data.name,
        description: data.description,
        isDefault: taskType.isDefault,
        icon: data.icon,
        color: data.color
      });
    }
  }

  async deleteTaskType(taskType: TaskType) {
    if (taskType.isDefault) {
      const alert = await this.alertCtrl.create({
        header: 'Cannot Delete',
        message: 'Default routine types cannot be deleted.',
        buttons: ['OK'],
        cssClass: 'custom-alert'
      });
      await alert.present();
      return;
    }

    const confirmAlert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete "${taskType.name}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Delete',
          cssClass: 'danger',
          handler: async () => {
            await this.taskTypeService.deleteTaskType(taskType.id!);
          }
        }
      ],
      cssClass: 'custom-alert'
    });
    await confirmAlert.present();
  }
}

// Modal component for adding/editing task types
@Component({
  selector: 'app-task-type-form-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ mode === 'add' ? 'Add Routine Type' : 'Edit Routine Type' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-item>
        <ion-label position="stacked">Name <ion-text color="danger">*</ion-text></ion-label>
        <ion-input [(ngModel)]="name" placeholder="Enter name" required></ion-input>
      </ion-item>
      
      <ion-item>
        <ion-label position="stacked">Description</ion-label>
        <ion-textarea [(ngModel)]="description" placeholder="Enter description" [autoGrow]="true"></ion-textarea>
      </ion-item>
      
      <div class="picker-section">
        <ion-label>Appearance</ion-label>
        <app-color-icon-picker
          [selectedIcon]="icon"
          [selectedColor]="color"
          (iconChange)="icon = $event"
          (colorChange)="color = $event">
        </app-color-icon-picker>
      </div>
      
      <div class="preview-section">
        <ion-label>Preview</ion-label>
        <div class="type-preview">
          <ion-item lines="none">
            <ion-icon [name]="icon" slot="start" [style.color]="color"></ion-icon>
            <ion-label>
              <h2>{{ name || 'Type Name' }}</h2>
              <p>{{ description || 'Type description will appear here' }}</p>
            </ion-label>
          </ion-item>
        </div>
      </div>
      
      <ion-button expand="block" (click)="confirm()" [disabled]="!name">
        {{ mode === 'add' ? 'Add' : 'Save' }}
      </ion-button>
    </ion-content>
  `,
  styles: [`
    .picker-section {
      margin-top: 20px;
    }
    
    .preview-section {
      margin-top: 24px;
      margin-bottom: 24px;
    }
    
    .type-preview {
      border: 1px solid var(--ion-border-color);
      border-radius: 8px;
      margin-top: 8px;
      background: var(--ion-item-background);
    }
    
    ion-button {
      margin-top: 16px;
    }
  `],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ColorIconPickerComponent]
})
export class TaskTypeFormModalComponent {
  mode: 'add' | 'edit' = 'add';
  taskType?: TaskType;
  
  name: string = '';
  description: string = '';
  icon: string = 'create-outline';
  color: string = '#3880ff';
  
  constructor(private modalCtrl: ModalController) {}
  
  ngOnInit() {
    if (this.mode === 'edit' && this.taskType) {
      this.name = this.taskType.name;
      this.description = this.taskType.description || '';
      this.icon = this.taskType.icon;
      this.color = this.taskType.color;
    }
  }
  
  dismiss() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
  
  confirm() {
    if (!this.name) return;
    
    this.modalCtrl.dismiss({
      name: this.name,
      description: this.description,
      icon: this.icon,
      color: this.color
    }, 'confirm');
  }
}
