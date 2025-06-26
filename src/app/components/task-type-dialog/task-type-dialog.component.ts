import { Component, OnInit, Input, AfterViewInit, OnDestroy, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ColorIconPickerComponent } from '../color-icon-picker/color-icon-picker.component';
import { TranslationService } from '../../services/translation.service';
import { TaskType } from '../../services/task-type.service';
import { addIcons } from 'ionicons';
import { close, chevronDownOutline, alertCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-task-type-dialog',
  templateUrl: './task-type-dialog.component.html',
  styleUrls: ['./task-type-dialog.component.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    ReactiveFormsModule,
    ColorIconPickerComponent
  ]
})
export class TaskTypeDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() taskType?: TaskType; // For edit mode
  @Input() isEditMode = false;
  
  taskTypeForm: FormGroup;
  selectedIcon = 'create-outline';
  selectedColor = '#3880ff';
  private initialFocusElement?: HTMLElement;

  constructor(
    private fb: FormBuilder,
    private modalController: ModalController,
    private translationService: TranslationService,
    private elementRef: ElementRef
  ) {
    // Register required icons
    addIcons({
      'close': close,
      'chevron-down-outline': chevronDownOutline,
      'alert-circle-outline': alertCircleOutline
    });

    this.taskTypeForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['']
    });
  }

  ngOnInit() {
    // If in edit mode, populate the form with existing data
    if (this.isEditMode && this.taskType) {
      this.taskTypeForm.patchValue({
        name: this.taskType.name,
        description: this.taskType.description || ''
      });
      this.selectedIcon = this.taskType.icon || 'create-outline';
      this.selectedColor = this.taskType.color || '#3880ff';
    }
    
    // Add modal-open class to body for accessibility
    setTimeout(() => {
      document.body.classList.add('modal-open');
      this.blurBackgroundElements();
    }, 100);
  }

  ngAfterViewInit() {
    // Set initial focus to the first input field after a short delay
    // This is more accessible than using a custom focus trap
    setTimeout(() => {
      this.setInitialFocus();
    }, 150);
  }

  ngOnDestroy() {
    // Clean up any focus management if needed
    if (this.initialFocusElement) {
      this.initialFocusElement = undefined;
    }
    
    // Remove modal-open class and restore background elements
    document.body.classList.remove('modal-open');
    this.restoreBackgroundElements();
  }

  private blurBackgroundElements() {
    // Simply rely on CSS-only solution via body.modal-open class
    // No need to manually set styles or inert attributes
  }

  private restoreBackgroundElements() {
    // CSS-only solution, no manual cleanup needed
  }

  private setInitialFocus() {
    // Find the first focusable input element and focus it
    const nameInput = this.elementRef.nativeElement.querySelector('ion-input[formControlName="name"] input');
    if (nameInput) {
      this.initialFocusElement = nameInput as HTMLElement;
      this.initialFocusElement.focus();
    }
  }

  // Translation helper method
  t(key: string, params?: { [key: string]: string }): string {
    return this.translationService.t(key, params);
  }

  onIconChange(icon: string) {
    this.selectedIcon = icon;
  }

  onColorChange(color: string) {
    this.selectedColor = color;
  }

  async onSubmit() {
    if (this.taskTypeForm.valid) {
      const result = {
        name: this.taskTypeForm.value.name,
        description: this.taskTypeForm.value.description || '',
        icon: this.selectedIcon,
        color: this.selectedColor,
        isDefault: 0
      };
      
      await this.modalController.dismiss(result, 'confirm');
    } else {
      // Mark all fields as touched to show validation errors
      this.taskTypeForm.markAllAsTouched();
      
      // Focus the first invalid field
      this.focusFirstInvalidField();
    }
  }

  async onCancel() {
    await this.modalController.dismiss(null, 'cancel');
  }

  private focusFirstInvalidField() {
    const firstInvalidField = this.elementRef.nativeElement.querySelector('.error ion-input input, .error ion-textarea textarea');
    if (firstInvalidField) {
      (firstInvalidField as HTMLElement).focus();
    }
  }

  getFieldError(fieldName: string): string | null {
    const field = this.taskTypeForm.get(fieldName);
    
    if (field && field.invalid && (field.dirty || field.touched)) {
      if (field.errors?.['required']) {
        return this.t('common.required');
      }
      if (field.errors?.['minlength']) {
        return `Minimum ${field.errors['minlength'].requiredLength} characters required`;
      }
    }
    
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.taskTypeForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // Handle keyboard navigation for accessibility
  onKeyDown(event: KeyboardEvent) {
    // Handle Escape key to close modal
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
    }
  }
}