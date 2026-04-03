import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule, AlertController, NavController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { LocalNotifications } from '@capacitor/local-notifications';
import { addIcons } from 'ionicons';
import {
  refreshCircleOutline,
  timeOutline,
  addCircleOutline,
  chevronForwardOutline,
  informationCircleOutline
} from 'ionicons/icons';

export interface OnboardingSlide {
  icon: string;
  title: string;
  body: string;
  showButton?: boolean;
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss']
})
export class OnboardingPage implements OnInit {
  slides: OnboardingSlide[] = [
    {
      icon: 'refresh-circle-outline',
      title: 'Your routines, on autopilot',
      body: 'RoutineLoop helps you build lasting habits by tracking recurring tasks and reminding you at the right time, every time.'
    },
    {
      icon: 'time-outline',
      title: 'Set it and forget it',
      body: 'Create your routines, set a schedule, and let RoutineLoop handle the reminders. Complete your cycles to build streaks and see your progress over time.'
    },
    {
      icon: 'add-circle-outline',
      title: 'Ready to start?',
      body: "Tap the + button to create your first routine. We'll guide you through setting up your schedule and reminders.",
      showButton: true
    }
  ];

  currentIndex = 0;
  isLastSlide = false;

  slideOpts = {
    autoHeight: false,
    touchStartPreventDefault: false,
    passiveListeners: true,
  };

  constructor(
    private alertController: AlertController,
    private navController: NavController
  ) {
    addIcons({
      'refresh-circle-outline': refreshCircleOutline,
      'time-outline': timeOutline,
      'add-circle-outline': addCircleOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'information-circle-outline': informationCircleOutline
    });
  }

  ngOnInit(): void {
    // Ensure slides start fresh
    this.currentIndex = 0;
    this.isLastSlide = false;
  }

  /**
   * Called by IonSlides when the active slide changes.
   */
  onSlideDidChange(event: any): void {
    const slides = event.target;
    slides.getActiveIndex().then((index: number) => {
      this.currentIndex = index;
      this.isLastSlide = index === this.slides.length - 1;
    });
  }

  /**
   * Called by the "Let's Go" button on the final slide.
   * Marks onboarding complete and navigates to the task list.
   */
  async onGetStarted(): Promise<void> {
    // 1. Show notification permission alert
    await this.showNotificationPermissionAlert();
  }

  /**
   * Show an Ionic Alert explaining why notifications are needed,
   * then request permission (denial is gracefully handled).
   */
  private async showNotificationPermissionAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Enable Reminders',
      message: 'RoutineLoop needs to send you reminders so you never miss a routine. Is that okay?',
      cssClass: 'onboarding-permission-alert',
      buttons: [
        {
          text: 'Not Now',
          role: 'cancel',
          handler: () => {
            // Deny gracefully — do not block
            this.completeOnboarding();
          }
        },
        {
          text: 'Enable',
          handler: async () => {
            await this.requestNotificationPermission();
            this.completeOnboarding();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Request notification permission via Capacitor.
   * Gracefully handles denial (native dialog or browser settings).
   */
  private async requestNotificationPermission(): Promise<void> {
    try {
      const result = await LocalNotifications.requestPermissions();
      console.log('[Onboarding] Notification permission result:', result);
    } catch (err) {
      // Permission denied or platform not supported — log and continue
      console.warn('[Onboarding] Could not request notification permission:', err);
    }
  }

  /**
   * Marks onboarding complete and navigates to the task list.
   */
  private completeOnboarding(): void {
    localStorage.setItem('onboarding_complete', 'true');
    // Navigate to task list — use replaceUrl so user can't go back to onboarding
    this.navController.navigateRoot('/tasks', { replaceUrl: true });
  }

  /**
   * Skip onboarding and go directly to task list.
   * Does NOT request notification permission.
   */
  skip(): void {
    localStorage.setItem('onboarding_complete', 'true');
    this.navController.navigateRoot('/tasks', { replaceUrl: true });
  }
}
