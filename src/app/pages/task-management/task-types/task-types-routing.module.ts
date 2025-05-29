import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TaskTypesPage } from './task-types.page';

const routes: Routes = [
  {
    path: '',
    component: TaskTypesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TaskTypesRoutingModule {}
