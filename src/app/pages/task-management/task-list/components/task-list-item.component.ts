import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule, DatePipe } from '@angular/common';
import { TaskListItem } from '../../../../models/task-cycle.model';
import { Router, RouterModule } from '@angular/router';
import { CycleStatusBadgeComponent } from '../../../../components/cycle-status-badge/cycle-status-badge.component';
import { STATUS_CONFIG, CycleDisplayStatus } from '../../../../models/cycle-display.model';
import { addIcons } from 'ionicons';
import { 
  timeOutline, playOutline, checkmarkCircleOutline, playForwardOutline, 
  helpOutline, addCircleOutline, ellipsisVertical 
} from 'ionicons/icons';

@Component({
  selector: 'app-task-list-item',
  templateUrl: './task-list-item.component.html',
  styleUrls: ['./task-list-item.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, DatePipe, RouterModule, CycleStatusBadgeComponent]
})
export class TaskListItemComponent {
  @Input() taskItem!: TaskListItem;
  @Output() statusChange = new EventEmitter<void>();
  @Output() progressUpdate = new EventEmitter<void>();
  @Output() optionsClick = new EventEmitter<Event>();
  @Output() quickComplete = new EventEmitter<number>();

  get progressValue(): number {
    return 0; // No progress in new cycle model
  }

  constructor(private router: Router) {
    // Register required icons
    addIcons({
      'time-outline': timeOutline,
      'play-outline': playOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'play-forward-outline': playForwardOutline,
      'help-outline': helpOutline,
      'add-circle-outline': addCircleOutline,
      'ellipsis-vertical': ellipsisVertical
    });
  }

  /** Single source of truth: STATUS_CONFIG (Phase 7 US5). */
  getStatusColor(status: string): string {
    const config = status ? STATUS_CONFIG[status as CycleDisplayStatus] : null;
    return config?.color ?? 'medium';
  }

  getStatusIcon(status: string): string {
    const config = status ? STATUS_CONFIG[status as CycleDisplayStatus] : null;
    return config?.icon ?? 'help-outline';
  }

  formatStatus(status: string): string {
    const config = status ? STATUS_CONFIG[status as CycleDisplayStatus] : null;
    return config?.label ?? status ?? '';
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

  onQuickComplete(event: Event) {
    event.stopPropagation();
    const cycleId = this.taskItem.currentCycle?.id;
    if (cycleId != null && this.taskItem.currentCycle?.resolution === 'open') {
      this.quickComplete.emit(cycleId);
    }
  }

  get canQuickComplete(): boolean {
    return !!(this.taskItem?.currentCycle?.id && this.taskItem.currentCycle.resolution === 'open');
  }

  navigateToTaskDetail() {
    this.router.navigate(['/tasks/detail', this.taskItem.task.id], {
      replaceUrl: false,
      skipLocationChange: false
    });
  }
}

