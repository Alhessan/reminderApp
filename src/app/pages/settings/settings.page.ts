import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <router-outlet></router-outlet>
      <ion-list *ngIf="!isChildRoute">
        <ion-item routerLink="task-types" detail>
          <ion-icon name="list-outline" slot="start"></ion-icon>
          <ion-label>
            <h2>Task Types</h2>
            <p>Manage task categories and types</p>
          </ion-label>
        </ion-item>

        <ion-item routerLink="notification-types" detail>
          <ion-icon name="notifications-outline" slot="start"></ion-icon>
          <ion-label>
            <h2>Notification Settings</h2>
            <p>Configure notification methods and preferences</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  `
})
export class SettingsPage {
  get isChildRoute(): boolean {
    return window.location.pathname !== '/settings';
  }
} 