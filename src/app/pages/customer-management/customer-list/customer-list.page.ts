import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonItemSliding, NavController, IonicModule, ToastController } from '@ionic/angular';
import { Customer } from '../../../models/customer.model';
import { CustomerService } from '../../../services/customer.service';
import { DatabaseService } from '../../../services/database.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-customer-list',
  templateUrl: './customer-list.page.html',
  styleUrls: ['./customer-list.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class CustomerListPage implements OnInit {
  customers: Customer[] = [];
  isLoading = true;

  constructor(
    private customerService: CustomerService,
    private router: Router,
    private alertController: AlertController,
    private navController: NavController,
    private databaseService: DatabaseService,
    private toastController: ToastController
  ) { }

  async ngOnInit() {
    // Ensure database is initialized before loading customers
    await this.databaseService.initializeDatabase(); 
    await this.loadCustomers();
  }

  async ionViewWillEnter() {
    // Refreshes data when the page is about to be entered
    await this.loadCustomers();
  }

  async loadCustomers() {
    this.isLoading = true;
    try {
      this.customers = await this.customerService.getAllCustomers();
    } catch (error) {
      console.error('Error loading customers:', error);
      this.presentErrorToast('Failed to load customers. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  // TrackBy function for better performance with *ngFor
  trackByCustomerId(index: number, customer: Customer): number {
    return customer.id || index;
  }

  // Statistics methods
  getCustomersWithEmail(): number {
    return this.customers.filter(c => c.email && c.email.trim() !== '').length;
  }

  getCustomersWithPhone(): number {
    return this.customers.filter(c => c.phone && c.phone.trim() !== '').length;
  }

  getCustomersWithBoth(): number {
    return this.customers.filter(c => 
      c.email && c.email.trim() !== '' && 
      c.phone && c.phone.trim() !== ''
    ).length;
  }

  async navigateToAddCustomer() {
    try {
      // Remove focus from any active element before navigation
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement) {
        activeElement.blur();
      }
      
      // Use navigateRoot to ensure proper navigation
      await this.navController.navigateRoot('/customers/new', {
        animated: true,
        animationDirection: 'forward'
      });
    } catch (error) {
      console.error('Navigation error:', error);
      this.presentErrorToast('Failed to navigate to add customer form.');
    }
  }

  async navigateToEditCustomer(customerId: number, slidingItem?: IonItemSliding) {
    try {
      if (slidingItem) {
        await slidingItem.close();
      }
      
      // Remove focus from any active element before navigation
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement) {
        activeElement.blur();
      }
      
      // Use navigateRoot to ensure proper navigation
      await this.navController.navigateRoot(`/customers/edit/${customerId}`, {
        animated: true,
        animationDirection: 'forward'
      });
    } catch (error) {
      console.error('Navigation error:', error);
      this.presentErrorToast('Failed to navigate to edit customer form.');
    }
  }



  async presentDeleteConfirm(customerId: number, customerName: string, slidingItem?: IonItemSliding) {
    if (slidingItem) {
      slidingItem.close();
    }
    
    const alert = await this.alertController.create({
      header: 'Delete Customer',
      message: `Are you sure you want to delete "${customerName}"? Associated tasks will have their customer link removed.`,
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
            await this.deleteCustomer(customerId, customerName);
          },
        },
      ],
      cssClass: 'custom-alert'
    });
    await alert.present();
  }

  async deleteCustomer(customerId: number, customerName: string) {
    try {
      await this.customerService.deleteCustomer(customerId);
      // Remove from local array for immediate UI update
      this.customers = this.customers.filter(c => c.id !== customerId);
      // Show success message
      this.presentSuccessToast(`${customerName} has been deleted successfully.`);
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
}

