import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Browser } from '@capacitor/browser';

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

        <ion-item button (click)="openSupportPage()" detail>
          <ion-icon name="cafe-outline" slot="start"></ion-icon>
          <ion-label>
            <h2>Support the App ☕</h2>
            <p>Buy me a coffee to help keep RoutineLoop going</p>
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
    window.open('https://routineloop.app/privacy', '_blank');
  }

  openSupport(): void {
    window.open('mailto:support@routineloop.app', '_blank');
  }

  async openSupportPage(): Promise<void> {
    try {
      await Browser.open({ url: 'https://ko-fi.com/routineloop' });
    } catch (error) {
      console.error('Error opening support page:', error);
      // Fallback to window.open if Browser fails
      window.open('https://ko-fi.com/routineloop', '_blank');
    }
  }
} 