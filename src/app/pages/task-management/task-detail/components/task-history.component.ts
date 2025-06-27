import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule, DatePipe } from '@angular/common';
import { TaskHistoryEntry } from '../../../../models/task.model';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-task-history',
  standalone: true,
  imports: [IonicModule, CommonModule, DatePipe],
  animations: [
    trigger('slideInOut', [
      state('in', style({ height: '*', opacity: 1 })),
      state('out', style({ height: '0px', opacity: 0 })),
      transition('in => out', animate('300ms ease-in-out')),
      transition('out => in', animate('300ms ease-in-out'))
    ])
  ],
  template: `
    <ion-card class="history-card">
      <ion-card-header (click)="toggleHistory()" class="clickable-header">
        <ion-card-title class="history-title">
          <ion-icon name="time-outline" color="primary"></ion-icon>
          Task History
          <ion-badge color="primary" *ngIf="taskHistory.length > 0">{{ taskHistory.length }}</ion-badge>
          <ion-icon 
            [name]="showHistory ? 'chevron-up-outline' : 'chevron-down-outline'" 
            class="expand-icon">
          </ion-icon>
        </ion-card-title>
        <ion-card-subtitle *ngIf="!showHistory && taskHistory.length > 0">
          Click to view {{ taskHistory.length }} history entries
        </ion-card-subtitle>
      </ion-card-header>
      
      <ion-card-content *ngIf="showHistory" [@slideInOut]="showHistory ? 'in' : 'out'">
        <div *ngIf="taskHistory.length === 0" class="empty-history">
          <ion-icon name="document-outline" color="medium"></ion-icon>
          <p>No history entries found for this task</p>
        </div>
        
        <ion-list *ngIf="taskHistory.length > 0" class="history-list">
          <ion-item 
            *ngFor="let entry of taskHistory; let i = index" 
            class="history-item"
            [class.latest]="i === 0">
            <div slot="start" class="timeline-indicator">
              <div class="timeline-dot" [class.latest]="i === 0"></div>
              <div class="timeline-line" *ngIf="i < taskHistory.length - 1"></div>
            </div>
            <ion-label class="history-content">
              <div class="history-header">
                <h3 class="action-title">{{ entry.action }}</h3>
                <ion-chip 
                  [color]="getActionColor(entry.action)" 
                  outline="true" 
                  class="action-chip">
                  {{ entry.action }}
                </ion-chip>
              </div>
              <p class="timestamp">{{ entry.timestamp | date:'medium' }}</p>
              <p *ngIf="entry.details" class="details">{{ entry.details }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .history-card {
      margin: 16px 0;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .clickable-header {
      cursor: pointer;
      transition: background-color 0.2s ease;
      user-select: none;
      
      &:hover {
        background-color: var(--ion-color-light);
      }
    }
    
    .history-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      
      ion-icon {
        font-size: 20px;
      }
      
      .expand-icon {
        margin-left: auto;
        font-size: 18px;
        color: var(--ion-color-medium);
        transition: transform 0.3s ease;
      }
    }
    
    .empty-history {
      text-align: center;
      padding: 32px 16px;
      color: var(--ion-color-medium);
      
      ion-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }
      
      p {
        margin: 0;
        font-size: 14px;
      }
    }
    
    .history-list {
      background: transparent;
      padding: 0;
    }
    
    .history-item {
      --background: transparent;
      --padding-start: 0;
      --padding-end: 16px;
      --padding-top: 16px;
      --padding-bottom: 16px;
      --min-height: auto;
      position: relative;
      
      &.latest {
        .timeline-dot {
          background: var(--ion-color-primary);
          box-shadow: 0 0 0 4px var(--ion-color-primary-tint);
        }
        
        .action-title {
          color: var(--ion-color-primary);
          font-weight: 600;
        }
      }
    }
    
    .timeline-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-right: 16px;
      position: relative;
      min-width: 20px;
    }
    
    .timeline-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--ion-color-medium);
      border: 2px solid var(--ion-color-light);
      z-index: 2;
      flex-shrink: 0;
    }
    
    .timeline-line {
      width: 2px;
      height: 40px;
      background: var(--ion-color-light-shade);
      margin-top: 4px;
    }
    
    .history-content {
      flex: 1;
    }
    
    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .action-title {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--ion-color-dark);
    }
    
    .action-chip {
      font-size: 11px;
      height: 24px;
      font-weight: 500;
    }
    
    .timestamp {
      margin: 0 0 8px 0;
      font-size: 13px;
      color: var(--ion-color-medium);
      font-weight: 500;
    }
    
    .details {
      margin: 0;
      font-size: 14px;
      color: var(--ion-color-medium-shade);
      line-height: 1.4;
      background: var(--ion-color-light);
      padding: 8px 12px;
      border-radius: 8px;
      border-left: 3px solid var(--ion-color-primary-tint);
    }
    
    // Dark mode support
    @media (prefers-color-scheme: dark) {
      .clickable-header:hover {
        background-color: var(--ion-color-dark-tint);
      }
      
      .timeline-line {
        background: var(--ion-color-dark-shade);
      }
      
      .timeline-dot {
        border-color: var(--ion-color-dark);
      }
      
      .action-title {
        color: var(--ion-color-light);
      }
      
      .details {
        background: var(--ion-color-dark-tint);
        color: var(--ion-color-light-shade);
      }
    }
    
    // Mobile responsive
    @media (max-width: 768px) {
      .history-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
      
      .action-chip {
        align-self: flex-start;
      }
    }
  `]
})
export class TaskHistoryComponent {
  @Input() taskHistory: TaskHistoryEntry[] = [];
  showHistory = false;

  toggleHistory() {
    this.showHistory = !this.showHistory;
  }

  getActionColor(action: string): string {
    switch (action.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'created':
        return 'primary';
      case 'updated':
      case 'modified':
        return 'warning';
      case 'deleted':
        return 'danger';
      case 'marked pending':
        return 'medium';
      default:
        return 'secondary';
    }
  }
} 