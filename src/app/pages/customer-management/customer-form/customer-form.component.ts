import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, NavController, IonicModule } from '@ionic/angular';
import { CustomerService } from '../../../services/customer.service';
import { Customer } from '../../../models/customer.model';
import { DatabaseService } from '../../../services/database.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-customer-form',
  templateUrl: './customer-form.component.html',
  styleUrls: ['./customer-form.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, FormsModule]
})
export class CustomerFormComponent implements OnInit {
  customerForm: FormGroup; // Initialize in constructor
  isEditMode = false;
  customerId?: number;
  formInitialized = false;

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private route: ActivatedRoute,
    private router: Router,
    private alertController: AlertController,
    private navController: NavController,
    private databaseService: DatabaseService
  ) {
    // Initialize form in constructor to ensure it's available before template renders
    this.customerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.email]],
      phone: ['']
    });
    this.formInitialized = true;
  }

  async ngOnInit() {
    // Ensure database is initialized before form operations
    await this.databaseService.initializeDatabase();
    
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.customerId = +id;
        this.loadCustomerData(+id);
      }
    });
  }

  async loadCustomerData(id: number) {
    try {
      const customer = await this.customerService.getCustomerById(id);
      if (customer) {
        this.customerForm.patchValue(customer);
      } else {
        this.presentErrorAlert('Customer not found.');
        this.navController.navigateBack('/customer-list');
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
      this.presentErrorAlert('Failed to load customer data.');
      this.navController.navigateBack('/customer-list');
    }
  }

  async onSubmit() {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched(); // Mark all fields as touched to show errors
      return;
    }

    const customerData: Customer = this.customerForm.value;

    try {
      if (this.isEditMode && this.customerId) {
        customerData.id = this.customerId;
        await this.customerService.updateCustomer(customerData);
        this.presentSuccessAlert('Customer updated successfully!');
      } else {
        await this.customerService.addCustomer(customerData);
        this.presentSuccessAlert('Customer added successfully!');
      }
      // Navigate back to the customer list or to the customer detail page
      this.navController.navigateBack('/customer-list');
    } catch (error) {
      console.error('Error saving customer:', error);
      this.presentErrorAlert('Failed to save customer. Please try again.');
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

  async presentSuccessAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Success',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
