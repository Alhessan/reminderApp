import { Component, OnInit } from '@angular/core';
import { AlertController, IonicModule } from '@ionic/angular';
import { TaskType, TaskTypeService } from '../../../services/task-type.service';
import { IonHeader } from "@ionic/angular/standalone";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-task-types',
  templateUrl: './task-types.page.html',
  styleUrls: ['./task-types.page.scss'],
    standalone: true,
    imports: [IonicModule, CommonModule, FormsModule]
})
export class TaskTypesPage implements OnInit {
  taskTypes$ = this.taskTypeService.getTaskTypes();
  availableIcons = [
    'cash-outline', 'refresh-outline', 'create-outline', 'alarm-outline',
    'book-outline', 'fitness-outline', 'heart-outline', 'walk-outline',
    'bicycle-outline', 'business-outline', 'cafe-outline', 'call-outline'
  ];

  constructor(
    private taskTypeService: TaskTypeService,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() { }

  async addTaskType() {
    const alert = await this.alertCtrl.create({
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
          placeholder: 'Icon name'
        },
        {
          name: 'color',
          type: 'text',
          placeholder: 'Color (e.g. #FF0000)'
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
            await this.taskTypeService.addTaskType({
              name: data.name,
              description: data.description,
              isDefault: 0,
              icon: data.icon || 'create-outline',
              color: data.color || '#3880ff'
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async editTaskType(taskType: TaskType) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Task Type',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Name',
          value: taskType.name
        },
        {
          name: 'description',
          type: 'text',
          placeholder: 'Description',
          value: taskType.description
        },
        {
          name: 'icon',
          type: 'text',
          placeholder: 'Icon name',
          value: taskType.icon
        },
        {
          name: 'color',
          type: 'text',
          value: taskType.color,
          placeholder: 'Color (e.g. #FF0000)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: async (data) => {
            await this.taskTypeService.updateTaskType(taskType.id!, {
              name: data.name,
              description: data.description,
              isDefault: taskType.isDefault,
              icon: data.icon,
              color: data.color
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteTaskType(taskType: TaskType) {
    if (taskType.isDefault) {
      const alert = await this.alertCtrl.create({
        header: 'Cannot Delete',
        message: 'Default task types cannot be deleted.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const confirmAlert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: 'Are you sure you want to delete this task type?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          handler: async () => {
            await this.taskTypeService.deleteTaskType(taskType.id!);
          }
        }
      ]
    });
    await confirmAlert.present();
  }
}
