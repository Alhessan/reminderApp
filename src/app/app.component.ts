import { Component } from '@angular/core';
import { DatabaseService } from './services/database.service';
import { Platform, IonicModule, AlertController, NavController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, Router } from '@angular/router'; // Add Router import
import { NotificationService } from './services/notification.service';
import { environment } from '../environments/environment';
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
  funnelOutline,
  chevronUp,
  chevronDown,
  analyticsOutline,
  flameOutline,
  trophyOutline,
  starOutline,
  trendingUpOutline,
  barChartOutline,
  reloadOutline
} from 'ionicons/icons';
import { SampleDataService } from './services/sample-data.service';
import { TaskCycleService } from './services/task-cycle.service';
import { TaskService } from './services/task.service';

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
    { title: 'Contacts', url: '/customers', icon: 'people-outline' },
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
    private navController: NavController,
    private taskCycleService: TaskCycleService,
    private taskService: TaskService
  ) {
    // Register Ionic icons first (synchronous operation)
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
      'funnel-outline': funnelOutline,
      'chevron-up': chevronUp,
      'chevron-down': chevronDown,
      'analytics-outline': analyticsOutline,
      'flame-outline': flameOutline,
      'trophy-outline': trophyOutline,
      'star-outline': starOutline,
      'trending-up-outline': trendingUpOutline,
      'bar-chart-outline': barChartOutline,
      'reload-outline': reloadOutline
    });
    
    // Initialize app (will wait for platform ready inside initializeApp)
    this.initializeApp();
    
    // Handle app lifecycle events
    this.setupAppLifecycle();
  }

  /**
   * Initialize app - Best Practice: Wait for platform to be ready
   * This ensures all native plugins are available before use
   */
  async initializeApp() {
    // For web/browser, proceed without waiting for platform ready
    if (!this.platform.is('cordova') && !this.platform.is('capacitor')) {
      await this.performInitialization();
      return;
    }

    // Wait for platform to be fully ready (for native platforms)
    await this.platform.ready();
    await this.performInitialization();
  }

  /**
   * Perform actual initialization tasks
   * Optimized to not block UI thread - uses requestIdleCallback or setTimeout
   */
  private async performInitialization(): Promise<void> {
    const shouldLog = environment.enableLogging && environment.enableConsoleLogs;
    
    if (shouldLog) {
      console.log('[App] Starting initialization...');
    }

    // Defer heavy initialization to allow UI to render first
    // Use requestIdleCallback if available (better for performance), otherwise setTimeout
    const deferInit = (callback: () => void) => {
      if (typeof (window as any).requestIdleCallback === 'function') {
        (window as any).requestIdleCallback(callback, { timeout: 2000 });
      } else {
        setTimeout(callback, 500); // Longer delay to ensure UI renders
      }
    };

    return new Promise<void>((resolve, reject) => {
      deferInit(async () => {
        try {
          if (shouldLog) {
            console.log('[App] Performing background initialization...');
          }

          // Initialize database (non-blocking, idempotent)
          await this.databaseService.initializeDatabase();
          
          if (shouldLog) {
            console.log('[App] Database initialized');
          }

          // Request notification permissions first so reschedule can run with permission on device
          const hasPermission = await this.notificationService.hasNotificationPermissions();
          if (shouldLog) {
            console.log('[App] Notification permission status:', hasPermission ? 'granted' : 'denied');
          }
          if (!hasPermission) {
            if (shouldLog) console.log('[App] Requesting notification permissions...');
            await this.notificationService.requestNotificationPermissions().catch(err => {
              console.error('[App] Error requesting permissions:', err);
            });
            if (shouldLog) {
              const nowGranted = await this.notificationService.hasNotificationPermissions();
              console.log('[App] After request:', nowGranted ? 'granted' : 'denied');
            }
          }

          // Register listeners and create Android channel before any scheduling
          await this.notificationService.registerNotificationListeners();

          // Reschedule all push notifications (e.g. after app restart)
          await this.taskService.rescheduleAllPendingNotifications().catch(err =>
            console.warn('[App] Reschedule notifications:', err)
          );
          if (shouldLog) console.log('[App] Pending notifications rescheduled');
          
          if (shouldLog) {
            console.log('[App] Initialization complete');
          }
          
          resolve();
        } catch (error) {
          // Always log errors, even in production
          console.error('[App] Error during initialization:', error);
          
          // Show user-friendly error message (non-blocking)
          this.alertController.create({
            header: 'Initialization Error',
            message: 'The app encountered an error during startup. Some features may not work correctly.',
            buttons: ['OK']
          }).then(alert => alert.present()).catch(alertError => {
            console.error('[App] Failed to show error alert:', alertError);
          });
          
          reject(error);
        }
      });
    });
  }

  /**
   * Setup app lifecycle event handlers (Ionic best practice)
   */
  private setupAppLifecycle(): void {
    const shouldLog = environment.enableLogging && environment.enableConsoleLogs;
    
    // Handle app pause (when user switches to another app)
    this.platform.pause.subscribe(() => {
      if (shouldLog) {
        console.log('[App] App paused');
      }
      // You can save state, pause timers, etc. here
      // Example: Save current form data, pause background tasks
    });

    // Handle app resume (when user returns to the app)
    this.platform.resume.subscribe(() => {
      if (shouldLog) {
        console.log('[App] App resumed');
      }
      // You can refresh data, restart timers, etc. here
      // Example: Refresh task list, check for new notifications
    });

    // Handle back button (Android) - Ionic best practice
    this.platform.backButton.subscribeWithPriority(10, () => {
      // Handle back button if needed
      // You can add custom back button logic here
      // Example: Close modals, navigate back, or exit app
      const currentUrl = this.router.url;
      if (currentUrl === '/' || currentUrl === '/home') {
        // If at root, you might want to show exit confirmation
        // For now, let default behavior handle it
        return;
      }
      // Otherwise, let Ionic handle navigation
    });
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
      header: 'Reset Database',
      message: 'This will reset the database to its initial state. All your current data will be lost. Are you sure?',
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
                message: 'Database has been reset successfully.',
                buttons: ['OK']
              });
              await successAlert.present();
            } catch (error) {
              console.error('Error resetting database:', error);
              const errorAlert = await this.alertController.create({
                header: 'Error',
                message: 'Failed to reset database. Please try again.',
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
      message: 'This will reset the database and create fresh sample data. All your current data will be lost. Continue?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Generate',
          role: 'destructive',
          handler: async () => {
            try {
              // First reinitialize the database (clean slate)
              await this.databaseService.reinitializeDatabase();
              // Then generate sample data
              await this.sampleDataService.generateSampleTasks();
              
              const successAlert = await this.alertController.create({
                header: 'Success',
                message: 'Database has been reset and sample data generated successfully.',
                buttons: ['OK']
              });
              await successAlert.present();
            } catch (error) {
              console.error('Error generating sample data:', error);
              const errorAlert = await this.alertController.create({
                header: 'Error',
                message: 'Failed to generate sample data. Please try again.',
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

  async refreshTaskList() {
    try {
      // Check if we're currently on the task list page
      if (this.router.url.includes('/tasks')) {
        await this.taskCycleService.loadTaskList();
        
        // Show a brief success message
        const successAlert = await this.alertController.create({
          header: 'Refreshed',
          message: 'Task list has been refreshed successfully.',
          buttons: ['OK']
        });
        await successAlert.present();
      } else {
        // Navigate to task list and refresh
        await this.navigateTo('/tasks');
        setTimeout(async () => {
          await this.taskCycleService.loadTaskList();
        }, 500); // Small delay to ensure navigation is complete
      }
    } catch (error) {
      console.error('Error refreshing task list:', error);
      const errorAlert = await this.alertController.create({
        header: 'Error',
        message: 'Failed to refresh task list. Please try again.',
        buttons: ['OK']
      });
      await errorAlert.present();
    }
  }
}