import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationTypeService } from '../../../services/notification-type.service';
import { NotificationType } from '../../../models/notification-type.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-settings-notification-types',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Notification Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item-group>
          <ion-item-divider>
            <ion-label>Notification Methods</ion-label>
          </ion-item-divider>

          <ion-item *ngFor="let type of notificationTypes$ | async">
            <ion-icon [name]="type.icon" slot="start" [style.color]="type.color"></ion-icon>
            <ion-label>
              <h2>{{ type.name }}</h2>
              <p>{{ type.description }}</p>
            </ion-label>
            <ion-toggle
              [(ngModel)]="type.isEnabled"
              (ionChange)="onToggleChange(type)"
              slot="end">
            </ion-toggle>
          </ion-item>
        </ion-item-group>

        <ion-item-group>
          <ion-item-divider>
            <ion-label>Notification Settings</ion-label>
          </ion-item-divider>

          <ion-item *ngFor="let type of (notificationTypes$ | async)">
            <ng-container *ngIf="type.isEnabled && type.requiresValue">
              <ion-label position="stacked">{{ type.valueLabel }}</ion-label>
              <ion-input
                [type]="type.key === 'email' ? 'email' : 'text'"
                [(ngModel)]="type.value"
                [placeholder]="type.valueLabel || ''"
                (ionBlur)="onValueChange(type)"
                [attr.pattern]="type.validationPattern"
                [errorText]="type.validationError">
              </ion-input>
            </ng-container>
          </ion-item>
        </ion-item-group>
      </ion-list>
    </ion-content>
  `
})
export class NotificationTypesPage implements OnInit {
  notificationTypes$: Observable<NotificationType[]>;

  constructor(private notificationTypeService: NotificationTypeService) {
    this.notificationTypes$ = this.notificationTypeService.getNotificationTypes();
  }

  ngOnInit() {
    // Trigger a refresh of notification types
    this.notificationTypeService.getNotificationTypes();
  }

  onToggleChange(type: NotificationType) {
    this.notificationTypeService.updateNotificationType({
      ...type,
      isEnabled: type.isEnabled
    });
  }

  onValueChange(type: NotificationType) {
    if (type.value && type.validationPattern) {
      const regex = new RegExp(type.validationPattern);
      if (!regex.test(type.value)) {
        return;
      }
    }
    
    this.notificationTypeService.updateNotificationType({
      ...type,
      value: type.value
    });
  }
}
