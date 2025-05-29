import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TaskTypesPage } from './task-types.page';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        component: TaskTypesPage
      }
    ]),
    TaskTypesPage
  ]
})
export class TaskTypesPageModule {}
