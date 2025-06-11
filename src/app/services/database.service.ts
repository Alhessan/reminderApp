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
    // Initialize empty tables with their schema
    this.webStore = {
      customers: [],
      tasks: [],
      task_cycles: [],
      task_history: [],
      task_types: [],
      notification_types: DEFAULT_NOTIFICATION_TYPES,
      notification_values: [],
      database_version: []
    };

    // Add schema information for each table
    const schema = {
      customers: {
        id: 'INTEGER',
        name: 'TEXT',
        email: 'TEXT',
        phone: 'TEXT',
        createdAt: 'TEXT'
      },
      tasks: {
        id: 'INTEGER',
        title: 'TEXT',
        type: 'TEXT',
        customerId: 'INTEGER',
        frequency: 'TEXT',
        startDate: 'TEXT',
        notificationTime: 'TEXT',
        notificationType: 'TEXT',
        notificationValue: 'TEXT',
        notes: 'TEXT',
        isCompleted: 'INTEGER',
        lastCompletedDate: 'TEXT',
        isArchived: 'INTEGER'
      },
      task_cycles: {
        id: 'INTEGER',
        taskId: 'INTEGER',
        cycleStartDate: 'TEXT',
        cycleEndDate: 'TEXT',
        status: 'TEXT',
        progress: 'INTEGER',
        completedAt: 'TEXT',
        createdAt: 'TEXT'
      },
      task_history: {
        id: 'INTEGER',
        taskId: 'INTEGER',
        timestamp: 'TEXT',
        action: 'TEXT',
        details: 'TEXT'
      },
      task_types: {
        id: 'INTEGER',
        name: 'TEXT',
        icon: 'TEXT',
        color: 'TEXT'
      },
      notification_types: {
        id: 'INTEGER',
        key: 'TEXT',
        name: 'TEXT',
        icon: 'TEXT',
        isEnabled: 'INTEGER'
      },
      notification_values: {
        id: 'INTEGER',
        notificationTypeId: 'INTEGER',
        value: 'TEXT',
        label: 'TEXT'
      },
      database_version: {
        version: 'INTEGER'
      }
    };

    // Add a dummy row to each table to preserve schema
    Object.entries(schema).forEach(([table, columns]) => {
      if (!this.webStore[table].length && table !== 'notification_types') {
        const dummyRow = Object.fromEntries(
          Object.entries(columns).map(([col, type]) => [col, type === 'INTEGER' ? 0 : ''])
        );
        this.webStore[table].push(dummyRow);
      }
    });

    // Save the initial state
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
        order INTEGER
      )`
    ];

    for (const statement of statements) {
      await this.executeQuery(statement, []);
    }
  }

  private async runMigrations() {
    const currentVersion = await this.getCurrentVersion();
    
    if (currentVersion < 1) {
        await this.migration1();
      }
    if (currentVersion < 2) {
        await this.migration2();
      }
    if (currentVersion < 3) {
      await this.migration3();
    }
    
    await this.setVersion(3);
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
    try {
      console.log('Executing web query:', { statement, values });
      console.log('Current web store state:', this.webStore);

      if (statement.trim().toUpperCase().startsWith('PRAGMA')) {
        // Handle PRAGMA queries
        const match = statement.match(/PRAGMA\s+table_info\((\w+)\)/i);
        if (match) {
          const tableName = match[1].toLowerCase();
          if (!this.webStore[tableName]) {
            return Promise.resolve({ values: [] });
          }
          
          // Get a sample row to determine columns
          const sampleRow = this.webStore[tableName][0] || {};
          const columns = Object.keys(sampleRow);
          
          // Return column info in SQLite format
          const columnInfo = columns.map((name, index) => ({
            cid: index,
            name: name,
            type: typeof sampleRow[name] === 'number' ? 'INTEGER' : 
                  typeof sampleRow[name] === 'boolean' ? 'BOOLEAN' : 'TEXT',
            notnull: 0,
            dflt_value: null,
            pk: name === 'id' ? 1 : 0
          }));
          
          return Promise.resolve({ values: columnInfo });
        }
        return Promise.resolve({ values: [] });
      } else if (statement.trim().toUpperCase().startsWith('WITH')) {
        // Handle WITH (CTE) queries
        const results = this.handleWebCTE(statement);
        return Promise.resolve({ values: results, changes: 0 });
      } else if (statement.trim().toUpperCase().startsWith('SELECT')) {
        // Handle SELECT queries
        const result = this.handleWebSelect(statement, values || []);
        console.log('SELECT query results:', result);
        return Promise.resolve(result);
      } else if (statement.trim().toUpperCase().startsWith('UPDATE')) {
        // Handle UPDATE queries
        const result = this.handleWebUpdate(statement, values || []);
        this.saveWebStoreToLocalStorage();
        return Promise.resolve(result);
      } else if (statement.trim().toUpperCase().startsWith('INSERT')) {
        // Handle INSERT queries
        const result = this.handleWebInsert(statement, values || []);
        this.saveWebStoreToLocalStorage();
        return Promise.resolve(result);
      } else if (statement.trim().toUpperCase().startsWith('DELETE')) {
        // Handle DELETE queries
        const result = this.handleWebDelete(statement, values || []);
        this.saveWebStoreToLocalStorage();
        return Promise.resolve(result);
      }

      throw new Error(`Unsupported query type: ${statement}`);
    } catch (error) {
      console.error('Error executing web query:', error);
      return Promise.reject(error);
    }
  }

  private handleWebCTE(statement: string): any[] {
    console.log('Handling CTE query:', statement);
    
    // Clean up the statement - normalize whitespace but preserve important spaces
    const cleanStatement = statement.replace(/\s+/g, ' ').trim();
    
    // Extract CTE definition and main query
    const matches = cleanStatement.match(/WITH\s+(\w+)\s+AS\s+\(([\s\S]+?)\)\s+([\s\S]+)/i);
    if (!matches) {
      throw new Error('Invalid CTE query format');
    }
    
    const [_, cteName, cteQuery, mainQuery] = matches;
    console.log('CTE parts:', { cteName, cteQuery, mainQuery });

    // Get base table data for the CTE
    const fromMatch = cteQuery.match(/FROM\s+(\w+)/i);
    if (!fromMatch) {
      throw new Error('Invalid FROM clause in CTE');
    }
    
    const baseTable = fromMatch[1].toLowerCase();
    const baseData = [...this.webStore[baseTable]];

    // Handle window function
    if (cteQuery.includes('ROW_NUMBER()')) {
      const partitionMatch = cteQuery.match(/PARTITION\s+BY\s+([^\s]+)/i);
      const orderMatch = cteQuery.match(/ORDER\s+BY\s+([^\s]+)/i);
      
      if (!partitionMatch || !orderMatch) {
        throw new Error('Missing PARTITION BY or ORDER BY in window function');
      }
      
      const partitionCol = partitionMatch[1].split('.')[1] || partitionMatch[1];
      const orderCol = orderMatch[1].split('.')[1] || orderMatch[1];
      
      // Group by partition column
      const groups = baseData.reduce<{ [key: string]: any[] }>((acc, row) => {
        const key = row[partitionCol];
        if (!acc[key]) acc[key] = [];
        acc[key].push({ ...row });
        return acc;
      }, {});
      
      // Add row numbers within each partition
      const cteResults = Object.values(groups).flatMap((group: any[]) => {
        group.sort((a: any, b: any) => {
          const aVal = a[orderCol];
          const bVal = b[orderCol];
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        });
        
        return group.map((row: any, index: number) => ({
          ...row,
          rn: index + 1
        }));
      });
      
      // Store CTE results temporarily
      const tempStore = { ...this.webStore };
      tempStore[cteName] = cteResults;
      
      // Execute main query with CTE results
      console.log('Executing main query with CTE:', mainQuery);
      const mainResults = this.handleWebSelect(mainQuery, [], tempStore).values;
      console.log('Main query results:', mainResults);
      
      return mainResults;
    }

    // For non-window function CTEs
    const cteResults = this.handleWebSelect(cteQuery, []).values;
    console.log('CTE results:', cteResults);

    // Store CTE results temporarily
    const tempStore = { ...this.webStore };
    tempStore[cteName] = cteResults;

    // Execute main query with CTE results
    const mainResults = this.handleWebSelect(mainQuery, [], tempStore).values;
    console.log('Main query results:', mainResults);

    return mainResults;
  }

  private handleWebSelect(statement: string, values: any[], tempStore?: any): any {
    console.log('Handling SELECT query:', { statement, values });
    
    // Clean up the statement - normalize whitespace but preserve important spaces
    const cleanStatement = statement.replace(/\s+/g, ' ').trim();
    console.log('Cleaned statement:', cleanStatement);
    
    // Extract table names and JOIN conditions
    const fromMatch = cleanStatement.match(/FROM\s+(\w+)(\s+(?:LEFT |INNER |RIGHT )?JOIN\s+[\s\S]+?(?=WHERE|ORDER BY|$))?/i);
    if (!fromMatch) {
      console.error('Invalid SELECT query format:', { cleanStatement, fromMatch });
      throw new Error('Invalid SELECT query format');
    }
    
    const mainTable = fromMatch[1].toLowerCase();
    const store = tempStore || this.webStore;
    
    if (!store[mainTable]) {
      console.error(`Table ${mainTable} not found in store`);
      throw new Error(`Table ${mainTable} not found`);
    }
    
    let results = [...store[mainTable]];
    console.log('Initial results from table:', results);
    
    // Handle JOINs if present
    if (fromMatch[2]) {
      const joins = fromMatch[2].match(/(?:LEFT |INNER |RIGHT )?JOIN\s+(\w+)\s+(?:AS\s+)?(\w+)?\s*ON\s+(.+?)(?=(?:LEFT |INNER |RIGHT )?JOIN|\s*$)/gi);
      if (joins) {
        joins.forEach(joinClause => {
          const joinMatch = joinClause.match(/(?:(LEFT|INNER|RIGHT)\s+)?JOIN\s+(\w+)\s+(?:AS\s+)?(\w+)?\s*ON\s+(.+)/i);
          if (joinMatch) {
            const [_, joinType = 'INNER', joinTable, alias, condition] = joinMatch;
            const tableToJoin = store[joinTable.toLowerCase()];
            
            if (!tableToJoin) {
              throw new Error(`Join table ${joinTable} not found`);
            }
            
            results = this.performJoin(results, tableToJoin, condition, joinType.toUpperCase(), alias);
          }
        });
      }
    }
    
    // Extract WHERE clause
    const whereMatch = cleanStatement.match(/WHERE\s+(.+?)(?:\s+ORDER BY|\s*$)/i);
    
    // Apply WHERE clause if present
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();
      results = results.filter(row => this.evaluateWhereCondition(row, whereClause, values));
    }
    
    // Extract ORDER BY clause
    const orderMatch = cleanStatement.match(/ORDER BY\s+(.+?)$/i);
    
    // Apply ORDER BY if present
    if (orderMatch) {
      const orderClauses = orderMatch[1].split(',').map(clause => {
        const parts = clause.trim().split(/\s+/);
        return {
          column: parts[0],
          direction: parts[1]?.toUpperCase() || 'ASC'
        };
        });
      
      results.sort((a, b) => {
        for (const clause of orderClauses) {
          const aVal = this.evaluateOrderByExpression(a, clause.column);
          const bVal = this.evaluateOrderByExpression(b, clause.column);
          
          if (aVal !== bVal) {
            return clause.direction === 'ASC' ? 
              (aVal > bVal ? 1 : -1) : 
              (aVal < bVal ? 1 : -1);
          }
        }
        return 0;
      });
    }
    
    console.log('Final SELECT results:', results);
    return {
      values: Array.isArray(results) ? results : [results],
      changes: 0
    };
  }

  private evaluateOrderByExpression(row: any, expression: string): any {
    // Handle CASE expressions
    if (expression.toUpperCase().startsWith('CASE')) {
      const caseMatch = expression.match(/CASE\s+([\s\S]+?)\s+END/i);
      if (caseMatch) {
        const whenClauses = caseMatch[1].split(/\s+WHEN\s+/i).slice(1);
        for (const clause of whenClauses) {
          const [condition, result] = clause.split(/\s+THEN\s+/i);
          if (this.evaluateComplexCondition(row, condition)) {
            return Number(result.trim());
          }
        }
        // Handle ELSE clause if present
        const elseMatch = caseMatch[1].match(/ELSE\s+(\d+)/i);
        return elseMatch ? Number(elseMatch[1]) : null;
      }
    }
    return row[expression];
  }

  private evaluateComplexCondition(row: any, condition: string): boolean {
    // Handle AND conditions
    if (condition.includes(' AND ')) {
      const conditions = condition.split(' AND ');
      return conditions.every(c => this.evaluateSimpleCondition(row, c.trim()));
    }
    
    // Handle OR conditions
    if (condition.includes(' OR ')) {
      const conditions = condition.split(' OR ');
      return conditions.some(c => this.evaluateSimpleCondition(row, c.trim()));
    }
    
    return this.evaluateSimpleCondition(row, condition);
  }

  private evaluateSimpleCondition(row: any, condition: string): boolean {
    // Handle various comparison operators
    if (condition.includes('!=')) {
      const [col, val] = condition.split('!=').map(s => s.trim());
      const rowVal = this.getRowValue(row, col);
      const compareVal = this.parseValue(val);
      return rowVal !== compareVal;
    } else if (condition.includes('<=')) {
      const [col, val] = condition.split('<=').map(s => s.trim());
      const rowVal = this.getRowValue(row, col);
      const compareVal = this.parseValue(val);
      return rowVal <= compareVal;
    } else if (condition.includes('>=')) {
      const [col, val] = condition.split('>=').map(s => s.trim());
      const rowVal = this.getRowValue(row, col);
      const compareVal = this.parseValue(val);
      return rowVal >= compareVal;
    } else if (condition.includes('<')) {
      const [col, val] = condition.split('<').map(s => s.trim());
      const rowVal = this.getRowValue(row, col);
      const compareVal = this.parseValue(val);
      return rowVal < compareVal;
    } else if (condition.includes('>')) {
      const [col, val] = condition.split('>').map(s => s.trim());
      const rowVal = this.getRowValue(row, col);
      const compareVal = this.parseValue(val);
      return rowVal > compareVal;
    } else if (condition.includes('=')) {
      const [col, val] = condition.split('=').map(s => s.trim());
      const rowVal = this.getRowValue(row, col);
      const compareVal = this.parseValue(val);
      return rowVal === compareVal;
    }
    
    return false;
  }

  private getRowValue(row: any, column: string): any {
    // Handle table aliases (e.g., tc.cycleEndDate)
    if (column.includes('.')) {
      const [alias, field] = column.split('.');
      return row[field];
    }
    return row[column];
  }

  private parseValue(value: string): any {
    // Remove quotes if present
    value = value.replace(/^['"]|['"]$/g, '');
    
    // Try parsing as date
    if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return value;
    }
    
    // Try parsing as number
    const num = Number(value);
    if (!isNaN(num)) {
      return num;
    }
    
    // Return as string
    return value;
  }

  private performJoin(leftTable: any[], rightTable: any[], condition: string, joinType: string, alias?: string): any[] {
    const results: any[] = [];
    const [leftCol, rightCol] = condition.split(/\s*=\s*/);
    const [leftTableCol, rightTableCol] = [
      leftCol.split('.')[1],
      rightCol.split('.')[1]
    ];

    for (const leftRow of leftTable) {
      let matched = false;
      for (const rightRow of rightTable) {
        if (leftRow[leftTableCol] === rightRow[rightTableCol]) {
          matched = true;
          const joinedRow = {
            ...leftRow,
            ...(alias ? { [alias]: rightRow } : rightRow)
          };
          results.push(joinedRow);
        }
      }
      
      if (!matched && (joinType === 'LEFT' || joinType === 'RIGHT')) {
        const nullRow = {
          ...leftRow,
          ...(alias ? { [alias]: null } : rightTable[0] ? 
            Object.keys(rightTable[0]).reduce((acc, key) => ({ ...acc, [key]: null }), {}) : 
            {})
        };
        results.push(nullRow);
      }
    }
    
    return results;
  }

  private handleWebInsert(statement: string, values: any[]): any {
    try {
      // Extract table name from INSERT statement
      const tableMatch = statement.match(/INSERT INTO (\w+)/i);
      if (!tableMatch) {
        throw new Error('Invalid INSERT statement');
      }
      
      const tableName = tableMatch[1].toLowerCase();
      if (!this.webStore[tableName]) {
        this.webStore[tableName] = [];
      }

      // Extract column names from the statement
      const columnsMatch = statement.match(/\(([\w\s,]+)\)/i);
      if (!columnsMatch) {
        throw new Error('Invalid INSERT statement format');
      }

      const columns = columnsMatch[1].split(',').map(col => col.trim());
      
      // Create new record
      const newRecord: any = {};
      
      // Generate new ID
      const existingIds = this.webStore[tableName].map((record: any) => record.id || 0);
      const newId = Math.max(0, ...existingIds) + 1;
      newRecord.id = newId;

      // Map values to columns
      columns.forEach((col, index) => {
        if (values[index] !== undefined) {
          // Handle boolean conversions
          if (col === 'isCompleted' || col === 'isArchived' || col === 'isEnabled' || col === 'isDefault') {
            newRecord[col] = values[index] === 1;
          } else {
            newRecord[col] = values[index];
          }
        } else if (col === 'status') {
          newRecord[col] = 'pending';
        } else if (col === 'progress') {
          newRecord[col] = 0;
        } else if (col === 'isArchived' || col === 'isCompleted' || col === 'isEnabled' || col === 'isDefault') {
          newRecord[col] = false;
        }
      });

      // Add timestamps
      if (!newRecord.createdAt) {
        newRecord.createdAt = new Date().toISOString();
      }

      // Special handling for task_cycles
      if (tableName === 'task_cycles') {
        if (!newRecord.status) {
          newRecord.status = 'pending';
        }
        if (typeof newRecord.progress === 'undefined') {
          newRecord.progress = 0;
        }
      }

      // Add the record
      this.webStore[tableName].push(newRecord);
      
      // Save changes
      this.saveWebStoreToLocalStorage();
      
      console.log(`Inserted new record into ${tableName}:`, {
        id: newId,
        record: newRecord,
        tableSize: this.webStore[tableName].length
      });
      
      // Return result in the same format as SQLite
              return {
        changes: {
          changes: 1,
          lastId: newId
        }
      };
    } catch (error) {
      console.error('Error in handleWebInsert:', error);
      throw error;
    }
  }

  private handleWebDelete(statement: string, values: any[]): any {
    console.log('Handling DELETE query:', { statement, values });
    
    // Clean up the statement - remove newlines and extra spaces
    const cleanStatement = statement.replace(/\s+/g, ' ').trim();
    
    // Extract table name and WHERE clause
    const tableMatch = cleanStatement.match(/FROM\s+(\w+)/i);
    const whereMatch = cleanStatement.match(/WHERE\s+(.+?)$/i);
    
    if (!tableMatch) {
      console.error('Invalid DELETE query format:', { cleanStatement, tableMatch });
      throw new Error('Invalid DELETE query format');
    }
    
    const tableName = tableMatch[1].toLowerCase();
    if (!this.webStore[tableName]) {
      console.error(`Table ${tableName} not found in web store`);
      throw new Error(`Table ${tableName} not found`);
    }
    
    const originalLength = this.webStore[tableName].length;
    
    // Apply WHERE clause if present
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();
      let valueIndex = 0;
      
      this.webStore[tableName] = this.webStore[tableName].filter(row => {
        if (whereClause.includes('id = ?')) {
          const idValue = Number(values[valueIndex]);
          return row.id !== idValue;
        }
        return !this.evaluateWhereCondition(row, whereClause, values);
      });
    } else {
      // If no WHERE clause, delete all rows
      this.webStore[tableName] = [];
    }
    
    const deletedCount = originalLength - this.webStore[tableName].length;
    console.log(`Deleted ${deletedCount} rows from ${tableName}`);
    
    return {
      values: [],
      changes: deletedCount
    };
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

 private handleWebUpdate(statement: string, values: any[]): any {
  console.log('Handling UPDATE query:', { statement, values });

  // Normalize whitespace to flatten multiline SQL
  const cleanStatement = statement.replace(/\s+/g, ' ').trim();

  // Extract parts
  const tableMatch = cleanStatement.match(/UPDATE\s+(\w+)\s+SET/i);
  const setMatch = cleanStatement.match(/SET\s+(.+?)\s+WHERE/i);
  const whereMatch = cleanStatement.match(/WHERE\s+(.+)$/i);

  if (!tableMatch || !setMatch || !whereMatch) {
    throw new Error('Invalid UPDATE query format');
  }

  const tableName = tableMatch[1].toLowerCase();
  const setClause = setMatch[1];
  const whereClause = whereMatch[1];

  if (!this.webStore[tableName]) {
    throw new Error(`Table ${tableName} not found`);
  }

  // Parse SET clause
  const setColumns = setClause.split(',').map(part => part.split('=')[0].trim());
  const updates: any = {};
  const updateValues = values.slice(0, setColumns.length);

  setColumns.forEach((col, i) => {
    updates[col] = updateValues[i];
  });

  const whereValue = values[values.length - 1];
  let updatedCount = 0;

  this.webStore[tableName] = this.webStore[tableName].map(row => {
    if (whereClause === 'id = ?' && row.id === whereValue) {
      updatedCount++;
      return { ...row, ...updates };
    }
    return row;
  });

  this.saveWebStoreToLocalStorage();

  console.log(`Updated ${updatedCount} rows in ${tableName}`);
  return { changes: updatedCount, values: [] };
}


  private evaluateWhereCondition(row: any, condition: string, values: any[]): boolean {
    try {
      let index = 0;
      const jsCondition = condition
        .replace(/\?/g, () => {
          const value = values[index++];
          return typeof value === 'string' ? `'${value}'` : value;
        })
        .replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*'([^']*)'|([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(\d+)/g,
          (_, col1, val1, col2, val2) => {
            const col = col1 || col2;
            const val = val1 || val2;
            return `row.${col} == ${typeof val === 'string' ? `'${val}'` : val}`;
          });
      return eval(jsCondition);
    } catch (error) {
      console.error('Error evaluating WHERE condition:', error);
      return false;
    }
  }
}