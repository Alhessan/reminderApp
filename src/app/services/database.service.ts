import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection, CapacitorSQLitePlugin, DBSQLiteValues, capSQLiteSet } from '@capacitor-community/sqlite';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private sqlite: CapacitorSQLitePlugin;
  private db!: SQLiteDBConnection;
  private readonly dbName = 'reminder_app.db';
  private isNative: boolean;
  private webStore: { [key: string]: any[] } = {}; // Simple in-memory store for web
  private readonly STORAGE_KEY = 'reminderApp_webDatabase';
  
  // Observable to notify components when database changes
  private dbReady = new BehaviorSubject<boolean>(false);
  public dbReady$ = this.dbReady.asObservable();

  constructor() {
    this.sqlite = CapacitorSQLite;
    this.isNative = Capacitor.isNativePlatform();
    console.log(`Running on ${this.isNative ? 'native' : 'web'} platform`);
    
    // Initialize database immediately in constructor
    this.initializeDatabase().then(() => {
      console.log('Database initialized in constructor');
      this.dbReady.next(true);
    }).catch(err => {
      console.error('Error initializing database in constructor:', err);
      this.dbReady.next(false);
    });
  }

  async initializeDatabase(): Promise<void> {
    try {
      if (this.isNative) {
        // Native platform - use SQLite
        await this.initializeNativeDatabase();
      } else {
        // Web platform - use in-memory store with localStorage persistence
        await this.initializeWebDatabase();
      }
      console.log(`Database ${this.dbName} initialized.`);
    } catch (err) {
      console.error('Error initializing database:', err);
      throw err;
    }
  }

  private async initializeNativeDatabase(): Promise<void> {
    try {
      const sqliteConnection = new SQLiteConnection(this.sqlite);
      
      this.db = await sqliteConnection.createConnection(
        this.dbName,
        false, // encrypted
        'no-encryption',
        1, // version
        false // readOnly
      );

      await this.db.open();
      await this.createSchema();
      console.log(`Native SQLite database ${this.dbName} initialized and schema created.`);
    } catch (err) {
      console.error('Error initializing native database:', err);
      throw err;
    }
  }

  private async initializeWebDatabase(): Promise<void> {
    try {
      // Try to load existing data from localStorage
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      
      if (storedData) {
        try {
          this.webStore = JSON.parse(storedData);
          console.log('Loaded web database from localStorage:', this.webStore);
        } catch (e) {
          console.error('Error parsing stored database, initializing empty database:', e);
          this.initializeEmptyWebStore();
        }
      } else {
        this.initializeEmptyWebStore();
      }
      
      // Ensure all required tables exist
      if (!this.webStore['customers']) {
        this.webStore['customers'] = [];
      }
      if (!this.webStore['tasks']) {
        this.webStore['tasks'] = [];
      }
      if (!this.webStore['task_history']) {
        this.webStore['task_history'] = [];
      }
      
      // Save to ensure structure is correct
      this.saveWebStoreToLocalStorage();
      
      console.log('Web database initialized with tables:', Object.keys(this.webStore));
    } catch (err) {
      console.error('Error initializing web database:', err);
      throw err;
    }
  }

  private initializeEmptyWebStore(): void {
    // Initialize our tables in the web store
    this.webStore = {
      'customers': [],
      'tasks': [],
      'task_history': []
    };
    
    // Add some sample data for testing in web mode
    this.webStore['customers'].push({
      id: 1,
      name: 'Sample Customer',
      email: 'sample@example.com',
      phone: '123-456-7890'
    });
    
    // Save to localStorage
    this.saveWebStoreToLocalStorage();
    
    console.log('Initialized empty web database with sample data');
  }

  private saveWebStoreToLocalStorage(): void {
    try {
      const dataToSave = JSON.stringify(this.webStore);
      localStorage.setItem(this.STORAGE_KEY, dataToSave);
      console.log('Saved web database to localStorage, size:', dataToSave.length, 'bytes');
      
      // Debug: Log the first few tasks to verify data
      if (this.webStore['tasks'] && this.webStore['tasks'].length > 0) {
        console.log('Sample of saved tasks:', this.webStore['tasks'].slice(0, 3));
      }
    } catch (e) {
      console.error('Error saving web database to localStorage:', e);
    }
  }

  private async createSchema(): Promise<void> {
    if (!this.isNative) return; // Skip for web platform
    
    const schema = `
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('Payment', 'Update', 'Custom')),
        customerId INTEGER,
        frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
        startDate TEXT NOT NULL, -- ISO 8601
        notificationType TEXT NOT NULL CHECK(notificationType IN ('push/local', 'silent reminder')),
        notes TEXT,
        isCompleted INTEGER DEFAULT 0, -- 0 for false, 1 for true
        lastCompletedDate TEXT, -- ISO 8601
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS task_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskId INTEGER NOT NULL,
        timestamp TEXT NOT NULL, -- ISO 8601
        action TEXT NOT NULL,
        details TEXT,
        FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
      );
    `;
    await this.db.execute(schema);
  }

  async executeQuery(statement: string, values?: any[]): Promise<any> {
    if (this.isNative) {
      // Native platform - use SQLite
      if (!this.db) {
        await this.initializeDatabase();
      }
      return this.db.query(statement, values);
    } else {
      // Web platform - use in-memory store
      return this.executeWebQuery(statement, values);
    }
  }

  private async executeWebQuery(statement: string, values?: any[]): Promise<any> {
    console.log('Web query:', statement, values || []);
    
    // Very simple SQL parser for basic CRUD operations
    let result;
    if (statement.trim().toUpperCase().startsWith('SELECT')) {
      result = this.handleWebSelect(statement, values || []);
    } else if (statement.trim().toUpperCase().startsWith('INSERT')) {
      result = this.handleWebInsert(statement, values || []);
      this.saveWebStoreToLocalStorage(); // Save after insert
    } else if (statement.trim().toUpperCase().startsWith('UPDATE')) {
      result = this.handleWebUpdate(statement, values || []);
      this.saveWebStoreToLocalStorage(); // Save after update
    } else if (statement.trim().toUpperCase().startsWith('DELETE')) {
      result = this.handleWebDelete(statement, values || []);
      this.saveWebStoreToLocalStorage(); // Save after delete
    } else {
      console.log('Unsupported operation in web mode, returning empty result');
      result = { values: [] };
    }
    
    return result;
  }

  private handleWebSelect(statement: string, values: any[]): any {
    // Very simplified SELECT handling - just determine which table and return all records
    // In a real implementation, you would parse the WHERE clause and filter accordingly
    
    // Special case for the JOIN query with ID filter (task detail/edit)
    if (statement.includes('SELECT t.*, c.name as customerName') && 
        statement.includes('FROM tasks t') && 
        statement.includes('LEFT JOIN customers c ON t.customerId = c.id') &&
        statement.includes('WHERE t.id = ?') &&
        values.length > 0) {
      
      const taskId = values[0];
      console.log(`Handling special JOIN query for task with ID ${taskId}`);
      
      // Find the specific task by ID
      const task = this.webStore['tasks'].find((t: any) => t.id === taskId);
      
      if (!task) {
        console.log(`Task with ID ${taskId} not found`);
        return { values: [] };
      }
      
      // Create a joined result with customer name
      let result = { ...task };
      
      if (task.customerId) {
        const customer = this.webStore['customers'].find((c: any) => c.id === task.customerId);
        result.customerName = customer ? customer.name : null;
      } else {
        result.customerName = null;
      }
      
      console.log(`Returning task with ID ${taskId}:`, result);
      return { values: [result] };
    }
    
    // Special case for the JOIN query for all tasks
    if (statement.includes('SELECT t.*, c.name as customerName') && 
        statement.includes('FROM tasks t') && 
        statement.includes('LEFT JOIN customers c ON t.customerId = c.id')) {
      
      console.log('Handling special JOIN query for all tasks with customer names');
      
      // Create a joined result with customer names
      const tasksWithCustomers = this.webStore['tasks'].map((task: any) => {
        let result = { ...task };
        
        if (task.customerId) {
          const customer = this.webStore['customers'].find((c: any) => c.id === task.customerId);
          result.customerName = customer ? customer.name : null;
        } else {
          result.customerName = null;
        }
        
        return result;
      });
      
      // Sort by startDate if requested
      if (statement.includes('ORDER BY t.startDate')) {
        tasksWithCustomers.sort((a: any, b: any) => {
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });
      }
      
      console.log('Returning all tasks with customers:', tasksWithCustomers);
      return { values: tasksWithCustomers };
    }
    
    let table = '';
    if (statement.includes('FROM customers')) {
      table = 'customers';
    } else if (statement.includes('FROM tasks')) {
      table = 'tasks';
    } else if (statement.includes('FROM task_history')) {
      table = 'task_history';
    }
    
    if (table) {
      // If there's a WHERE clause with ID, filter by ID
      if (values.length > 0 && statement.includes('WHERE') && statement.includes('id = ?')) {
        const id = values[0];
        console.log(`Filtering ${table} by id ${id}`);
        const filteredValues = this.webStore[table].filter((item: any) => item.id === id);
        console.log(`Found ${filteredValues.length} items in ${table} with id ${id}:`, filteredValues);
        return { values: filteredValues };
      }
      
      // Return all records from the table
      console.log(`Returning all ${table}:`, this.webStore[table]);
      return { values: this.webStore[table] };
    }
    
    return { values: [] };
  }

  private handleWebInsert(statement: string, values: any[]): any {
    let table = '';
    if (statement.includes('INTO customers')) {
      table = 'customers';
    } else if (statement.includes('INTO tasks')) {
      table = 'tasks';
    } else if (statement.includes('INTO task_history')) {
      table = 'task_history';
    }
    
    if (table) {
      // Generate a new ID
      const newId = this.webStore[table].length > 0 
        ? Math.max(...this.webStore[table].map((item: any) => item.id)) + 1 
        : 1;
      
      // Create a new object based on the table
      let newRecord: any = { id: newId };
      
      if (table === 'customers') {
        newRecord = {
          ...newRecord,
          name: values[0],
          email: values[1],
          phone: values[2]
        };
      } else if (table === 'tasks') {
        newRecord = {
          ...newRecord,
          title: values[0],
          type: values[1],
          customerId: values[2],
          frequency: values[3],
          startDate: values[4],
          notificationType: values[5],
          notes: values[6],
          isCompleted: values[7] === 1
        };
      } else if (table === 'task_history') {
        newRecord = {
          ...newRecord,
          taskId: values[0],
          timestamp: values[1],
          action: values[2],
          details: values[3]
        };
      }
      
      this.webStore[table].push(newRecord);
      console.log(`Inserted record into ${table}:`, newRecord);
      console.log(`${table} now has ${this.webStore[table].length} records`);
      return { changes: { lastId: newId } };
    }
    
    return { changes: { lastId: null } };
  }

  private handleWebUpdate(statement: string, values: any[]): any {
    let table = '';
    if (statement.includes('UPDATE customers')) {
      table = 'customers';
    } else if (statement.includes('UPDATE tasks')) {
      table = 'tasks';
    } else if (statement.includes('UPDATE task_history')) {
      table = 'task_history';
    }
    
    if (table) {
      // Assume the last value is the ID for the WHERE clause
      const id = values[values.length - 1];
      console.log(`Updating ${table} with id ${id}`);
      const index = this.webStore[table].findIndex((item: any) => item.id === id);
      
      if (index !== -1) {
        if (table === 'customers') {
          this.webStore[table][index] = {
            ...this.webStore[table][index],
            name: values[0],
            email: values[1],
            phone: values[2]
          };
        } else if (table === 'tasks') {
          this.webStore[table][index] = {
            ...this.webStore[table][index],
            title: values[0],
            type: values[1],
            customerId: values[2],
            frequency: values[3],
            startDate: values[4],
            notificationType: values[5],
            notes: values[6],
            isCompleted: values[7] === 1,
            lastCompletedDate: values[8]
          };
        }
        console.log(`Updated record in ${table}:`, this.webStore[table][index]);
        return { changes: { changes: 1 } };
      } else {
        console.log(`No record found in ${table} with id ${id}`);
      }
    }
    
    return { changes: { changes: 0 } };
  }

  private handleWebDelete(statement: string, values: any[]): any {
    let table = '';
    if (statement.includes('FROM customers')) {
      table = 'customers';
    } else if (statement.includes('FROM tasks')) {
      table = 'tasks';
    } else if (statement.includes('FROM task_history')) {
      table = 'task_history';
    }
    
    if (table && values.length > 0) {
      const id = values[0];
      const initialLength = this.webStore[table].length;
      this.webStore[table] = this.webStore[table].filter((item: any) => item.id !== id);
      const removed = initialLength - this.webStore[table].length;
      
      console.log(`Deleted ${removed} record(s) from ${table} with id ${id}`);
      return { changes: { changes: removed } };
    }
    
    return { changes: { changes: 0 } };
  }

  async executeSet(set: capSQLiteSet[]): Promise<any> {
    if (this.isNative) {
      // Native platform - use SQLite
      if (!this.db) {
        await this.initializeDatabase();
      }
      return this.db.executeSet(set);
    } else {
      // Web platform - execute each query in the set
      const results = [];
      for (const item of set) {
        // Add type safety check to ensure statement is defined
        if (item.statement) {
          const result = await this.executeQuery(item.statement, item.values);
          results.push(result);
        } else {
          console.warn('Skipping undefined statement in executeSet');
          results.push({ values: [] });
        }
      }
      // Save to localStorage after batch operations
      this.saveWebStoreToLocalStorage();
      
      return results;
    }
  }

  async closeDatabase(): Promise<void> {
    if (this.isNative && this.db) {
      const sqliteConnection = new SQLiteConnection(this.sqlite);
      await sqliteConnection.closeConnection(this.dbName, false);
      console.log(`Database ${this.dbName} closed.`);
    }
  }

  getDb(): SQLiteDBConnection {
    if (this.isNative && !this.db) {
      throw new Error('Database not initialized. Call initializeDatabase first.');
    }
    return this.db;
  }
  
  // Debug method to dump database contents
  dumpDatabase(): any {
    if (!this.isNative) {
      return this.webStore;
    }
    return null; // Not implemented for native
  }
}
