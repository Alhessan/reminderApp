import { Component, NgZone, Optional, OnDestroy } from '@angular/core';
import { DatabaseService } from './services/database.service';
import { Platform, IonicModule, AlertController, NavController, IonRouterOutlet } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterOutlet, Router } from '@angular/router';
import { App } from '@capacitor/app';
import { NotificationService } from './services/notification.service';
import { environment } from '../environments/environment';
import packageJson from '../../package.json';
import { SampleDataService } from './services/sample-data.service';
import { TaskCycleService } from './services/task-cycle.service';
import { TaskService } from './services/task.service';
import { AlarmService } from './services/alarm.service';
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
  chevronUpOutline,
  chevronDownOutline,
  analyticsOutline,
  flameOutline,
  trophyOutline,
  starOutline,
  trendingUpOutline,
  barChartOutline,
  reloadOutline,
  pauseOutline,
  checkmarkDoneOutline,
  alertCircleOutline,
  arrowBackOutline,
  closeCircleOutline,
  ellipseOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    IonicModule, 
    CommonModule,
    FormsModule,
    RouterLink,
    RouterOutlet
  ]
})
export class AppComponent implements OnDestroy {
  /** Shown in side menu; keep in sync with releases by bumping root `package.json` `version`. */
  readonly appVersion = packageJson.version;

  /** Dev menu: number of days to shift open cycles into the past (cycle engine QA). */
  devSimulateDaysElapsed = 5;

  public appPages = [
    { title: 'Contacts', url: '/customers', icon: 'people-outline' },
    { title: 'Tasks', url: '/tasks', icon: 'checkbox-outline' },
    { title: 'Task Categories', url: '/settings/task-types', icon: 'settings-outline' },
    { title: 'Notification Methods', url: '/settings/notification-types', icon: 'notifications-outline' }
  ];

  // Logo images for branding — switches between dark/light mode (Phase 6 US4)
  logoLight = '/assets/logo/text-logo-light.png';
  logoDark = '/assets/logo/text-logo-dark.png';

  /** Returns the logo path based on current color scheme. */
  get currentLogo(): string {
    return this.isDarkMode ? this.logoDark : this.logoLight;
  }

  /** Whether the app is running in development (non-production) mode. */
  get isDevMode(): boolean {
    return !environment.production;
  }

  private isDarkMode = false;
  /** MediaQueryList reference for dark mode listener - stored so it can be removed on destroy */
  private darkModeMediaQuery: MediaQueryList | null = null;
  /** Event listener reference for dark mode changes - stored so it can be removed on destroy */
  private darkModeChangeHandler: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null = null;

  constructor(
    private platform: Platform,
    private databaseService: DatabaseService,
    private notificationService: NotificationService,
    private alarmService: AlarmService,
    private alertController: AlertController,
    private sampleDataService: SampleDataService,
    public router: Router,
    private navController: NavController,
    private taskCycleService: TaskCycleService,
    private taskService: TaskService,
    private ngZone: NgZone,
    @Optional() private routerOutlet?: IonRouterOutlet
  ) {
    // Register Ionic icons (required for Ionic 8 - icons must be explicitly registered)
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
      'play-forward-outline': playForwardOutline,
      'pause-outline': pauseOutline,
      'checkmark-done-outline': checkmarkDoneOutline,
      'alert-circle-outline': alertCircleOutline,
      'arrow-back-outline': arrowBackOutline,
      'close-circle-outline': closeCircleOutline,
      'ellipse-outline': ellipseOutline,
      'add': add,
      'funnel-outline': funnelOutline,
      'chevron-up': chevronUp,
      'chevron-down': chevronDown,
      'chevron-up-outline': chevronUpOutline,
      'chevron-down-outline': chevronDownOutline,
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
    // Detect and watch dark/light mode for logo switching
    this.updateDarkMode();
    this.darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    // Store handler reference so it can be removed on destroy
    this.darkModeChangeHandler = () => {
      this.ngZone.run(() => this.updateDarkMode());
    };
    this.darkModeMediaQuery.addEventListener('change', this.darkModeChangeHandler);

    // For web/browser, proceed without waiting for platform ready
    if (!this.platform.is('cordova') && !this.platform.is('capacitor')) {
      await this.performInitialization();
      this.handleFirstLaunchRouting();
      return;
    }

    // Wait for platform to be fully ready (for native platforms)
    await this.platform.ready();
    await this.performInitialization();
    this.handleFirstLaunchRouting();
  }

  private updateDarkMode(): void {
    this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  ngOnDestroy() {
    // Remove dark mode event listener to prevent memory leaks
    if (this.darkModeMediaQuery && this.darkModeChangeHandler) {
      this.darkModeMediaQuery.removeEventListener('change', this.darkModeChangeHandler);
    }
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
          // Ensure every active task has one open cycle (post-migration v6)
          await this.taskCycleService.ensureOpenCyclesForActiveTasks().catch(err =>
            console.warn('[App] ensureOpenCyclesForActiveTasks:', err)
          );
          await this.taskCycleService.loadTaskList().catch(err =>
            console.warn('[App] loadTaskList after startup:', err)
          );
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

          // Preload alarm sound for alarm notifications
          await this.alarmService.preloadAlarm().catch(err =>
            console.warn('[App] Preload alarm:', err)
          );

          // loadTaskList (above) already reschedules notifications via TaskService
          
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
   * Redirect to onboarding if this is the user's first launch.
   * Reads the 'onboarding_complete' flag from localStorage.
   */
  private handleFirstLaunchRouting(): void {
    const onboardingComplete = localStorage.getItem('onboarding_complete');
    if (!onboardingComplete) {
      // First launch — navigate to onboarding (replaces history so back button doesn't return)
      this.navController.navigateRoot('/onboarding', { replaceUrl: true });
    }
    // else: onboarding already done, app continues to /tasks (default route)
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

    this.platform.resume.subscribe(async () => {
      if (shouldLog) {
        console.log('[App] App resumed');
      }
      try {
        await this.taskCycleService.loadTaskList();
      } catch (e) {
        console.warn('[App] Resume refresh:', e);
      }
    });

    // Handle back button (Android) - Ionic best practice
    // Priority 10: Runs after overlays (100) and menu (99), but before navigation (0)
    // This allows modals/menus to close first, then we handle back navigation
    this.platform.backButton.subscribeWithPriority(10, async () => {
      // Check if we can go back in the navigation stack
      if (this.routerOutlet?.canGoBack()) {
        // Pop the current view off the navigation stack
        await this.routerOutlet.pop();
      } else if (this.router.url !== '/tasks') {
        // Not on root page and can't go back via outlet — navigate to tasks root
        await this.navController.navigateRoot('/tasks', { animated: true });
      }
      // If on root page (/tasks), do nothing — don't exit the app
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

  /** Dev-only: shift all open cycle deadlines back N days and run lapse/backfill (see Cycle Engine plan). */
  async devSimulateElapsed(): Promise<void> {
    const raw = Number(this.devSimulateDaysElapsed);
    const days = Math.min(90, Math.max(1, Math.floor(Number.isFinite(raw) ? raw : 1)));
    try {
      await this.taskCycleService.simulateDaysElapsed(days);
      const ok = await this.alertController.create({
        header: 'Dev',
        message: `Simulated ${days} day(s): open cycles moved back; lapse/backfill ran.`,
        buttons: ['OK'],
      });
      await ok.present();
    } catch (error) {
      console.error('[App] devSimulateElapsed:', error);
      const err = await this.alertController.create({
        header: 'Error',
        message: 'Simulate failed. See console.',
        buttons: ['OK'],
      });
      await err.present();
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

  onRouterOutletDeactivate(_event: unknown) {
    // Angular calls ngOnDestroy automatically; do not call it here (would cause double cleanup / crashes).
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