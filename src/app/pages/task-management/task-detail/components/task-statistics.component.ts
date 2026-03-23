import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Task } from '../../../../models/task.model';
import { DatabaseService } from '../../../../services/database.service';
import { STATUS_CONFIG } from '../../../../models/cycle-display.model';

interface TaskStatistics {
  totalCycles: number;
  completedCycles: number;
  skippedCycles: number;
  lapsedCycles: number;
  openCycles: number;
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
                  class="status-segment lapsed" 
                  [style.width.%]="getStatusPercentage('lapsed')">
                </div>
                <div 
                  class="status-segment open" 
                  [style.width.%]="getStatusPercentage('open')">
                </div>
              </div>
              
              <div class="status-legend">
                <div class="legend-item">
                  <div class="legend-color completed"></div>
                  <span>{{ STATUS_CONFIG.completed.label }} ({{ statistics.completedCycles }})</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color skipped"></div>
                  <span>{{ STATUS_CONFIG.skipped.label }} ({{ statistics.skippedCycles }})</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color lapsed"></div>
                  <span>{{ STATUS_CONFIG.missed.label }} ({{ statistics.lapsedCycles }})</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color open"></div>
                  <span>Open ({{ statistics.openCycles }})</span>
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
          &.lapsed { background: var(--ion-color-medium-shade); }
          &.open { background: var(--ion-color-medium); }
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
            &.lapsed { background: var(--ion-color-medium); }
            &.open { background: var(--ion-color-medium); }
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
export class TaskStatisticsComponent implements OnInit, OnChanges {
  @Input() task: Task | null = null;
  
  showStatistics = false;
  isLoading = false;
  statistics: TaskStatistics | null = null;

  readonly STATUS_CONFIG = STATUS_CONFIG;

  constructor(private db: DatabaseService) {}

  async ngOnInit() {
    if (this.task) {
      await this.loadStatistics();
    }
  }

  async ngOnChanges(changes: SimpleChanges) {
    const taskChange = changes['task'];
    if (taskChange && !taskChange.firstChange) {
      if (!this.task?.id) {
        this.statistics = null;
        return;
      }
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
    if (!this.task?.id) {
      console.warn('[TaskDetail.Statistics] loadStatistics skipped: no task.id');
      return;
    }
    this.isLoading = true;
    console.log('[TaskDetail.Statistics] loadStatistics start', { taskId: this.task.id });
    try {
      const [cycles, history] = await Promise.all([
        this.getCycleData(this.task.id),
        this.getTaskHistory(this.task.id),
      ]);
      console.log('[TaskDetail.Statistics] getCycleData + getTaskHistory ok', { cycles: cycles?.length ?? 0, history: history?.length ?? 0 });
      const activeIntervals = this.buildActiveIntervals(this.task, history);
      const cyclesInActivePeriods = this.filterCyclesToActivePeriods(cycles, activeIntervals);
      this.statistics = this.calculateStatistics(cyclesInActivePeriods);
      console.log('[TaskDetail.Statistics] loadStatistics done', { totalCycles: this.statistics?.totalCycles });
    } catch (error) {
      console.error('[TaskDetail.Statistics] loadStatistics failed', error);
      console.error('[TaskDetail.Statistics] error stack', error instanceof Error ? error.stack : 'no stack');
    } finally {
      this.isLoading = false;
    }
  }

  /** Max cycles to load for stats (most recent). Keeps stats fast for long-lived tasks. */
  private static readonly STATS_CYCLE_LIMIT = 500;

  private async getCycleData(taskId: number): Promise<any[]> {
    const result = await this.db.executeQuery(`
      SELECT * FROM task_cycles 
      WHERE taskId = ? 
      ORDER BY COALESCE(hardDeadline, cycleStartDate) DESC
      LIMIT ?
    `, [taskId, TaskStatisticsComponent.STATS_CYCLE_LIMIT]);
    const rows = (result.values || []) as any[];
    return rows.reverse();
  }

  private async getTaskHistory(taskId: number): Promise<{ timestamp: string; action: string }[]> {
    const result = await this.db.executeQuery(
      'SELECT timestamp, action FROM task_history WHERE taskId = ? ORDER BY timestamp ASC',
      [taskId]
    );
    return (result.values || []) as { timestamp: string; action: string }[];
  }

  /** Build [start, end] intervals when the task was active (not paused). Used to exclude paused periods from stats. */
  private buildActiveIntervals(task: Task, history: { timestamp: string; action: string }[]): [string, string][] {
    const now = new Date().toISOString();
    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const intervals: [string, string][] = [];
    let currentStart: string = task.startDate;
    for (const entry of history) {
      if (entry.action === 'paused' && currentStart) {
        intervals.push([currentStart, entry.timestamp]);
        currentStart = '';
      } else if (entry.action === 'resumed') {
        currentStart = entry.timestamp;
      }
    }
    if (currentStart) intervals.push([currentStart, farFuture]);
    return intervals;
  }

  private filterCyclesToActivePeriods(cycles: any[], intervals: [string, string][]): any[] {
    if (intervals.length === 0) return cycles;
    return cycles.filter((c: any) => {
      const start = new Date(c.cycleStartDate).getTime();
      return intervals.some(([s, e]) => {
        const segStart = new Date(s).getTime();
        const segEnd = new Date(e).getTime();
        return start >= segStart && start < segEnd;
      });
    });
  }

  /** Normalize resolution for legacy cycles (e.g. status 'pending'/'completed' from old schema). */
  private normalizeResolution(c: any): string {
    if (c == null) return 'open';
    if (c.resolution && ['done', 'skipped', 'lapsed', 'open'].includes(c.resolution)) return c.resolution;
    if (c.status === 'completed') return 'done';
    if (c.status === 'pending') return 'open';
    return 'open';
  }

  private calculateStatistics(cycles: any[]): TaskStatistics {
    const safe = (cycles || []).filter((c: any) => c != null);
    const withResolution = safe.map((c: any) => ({ ...c, resolution: this.normalizeResolution(c) }));
    const completedCycles = withResolution.filter((c: any) => c.resolution === 'done').length;
    const skippedCycles = withResolution.filter((c: any) => c.resolution === 'skipped').length;
    const lapsedCycles = withResolution.filter((c: any) => c.resolution === 'lapsed').length;
    const openCycles = withResolution.filter((c: any) => c.resolution === 'open').length;
    const totalCycles = completedCycles + skippedCycles + lapsedCycles + openCycles;

    // Completion rate excludes skipped from denominator: done / (done + lapsed)
    const rateDenominator = completedCycles + lapsedCycles;
    const completionRate = rateDenominator > 0 ? Math.round((completedCycles / rateDenominator) * 100) : 0;

    const completedWithTimes = withResolution.filter((c: any) => c.resolution === 'done' && c.completedAt);
    const rawAvg = completedWithTimes.length > 0
      ? completedWithTimes.reduce((sum: number, c: any) => {
          const start = new Date(c.cycleStartDate).getTime();
          const end = new Date(c.completedAt).getTime();
          return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        }, 0) / completedWithTimes.length
      : 0;
    const averageCompletionTime = Math.max(0, Math.round(rawAvg));

    const streak = this.calculateStreaks(withResolution);

    const withActivity = safe.filter((c: any) => c.completedAt || c.skippedAt);
    const lastActivity = withActivity.length > 0
      ? withActivity.sort((a: any, b: any) => new Date(b.completedAt || b.skippedAt).getTime() - new Date(a.completedAt || a.skippedAt).getTime())[0]?.completedAt || withActivity[0]?.skippedAt || null
      : null;

    return {
      totalCycles,
      completedCycles,
      skippedCycles,
      lapsedCycles,
      openCycles,
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

    const sortedCycles = [...cycles].sort((a, b) =>
      new Date(a.cycleStartDate).getTime() - new Date(b.cycleStartDate).getTime()
    );

    for (const cycle of sortedCycles) {
      if (cycle.resolution === 'done') {
        temp++;
        best = Math.max(best, temp);
      } else if (cycle.resolution === 'skipped' || cycle.resolution === 'lapsed') {
        temp = 0;
      }
    }

    for (let i = sortedCycles.length - 1; i >= 0; i--) {
      if (sortedCycles[i].resolution === 'done') {
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
      case 'lapsed': count = this.statistics.lapsedCycles; break;
      case 'open': count = this.statistics.openCycles; break;
    }

    return (count / this.statistics.totalCycles) * 100;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Today';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }
} 