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
            <h2>Categories</h2>
            <p>Manage routine categories</p>
          </ion-label>
        </ion-item>

        <ion-item routerLink="notification-types" detail>
          <ion-icon name="notifications-outline" slot="start"></ion-icon>
          <ion-label>
            <h2>Notification Settings</h2>
            <p>Configure notification methods and preferences</p>
          </ion-label>
        </ion-item>

        <ion-item button (click)="openPrivacyPolicy()" detail>
          <ion-icon name="document-text-outline" slot="start"></ion-icon>
          <ion-label>
            <h2>Privacy Policy</h2>
            <p>How we handle your data</p>
          </ion-label>
        </ion-item>

        <ion-item button (click)="openSupport()" detail>
          <ion-icon name="help-outline" slot="start"></ion-icon>
          <ion-label>
            <h2>Help &amp; Support</h2>
            <p>Contact us or report an issue</p>
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

  openPrivacyPolicy(): void {
    window.open('https://alhessan.github.io/reminderApp/privacy-policy.html', '_blank');
  }

  openSupport(): void {
    window.open('mailto:engalhessan@gmail.com', '_blank');
  }
} 