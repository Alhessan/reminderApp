import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection, CapacitorSQLitePlugin, DBSQLiteValues, capSQLiteSet } from '@capacitor-community/sqlite';
import { BehaviorSubject } from 'rxjs';

const DEFAULT_NOTIFICATION_TYPES = [
  {
    key: 'silent',
    name: 'Silent',
    description: 'Notifications without sound or alerts',
    icon: 'alert-outline',
    color: '#ffd534',
    isEnabled: false,
    requiresValue: false,
    order: 1
  },
  {
    key: 'push',
    name: 'Push Notifications',
    description: 'Receive instant notifications on your device',
    icon: 'notifications-outline',
    color: '#2dd36f',
    isEnabled: false,
    requiresValue: false,
    order: 2
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
    order: 3
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
    order: 4
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
    order: 5
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
    order: 6
  }
];

interface TaskCycle {
  id: number;
  taskId: number;
  cycleStartDate: string;
  cycleEndDate: string;
  status: string;
  progress: number;
  completedAt?: string;
}

interface TaskWithCycle {
  id: number;
  title: string;
  type: string;
  frequency: string;
  startDate: string;
  notificationTime: string;
  notificationType: string;
  notificationValue?: string;
  notes?: string;
  isArchived?: boolean;
  cycle_id?: number;
  cycleStartDate?: string;
  cycleEndDate?: string;
  status?: string;
  progress?: number;
  completedAt?: string;
}

interface TableSchema {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface TableSchemas {
  [key: string]: TableSchema[];
}

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

  private currentVersion = 5; // Increment this when adding new migrations

  private readonly tableSchemas: TableSchemas = {
    tasks: [
      { cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
      { cid: 1, name: 'title', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
      { cid: 2, name: 'type', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
      { cid: 3, name: 'customerId', type: 'INTEGER', notnull: 0, dflt_value: null, pk: 0 },
      { cid: 4, name: 'frequency', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
      { cid: 5, name: 'startDate', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
      { cid: 6, name: 'notificationType', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
      { cid: 7, name: 'notificationTime', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
      { cid: 8, name: 'notificationValue', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
      { cid: 9, name: 'notes', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
      { cid: 10, name: 'isArchived', type: 'INTEGER', notnull: 1, dflt_value: '0', pk: 0 }
    ],
    task_cycles: [
      { cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
      { cid: 1, name: 'taskId', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 0 },
      { cid: 2, name: 'cycleStartDate', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
      { cid: 3, name: 'cycleEndDate', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
      { cid: 4, name: 'status', type: 'TEXT', notnull: 1, dflt_value: "'pending'", pk: 0 },
      { cid: 5, name: 'progress', type: 'INTEGER', notnull: 1, dflt_value: '0', pk: 0 },
      { cid: 6, name: 'completedAt', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 }
    ],
    task_types: [
      { cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
      { cid: 1, name: 'name', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
      { cid: 2, name: 'description', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
      { cid: 3, name: 'isDefault', type: 'INTEGER', notnull: 1, dflt_value: '0', pk: 0 },
      { cid: 4, name: 'icon', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
      { cid: 5, name: 'color', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 }
    ],
    notification_types: [
      { cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
      { cid: 1, name: 'key', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
      { cid: 2, name: 'name', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
      { cid: 3, name: 'description', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
      { cid: 4, name: 'icon', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
      { cid: 5, name: 'color', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
      { cid: 6, name: 'isEnabled', type: 'INTEGER', notnull: 1, dflt_value: '0', pk: 0 },
      { cid: 7, name: 'requiresValue', type: 'INTEGER', notnull: 1, dflt_value: '0', pk: 0 },
      { cid: 8, name: 'valueLabel', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
      { cid: 9, name: 'validationPattern', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
      { cid: 10, name: 'validationError', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
      { cid: 11, name: 'order_num', type: 'INTEGER', notnull: 1, dflt_value: '0', pk: 0 }
    ],
    notification_values: [
      { cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
      { cid: 1, name: 'notification_type_key', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
      { cid: 2, name: 'value', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 }
    ],
    customers: [
      { cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
      { cid: 1, name: 'name', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
      { cid: 2, name: 'email', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
      { cid: 3, name: 'phone', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
      { cid: 4, name: 'notes', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 }
    ],
    database_version: [
      { cid: 0, name: 'version', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 }
    ]
  };

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
      if (!this.webStore['task_cycles']) {
        this.webStore['task_cycles'] = [];
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
        this.webStore['notification_types'] = DEFAULT_NOTIFICATION_TYPES.map((type, index) => ({
          id: index + 1,
          key: type.key,
          name: type.name,
          description: type.description,
          icon: type.icon,
          color: type.color,
          isEnabled: type.isEnabled ? 1 : 0,
          requiresValue: type.requiresValue ? 1 : 0,
          valueLabel: type.valueLabel || null,
          validationPattern: type.validationPattern || null,
          validationError: type.validationError || null,
          order_num: type.order
        }));
      }
      if (!this.webStore['notification_values']) {
        this.webStore['notification_values'] = [];
      }
      
      // Save the initialized store back to localStorage
      this.saveWebStoreToLocalStorage();
      console.log('Web database initialized:', this.webStore);
    } catch (error) {
      console.error('Error initializing web database:', error);
      throw error;
    }
  }

  private initializeEmptyWebStore(): void {
    this.webStore = {
      customers: [],
      tasks: [],
      task_cycles: [],
      task_history: [],
      task_types: [
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
      notification_types: DEFAULT_NOTIFICATION_TYPES.map((type, index) => ({
        id: index + 1,
        key: type.key,
        name: type.name,
        description: type.description,
        icon: type.icon,
        color: type.color,
        isEnabled: type.isEnabled ? 1 : 0,
        requiresValue: type.requiresValue ? 1 : 0,
        valueLabel: type.valueLabel || null,
        validationPattern: type.validationPattern || null,
        validationError: type.validationError || null,
        order_num: type.order
      })),
      notification_values: []
    };

    // Initialize with proper data types
    this.webStore['tasks'] = this.webStore['tasks'].map(task => ({
      ...task,
      isArchived: task.isArchived === 1 || task.isArchived === true || task.isArchived === 'true' ? 1 : 0
    }));

    console.log('Initialized web store with default values:', this.webStore);
    this.saveWebStoreToLocalStorage();
  }

  private saveWebStoreToLocalStorage(): void {
    try {
      const dataToStore = JSON.stringify(this.webStore);
      localStorage.setItem(this.STORAGE_KEY, dataToStore);
      console.log('Web store saved to localStorage:', this.webStore);
    } catch (error) {
      console.error('Error saving web store to localStorage:', error);
    }
  }

  private async createSchema(): Promise<void> {
    const statements = [
      `CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        notes TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        customerId INTEGER,
        frequency TEXT NOT NULL,
        startDate TEXT NOT NULL,
        notificationType TEXT NOT NULL,
        notificationTime TEXT NOT NULL,
        notificationValue TEXT,
        notes TEXT,
        isArchived INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS task_cycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskId INTEGER NOT NULL,
        cycleStartDate TEXT NOT NULL,
        cycleEndDate TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        completedAt TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS task_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskId INTEGER NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS task_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        isDefault INTEGER DEFAULT 0,
        icon TEXT,
        color TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS notification_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT,
        isEnabled INTEGER DEFAULT 0,
        requiresValue INTEGER DEFAULT 0,
        valueLabel TEXT,
        validationPattern TEXT,
        validationError TEXT,
        order_num INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS notification_values (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        notification_type_key TEXT NOT NULL,
        value TEXT NOT NULL,
        FOREIGN KEY (notification_type_key) REFERENCES notification_types(key) ON DELETE CASCADE
      )`
    ];

    for (const statement of statements) {
      await this.executeQuery(statement, []);
    }
  }

  private async runMigrations() {
    const currentVersion = await this.getCurrentVersion();
    console.log('Current database version:', currentVersion);

    if (currentVersion < 1) {
      await this.migration1();
      await this.setVersion(1);
    }
    if (currentVersion < 2) {
      await this.migration2();
      await this.setVersion(2);
    }
    if (currentVersion < 3) {
      await this.migration3();
      await this.setVersion(3);
    }
    if (currentVersion < 4) {
      await this.migration4();
      await this.setVersion(4);
    }
    if (currentVersion < 5) {
      await this.migration5();
      await this.setVersion(5);
    }
  }

  private async migration3() {
    const statements = [
      // Drop the isCompleted and lastCompletedDate columns from tasks table
      `CREATE TABLE IF NOT EXISTS tasks_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        customerId INTEGER,
        frequency TEXT NOT NULL,
        startDate TEXT NOT NULL,
        notificationType TEXT NOT NULL,
        notificationTime TEXT NOT NULL,
        notificationValue TEXT,
        notes TEXT,
        isArchived INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
      )`,
      `INSERT INTO tasks_new SELECT 
        id, title, type, customerId, frequency, startDate, 
        notificationType, notificationTime, notificationValue, 
        notes, isArchived, createdAt 
        FROM tasks`,
      `DROP TABLE tasks`,
      `ALTER TABLE tasks_new RENAME TO tasks`,

      // Create task_cycles table
      `CREATE TABLE IF NOT EXISTS task_cycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskId INTEGER NOT NULL,
        cycleStartDate TEXT NOT NULL,
        cycleEndDate TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        completedAt TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
      )`,

      // Create initial cycles for existing tasks
      `INSERT INTO task_cycles (taskId, cycleStartDate, cycleEndDate, status, completedAt)
       SELECT id, startDate, 
         CASE frequency
           WHEN 'daily' THEN date(startDate, '+1 day')
           WHEN 'weekly' THEN date(startDate, '+7 days')
           WHEN 'monthly' THEN date(startDate, '+1 month')
           WHEN 'yearly' THEN date(startDate, '+1 year')
         END,
         CASE WHEN isCompleted = 1 THEN 'completed' ELSE 'pending' END,
         lastCompletedDate
       FROM tasks`
    ];

    for (const statement of statements) {
      await this.executeQuery(statement, []);
    }
  }

  private async migration4() {
    console.log('Running migration 4: Adding Silent notification type and notification_values table');
    
    try {
      // Create notification_values table if it doesn't exist
      await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS notification_values (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          notification_type_key TEXT NOT NULL,
          value TEXT NOT NULL,
          FOREIGN KEY (notification_type_key) REFERENCES notification_types(key) ON DELETE CASCADE
        )
      `);

      // Check if Silent notification type already exists
      const result = await this.executeQuery(
        'SELECT * FROM notification_types WHERE key = ?',
        ['silent']
      );

      if (!result.values || result.values.length === 0) {
        // Add Silent notification type
        await this.executeQuery(`
          INSERT INTO notification_types (
            key, name, description, icon, color, isEnabled, requiresValue, valueLabel,
            validationPattern, validationError, order_num
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'silent',
          'Silent',
          'Notifications without sound or alerts',
          'alert-outline',
          '#ffd534',
          0,  // isEnabled = false
          0,  // requiresValue = false
          null, // valueLabel
          null, // validationPattern
          null, // validationError
          1    // order_num
        ]);

        // Update order of other notification types
        await this.executeQuery(`
          UPDATE notification_types 
          SET order_num = order_num + 1 
          WHERE key != 'silent'
        `);
      }

      console.log('Migration 4 completed successfully');
    } catch (error) {
      console.error('Error in migration 4:', error);
      throw error;
    }
  }

  private async migration5() {
    console.log('Running migration 5: Updating notification_values table and cleaning up invalid tasks');
    
    try {
      // Drop and recreate notification_values table
      await this.executeQuery('DROP TABLE IF EXISTS notification_values');
      
      await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS notification_values (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          notification_type_key TEXT NOT NULL,
          value TEXT NOT NULL,
          FOREIGN KEY (notification_type_key) REFERENCES notification_types(key) ON DELETE CASCADE
        )
      `);

      // Clean up invalid tasks
      await this.executeQuery(`
        DELETE FROM tasks 
        WHERE frequency IS NULL 
           OR startDate IS NULL 
           OR title IS NULL 
           OR type IS NULL
      `);

      // If in web mode, also clean up the web store
      if (!this.isNative) {
        if (this.webStore['tasks']) {
          this.webStore['tasks'] = this.webStore['tasks'].filter(task => 
            task.frequency && 
            task.startDate && 
            task.title && 
            task.type
          );
          this.saveWebStoreToLocalStorage();
        }
      }

      console.log('Migration 5 completed successfully');
    } catch (error) {
      console.error('Error in migration 5:', error);
      throw error;
    }
  }

  async executeQuery(statement: string, values?: any[]): Promise<any> {
    if (this.isNative) {
      // Native platform - use SQLite with proper transaction handling
      if (!this.db) {
        await this.initializeDatabase();
      }
      
      try {
        // For INSERT statements, use run() instead of query()
        if (statement.toLowerCase().trim().startsWith('insert')) {
          const result = await this.db.run(statement, values || []);
          // Get the last inserted id
          const lastIdResult = await this.db.query('SELECT last_insert_rowid() as lastId');
          return {
            changes: {
              lastId: lastIdResult.values?.[0]?.lastId,
              changes: (result as any).changes || 0
            }
          };
        }
        
        // For other statements (SELECT, UPDATE, DELETE)
        const result = await this.db.query(statement, values || []);
        return {
          values: result.values || [],
          changes: { 
            changes: (result as any).changes || 0,
            lastId: null 
          }
        };
      } catch (error) {
        console.error('Native SQLite error:', error);
        throw error;
      }
    } else {
      // Web platform - use in-memory store
      return this.executeWebQuery(statement, values || []);
    }
  }

  private async executeWebQuery(statement: string, values?: any[]): Promise<any> {
    console.log('Executing web query:', statement, 'with values:', values);
    try {
      let result: any;
      
      // Special handling for PRAGMA and table_info queries
      if (statement.trim().toLowerCase().startsWith('pragma') || 
          /table_info\(\w+\)/i.test(statement)) {
        return this.handleWebSelect(statement, values || []);
      }
      
      // Handle different types of SQL statements
      if (statement.trim().toLowerCase().startsWith('select')) {
        result = this.handleWebSelect(statement, values || []);
      } else if (statement.trim().toLowerCase().startsWith('insert')) {
        result = this.handleWebInsert(statement, values || []);
      } else if (statement.trim().toLowerCase().startsWith('update')) {
        result = this.handleWebUpdate(statement, values || []);
      } else if (statement.trim().toLowerCase().startsWith('delete')) {
        result = this.handleWebDelete(statement, values || []);
      } else {
        throw new Error(`Unsupported SQL statement: ${statement}`);
      }

      // Save changes to localStorage
      this.saveWebStoreToLocalStorage();
      
      console.log('Web query result:', result);
      return result;
    } catch (error) {
      console.error('Error executing web query:', error);
      throw error;
    }
  }

  private handleWebSelect(statement: string, values: any[]): any {
    try {
      // Handle PRAGMA and table_info queries
      if (statement.toLowerCase().includes('pragma') || statement.toLowerCase().includes('table_info')) {
        const tableMatch = statement.match(/table_info\((\w+)\)/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          if (tableName in this.tableSchemas) {
            return { values: this.tableSchemas[tableName] };
          }
          return { values: [] };
        }
        // For other PRAGMA queries, return empty result
        return { values: [] };
      }

      // Extract table name from the query
      const tableMatch = statement.match(/FROM\s+(\w+)/i);
      if (!tableMatch) throw new Error('Could not determine table name from query');
      const tableName = tableMatch[1];

      // Get the data for this table
      let data = this.webStore[tableName] || [];

      // Handle WHERE conditions
      if (statement.includes('WHERE')) {
        const whereCondition = statement.split('WHERE')[1].split(/ORDER BY|LIMIT|GROUP BY/)[0].trim();
        data = data.filter(record => this.evaluateWhereCondition(record, whereCondition, values));
      }

      // Special handling for isArchived field
      if (tableName === 'tasks' && statement.includes('isArchived')) {
        data = data.map(task => ({
          ...task,
          isArchived: task.isArchived === 1 || task.isArchived === true || task.isArchived === 'true' ? 1 : 0
        }));
      }

      // Handle JOIN conditions
      if (statement.includes('JOIN')) {
        // Extract all table names and their aliases
        const joinMatches = statement.matchAll(/JOIN\s+(\w+)(?:\s+(?:as\s+)?(\w+))?/gi);
        for (const match of joinMatches) {
          const joinTable = match[1];
          const joinData = this.webStore[joinTable] || [];
          
          // Perform the join
          data = data.map(record => {
            const joinRecords = joinData.filter(jr => 
              jr[`${tableName}Id`] === record.id || 
              jr.id === record[`${joinTable}Id`]
            );
            
            return {
              ...record,
              ...joinRecords[0]
            };
          });
        }
      }

      return { values: data };
    } catch (error) {
      console.error('Error in handleWebSelect:', error);
      throw error;
    }
  }

  private handleWebInsert(statement: string, values: any[]): any {
    console.log('Handling web insert:', statement, values);
    const matches = statement.match(/INSERT INTO (\w+)/i);
    if (!matches) {
      throw new Error('Invalid INSERT statement');
    }
  
    const tableName = matches[1].toLowerCase();
    if (!this.webStore[tableName]) {
      this.webStore[tableName] = [];  // Initialize if not exists
    }
  
    // Get the next ID
    const maxId = this.webStore[tableName].reduce((max: number, item: any) => 
      item.id > max ? item.id : max, 0);
    const newId = maxId + 1;
  
    // Create the new record
    const newRecord: { [key: string]: any } = { id: newId };
    
    // Extract column names from the statement - fix the regex to handle multiline
    // Match everything between the first ( and ) that contains column names
    const columnsMatch = statement.match(/INSERT INTO \w+\s*\(\s*([\s\S]*?)\s*\)\s*VALUES/i);
    if (columnsMatch) {
      const columnsString = columnsMatch[1];
      const columns = columnsString
        .split(',')
        .map(col => col.trim().replace(/\n/g, '').replace(/\s+/g, ' '))
        .filter(col => col.length > 0);
      
      console.log('Extracted columns:', columns);
      console.log('Values to insert:', values);
      
      columns.forEach((col, index) => {
        if (index < values.length) {
          newRecord[col] = values[index];
        }
      });
    } else {
      console.error('Could not extract columns from statement:', statement);
      throw new Error('Could not parse column names from INSERT statement');
    }
  
    // Special handling for notification_values
    if (tableName === 'notification_values') {
      // Remove any existing value for this notification type
      this.webStore[tableName] = this.webStore[tableName].filter(
        (nv: any) => nv['notification_type_key'] !== newRecord['notification_type_key']
      );
    }
  
    // Add the record to the table
    this.webStore[tableName].push(newRecord);
  
    // Save changes to localStorage
    this.saveWebStoreToLocalStorage();
  
    console.log(`Inserted new record in ${tableName}:`, newRecord);
    return { changes: { lastId: newId, changes: 1 }, values: [newRecord] };
  }
  private handleWebUpdate(statement: string, values: any[]): any {
    console.log('Handling web update:', statement, values);
    const matches = statement.match(/UPDATE\s+(\w+)\s+SET/i);
    if (!matches) {
      throw new Error('Invalid UPDATE statement');
    }

    const tableName = matches[1].toLowerCase();
    if (!this.webStore[tableName]) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    // Extract SET clause and WHERE condition
    const setMatch = statement.match(/SET\s+(.*?)(?=\s+WHERE|$)/is);
    const whereMatch = statement.match(/WHERE\s+(.*)/i);

    if (!setMatch) {
      throw new Error('Invalid SET clause in UPDATE statement');
    }

    // Split SET clause by commas, but handle line breaks and whitespace
    const setColumns = setMatch[1]
      .split(',')
      .map(col => col.trim())
      .filter(col => col.length > 0);  // Filter out empty strings

    let valueIndex = 0;
    const updates: { [key: string]: any } = {};

    // Build updates object
    setColumns.forEach(col => {
      const colMatch = col.match(/(\w+)\s*=\s*\?/);
      if (colMatch) {
        const columnName = colMatch[1];
        updates[columnName] = values[valueIndex++];
      }
    });

    console.log('Updates to apply:', updates);
    console.log('Where condition:', whereMatch?.[1]);
    console.log('Remaining values:', values.slice(valueIndex));

    // Apply updates
    let updatedCount = 0;
    this.webStore[tableName] = this.webStore[tableName].map((record: any) => {
      if (!whereMatch || this.evaluateWhereCondition(record, whereMatch[1], values.slice(valueIndex))) {
        updatedCount++;
        return { ...record, ...updates };
      }
      return record;
    });

    // Save changes to localStorage
    this.saveWebStoreToLocalStorage();

    console.log(`Updated ${updatedCount} records in ${tableName}:`, updates);
    return { changes: { changes: updatedCount } };
  }

  private handleWebDelete(statement: string, values: any[]): any {
    console.log('Handling web delete:', statement, values);
    const matches = statement.match(/DELETE FROM (\w+)/i);
    if (!matches) {
      throw new Error('Invalid DELETE statement');
    }

    const tableName = matches[1].toLowerCase();
    if (!this.webStore[tableName]) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    const whereMatch = statement.match(/WHERE (.*)/i);
    if (!whereMatch) {
      throw new Error('DELETE statement must have a WHERE clause');
    }

    const initialLength = this.webStore[tableName].length;
    this.webStore[tableName] = this.webStore[tableName].filter((record: any) => 
      !this.evaluateWhereCondition(record, whereMatch[1], values));

    // Save changes to localStorage
      this.saveWebStoreToLocalStorage();
      
    const deletedCount = initialLength - this.webStore[tableName].length;
    console.log(`Deleted ${deletedCount} records from ${tableName}`);
    return { changes: { changes: deletedCount } };
  }

  private evaluateWhereCondition(record: any, condition: string, values: any[]): boolean {
    let valueIndex = 0;
    const processedCondition = condition.replace(/\?/g, () => {
      const value = values[valueIndex++];
      return typeof value === 'string' ? `'${value}'` : value;
    });
    
    // Handle basic conditions (e.g., "id = 1")
    const basicCondition = processedCondition.match(/(\w+)\s*(=|!=|>|<|>=|<=)\s*(.+)/);
    if (basicCondition) {
      const [, column, operator, value] = basicCondition;
      const recordValue = record[column];
      const compareValue = this.parseValue(value);
      
      switch (operator) {
        case '=': return recordValue === compareValue;
        case '!=': return recordValue !== compareValue;
        case '>': return recordValue > compareValue;
        case '<': return recordValue < compareValue;
        case '>=': return recordValue >= compareValue;
        case '<=': return recordValue <= compareValue;
        default: return false;
      }
    }
    
    return false;
  }

  private parseValue(value: string): any {
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1);
    }
    const num = Number(value);
    return isNaN(num) ? value : num;
  }

  async reinitializeDatabase(): Promise<void> {
    try {
      if (this.isNative) {
        // Native platform - use SQLite
        if (this.db) {
          await this.db.close();
          await this.sqlite.deleteOldDatabases();
          
          // Reinitialize database
          this.db = await this.sqlite.createConnection(
            this.dbName,
            false,
            'no-encryption',
            1,
            false
          );
          
          await this.db.open();
          await this.createSchema();
          await this.migration2(); // This will add sample data
        }
      } else {
        // Web platform - clear localStorage and reinitialize
        localStorage.removeItem(this.STORAGE_KEY);
        this.webStore = {};
        await this.initializeWebDatabase();
        await this.migration2(); // This will add sample data
        
        // Save changes
        this.saveWebStoreToLocalStorage();
        
        console.log('Initialized empty web database with sample data');
      }
    } catch (error) {
      console.error('Error reinitializing database:', error);
      throw error;
    }
  }

  private calculateNextCycleEnd(startDate: string, frequency: string): string {
    const date = new Date(startDate);
    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return date.toISOString();
  }

  private async getCurrentVersion(): Promise<number> {
    try {
      // Create version table if it doesn't exist
      await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS database_version (
          version INTEGER PRIMARY KEY
        )
      `);

      // Get current database version
      const result = await this.executeQuery('SELECT version FROM database_version LIMIT 1');
      return result.values?.length ? result.values[0].version : 0;
    } catch (error) {
      console.error('Error getting database version:', error);
      return 0;
    }
  }

  private async setVersion(version: number): Promise<void> {
    try {
      const currentVersion = await this.getCurrentVersion();
      if (currentVersion === 0) {
        await this.executeQuery('INSERT INTO database_version (version) VALUES (?)', [version]);
      } else {
        await this.executeQuery('UPDATE database_version SET version = ?', [version]);
      }
    } catch (error) {
      console.error('Error setting database version:', error);
      throw error;
    }
  }

  private async migration1() {
    // Initial schema migration - already handled in createSchema
    console.log('Running migration 1');
  }

  private async migration2() {
    try {
      console.log('Running migration 2 - Adding sample data');
      
      // Add sample data
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      if (!this.isNative) {
        // Web platform - initialize web store with sample data
        
        // Initialize task_types if empty
        if (!this.webStore['task_types']?.length) {
          this.webStore['task_types'] = [
        {
          id: 1,
          name: 'Payment',
          description: 'Payment reminder tasks',
              isDefault: true,
          icon: 'cash-outline',
          color: '#2dd36f'
        },
        {
          id: 2,
          name: 'Update',
          description: 'General update tasks',
              isDefault: true,
          icon: 'refresh-outline',
          color: '#3880ff'
        },
        {
          id: 3,
          name: 'Custom',
          description: 'Custom reminder tasks',
              isDefault: true,
          icon: 'create-outline',
          color: '#5260ff'
        }
          ];
        }

        // Initialize notification_types if empty
        if (!this.webStore['notification_types']?.length) {
          this.webStore['notification_types'] = [
        {
          id: 1,
          key: 'push',
          name: 'Push Notifications',
          description: 'Receive instant notifications on your device',
          icon: 'notifications-outline',
          color: '#2dd36f',
              isEnabled: false,
              requiresValue: false,
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
              isEnabled: false,
              requiresValue: true,
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
              isEnabled: false,
              requiresValue: true,
          valueLabel: 'Phone Number',
          validationPattern: '^\\+?[1-9]\\d{1,14}$',
          validationError: 'Please enter a valid phone number in international format',
          order_num: 3
            }
          ];
        }

        // Sample tasks with proper dates
        const sampleTasks = [
          {
            id: 1,
            title: 'Monthly Payment Review',
            type: 'payment',
            frequency: 'monthly',
            startDate: now.toISOString(),
            notificationType: 'push',
            notificationTime: '09:00',
            isArchived: false,
            createdAt: now.toISOString()
          },
          {
            id: 2,
            title: 'Weekly Progress Update',
            type: 'update',
            frequency: 'weekly',
            startDate: now.toISOString(),
            notificationType: 'push',
            notificationTime: '10:00',
            isArchived: false,
            createdAt: now.toISOString()
          },
          {
            id: 3,
            title: 'Daily System Check',
            type: 'custom',
            frequency: 'daily',
            startDate: now.toISOString(),
            notificationType: 'push',
            notificationTime: '08:00',
            isArchived: false,
            createdAt: now.toISOString()
          }
        ];

        // Initialize tasks if empty
        if (!this.webStore['tasks']?.length) {
          this.webStore['tasks'] = sampleTasks;
        }

        // Initialize task_cycles if empty
        if (!this.webStore['task_cycles']?.length) {
          this.webStore['task_cycles'] = sampleTasks.map((task, index) => {
            const cycleStartDate = now.toISOString();
            let cycleEndDate;
            
            switch (task.frequency) {
              case 'daily':
                cycleEndDate = tomorrow.toISOString();
                break;
              case 'weekly':
                cycleEndDate = nextWeek.toISOString();
                break;
              case 'monthly':
                cycleEndDate = nextMonth.toISOString();
                break;
              default:
                cycleEndDate = nextMonth.toISOString();
            }

            return {
              id: index + 1,
              taskId: task.id,
              cycleStartDate,
              cycleEndDate,
              status: 'pending',
              progress: 0,
              createdAt: now.toISOString()
            };
          });
        }

        // Initialize empty tables if they don't exist
        if (!this.webStore['customers']) {
          this.webStore['customers'] = [];
        }
        if (!this.webStore['task_history']) {
          this.webStore['task_history'] = [];
        }
        if (!this.webStore['notification_values']) {
          this.webStore['notification_values'] = [];
        }
        if (!this.webStore['database_version']) {
          this.webStore['database_version'] = [{ version: 2 }];
        }

        // Save changes
        this.saveWebStoreToLocalStorage();
        
        console.log('Migration 2 completed - Sample data added to web store');
      } else {
        // Native platform - use SQL queries
        // ... existing native platform code ...
      }
    } catch (error) {
      console.error('Error in migration2:', error);
      throw error;
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString();
  }

  async getDatabaseSchema(): Promise<any> {
    try {
      const tables = [
        'customers',
        'tasks',
        'task_cycles',
        'task_history',
        'task_types',
        'notification_types',
        'notification_values',
        'database_version'
      ];
      
      const schema: any = {};
      
    if (this.isNative) {
        // Native platform - use SQLite queries
        for (const table of tables) {
          try {
            // Get table info
            const tableInfo = await this.executeQuery(`PRAGMA table_info(${table})`);
            schema[table] = tableInfo.values;
            
            // Get row count
            const countResult = await this.executeQuery(`SELECT COUNT(*) as count FROM ${table}`);
            schema[`${table}_count`] = countResult.values?.[0]?.count || 0;

            // Get last row if table has any data
            if (countResult.values?.[0]?.count > 0) {
              const lastRow = await this.executeQuery(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 1`);
              schema[`${table}_last_row`] = lastRow.values?.[0] || null;
            }
          } catch (error) {
            console.error(`Error getting schema for table ${table}:`, error);
            schema[table] = { error: error instanceof Error ? error.message : 'Unknown error' };
          }
        }
      } else {
        // Web platform - use web store
        for (const table of tables) {
          try {
            // Get table info from handleOtherWebQueries
            const tableInfo = await this.executeQuery(`PRAGMA table_info(${table})`);
            schema[table] = tableInfo.values;
            
            // Get row count directly from web store
            schema[`${table}_count`] = this.webStore[table]?.length || 0;

            // Get last row if table has any data
            if (this.webStore[table]?.length > 0) {
              schema[`${table}_last_row`] = this.webStore[table][this.webStore[table].length - 1];
            }
          } catch (error) {
            console.error(`Error getting schema for table ${table}:`, error);
            schema[table] = { error: error instanceof Error ? error.message : 'Unknown error' };
          }
        }
      }
      
      return schema;
    } catch (error) {
      console.error('Error getting database schema:', error);
      throw error;
    }
  }
}