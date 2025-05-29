import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TaskDetailPageRoutingModule } from './task-detail-routing.module';
import { TaskDetailPage } from './task-detail.page'; // Import the page

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TaskDetailPageRoutingModule,
    TaskDetailPage // Import TaskDetailPage as it's standalone
  ],
  declarations: [] // TaskDetailPage removed as it's standalone
})
export class TaskDetailPageModule {}
