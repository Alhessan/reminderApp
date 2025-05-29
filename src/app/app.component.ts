import { Component } from '@angular/core';
import { DatabaseService } from './services/database.service';
import { Platform, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'; // Added RouterOutlet

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true, // Added standalone: true
  imports: [IonicModule, CommonModule, RouterLink, RouterLinkActive, RouterOutlet] // Added RouterOutlet
})
export class AppComponent {
  public appPages = [
    { title: 'Customers', url: '/customer-list', icon: 'people' },
    { title: 'Tasks', url: '/task-list', icon: 'checkbox' },
    // Add more pages here as needed
  ];

  constructor(
    private platform: Platform,
    private databaseService: DatabaseService
  ) {
    this.initializeApp();
  }

  async initializeApp() {
    await this.platform.ready();
    try {
      await this.databaseService.initializeDatabase();
      console.log('Database initialized successfully from AppComponent');
    } catch (error) {
      console.error('Error initializing database from AppComponent:', error);
      // Handle initialization error, perhaps show a message to the user
    }
  }
}
