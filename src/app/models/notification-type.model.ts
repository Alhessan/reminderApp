export interface NotificationType {
  id?: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isEnabled: boolean;
  requiresValue: boolean;
  valueLabel?: string;
  validationPattern?: string;
  validationError?: string;
  order: number;
}

export const DEFAULT_NOTIFICATION_TYPES: NotificationType[] = [
  {
    key: 'push',
    name: 'Push',
    description: 'Instant notifications on your device',
    icon: 'notifications-outline',
    color: 'primary',
    isEnabled: true,
    requiresValue: false,
    order: 1
  },
  {
    key: 'silent',
    name: 'Silent',
    description: 'Quiet notifications without sound',
    icon: 'alert-outline',
    color: 'warning',
    isEnabled: true,
    requiresValue: false,
    order: 2
  },
  {
    key: 'email',
    name: 'Email',
    description: 'Get reminders in your inbox',
    icon: 'mail-outline',
    color: 'tertiary',
    isEnabled: false,
    requiresValue: true,
    valueLabel: 'Email Address',
    validationPattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    validationError: 'Please enter a valid email address',
    order: 3
  },
  {
    key: 'sms',
    name: 'SMS Notifications',
    description: 'Text message reminders',
    icon: 'chatbox-outline',
    color: 'success',
    isEnabled: false,
    requiresValue: true,
    valueLabel: 'Phone Number',
    validationPattern: '^\\+?[1-9]\\d{1,14}$',
    validationError: 'Please enter a valid phone number',
    order: 4
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp Notifications',
    description: 'Get reminders on WhatsApp',
    icon: 'logo-whatsapp',
    color: 'success',
    isEnabled: false,
    requiresValue: true,
    valueLabel: 'WhatsApp Number',
    validationPattern: '^\\+?[1-9]\\d{1,14}$',
    validationError: 'Please enter a valid WhatsApp number',
    order: 5
  },
  {
    key: 'telegram',
    name: 'Telegram Notifications',
    description: 'Get reminders on Telegram',
    icon: 'paper-plane-outline',
    color: 'primary',
    isEnabled: false,
    requiresValue: true,
    valueLabel: 'Telegram Username',
    validationPattern: '^[a-zA-Z0-9_]{5,32}$',
    validationError: 'Please enter a valid Telegram username (5-32 characters, alphanumeric and underscore)',
    order: 6
  }
]; 