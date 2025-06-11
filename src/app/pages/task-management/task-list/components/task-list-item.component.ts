import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule, DatePipe } from '@angular/common';
import { TaskListItem } from '../../../../models/task-cycle.model';

@Component({
  selector: 'app-task-list-item',
  templateUrl: './task-list-item.component.html',
  styleUrls: ['./task-list-item.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, DatePipe]
})
export class TaskListItemComponent {
  @Input() taskItem!: TaskListItem;
  @Output() statusChange = new EventEmitter<void>();
  @Output() progressUpdate = new EventEmitter<void>();
  @Output() optionsClick = new EventEmitter<Event>();

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'medium';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'skipped': return 'warning';
      default: return 'medium';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'in_progress': return 'play-outline';
      case 'completed': return 'checkmark-circle-outline';
      case 'skipped': return 'forward-outline';
      default: return 'help-outline';
    }
  }

  getTypeColor(type: string): string {
    switch (type.toLowerCase()) {
      case 'payment': return 'success';
      case 'update': return 'primary';
      case 'custom': return 'tertiary';
      default: return 'medium';
    }
  }

  formatDate(date: string): string {
    if (!date) return 'No date';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid date';
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Format based on how far the date is
    if (d.toDateString() === now.toDateString()) {
      return 'Today ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (d.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  onStatusClick() {
    this.statusChange.emit();
  }

  onProgressClick() {
    this.progressUpdate.emit();
  }

  onOptionsClick(event: Event) {
    event.stopPropagation();
    this.optionsClick.emit(event);
  }
} 