import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { TaskManagementPage } from './task-management.page';

const routes: Routes = [
  {
    path: '',
    component: TaskManagementPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    TaskManagementPage
  ]
})
export class TaskManagementPageModule {} 