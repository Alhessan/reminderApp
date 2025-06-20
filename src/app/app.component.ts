import { Component } from '@angular/core';
import { DatabaseService } from './services/database.service';
import { Platform, IonicModule, AlertController, NavController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, Router } from '@angular/router'; // Add Router import
import { NotificationService } from './services/notification.service';
import { addIcons } from 'ionicons';
import { 
  peopleOutline, 
  checkboxOutline, 
  settingsOutline, 
  notificationsOutline,
  documentTextOutline,
  informationCircleOutline,
  alertOutline,
  mailOutline,
  chatboxOutline,
  chevronBackOutline,
  notificationsOffOutline,
  refreshOutline,
  cashOutline,
  createOutline,
  alarmOutline,
  sunnyOutline,
  moonOutline,
  calendarOutline,
  timeOutline,
  repeatOutline,
  arrowForwardOutline,
  chevronForwardOutline,
  addOutline,
  closeOutline,
  ellipsisHorizontalOutline,
  ellipsisVerticalOutline,
  menuOutline,
  todayOutline,
  cogOutline,
  helpCircleOutline,
  listOutline,
  caretDownOutline,
  caretUpOutline,
  saveOutline,
  trashOutline,
  warningOutline,
  buildOutline,
  addCircleOutline,
  calendarNumberOutline,
  hourglassOutline,
  sunny,
  checkmarkCircleOutline,
  personAddOutline,
  paperPlaneOutline,
  logoWhatsapp,
  archiveOutline,
  playOutline,
  checkmarkOutline,
  playForwardOutline,
  add,
  funnelOutline
} from 'ionicons/icons';
import { SampleDataService } from './services/sample-data.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    IonicModule, 
    CommonModule, 
    RouterLink,
    RouterOutlet
  ]
})
export class AppComponent {
  public appPages = [
    { title: 'Customers', url: '/customers', icon: 'people-outline' },
    { title: 'Tasks', url: '/tasks', icon: 'checkbox-outline' },
    { title: 'Task Types', url: '/settings/task-types', icon: 'settings-outline' },
    { title: 'Notification Methods', url: '/settings/notification-types', icon: 'notifications-outline' }
  ];

  constructor(
    private platform: Platform,
    private databaseService: DatabaseService,
    private notificationService: NotificationService,
    private alertController: AlertController,
    private sampleDataService: SampleDataService,
    public router: Router,
    private navController: NavController
  ) {
    this.initializeApp();
    // Register Ionic icons
    addIcons({
      'people-outline': peopleOutline,
      'checkbox-outline': checkboxOutline,
      'settings-outline': settingsOutline,
      'notifications-outline': notificationsOutline,
      'document-text-outline': documentTextOutline,
      'information-circle-outline': informationCircleOutline,
      'alert-outline': alertOutline,
      'mail-outline': mailOutline,
      'chatbox-outline': chatboxOutline,
      'chevron-back-outline': chevronBackOutline,
      'notifications-off-outline': notificationsOffOutline,
      'refresh-outline': refreshOutline,
      'cash-outline': cashOutline,
      'create-outline': createOutline,
      'alarm-outline': alarmOutline,
      'sunny-outline': sunnyOutline,
      'moon-outline': moonOutline,
      'calendar-outline': calendarOutline,
      'time-outline': timeOutline,
      'repeat-outline': repeatOutline,
      'arrow-forward-outline': arrowForwardOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'add-outline': addOutline,
      'close-outline': closeOutline,
      'ellipsis-horizontal-outline': ellipsisHorizontalOutline,
      'ellipsis-vertical': ellipsisVerticalOutline,
      'menu-outline': menuOutline,
      'today-outline': todayOutline,
      'cog-outline': cogOutline,
      'help-outline': helpCircleOutline,
      'list-outline': listOutline,
      'caret-down-outline': caretDownOutline,
      'caret-up-outline': caretUpOutline,
      'save-outline': saveOutline,
      'trash-outline': trashOutline,
      'warning-outline': warningOutline,
      'build-outline': buildOutline,
      'add-circle-outline': addCircleOutline,
      'calendar-number-outline': calendarNumberOutline,
      'hourglass-outline': hourglassOutline,
      'sunny': sunny,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'person-add-outline': personAddOutline,
      'paper-plane-outline': paperPlaneOutline,
      'logo-whatsapp': logoWhatsapp,
      'archive-outline': archiveOutline,
      'play-outline': playOutline,
      'checkmark-outline': checkmarkOutline,
      'forward-outline': playForwardOutline,
      'add': add,
      'funnel-outline': funnelOutline
    });
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

  // Update navigation helper method to ensure proper component destruction
  async navigateTo(path: string) {
    try {
      // Force destroy any existing views
      await this.navController.navigateRoot(path, {
        animated: true,
        animationDirection: 'forward'
      });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }

  // Update router outlet event handlers to ensure proper cleanup
  onRouterOutletActivate(event: any) {
    console.log('Router outlet activated with component:', event.constructor.name);
    // Ensure the view is at the root level
    if (this.router.url === event.router?.url) {
      this.navController.navigateRoot(this.router.url, {
        animated: false,
        replaceUrl: true
      });
    }
  }

  onRouterOutletDeactivate(event: any) {
    console.log('Router outlet deactivated from component:', event.constructor.name);
    // Ensure cleanup of any resources
    if (event.ngOnDestroy) {
      event.ngOnDestroy();
    }
  }

  async reinitializeDatabase() {
    const alert = await this.alertController.create({
      header: 'Confirm Reset',
      message: 'This will reset the database to its initial state. All your data will be lost. Are you sure?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reset',
          role: 'destructive',
          handler: async () => {
            try {
              await this.databaseService.reinitializeDatabase();
              const successAlert = await this.alertController.create({
                header: 'Success',
                message: 'Database has been reinitialized successfully.',
                buttons: ['OK']
              });
              await successAlert.present();
            } catch (error) {
              const errorAlert = await this.alertController.create({
                header: 'Error',
                message: 'Failed to reinitialize database. Please try again.',
                buttons: ['OK']
              });
              await errorAlert.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async generateSampleData() {
    const alert = await this.alertController.create({
      header: 'Generate Sample Data',
      message: 'This will create sample tasks with different states. Continue?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Generate',
          handler: async () => {
            try {
              await this.sampleDataService.generateSampleTasks();
              const successAlert = await this.alertController.create({
                header: 'Success',
                message: 'Sample tasks have been generated successfully.',
                buttons: ['OK']
              });
              await successAlert.present();
            } catch (error) {
              const errorAlert = await this.alertController.create({
                header: 'Error',
                message: 'Failed to generate sample tasks. Please try again.',
                buttons: ['OK']
              });
              await errorAlert.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }
}