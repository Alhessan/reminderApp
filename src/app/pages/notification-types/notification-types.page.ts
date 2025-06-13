import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NotificationTypeService } from '../../services/notification-type.service';
import { NotificationType } from '../../models/notification-type.model';
import { Observable, take } from 'rxjs';
import { ToastController } from '@ionic/angular';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-notification-types',
  templateUrl: './notification-types.page.html',
  styleUrls: ['./notification-types.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule, ReactiveFormsModule]
})
export class NotificationTypesPage implements OnInit {
  notificationTypes$: Observable<NotificationType[]>;
  notificationForm: FormGroup;
  showAdditionalFields = false;
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
    private toastController: ToastController
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
    // Load notification settings first
    await this.loadNotificationSettings();

    // Then initialize enabled types
    this.notificationTypes$.pipe(take(1)).subscribe(types => {
      types.forEach(type => {
        if (type.isEnabled) {
          this.enabledTypes.add(type.key);
        }
      });
      this.updateAdditionalFieldsVisibility();
    });
  }

  async loadNotificationSettings() {
    try {
      const settings = await this.notificationTypeService.getNotificationSettings();
      console.log('Loaded notification settings:', settings);
      if (settings) {
        // Patch form values and mark fields as touched to show validation
        this.notificationForm.patchValue(settings);
        Object.keys(settings).forEach(key => {
          const control = this.notificationForm.get(key);
          if (control) {
            control.markAsTouched();
          }
        });
        this.updateAdditionalFieldsVisibility();
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      await this.presentToast('Failed to load notification settings.');
    }
  }

  getEnabledCount(): number {
    return this.enabledTypes.size;
  }

  isTypeEnabled(typeKey: string): boolean {
    return this.enabledTypes.has(typeKey);
  }

  async onToggleChange(type: NotificationType) {
    const newEnabledState = !this.isTypeEnabled(type.key);

    if (newEnabledState && this.getEnabledCount() >= 3) {
      await this.presentToast('You can only enable up to 3 notification methods.');
      return;
    }

    try {
      const updatedType = { ...type, isEnabled: newEnabledState };
      await this.notificationTypeService.updateNotificationType(updatedType);

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
          }
        }
      }

      // Save form values if any notification type is enabled
      if (this.getEnabledCount() > 0) {
        const formValues = this.notificationForm.value;
        await this.notificationTypeService.saveNotificationSettings(formValues);
      }

      // Force update the notification types observable
      this.notificationTypes$ = this.notificationTypeService.getNotificationTypes();
      this.updateAdditionalFieldsVisibility();

      // Show success message
      await this.presentToast(`${type.name} notifications ${newEnabledState ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      console.error('Error toggling notification type:', error);
      await this.presentToast('Failed to update notification settings.');
      
      // Revert the local state
      if (newEnabledState) {
        this.enabledTypes.delete(type.key);
      } else {
        this.enabledTypes.add(type.key);
      }
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
    this.showAdditionalFields = Array.from(this.enabledTypes).some(type => 
      Object.keys(this.controlMapping).includes(type)
    );

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
      this.presentToast('Please fill in all required fields correctly.');
      return;
    }

    try {
      // Get form values directly
      const formValues = this.notificationForm.value;
      console.log('Form values to save:', formValues);
      
      await this.notificationTypeService.saveNotificationSettings(formValues);
      await this.presentToast('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      await this.presentToast('Failed to save settings. Please try again.');
    }
  }

  private async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: message.includes('error') || message.includes('Failed') ? 'danger' : 'success'
    });
    toast.present();
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