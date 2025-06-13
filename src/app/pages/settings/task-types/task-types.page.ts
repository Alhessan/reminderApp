import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskTypeService, TaskType } from '../../../services/task-type.service';
import { AlertController } from '@ionic/angular';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-settings-task-types',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
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

    <ion-content>
      <ion-list>
        <ion-item-sliding *ngFor="let type of taskTypes$ | async">
          <ion-item>
            <ion-icon [name]="type.icon" slot="start" [style.color]="type.color"></ion-icon>
            <ion-label>
              <h2>{{ type.name }}</h2>
              <p>{{ type.description }}</p>
            </ion-label>
          </ion-item>

          <ion-item-options side="end">
            <ion-item-option color="primary" (click)="editTaskType(type)">
              <ion-icon name="create" slot="icon-only"></ion-icon>
            </ion-item-option>
            <ion-item-option color="danger" (click)="deleteTaskType(type)" [disabled]="type.isDefault === 1">
              <ion-icon name="trash" slot="icon-only"></ion-icon>
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>
    </ion-content>
  `
})
export class TaskTypesPage implements OnInit {
  taskTypes$: Observable<TaskType[]>;

  constructor(
    private taskTypeService: TaskTypeService,
    private alertController: AlertController
  ) {
    console.log('TaskTypesPage constructor');
    this.taskTypes$ = this.taskTypeService.getTaskTypes();
  }

  ngOnInit() {
    console.log('TaskTypesPage ngOnInit');
    // Trigger a refresh of task types
    this.taskTypeService.getTaskTypes();
  }

  async addTaskType() {
    const alert = await this.alertController.create({
      header: 'Add Task Type',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Name'
        },
        {
          name: 'description',
          type: 'text',
          placeholder: 'Description'
        },
        {
          name: 'icon',
          type: 'text',
          placeholder: 'Icon name (e.g., calendar)'
        },
        {
          name: 'color',
          type: 'text',
          placeholder: 'Color (e.g., #ff0000)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Add',
          handler: (data) => {
            if (data.name && data.description) {
              this.taskTypeService.addTaskType({
                name: data.name,
                description: data.description,
                icon: data.icon || 'calendar',
                color: data.color || '#000000',
                isDefault: 0
              });
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async editTaskType(type: TaskType) {
    const alert = await this.alertController.create({
      header: 'Edit Task Type',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: type.name,
          placeholder: 'Name'
        },
        {
          name: 'description',
          type: 'text',
          value: type.description,
          placeholder: 'Description'
        },
        {
          name: 'icon',
          type: 'text',
          value: type.icon,
          placeholder: 'Icon name'
        },
        {
          name: 'color',
          type: 'text',
          value: type.color,
          placeholder: 'Color'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: (data) => {
            if (data.name && data.description) {
              this.taskTypeService.updateTaskType(type.id!, {
                name: data.name,
                description: data.description,
                icon: data.icon,
                color: data.color,
                isDefault: type.isDefault
              });
            }
          }
        }
      ]
    });

    await alert.present();
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