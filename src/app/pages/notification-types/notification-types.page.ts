import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Location } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { NotificationTypeService } from '../../services/notification-type.service';
import { NotificationType } from '../../models/notification-type.model';
import { Observable, take } from 'rxjs';
import { AlertController } from '@ionic/angular';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-notification-types',
  templateUrl: './notification-types.page.html',
  styleUrls: ['./notification-types.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule, ReactiveFormsModule],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ height: '0', opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-in-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', style({ height: '0', opacity: 0, overflow: 'hidden' }))
      ])
    ])
  ]
})
export class NotificationTypesPage implements OnInit {
  notificationTypes$: Observable<NotificationType[]>;
  notificationForm: FormGroup;
  showAdditionalFields = false;
  isSubmitting = false;
  showInfoSection = false; // Collapsed by default
  private enabledTypes: Set<string> = new Set();

  private readonly controlMapping: Record<string, string> = {
    'email': 'emailAddress',
    'sms': 'phoneNumber',
    'whatsapp': 'whatsappNumber',
    'telegram': 'telegramUsername'
  };

  private readonly reverseControlMapping: Record<string, string> = {
    'emailAddress': 'email',
    'phoneNumber': 'sms',
    'whatsappNumber': 'whatsapp',
    'telegramUsername': 'telegram'
  };

  constructor(
    private notificationTypeService: NotificationTypeService,
    private formBuilder: FormBuilder,
    private alertController: AlertController,
    private location: Location
  ) {
    this.notificationForm = this.formBuilder.group({
      emailAddress: ['', [Validators.email]],
      phoneNumber: ['', [Validators.pattern('^\\+?[1-9]\\d{1,14}$')]],
      whatsappNumber: ['', [Validators.pattern('^\\+?[1-9]\\d{1,14}$')]],
      telegramUsername: ['', [Validators.pattern('^[a-zA-Z0-9_]{5,32}$')]]
    });

    this.notificationTypes$ = this.notificationTypeService.getNotificationTypes();
  }

  async ngOnInit() {
    // First load notification types to get enabled status
    this.notificationTypes$.pipe(take(1)).subscribe(async types => {
      console.log('Notification types loaded:', types);
      types.forEach(type => {
        if (type.isEnabled) {
          this.enabledTypes.add(type.key);
        }
      });
      
      // After we know which types are enabled, load the notification settings
      await this.loadNotificationSettings();
      this.updateAdditionalFieldsVisibility();
    });
  }

  // TrackBy function for better performance with *ngFor
  trackByTypeKey(index: number, type: NotificationType): string {
    return type.key;
  }

  async loadNotificationSettings() {
    try {
      const settings = await this.notificationTypeService.getNotificationSettings();
      console.log('Loaded notification settings:', settings);
      console.log('Current form controls:', Object.keys(this.notificationForm.controls));
      console.log('Current form values before patch:', this.notificationForm.value);
      
      if (settings && Object.keys(settings).length > 0) {
        // Patch form values and mark fields as touched to show validation
        this.notificationForm.patchValue(settings);
        console.log('Form values after patch:', this.notificationForm.value);
        
        Object.keys(settings).forEach(key => {
          const control = this.notificationForm.get(key);
          if (control) {
            control.markAsTouched();
            console.log(`Marked ${key} as touched with value:`, control.value);
          }
        });

        // Show additional fields if we have saved values, regardless of enabled status
        this.updateAdditionalFieldsVisibility();
      } else {
        console.log('No notification settings found or settings object is empty');
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      await this.presentToast('Failed to load notification settings.', 'danger');
    }
  }

  getEnabledCount(): number {
    return this.enabledTypes.size;
  }

  isTypeEnabled(typeKey: string): boolean {
    return this.enabledTypes.has(typeKey);
  }

  toggleInfoSection() {
    this.showInfoSection = !this.showInfoSection;
  }

  goBack() {
    this.location.back();
  }



  async onToggleChange(type: NotificationType) {
    const newEnabledState = !this.isTypeEnabled(type.key);

    if (newEnabledState && this.getEnabledCount() >= 3) {
      await this.presentToast('You can only enable up to 3 notification methods.', 'warning');
      return;
    }

    // Update local state immediately for instant UI response
    if (newEnabledState) {
      this.enabledTypes.add(type.key);
    } else {
      this.enabledTypes.delete(type.key);
      // Clear the form value when disabling
      if (type.requiresValue) {
        const controlName = this.getControlName(type.key);
        if (controlName) {
          this.notificationForm.get(controlName)?.setValue('');
          this.notificationForm.get(controlName)?.markAsUntouched();
          // Remove validators when disabling
          this.notificationForm.get(controlName)?.setValidators(null);
          this.notificationForm.get(controlName)?.updateValueAndValidity();
        }
      }
    }

    // Update UI immediately
    this.updateAdditionalFieldsVisibility();

    try {
      const updatedType = { ...type, isEnabled: newEnabledState };
      await this.notificationTypeService.updateNotificationType(updatedType);

      // Only save form values if validation passes
      const formValues = this.notificationForm.value;
      await this.notificationTypeService.saveNotificationSettings(formValues);

      // Force update the notification types observable
      this.notificationTypes$ = this.notificationTypeService.getNotificationTypes();

      // Show success message
      await this.presentToast(`${type.name} notifications ${newEnabledState ? 'enabled' : 'disabled'}.`, 'success');
    } catch (error) {
      console.error('Error toggling notification type:', error);
      await this.presentToast('Failed to update notification settings.', 'danger');
      
      // Revert the local state on error
      if (newEnabledState) {
        this.enabledTypes.delete(type.key);
      } else {
        this.enabledTypes.add(type.key);
        // Restore the form value if we reverted
        if (type.requiresValue) {
          const controlName = this.getControlName(type.key);
          if (controlName) {
            // Re-apply validators when reverting
            this.notificationForm.get(controlName)?.setValidators(this.getValidatorsForType(type.key));
            this.notificationForm.get(controlName)?.updateValueAndValidity();
          }
        }
      }
      // Update UI after reverting
      this.updateAdditionalFieldsVisibility();
    }
  }

  private getControlName(typeKey: string): string {
    return this.controlMapping[typeKey] || '';
  }

  private getTypeKey(controlName: string): string {
    return this.reverseControlMapping[controlName] || '';
  }

  private getValidatorsForType(typeKey: string): ValidatorFn[] {
    switch (typeKey) {
      case 'email':
        return [Validators.required, Validators.email];
      case 'sms':
      case 'whatsapp':
        return [
          Validators.required,
          Validators.pattern('^\\+?[1-9]\\d{1,14}$')
        ];
      case 'telegram':
        return [
          Validators.required,
          Validators.pattern('^[a-zA-Z0-9_]{5,32}$')
        ];
      default:
        return [];
    }
  }

  private updateAdditionalFieldsVisibility() {
    // Show additional fields only if at least one notification type that requires a value is enabled
    const hasEnabledTypesWithValues = Array.from(this.enabledTypes).some(type => 
      Object.keys(this.controlMapping).includes(type)
    );

    this.showAdditionalFields = hasEnabledTypesWithValues;
    
    console.log('Additional fields visibility:', {
      hasEnabledTypesWithValues,
      showAdditionalFields: this.showAdditionalFields,
      enabledTypes: Array.from(this.enabledTypes),
      formValues: this.notificationForm.value
    });

    // Update validators based on enabled types
    Object.keys(this.notificationForm.controls).forEach(controlName => {
      const control = this.notificationForm.get(controlName);
      if (control) {
        const typeKey = this.getTypeKey(controlName);
        if (typeKey && this.isTypeEnabled(typeKey)) {
          control.setValidators(this.getValidatorsForType(typeKey));
        } else {
          control.setValidators(null);
        }
        control.updateValueAndValidity();
      }
    });
  }

  async saveSettings() {
    if (this.showAdditionalFields && this.notificationForm.invalid) {
      this.notificationForm.markAllAsTouched();
      this.presentToast('Please fill in all required fields correctly.', 'danger');
      return;
    }

    this.isSubmitting = true;

    try {
      // Get form values directly
      const formValues = this.notificationForm.value;
      console.log('Form values to save:', formValues);
      
      await this.notificationTypeService.saveNotificationSettings(formValues);
      await this.presentToast('Notification settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      await this.presentToast('Failed to save settings. Please try again.', 'danger');
    } finally {
      this.isSubmitting = false;
    }
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const iconMap = {
      'success': '✓',
      'warning': '⚠',
      'danger': '✕'
    };

    const alert = await this.alertController.create({
      header: `${iconMap[color]} ${color.charAt(0).toUpperCase() + color.slice(1)}`,
      message: message,
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
          cssClass: `alert-button-${color}`
        }
      ],
      cssClass: `custom-alert alert-${color}`,
      backdropDismiss: true,
      animated: true
    });

    await alert.present();
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      alert.dismiss();
    }, 3000);
  }

  getValidationError(typeKey: string): string {
    const controlName = this.getControlName(typeKey);
    if (!controlName) return '';

    const control = this.notificationForm.get(controlName);
    if (!control?.touched || !control?.errors) return '';

    let errorMessage = '';
    this.notificationTypes$.pipe(take(1)).subscribe(types => {
      const type = types.find(t => t.key === typeKey);
      errorMessage = type?.validationError || this.getDefaultError(typeKey);
    });

    return errorMessage;
  }

  private getDefaultError(typeKey: string): string {
    switch (typeKey) {
      case 'email': return 'Please enter a valid email address';
      case 'sms': return 'Please enter a valid phone number';
      case 'whatsapp': return 'Please enter a valid WhatsApp number';
      case 'telegram': return 'Please enter a valid Telegram username';
      default: return 'Invalid value';
    }
  }
}

