import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-color-icon-picker',
  templateUrl: './color-icon-picker.component.html',
  styleUrls: ['./color-icon-picker.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ColorIconPickerComponent implements OnInit {
  @Input() selectedIcon: string = 'person-outline';
  @Input() selectedColor: string = '#3880ff';
  @Input() context: 'task' | 'customer' | 'general' = 'general';
  @Input() showTitle: boolean = true;
  @Input() compact: boolean = false;
  @Output() iconChange = new EventEmitter<string>();
  @Output() colorChange = new EventEmitter<string>();

  showIconPicker = false;
  showColorPicker = false;

  // Context-specific icons
  private taskIcons = [
    'create-outline', 'fitness-outline', 'walk-outline', 'bicycle-outline',
    'book-outline', 'cafe-outline', 'restaurant-outline', 'water-outline',
    'bed-outline', 'alarm-outline', 'calendar-outline', 'cash-outline',
    'heart-outline', 'medkit-outline', 'call-outline', 'mail-outline',
    'business-outline', 'home-outline', 'school-outline', 'briefcase-outline',
    'barbell-outline', 'basketball-outline', 'musical-notes-outline', 'brush-outline'
  ];

  private customerIcons = [
    'person-outline', 'people-outline', 'business-outline', 'briefcase-outline',
    'home-outline', 'storefront-outline', 'restaurant-outline', 'medical-outline',
    'school-outline', 'library-outline', 'car-outline', 'airplane-outline',
    'heart-outline', 'star-outline', 'diamond-outline', 'trophy-outline',
    'shield-outline', 'leaf-outline', 'flower-outline', 'sunny-outline',
    'moon-outline', 'planet-outline', 'rocket-outline', 'gift-outline'
  ];

  private generalIcons = [
    'create-outline', 'person-outline', 'people-outline', 'business-outline',
    'home-outline', 'heart-outline', 'star-outline', 'bookmark-outline',
    'flag-outline', 'location-outline', 'time-outline', 'calendar-outline',
    'mail-outline', 'call-outline', 'chatbubble-outline', 'notifications-outline',
    'settings-outline', 'cog-outline', 'build-outline', 'hammer-outline',
    'brush-outline', 'color-palette-outline', 'image-outline', 'camera-outline'
  ];

  // Enhanced color palette with better organization
  predefinedColors = [
    // Primary colors
    { value: '#3880ff', name: 'Blue', category: 'primary' },
    { value: '#5260ff', name: 'Indigo', category: 'primary' },
    { value: '#7c4dff', name: 'Purple', category: 'primary' },
    { value: '#eb445a', name: 'Red', category: 'primary' },
    
    // Secondary colors
    { value: '#ff9800', name: 'Orange', category: 'secondary' },
    { value: '#ffcc00', name: 'Yellow', category: 'secondary' },
    { value: '#2dd36f', name: 'Green', category: 'secondary' },
    { value: '#00bcd4', name: 'Cyan', category: 'secondary' },
    
    // Neutral colors
    { value: '#9e9e9e', name: 'Gray', category: 'neutral' },
    { value: '#607d8b', name: 'Blue Gray', category: 'neutral' },
    { value: '#795548', name: 'Brown', category: 'neutral' },
    { value: '#424242', name: 'Dark Gray', category: 'neutral' },
    
    // Pastel colors
    { value: '#e1bee7', name: 'Light Purple', category: 'pastel' },
    { value: '#c8e6c9', name: 'Light Green', category: 'pastel' },
    { value: '#ffcdd2', name: 'Light Red', category: 'pastel' },
    { value: '#ffe0b2', name: 'Light Orange', category: 'pastel' }
  ];

  constructor() { }

  ngOnInit() {
    // Set default icon based on context if none provided
    if (!this.selectedIcon || this.selectedIcon === 'create-outline') {
      this.selectedIcon = this.getDefaultIcon();
    }
  }

  get availableIcons(): string[] {
    switch (this.context) {
      case 'task':
        return this.taskIcons;
      case 'customer':
        return this.customerIcons;
      default:
        return this.generalIcons;
    }
  }

  get contextTitle(): string {
    switch (this.context) {
      case 'task':
        return 'Task Appearance';
      case 'customer':
        return 'Customer Appearance';
      default:
        return 'Appearance';
    }
  }

  private getDefaultIcon(): string {
    switch (this.context) {
      case 'task':
        return 'create-outline';
      case 'customer':
        return 'person-outline';
      default:
        return 'create-outline';
    }
  }

  // TrackBy functions for better performance
  trackByIcon(index: number, icon: string): string {
    return icon;
  }

  trackByColor(index: number, color: any): string {
    return color.value;
  }

  selectIcon(icon: string) {
    this.selectedIcon = icon;
    this.iconChange.emit(icon);
    this.showIconPicker = false;
  }

  selectColor(color: string) {
    this.selectedColor = color;
    this.colorChange.emit(color);
    this.showColorPicker = false;
  }

  toggleIconPicker() {
    this.showIconPicker = !this.showIconPicker;
    if (this.showIconPicker) {
      this.showColorPicker = false;
    }
  }

  toggleColorPicker() {
    this.showColorPicker = !this.showColorPicker;
    if (this.showColorPicker) {
      this.showIconPicker = false;
    }
  }

  getColorName(colorValue: string): string {
    const color = this.predefinedColors.find(c => c.value === colorValue);
    return color ? color.name : 'Custom';
  }

  getColorsByCategory(category: string) {
    return this.predefinedColors.filter(c => c.category === category);
  }

  get colorCategories(): string[] {
    return ['primary', 'secondary', 'neutral', 'pastel'];
  }

  getCategoryDisplayName(category: string): string {
    switch (category) {
      case 'primary':
        return 'Primary';
      case 'secondary':
        return 'Secondary';
      case 'neutral':
        return 'Neutral';
      case 'pastel':
        return 'Pastel';
      default:
        return category;
    }
  }
}

