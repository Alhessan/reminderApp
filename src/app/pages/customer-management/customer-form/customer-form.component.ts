import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, NavController, IonicModule, ToastController } from '@ionic/angular';
import { CustomerService } from '../../../services/customer.service';
import { Customer } from '../../../models/customer.model';
import { DatabaseService } from '../../../services/database.service';
import { CommonModule } from '@angular/common';
import { ColorIconPickerComponent } from '../../../components/color-icon-picker/color-icon-picker.component';

@Component({
  selector: 'app-customer-form',
  templateUrl: './customer-form.component.html',
  styleUrls: ['./customer-form.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, FormsModule, ColorIconPickerComponent]
})
export class CustomerFormComponent implements OnInit {
  customerForm: FormGroup;
  isEditMode = false;
  customerId?: number;
  formInitialized = false;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private route: ActivatedRoute,
    private router: Router,
    private alertController: AlertController,
    private navController: NavController,
    private databaseService: DatabaseService,
    private toastController: ToastController
  ) {
    // Initialize form in constructor to ensure it's available before template renders
    this.customerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.email]],
      phone: [''],
      color: ['#3880ff'], // Default color
      icon: ['person-outline'] // Default icon
    });
    this.formInitialized = true;
  }

  async ngOnInit() {
    // Ensure database is initialized before form operations
    await this.databaseService.initializeDatabase();
    
    // Subscribe to route params
    this.route.paramMap.subscribe(async params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.customerId = +id;
        await this.loadCustomerData(+id);
      }
    });
  }

  async loadCustomerData(id: number) {
    this.formInitialized = false;
    try {
      const customer = await this.customerService.getCustomerById(id);
      if (customer) {
        // Set default values for color and icon if not present
        const customerData = {
          ...customer,
          color: customer.color || '#3880ff',
          icon: customer.icon || 'person-outline'
        };
        this.customerForm.patchValue(customerData);
      } else {
        this.presentErrorToast('Customer not found.');
        await this.navController.navigateRoot('/customers', {
          animated: true,
          animationDirection: 'back'
        });
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
      this.presentErrorToast('Failed to load customer data.');
      await this.navController.navigateRoot('/customers', {
        animated: true,
        animationDirection: 'back'
      });
    } finally {
      this.formInitialized = true;
    }
  }

  onIconChange(icon: string) {
    this.customerForm.patchValue({ icon });
  }

  onColorChange(color: string) {
    this.customerForm.patchValue({ color });
  }

  async onSubmit() {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      this.presentErrorToast('Please fill in all required fields correctly.');
      return;
    }

    this.isSubmitting = true;
    const customerData: Customer = this.customerForm.value;

    try {
      if (this.isEditMode && this.customerId) {
        customerData.id = this.customerId;
        await this.customerService.updateCustomer(customerData);
        this.presentSuccessToast('Customer updated successfully!');
      } else {
        await this.customerService.addCustomer(customerData);
        this.presentSuccessToast('Customer added successfully!');
      }
      
      // Navigate back to the customer list using navigateRoot
      await this.navController.navigateRoot('/customers', {
        animated: true,
        animationDirection: 'back'
      });
    } catch (error) {
      console.error('Error saving customer:', error);
      this.presentErrorToast('Failed to save customer. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }

  onCancel() {
    if (this.customerForm.dirty) {
      this.presentCancelConfirm();
    } else {
      this.navController.navigateRoot('/customers', {
        animated: true,
        animationDirection: 'back'
      });
    }
  }

  async presentCancelConfirm() {
    const alert = await this.alertController.create({
      header: 'Discard Changes',
      message: 'Are you sure you want to discard your changes?',
      buttons: [
        {
          text: 'Keep Editing',
          role: 'cancel',
          cssClass: 'secondary',
        },
        {
          text: 'Discard',
          cssClass: 'danger',
          handler: () => {
            this.navController.navigateRoot('/customers', {
              animated: true,
              animationDirection: 'back'
            });
          },
        },
      ],
      cssClass: 'custom-alert'
    });
    await alert.present();
  }

  async presentDeleteConfirm() {
    if (!this.isEditMode || !this.customerId) return;

    const customerName = this.customerForm.get('name')?.value || 'this customer';
    const alert = await this.alertController.create({
      header: 'Delete Customer',
      message: `Are you sure you want to delete "${customerName}"? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
        },
        {
          text: 'Delete',
          cssClass: 'danger',
          handler: async () => {
            await this.deleteCustomer();
          },
        },
      ],
      cssClass: 'custom-alert'
    });
    await alert.present();
  }

  async deleteCustomer() {
    if (!this.customerId) return;

    try {
      await this.customerService.deleteCustomer(this.customerId);
      this.presentSuccessToast('Customer deleted successfully.');
      await this.navController.navigateRoot('/customers', {
        animated: true,
        animationDirection: 'back'
      });
    } catch (error) {
      console.error('Error deleting customer:', error);
      this.presentErrorToast('Failed to delete customer. Please try again.');
    }
  }

  async presentErrorToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: 'danger',
      buttons: [
        {
          text: 'Dismiss',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  async presentSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: 'success',
      icon: 'checkmark-circle-outline'
    });
    await toast.present();
  }

  async presentErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK'],
      cssClass: 'custom-alert'
    });
    await alert.present();
  }

  async presentSuccessAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Success',
      message: message,
      buttons: ['OK'],
      cssClass: 'custom-alert'
    });
    await alert.present();
  }
}

