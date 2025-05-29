import { Component } from '@angular/core';
import { DatabaseService } from './services/database.service';
import { Platform, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterLink, RouterLinkActive, RouterOutlet]
})
export class AppComponent {
  public appPages = [
    { title: 'Customers', url: '/customer-list', icon: 'people' },
    { title: 'Tasks', url: '/task-list', icon: 'checkbox' },
    { title: 'Task Types', url: '/task-management/task-types', icon: 'settings' }
  ];

  constructor(
    private platform: Platform,
    private databaseService: DatabaseService,
    private notificationService: NotificationService
  ) {
    this.initializeApp();
  }

  async initializeApp() {
    console.log('Initializing app...');
    try {
      // Request notification permissions on app start
      const hasPermission = await this.notificationService.hasNotificationPermissions();
      console.log('Current notification permission status:', hasPermission ? 'granted' : 'denied');
      
      if (!hasPermission) {
        console.log('Requesting notification permissions...');
        const permissionGranted = await this.notificationService.requestNotificationPermissions();
        console.log('Notification permission request result:', permissionGranted ? 'granted' : 'denied');
      }

      // Register notification listeners
      await this.notificationService.registerNotificationListeners();
      console.log('App initialization complete');
    } catch (error) {
      console.error('Error during app initialization:', error);
    }
  }
}
