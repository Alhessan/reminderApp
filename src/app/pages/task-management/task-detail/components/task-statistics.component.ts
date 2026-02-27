import { Component, Input, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Task } from '../../../../models/task.model';
import { DatabaseService } from '../../../../services/database.service';

interface TaskStatistics {
  totalCycles: number;
  completedCycles: number;
  skippedCycles: number;
  inProgressCycles: number;
  pendingCycles: number;
  completionRate: number;
  averageCompletionTime: number;
  streak: {
    current: number;
    best: number;
  };
  lastActivity: string | null;
}

@Component({
  selector: 'app-task-statistics',
  standalone: true,
  imports: [IonicModule, CommonModule],
  template: `
    <ion-card class="statistics-card">
      <ion-card-header (click)="toggleStatistics()" class="clickable-header">
        <ion-card-title class="stats-title">
          <ion-icon name="analytics-outline" color="primary"></ion-icon>
          Task Statistics
          <ion-icon 
            [name]="showStatistics ? 'chevron-up' : 'chevron-down'" 
            class="expand-icon">
          </ion-icon>
        </ion-card-title>
        <ion-card-subtitle *ngIf="!showStatistics && statistics">
          {{ statistics.completionRate }}% completion rate • {{ statistics.totalCycles }} total cycles
        </ion-card-subtitle>
      </ion-card-header>
      
      <ion-card-content *ngIf="showStatistics">
        <div *ngIf="isLoading" class="loading-state">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Loading statistics...</p>
        </div>

        <div *ngIf="!isLoading && !statistics" class="no-data">
          <ion-icon name="bar-chart-outline" color="medium"></ion-icon>
          <p>No cycle data available yet</p>
        </div>

        <div *ngIf="!isLoading && statistics" class="stats-content">
          <!-- Overview Cards -->
          <div class="overview-grid">
            <div class="stat-card completion">
              <div class="stat-icon">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
              </div>
              <div class="stat-content">
                <span class="stat-number">{{ statistics.completionRate }}%</span>
                <span class="stat-label">Completion Rate</span>
              </div>
            </div>

            <div class="stat-card cycles">
              <div class="stat-icon">
                <ion-icon name="refresh-outline"></ion-icon>
              </div>
              <div class="stat-content">
                <span class="stat-number">{{ statistics.totalCycles }}</span>
                <span class="stat-label">Total Cycles</span>
              </div>
            </div>

            <div class="stat-card streak">
              <div class="stat-icon">
                <ion-icon name="flame-outline"></ion-icon>
              </div>
              <div class="stat-content">
                <span class="stat-number">{{ statistics.streak.current }}</span>
                <span class="stat-label">Current Streak</span>
              </div>
            </div>

            <div class="stat-card average">
              <div class="stat-icon">
                <ion-icon name="time-outline"></ion-icon>
              </div>
              <div class="stat-content">
                <span class="stat-number">{{ statistics.averageCompletionTime }}</span>
                <span class="stat-label">Avg Days</span>
              </div>
            </div>
          </div>

          <!-- Status Breakdown Chart -->
          <div class="status-breakdown">
            <h4>Cycle Status Breakdown</h4>
            <div class="status-chart">
              <div class="status-bar">
                <div 
                  class="status-segment completed" 
                  [style.width.%]="getStatusPercentage('completed')">
                </div>
                <div 
                  class="status-segment skipped" 
                  [style.width.%]="getStatusPercentage('skipped')">
                </div>
                <div 
                  class="status-segment in-progress" 
                  [style.width.%]="getStatusPercentage('in_progress')">
                </div>
                <div 
                  class="status-segment pending" 
                  [style.width.%]="getStatusPercentage('pending')">
                </div>
              </div>
              
              <div class="status-legend">
                <div class="legend-item">
                  <div class="legend-color completed"></div>
                  <span>Completed ({{ statistics.completedCycles }})</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color skipped"></div>
                  <span>Missed ({{ statistics.skippedCycles }})</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color in-progress"></div>
                  <span>In Progress ({{ statistics.inProgressCycles }})</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color pending"></div>
                  <span>Pending ({{ statistics.pendingCycles }})</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Performance Insights -->
          <div class="insights-section" *ngIf="statistics.totalCycles > 0">
            <h4>Performance Insights</h4>
            <div class="insights-list">
              <div class="insight-item" *ngIf="statistics.streak.best > 0">
                <ion-icon name="trophy-outline" color="warning"></ion-icon>
                <span>Best streak: {{ statistics.streak.best }} cycles</span>
              </div>
              <div class="insight-item" *ngIf="statistics.lastActivity">
                <ion-icon name="calendar-outline" color="primary"></ion-icon>
                <span>Last activity: {{ formatDate(statistics.lastActivity) }}</span>
              </div>
              <div class="insight-item" *ngIf="statistics.completionRate >= 80">
                <ion-icon name="star-outline" color="success"></ion-icon>
                <span>Excellent completion rate!</span>
              </div>
              <div class="insight-item" *ngIf="statistics.completionRate < 50 && statistics.totalCycles > 3">
                <ion-icon name="trending-up-outline" color="warning"></ion-icon>
                <span>Consider reviewing your schedule</span>
              </div>
            </div>
          </div>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .statistics-card {
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
    
    .stats-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      line-height: 2;
      
      .expand-icon {
        margin-left: auto;
        font-size: 18px;
        color: var(--ion-color-medium);
      }
    }
    
    .loading-state, .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 16px;
      text-align: center;
      
      ion-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }
      
      p {
        margin: 0;
        color: var(--ion-color-medium);
        font-size: 14px;
      }
    }
    
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      background: var(--ion-color-light);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      
      &.completion { border-left: 4px solid var(--ion-color-success); }
      &.cycles { border-left: 4px solid var(--ion-color-primary); }
      &.streak { border-left: 4px solid var(--ion-color-warning); }
      &.average { border-left: 4px solid var(--ion-color-secondary); }
      
      .stat-icon ion-icon {
        font-size: 24px;
        color: var(--ion-color-medium);
      }
      
      .stat-content {
        display: flex;
        flex-direction: column;
        
        .stat-number {
          font-size: 20px;
          font-weight: 700;
          color: var(--ion-color-dark);
        }
        
        .stat-label {
          font-size: 12px;
          color: var(--ion-color-medium);
          font-weight: 500;
          text-transform: uppercase;
        }
      }
    }
    
    .status-breakdown {
      margin-bottom: 24px;
      
      h4 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--ion-color-dark);
      }
      
      .status-bar {
        height: 12px;
        border-radius: 6px;
        overflow: hidden;
        display: flex;
        background: var(--ion-color-light-shade);
        margin-bottom: 16px;
        
        .status-segment {
          height: 100%;
          transition: width 0.5s ease;
          
          &.completed { background: var(--ion-color-success); }
          &.skipped { background: var(--ion-color-warning); }
          &.in-progress { background: var(--ion-color-primary); }
          &.pending { background: var(--ion-color-medium); }
        }
      }
      
      .status-legend {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          
          .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 2px;
            
            &.completed { background: var(--ion-color-success); }
            &.skipped { background: var(--ion-color-warning); }
            &.in-progress { background: var(--ion-color-primary); }
            &.pending { background: var(--ion-color-medium); }
          }
          
          span {
            color: var(--ion-color-dark);
            font-weight: 500;
          }
        }
      }
    }
    
    .insights-section {
      h4 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--ion-color-dark);
      }
      
      .insights-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        
        .insight-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--ion-color-light);
          border-radius: 8px;
          
          span {
            font-size: 14px;
            color: var(--ion-color-dark);
            font-weight: 500;
          }
        }
      }
    }
    .stats-content{
        padding-top: 10px;
    }
    
    @media (max-width: 768px) {
      .overview-grid {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      
      .status-legend {
        grid-template-columns: 1fr !important;
      }
    }
  `]
})
export class TaskStatisticsComponent implements OnInit {
  @Input() task: Task | null = null;
  
  showStatistics = false;
  isLoading = false;
  statistics: TaskStatistics | null = null;

  constructor(private db: DatabaseService) {}

  async ngOnInit() {
    if (this.task) {
      await this.loadStatistics();
    }
  }

  toggleStatistics() {
    this.showStatistics = !this.showStatistics;
    if (this.showStatistics && !this.statistics) {
      this.loadStatistics();
    }
  }

  async loadStatistics() {
    if (!this.task?.id) return;
    
    this.isLoading = true;
    try {
      const cycles = await this.getCycleData(this.task.id);
      this.statistics = this.calculateStatistics(cycles);
    } catch (error) {
      console.error('Error loading task statistics:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async getCycleData(taskId: number): Promise<any[]> {
    const result = await this.db.executeQuery(`
      SELECT * FROM task_cycles 
      WHERE taskId = ? 
      ORDER BY cycleStartDate ASC
    `, [taskId]);
    
    return result.values || [];
  }

  private calculateStatistics(cycles: any[]): TaskStatistics {
    const totalCycles = cycles.length;
    const completedCycles = cycles.filter(c => c.status === 'completed').length;
    const skippedCycles = cycles.filter(c => c.status === 'skipped').length;
    const inProgressCycles = cycles.filter(c => c.status === 'in_progress').length;
    const pendingCycles = cycles.filter(c => c.status === 'pending').length;
    
    const completionRate = totalCycles > 0 ? Math.round((completedCycles / totalCycles) * 100) : 0;
    
    const completedWithTimes = cycles.filter(c => c.status === 'completed' && c.completedAt);
    const averageCompletionTime = completedWithTimes.length > 0 
      ? Math.round(completedWithTimes.reduce((sum, c) => {
          const start = new Date(c.cycleStartDate);
          const end = new Date(c.completedAt);
          return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / completedWithTimes.length)
      : 0;
    
    const streak = this.calculateStreaks(cycles);
    
    const lastActivity = cycles
      .filter(c => c.completedAt || c.status !== 'pending')
      .sort((a, b) => new Date(b.completedAt || b.cycleStartDate).getTime() - new Date(a.completedAt || a.cycleStartDate).getTime())
      [0]?.completedAt || cycles[cycles.length - 1]?.cycleStartDate || null;

    return {
      totalCycles,
      completedCycles,
      skippedCycles,
      inProgressCycles,
      pendingCycles,
      completionRate,
      averageCompletionTime,
      streak,
      lastActivity
    };
  }

  private calculateStreaks(cycles: any[]): { current: number; best: number } {
    let current = 0;
    let best = 0;
    let temp = 0;
    
    const sortedCycles = cycles.sort((a, b) => 
      new Date(a.cycleStartDate).getTime() - new Date(b.cycleStartDate).getTime()
    );
    
    for (const cycle of sortedCycles) {
      if (cycle.status === 'completed') {
        temp++;
        best = Math.max(best, temp);
      } else if (cycle.status === 'skipped') {
        temp = 0;
      }
    }
    
    for (let i = sortedCycles.length - 1; i >= 0; i--) {
      if (sortedCycles[i].status === 'completed') {
        current++;
      } else {
        break;
      }
    }
    
    return { current, best };
  }

  getStatusPercentage(status: string): number {
    if (!this.statistics || this.statistics.totalCycles === 0) return 0;
    
    let count = 0;
    switch (status) {
      case 'completed': count = this.statistics.completedCycles; break;
      case 'skipped': count = this.statistics.skippedCycles; break;
      case 'in_progress': count = this.statistics.inProgressCycles; break;
      case 'pending': count = this.statistics.pendingCycles; break;
    }
    
    return (count / this.statistics.totalCycles) * 100;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }
} 