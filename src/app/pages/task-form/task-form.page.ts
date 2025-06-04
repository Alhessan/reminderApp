import { Component, OnInit } from '@angular/core';
import { NotificationTypeService } from '../../services/notification-type.service';
import { Observable } from 'rxjs';
import { NotificationType } from '../../models/notification-type.model';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-task-form',
  templateUrl: './task-form.page.html',
  styleUrls: ['./task-form.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TaskFormPage implements OnInit {
  enabledNotificationTypes$: Observable<NotificationType[]>;

  constructor(private notificationTypeService: NotificationTypeService) {
    this.enabledNotificationTypes$ = this.notificationTypeService.getEnabledNotificationTypes();
  }

  ngOnInit() {
  }
} 