import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonItemSliding, NavController, IonicModule } from '@ionic/angular'; // Added IonicModule
import { Customer } from '../../../models/customer.model';
import { CustomerService } from '../../../services/customer.service';
import { DatabaseService } from '../../../services/database.service';
import { CommonModule } from '@angular/common'; // Added CommonModule
import { FormsModule } from '@angular/forms'; // Added FormsModule

@Component({
  selector: 'app-customer-list',
  templateUrl: './customer-list.page.html',
  styleUrls: ['./customer-list.page.scss'],
  standalone: true, // Mark as standalone
  imports: [IonicModule, CommonModule, FormsModule] // Import necessary modules for standalone components
})
export class CustomerListPage implements OnInit {
  customers: Customer[] = [];
  isLoading = true;

  constructor(
    private customerService: CustomerService,
    private router: Router,
    private alertController: AlertController,
    private navController: NavController,
    private databaseService: DatabaseService // Inject DatabaseService
  ) { }

  async ngOnInit() {
    // Ensure database is initialized before loading customers
    // This might be better handled in an app initialization service or app.component
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
      // Optionally, show a toast or alert to the user
      this.presentErrorAlert('Failed to load customers. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  navigateToAddCustomer() {
    // Navigate to a dedicated page or use a modal for adding/editing
    // For simplicity, let's assume a route like '/customer-form' for new, and '/customer-form/:id' for edit
    this.router.navigate(['/customer-form']); 
  }

  navigateToEditCustomer(customerId: number, slidingItem?: IonItemSliding) {
    if (slidingItem) {
      slidingItem.close();
    }
    this.router.navigate(['/customer-form', customerId]);
  }

  navigateToCustomerDetail(customerId: number, slidingItem?: IonItemSliding) {
    // This page is not explicitly in MVP, but good for viewing tasks per customer
    // For now, let's assume it navigates to a detail page that might show tasks
    if (slidingItem) {
      slidingItem.close();
    }
    // Replace with actual route if a customer detail page is implemented
    // For now, it can also just navigate to edit or simply do nothing if no detail view
    console.log('Navigate to customer detail for ID:', customerId);
    // this.router.navigate(['/customer-detail', customerId]); 
    this.navigateToEditCustomer(customerId); // Or navigate to edit for now
  }

  async presentDeleteConfirm(customerId: number, customerName: string, slidingItem?: IonItemSliding) {
    if (slidingItem) {
      slidingItem.close(); // Close the sliding item before showing the alert
    }
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete ${customerName}? Associated tasks will have their customer link removed (but tasks themselves won't be deleted).`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
        },
        {
          text: 'Delete',
          handler: async () => {
            await this.deleteCustomer(customerId);
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteCustomer(customerId: number) {
    try {
      await this.customerService.deleteCustomer(customerId);
      // Refresh the list
      this.customers = this.customers.filter(c => c.id !== customerId);
      // Optionally, show a success toast
    } catch (error) {
      console.error('Error deleting customer:', error);
      this.presentErrorAlert('Failed to delete customer. Please try again.');
    }
  }

  async presentErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }
}

