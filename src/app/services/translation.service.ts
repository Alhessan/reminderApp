import { Injectable } from '@angular/core';

export interface TranslationKeys {
  [key: string]: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private translations: TranslationKeys = {
    // Category Dialog
    'taskType.add.title': 'Add Category',
    'taskType.add.subtitle': 'Create a new category with custom appearance',
    'taskType.edit.title': 'Edit Category',
    'taskType.edit.subtitle': 'Modify the category details',
    'taskType.name.label': 'Name',
    'taskType.name.placeholder': 'Enter category name',
    'taskType.description.label': 'Description',
    'taskType.description.placeholder': 'Enter description (optional)',
    'taskType.appearance': 'Appearance',
    'taskType.appearance.subtitle': 'Choose an icon and color',
    
    // Common
    'common.cancel': 'Cancel',
    'common.add': 'Add',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.required': 'This field is required',
    
    // Validation Messages
    'validation.name.required': 'Name is required for category',
    'validation.taskType.create.success': 'Category created successfully',
    'validation.taskType.create.error': 'Failed to create category. Please try again.',
    'validation.task.notFound': 'Task not found',
    'validation.task.loadError': 'Failed to load task details',
    'validation.task.saveError': 'Failed to save task. Please try again.',
    'validation.task.created': 'Task created successfully',
    'validation.task.updated': 'Task updated successfully',
    
    // Labels
    'label.name': 'Name',
    'label.description': 'Description',
    'label.icon': 'Icon',
    'label.color': 'Color',
    'label.appearance': 'Appearance'
  };

  constructor() { }

  translate(key: string, params?: { [key: string]: string }): string {
    let translation = this.translations[key] || key;
    
    // Replace parameters if provided
    if (params) {
      Object.keys(params).forEach(paramKey => {
        translation = translation.replace(`{{${paramKey}}}`, params[paramKey]);
      });
    }
    
    return translation;
  }

  // Alias for shorter usage
  t(key: string, params?: { [key: string]: string }): string {
    return this.translate(key, params);
  }

  // Set translations dynamically (for future extensibility)
  setTranslations(translations: TranslationKeys): void {
    this.translations = { ...this.translations, ...translations };
  }

  // Get all translations
  getTranslations(): TranslationKeys {
    return { ...this.translations };
  }
} 