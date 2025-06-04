import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection, CapacitorSQLitePlugin, DBSQLiteValues, capSQLiteSet } from '@capacitor-community/sqlite';
import { BehaviorSubject } from 'rxjs';

const DEFAULT_NOTIFICATION_TYPES = [
  {
    key: 'push',
    name: 'Push Notifications',
    description: 'Receive instant notifications on your device',
    icon: 'notifications-outline',
    color: '#2dd36f',
    isEnabled: false,
    requiresValue: false,
    order: 1
  },
  {
    key: 'email',
    name: 'Email Notifications',
    description: 'Get notified via email',
    icon: 'mail-outline',
    color: '#3880ff',
    isEnabled: false,
    requiresValue: true,
    valueLabel: 'Email Address',
    validationPattern: '^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$',
    validationError: 'Please enter a valid email address',
    order: 2
  },
  {
    key: 'sms',
    name: 'SMS Notifications',
    description: 'Receive SMS text messages',
    icon: 'chatbox-outline',
    color: '#5260ff',
    isEnabled: false,
    requiresValue: true,
    valueLabel: 'Phone Number',
    validationPattern: '^\\+?[1-9]\\d{1,14}$',
    validationError: 'Please enter a valid phone number in international format',
    order: 3
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp Notifications',
    description: 'Get notified via WhatsApp',
    icon: 'logo-whatsapp',
    color: '#25D366',
    isEnabled: false,
    requiresValue: true,
    valueLabel: 'WhatsApp Number',
    validationPattern: '^\\+?[1-9]\\d{1,14}$',
    validationError: 'Please enter a valid WhatsApp number in international format',
    order: 4
  },
  {
    key: 'telegram',
    name: 'Telegram Notifications',
    description: 'Receive notifications on Telegram',
    icon: 'paper-plane-outline',
    color: '#0088cc',
    isEnabled: false,
    requiresValue: true,
    valueLabel: 'Telegram Username',
    validationPattern: '^[a-zA-Z0-9_]{5,32}$',
    validationError: 'Please enter a valid Telegram username (5-32 characters, alphanumeric and underscore)',
    order: 5
  }
];

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private sqlite: SQLiteConnection;
  private db!: SQLiteDBConnection;
  private readonly dbName = 'reminder_app.db';
  private isNative: boolean;
  private webStore: { [key: string]: any[] } = {}; // Simple in-memory store for web
  private readonly STORAGE_KEY = 'reminderApp_webDatabase';
  
  // Observable to notify components when database changes
  private dbReady = new BehaviorSubject<boolean>(false);
  public dbReady$ = this.dbReady.asObservable();

  private currentVersion = 2; // Increment this when adding new migrations

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
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
      if (this.isNative) {
        // Native platform - use SQLite
        await this.initializeNativeDatabase();
      } else {
        // Web platform - use in-memory store with localStorage persistence
        await this.initializeWebDatabase();
      }
      console.log(`Database ${this.dbName} initialized.`);
  }

  private async initializeNativeDatabase(): Promise<void> {
    try {
      const platform = Capacitor.getPlatform();
      const dbName = 'routineloop.db';

      if (platform === 'web') {
        await this.sqlite.initWebStore();
      }
      
      this.db = await this.sqlite.createConnection(
        dbName,
        false,
        'no-encryption',
        1,
        false
      );

      await this.db.open();
      
      // Run migrations
      await this.runMigrations();

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
      
      // Ensure all required tables exist with proper initialization
      if (!this.webStore['customers']) {
        this.webStore['customers'] = [];
      }
      if (!this.webStore['tasks']) {
        this.webStore['tasks'] = [];
      }
      if (!this.webStore['task_history']) {
        this.webStore['task_history'] = [];
      }
      if (!this.webStore['task_types']) {
        this.webStore['task_types'] = [
          {
            id: 1,
            name: 'Payment',
            description: 'Payment reminder tasks',
            isDefault: 1,
            icon: 'cash-outline',
            color: '#2dd36f'
          },
          {
            id: 2,
            name: 'Update',
            description: 'General update tasks',
            isDefault: 1,
            icon: 'refresh-outline',
            color: '#3880ff'
          },
          {
            id: 3,
            name: 'Custom',
            description: 'Custom reminder tasks',
            isDefault: 1,
            icon: 'create-outline',
            color: '#5260ff'
          }
        ];
      }
      if (!this.webStore['notification_types']) {
        this.webStore['notification_types'] = [
          {
            id: 1,
            key: 'push',
            name: 'Push Notifications',
            description: 'Receive instant notifications on your device',
            icon: 'notifications-outline',
            color: '#2dd36f',
            isEnabled: 0,
            requiresValue: 0,
            valueLabel: null,
            validationPattern: null,
            validationError: null,
            order_num: 1
          },
          {
            id: 2,
            key: 'email',
            name: 'Email Notifications',
            description: 'Get notified via email',
            icon: 'mail-outline',
            color: '#3880ff',
            isEnabled: 0,
            requiresValue: 1,
            valueLabel: 'Email Address',
            validationPattern: '^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$',
            validationError: 'Please enter a valid email address',
            order_num: 2
          },
          {
            id: 3,
            key: 'sms',
            name: 'SMS Notifications',
            description: 'Receive SMS text messages',
            icon: 'chatbox-outline',
            color: '#5260ff',
            isEnabled: 0,
            requiresValue: 1,
            valueLabel: 'Phone Number',
            validationPattern: '^\\+?[1-9]\\d{1,14}$',
            validationError: 'Please enter a valid phone number in international format',
            order_num: 3
          },
          {
            id: 4,
            key: 'whatsapp',
            name: 'WhatsApp Notifications',
            description: 'Get notified via WhatsApp',
            icon: 'logo-whatsapp',
            color: '#25D366',
            isEnabled: 0,
            requiresValue: 1,
            valueLabel: 'WhatsApp Number',
            validationPattern: '^\\+?[1-9]\\d{1,14}$',
            validationError: 'Please enter a valid WhatsApp number in international format',
            order_num: 4
          },
          {
            id: 5,
            key: 'telegram',
            name: 'Telegram Notifications',
            description: 'Receive notifications on Telegram',
            icon: 'paper-plane-outline',
            color: '#0088cc',
            isEnabled: 0,
            requiresValue: 1,
            valueLabel: 'Telegram Username',
            validationPattern: '^[a-zA-Z0-9_]{5,32}$',
            validationError: 'Please enter a valid Telegram username (5-32 characters, alphanumeric and underscore)',
            order_num: 5
          }
        ];
      }
      if (!this.webStore['notification_values']) {
        this.webStore['notification_values'] = [];
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
      'task_history': [],
      'task_types': [
        {
          id: 1,
          name: 'Payment',
          description: 'Payment reminder tasks',
          isDefault: 1,
          icon: 'cash-outline',
          color: '#2dd36f'
        },
        {
          id: 2,
          name: 'Update',
          description: 'General update tasks',
          isDefault: 1,
          icon: 'refresh-outline',
          color: '#3880ff'
        },
        {
          id: 3,
          name: 'Custom',
          description: 'Custom reminder tasks',
          isDefault: 1,
          icon: 'create-outline',
          color: '#5260ff'
        }
      ],
      'notification_types': [
        {
          id: 1,
          key: 'push',
          name: 'Push Notifications',
          description: 'Receive instant notifications on your device',
          icon: 'notifications-outline',
          color: '#2dd36f',
          isEnabled: 0,
          requiresValue: 0,
          valueLabel: null,
          validationPattern: null,
          validationError: null,
          order_num: 1
        },
        {
          id: 2,
          key: 'email',
          name: 'Email Notifications',
          description: 'Get notified via email',
          icon: 'mail-outline',
          color: '#3880ff',
          isEnabled: 0,
          requiresValue: 1,
          valueLabel: 'Email Address',
          validationPattern: '^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$',
          validationError: 'Please enter a valid email address',
          order_num: 2
        },
        {
          id: 3,
          key: 'sms',
          name: 'SMS Notifications',
          description: 'Receive SMS text messages',
          icon: 'chatbox-outline',
          color: '#5260ff',
          isEnabled: 0,
          requiresValue: 1,
          valueLabel: 'Phone Number',
          validationPattern: '^\\+?[1-9]\\d{1,14}$',
          validationError: 'Please enter a valid phone number in international format',
          order_num: 3
        },
        {
          id: 4,
          key: 'whatsapp',
          name: 'WhatsApp Notifications',
          description: 'Get notified via WhatsApp',
          icon: 'logo-whatsapp',
          color: '#25D366',
          isEnabled: 0,
          requiresValue: 1,
          valueLabel: 'WhatsApp Number',
          validationPattern: '^\\+?[1-9]\\d{1,14}$',
          validationError: 'Please enter a valid WhatsApp number in international format',
          order_num: 4
        },
        {
          id: 5,
          key: 'telegram',
          name: 'Telegram Notifications',
          description: 'Receive notifications on Telegram',
          icon: 'paper-plane-outline',
          color: '#0088cc',
          isEnabled: 0,
          requiresValue: 1,
          valueLabel: 'Telegram Username',
          validationPattern: '^[a-zA-Z0-9_]{5,32}$',
          validationError: 'Please enter a valid Telegram username (5-32 characters, alphanumeric and underscore)',
          order_num: 5
        }
      ],
      'notification_values': []
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
        phone TEXT,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS task_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        isDefault INTEGER DEFAULT 0,
        icon TEXT,
        color TEXT
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        customerId INTEGER,
        frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
        startDate TEXT NOT NULL, -- ISO 8601
        notificationTime TEXT NOT NULL DEFAULT '09:00', -- 24-hour format HH:mm
        notificationType TEXT NOT NULL,
        notes TEXT,
        isCompleted INTEGER DEFAULT 0, -- 0 for false, 1 for true
        lastCompletedDate TEXT, -- ISO 8601
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY (type) REFERENCES task_types(name) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS task_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskId INTEGER NOT NULL,
        timestamp TEXT NOT NULL, -- ISO 8601
        action TEXT NOT NULL,
        details TEXT,
        FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
      );

      -- Insert default task types if they don't exist
      INSERT OR IGNORE INTO task_types (name, description, isDefault, icon, color) VALUES
        ('Payment', 'Payment reminder tasks', 1, 'cash-outline', '#2dd36f'),
        ('Update', 'General update tasks', 1, 'refresh-outline', '#3880ff'),
        ('Custom', 'Custom reminder tasks', 1, 'create-outline', '#5260ff');
    `;
    await this.db.execute(schema);
  }

  private async runMigrations() {
    try {
      // Create version table if it doesn't exist
      await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS database_version (
          version INTEGER PRIMARY KEY
        )
      `);

      // Get current database version
      const result = await this.executeQuery('SELECT version FROM database_version LIMIT 1');
      const currentDbVersion = result.values?.length ? result.values[0].version : 0;

      // Run migrations in sequence
      if (currentDbVersion < 1) {
        await this.migration1();
      }
      if (currentDbVersion < 2) {
        await this.migration2();
      }
      // Add more version checks here for future migrations

      // Update database version
      if (currentDbVersion === 0) {
        await this.executeQuery('INSERT INTO database_version (version) VALUES (?)', [this.currentVersion]);
      } else {
        await this.executeQuery('UPDATE database_version SET version = ?', [this.currentVersion]);
      }
    } catch (error) {
      console.error('Error running migrations:', error);
      throw error;
    }
  }

  private async migration1() {
    // Initial schema
    await this.executeQuery(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        frequency TEXT NOT NULL,
        startDate TEXT NOT NULL,
        notificationTime TEXT,
        notes TEXT,
        isCompleted INTEGER DEFAULT 0,
        lastCompletedDate TEXT,
        customerId INTEGER,
        FOREIGN KEY (customerId) REFERENCES customers(id)
      )
    `);

    await this.executeQuery(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        notes TEXT
      )
    `);
  }

  private async migration2() {
    // Add notification_types table
    await this.executeQuery(`
      CREATE TABLE IF NOT EXISTS notification_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        isEnabled INTEGER DEFAULT 0,
        requiresValue INTEGER DEFAULT 0,
        valueLabel TEXT,
        validationPattern TEXT,
        validationError TEXT,
        order_num INTEGER NOT NULL
      )
    `);

    // Insert default notification types
    for (const type of DEFAULT_NOTIFICATION_TYPES) {
      await this.executeQuery(`
        INSERT INTO notification_types (
          key, name, description, icon, color, isEnabled, 
          requiresValue, valueLabel, validationPattern, validationError, order_num
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        type.key,
        type.name,
        type.description || '',
        type.icon,
        type.color,
        type.isEnabled ? 1 : 0,
        type.requiresValue ? 1 : 0,
        type.valueLabel || null,
        type.validationPattern || null,
        type.validationError || null,
        type.order
      ]);
    }
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
    
    // Special case for notification types JOIN query
    if (statement.includes('SELECT nt.key, nv.value') && 
        statement.includes('FROM notification_types nt') &&
        statement.includes('LEFT JOIN notification_values nv')) {
      
      const enabledTypes = this.webStore['notification_types'].filter((nt: any) => nt.isEnabled === 1);
      const values = this.webStore['notification_values'];
      
      const result = enabledTypes.map((type: any) => {
        const value = values.find((v: any) => v.notification_type_id === type.id);
        return {
          key: type.key,
          value: value ? value.value : null
        };
        });
      
      console.log('Returning notification settings:', result);
      return { values: result };
    }
    
    let table = '';
    if (statement.includes('FROM customers')) {
      table = 'customers';
    } else if (statement.includes('FROM tasks')) {
      table = 'tasks';
    } else if (statement.includes('FROM task_history')) {
      table = 'task_history';
    } else if (statement.includes('FROM task_types')) {
      table = 'task_types';
    } else if (statement.includes('FROM notification_types')) {
      table = 'notification_types';
    } else if (statement.includes('FROM notification_values')) {
      table = 'notification_values';
    }
    
    if (table) {
      // If there's a WHERE clause with ID, filter by ID
      if (values.length > 0 && statement.includes('WHERE') && statement.includes('id = ?')) {
        const id = values[0];
        console.log(`Filtering ${table} by id ${id}`);
        const filteredValues = this.webStore[table].filter((item: any) => item.id === id);
        console.log(`Found ${filteredValues.length} items in ${table} with id ${id}`);
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
    } else if (statement.includes('INTO task_types')) {
      table = 'task_types';
    } else if (statement.includes('INTO notification_values')) {
      table = 'notification_values';
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
          notificationTime: values[5],
          notificationType: values[6],
          notes: values[7],
          isCompleted: values[8] === 1
        };
      } else if (table === 'task_history') {
        newRecord = {
          ...newRecord,
          taskId: values[0],
          timestamp: values[1],
          action: values[2],
          details: values[3]
        };
      } else if (table === 'notification_values') {
        newRecord = {
          ...newRecord,
          notification_type_id: values[0],
          value: values[1]
        };
      }
      
      this.webStore[table].push(newRecord);
      console.log(`Inserted record into ${table}:`, newRecord);
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
    } else if (statement.includes('UPDATE notification_types')) {
      table = 'notification_types';
    }
    
    if (table) {
      let records = this.webStore[table];
      let updated = 0;

      if (table === 'notification_types' && statement.includes('WHERE key = ?')) {
        const key = values[values.length - 1];
        const isEnabled = values[0];
        records = records.map((record: any) => {
          if (record.key === key) {
            updated++;
            return { ...record, isEnabled };
          }
          return record;
        });
      } else if (statement.includes('WHERE id = ?')) {
      const id = values[values.length - 1];
        records = records.map((record: any) => {
          if (record.id === id) {
            updated++;
            if (table === 'tasks') {
              return {
                ...record,
            title: values[0],
            type: values[1],
            customerId: values[2],
            frequency: values[3],
            startDate: values[4],
            notificationTime: values[5],
            notificationType: values[6],
            notes: values[7],
            isCompleted: values[8] === 1,
            lastCompletedDate: values[9]
          };
            }
          }
          return record;
        });
      }

      this.webStore[table] = records;
      return { changes: { changes: updated } };
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
    } else if (statement.includes('FROM notification_values')) {
      table = 'notification_values';
    }
    
    if (table && values.length > 0) {
      const initialLength = this.webStore[table].length;
      
      if (table === 'notification_values' && statement.includes('IN (SELECT id FROM notification_types WHERE isEnabled = 1)')) {
        // Special case for deleting notification values
        const enabledTypeIds = this.webStore['notification_types']
          .filter((t: any) => t.isEnabled === 1)
          .map((t: any) => t.id);
        this.webStore[table] = this.webStore[table].filter((item: any) => 
          !enabledTypeIds.includes(item.notification_type_id)
        );
      } else {
        const id = values[0];
      this.webStore[table] = this.webStore[table].filter((item: any) => item.id !== id);
      }
      
      const removed = initialLength - this.webStore[table].length;
      return { changes: { changes: removed } };
    }
    
    return { changes: { changes: 0 } };
  }
}