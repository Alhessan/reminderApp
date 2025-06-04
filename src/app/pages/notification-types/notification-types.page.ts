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

  ngOnInit() {
    this.loadNotificationSettings();

    // Initialize enabled types
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
      if (settings) {
        this.notificationForm.patchValue(settings);
        this.updateAdditionalFieldsVisibility();
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
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
      this.presentToast('You can only enable up to 3 notification methods.');
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

      // Force update the notification types observable
      this.notificationTypes$ = this.notificationTypeService.getNotificationTypes();
      this.updateAdditionalFieldsVisibility();
    } catch (error) {
      console.error('Error toggling notification type:', error);
      this.presentToast('Failed to update notification settings.');
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
      const settings = Array.from(this.enabledTypes).reduce<Record<string, string>>((acc, typeKey) => {
        const controlName = this.getControlName(typeKey);
        if (controlName) {
          const value = this.notificationForm.get(controlName)?.value;
          if (value) {
            acc[typeKey] = value;
          }
        }
        return acc;
      }, {});

      await this.notificationTypeService.saveNotificationSettings(settings);
      this.presentToast('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      this.presentToast('Failed to save settings. Please try again.');
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