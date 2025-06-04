import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { NotificationType } from '../models/notification-type.model';
import { DatabaseService } from './database.service';
import { map } from 'rxjs/operators';

interface NotificationTypeRow {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isEnabled: number;
  requiresValue: number;
  valueLabel: string | null;
  validationPattern: string | null;
  validationError: string | null;
  order_num: number;
}

interface NotificationValue {
  typeId: number;
  value: string;
  isValid: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationTypeService {
  private notificationTypesSubject = new BehaviorSubject<NotificationType[]>([]);
  public notificationTypes$ = this.notificationTypesSubject.asObservable();

  private readonly controlMapping: Record<string, string> = {
    'email': 'emailAddress',
    'sms': 'phoneNumber',
    'whatsapp': 'whatsappNumber',
    'telegram': 'telegramUsername'
  };

  constructor(private databaseService: DatabaseService) {
    this.loadNotificationTypes();
  }

  private async loadNotificationTypes() {
    try {
      const result = await this.databaseService.executeQuery('SELECT * FROM notification_types ORDER BY order_num');
      console.log('Fetched notification types:', result);
      const types = result.values.map((row: any) => ({
        id: row.id,
        key: row.key,
        name: row.name,
        description: row.description,
        icon: row.icon,
        color: row.color,
        isEnabled: row.isEnabled === 1,
        requiresValue: row.requiresValue === 1,
        valueLabel: row.valueLabel,
        validationPattern: row.validationPattern,
        validationError: row.validationError,
        order: row.order_num
      }));
      
      this.notificationTypesSubject.next(types);
    } catch (error) {
      console.error('Error loading notification types:', error);
      throw error;
    }
  }

  getNotificationTypes(): Observable<NotificationType[]> {
    return this.notificationTypes$;
  }

  getEnabledNotificationTypes(): Observable<NotificationType[]> {
    return this.notificationTypes$.pipe(
      map(types => types.filter(type => type.isEnabled))
    );
  }

  async updateNotificationType(type: NotificationType): Promise<void> {
    try {
      await this.databaseService.executeQuery(
        `UPDATE notification_types 
         SET isEnabled = ? 
         WHERE key = ?`,
        [type.isEnabled ? 1 : 0, type.key]
      );

      // Update the local state
      const currentTypes = this.notificationTypesSubject.value;
      const updatedTypes = currentTypes.map(t => 
        t.key === type.key ? { ...t, isEnabled: type.isEnabled } : t
      );
      this.notificationTypesSubject.next(updatedTypes);
    } catch (error) {
      console.error('Error updating notification type:', error);
      throw error;
    }
  }

  validateNotificationValue(type: NotificationType, value: string): boolean {
    if (!type.requiresValue) return true;
    if (!value) return false;
    if (!type.validationPattern) return true;

    const regex = new RegExp(type.validationPattern);
    return regex.test(value);
  }

  async getNotificationSettings(): Promise<Record<string, string>> {
    try {
      const result = await this.databaseService.executeQuery(`
        SELECT nt.key, nv.value
        FROM notification_types nt
        LEFT JOIN notification_values nv ON nt.id = nv.notification_type_id
        WHERE nt.isEnabled = 1
      `);

      // Map the database keys to form control names
      return result.values.reduce((acc: Record<string, string>, row: any) => {
        const controlName = this.controlMapping[row.key];
        if (controlName && row.value) {
          acc[controlName] = row.value;
        }
        return acc;
      }, {});
    } catch (error) {
      console.error('Error getting notification settings:', error);
      throw error;
    }
  }

  async saveNotificationSettings(settings: Record<string, string>): Promise<void> {
    try {
      // First, get all notification types to map keys to IDs
      const types = await this.databaseService.executeQuery(
        'SELECT id, key FROM notification_types WHERE isEnabled = 1'
      );

      const keyToId = types.values.reduce((acc: Record<string, number>, row: any) => {
        acc[row.key] = row.id;
        return acc;
      }, {});

      // Delete existing values
      await this.databaseService.executeQuery(
        'DELETE FROM notification_values WHERE notification_type_id IN (SELECT id FROM notification_types WHERE isEnabled = 1)'
      );

      // Create reverse mapping from form control names to notification type keys
      const reverseMapping: Record<string, string> = Object.entries(this.controlMapping)
        .reduce((acc: Record<string, string>, [key, value]) => {
          acc[value] = key;
          return acc;
        }, {});

      // Insert new values, mapping form control names back to notification type keys
      for (const [controlName, value] of Object.entries(settings)) {
        const typeKey = reverseMapping[controlName];
        const typeId = typeKey ? keyToId[typeKey] : null;
        if (typeId) {
          await this.databaseService.executeQuery(
            'INSERT INTO notification_values (notification_type_id, value) VALUES (?, ?)',
            [typeId, value]
          );
        }
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      throw error;
    }
  }
} 