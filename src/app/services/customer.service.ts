import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Customer } from '../models/customer.model';
import { DBSQLiteValues } from '@capacitor-community/sqlite';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {

  constructor(private dbService: DatabaseService) { }

  async addCustomer(customer: Customer): Promise<number | undefined> {
    const query = 'INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)';
    const values: any[] = [customer.name, customer.email, customer.phone];
    try {
      const result = await this.dbService.executeQuery(query, values);
      return result.changes?.lastId;
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  }

  async getCustomerById(id: number): Promise<Customer | null> {
    const query = 'SELECT * FROM customers WHERE id = ?';
    try {
      const result = await this.dbService.executeQuery(query, [id]);
      if (result.values && result.values.length > 0) {
        return result.values[0] as Customer;
      }
      return null;
    } catch (error) {
      console.error('Error getting customer by ID:', error);
      throw error;
    }
  }

  async getAllCustomers(): Promise<Customer[]> {
    const query = 'SELECT * FROM customers ORDER BY name ASC';
    try {
      const result = await this.dbService.executeQuery(query);
      return result.values || [];
    } catch (error) {
      console.error('Error getting all customers:', error);
      throw error;
    }
  }

  async updateCustomer(customer: Customer): Promise<number | undefined> {
    if (!customer.id) {
      throw new Error('Customer ID is required for update');
    }
    const query = 'UPDATE customers SET name = ?, email = ?, phone = ? WHERE id = ?';
    const values: any[] = [customer.name, customer.email, customer.phone, customer.id];
    try {
      const result = await this.dbService.executeQuery(query, values);
      return result.changes?.changes;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  async deleteCustomer(id: number): Promise<number | undefined> {
    // First, ensure tasks associated with this customer have their customerId set to NULL
    // This is handled by ON DELETE SET NULL in the tasks table schema, but good to be aware of.
    // Alternatively, one might want to delete associated tasks or prevent deletion if tasks exist.
    // For this MVP, we rely on the schema's ON DELETE SET NULL.

    const query = 'DELETE FROM customers WHERE id = ?';
    try {
      const result = await this.dbService.executeQuery(query, [id]);
      return result.changes?.changes;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }
}

