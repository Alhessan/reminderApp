import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TaskListPageRoutingModule } from './task-list-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TaskListPageRoutingModule
    // TaskListPage removed from imports as it's a standalone component
  ],
  declarations: [] // TaskListPage removed as it's standalone
})
export class TaskListPageModule {}
