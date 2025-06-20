import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule, DatePipe } from '@angular/common';
import { TaskListItem } from '../../../../models/task-cycle.model';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-task-list-item',
  templateUrl: './task-list-item.component.html',
  styleUrls: ['./task-list-item.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, DatePipe, RouterModule]
})
export class TaskListItemComponent {
  @Input() taskItem!: TaskListItem;
  @Output() statusChange = new EventEmitter<void>();
  @Output() progressUpdate = new EventEmitter<void>();
  @Output() optionsClick = new EventEmitter<Event>();

  get progressValue(): number {
    const progress = this.taskItem?.currentCycle?.progress || 0;
    console.log('Raw progress:', progress); // Debug log
    const calculated = Math.max(0, Math.min(100, progress)) / 100; // Clamp between 0-1
    console.log('Calculated progress value:', calculated); // Debug log
    return calculated;
  }

  constructor(private router: Router) {}

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

  formatStatus(status: string): string {
    switch (status) {
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'skipped': return 'Skipped';
      case 'pending': return 'Pending';
      default: return status;
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
    
    if (d.toDateString() === now.toDateString()) {
      return 'Today ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (d.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  onStatusClick(event: Event) {
    event.stopPropagation(); // Prevent navigation
    this.statusChange.emit();
  }

  onProgressClick(event: Event) {
    event.stopPropagation(); // Prevent navigation
    this.progressUpdate.emit();
  }

  onOptionsClick(event: Event) {
    event.stopPropagation();
    this.optionsClick.emit(event);
  }

  navigateToTaskDetail() {
    this.router.navigate(['/tasks/detail', this.taskItem.task.id], {
      replaceUrl: false,
      skipLocationChange: false
    });
  }
}

