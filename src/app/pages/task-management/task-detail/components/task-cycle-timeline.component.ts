import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Cycle } from '../../../../models/task-cycle.model';
import { CycleDisplayStatus } from '../../../../models/cycle-display.model';
import { isEmpty } from 'rxjs';

export interface TimelineCycleItem {
  cycle: Cycle;
  displayStatus: CycleDisplayStatus;
}

@Component({
  selector: 'app-task-cycle-timeline',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="timeline-root">
      <div class="timeline-header">
        <div class="header-main">
          <ion-label>
            <!-- <h2 class="section-title">Timeline</h2> -->
            <p class="section-subtitle" *ngIf="totalCount > 0">
              <span class="count-pill">{{ totalCount }} total</span>
              <span class="status-dot success"></span> {{ completedCount }} done
              <span class="status-dot danger"></span> {{ missedCount }} missed
            </p>
          </ion-label>
        </div>
        
        <div class="scroll-status" *ngIf="isLoadingMore">
          <ion-spinner name="dots" color="primary"></ion-spinner>
        </div>
      </div>

      <div class="timeline-viewport">
        <div class="timeline-scroll-container" #scrollContainer (scroll)="onScroll($event)">
          
          <div class="timeline-track">
            <div class="line-bg"></div>

            <div class="items-flex">
              <div 
                class="node-item"
                *ngFor="let item of cycles"
                [class]="'is-' + item.displayStatus">
                <span class="day-text">{{ getDayOfWeek(item.cycle) }}</span>
                <div class="node-circle">
                  <ion-icon [name]="getStatusIcon(item.displayStatus)"></ion-icon>
                </div>
                <span class="date-text">{{ formatDate(item.cycle) }}</span>
              </div>
              <div class="node-item is-upcoming" *ngIf="upcomingCycle">
                <span class="day-text highlight">NEXT</span>
                <div class="node-circle pulse">
                  <ion-icon name="flash"></ion-icon>
                </div>
                <span class="date-text">{{ formatDate(upcomingCycle) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="edge-fade left" *ngIf="canScrollLeft"></div>
        <div class="edge-fade right" *ngIf="!isAtEnd"></div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --timeline-bg: transparent;
      --node-dim: 38px;
      --track-color: var(--ion-color-step-150, #e0e0e0);
    }

    .timeline-root {
      padding: 16px 0;
      background: var(--timeline-bg);
      
      border-top: 1px solid var(--ion-color-step-100);
      box-shadow: 4px 2px 2px 2px  rgba(0, 0, 0, 0.1);
    }

    /* Header */
    .timeline-header {
      display : flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .section-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0 0 4px 0;
      color: var(--ion-text-color);
    }

    .section-subtitle {
      font-size: 0.8rem;
      color: var(--ion-color-medium);
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
    }

    .count-pill {
      background: var(--ion-color-light-shade);
      padding: 2px 8px;
      border-radius: 12px;
      margin-right: 4px;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .status-dot.success { background: var(--ion-color-success); }
    .status-dot.danger { background: var(--ion-color-danger); }

    /* Viewport & Scrolling */
    .timeline-viewport {
      position: relative;
      width: 100%;
    }

    .timeline-scroll-container {
      overflow-x: auto;
      padding: 10px 20px 24px;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
    }
    .timeline-scroll-container::-webkit-scrollbar { display: none; }

    .timeline-track {
      position: relative;
      display: inline-block;
      min-width: 100%;
    }

    .line-bg {
      position: absolute;
      top: 48px; /* Centers with the node-circle */
      left: 0;
      right: 0;
      height: 3px;
      background: var(--track-color);
      z-index: 0;
      border-radius: 2px;
    }

    .items-flex {
      display: flex;
      gap: 28px;
      position: relative;
      z-index: 1;
    }

    /* Node Styling */
    .node-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 50px;
      flex-shrink: 0;
    }

    .node-circle {
      width: var(--node-dim);
      height: var(--node-dim);
      border-radius: 12px; /* Rounded square for a modern look */
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ion-background-color, #fff);
      border: 2px solid var(--track-color);
      margin: 8px 0;
      transition: all 0.2s ease;
    }

    .node-circle ion-icon { font-size: 18px; color: var(--ion-color-medium); }

    /* State Variations */
    .is-completed .node-circle { border-color: var(--ion-color-success); background: var(--ion-color-success-tiny, #e8f5e9); }
    .is-completed ion-icon { color: var(--ion-color-success); }

    .is-missed .node-circle {
      background: var(--ion-color-missed-surface, #fff);
      border: 1px solid var(--ion-color-light-shade);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }
    .is-missed ion-icon { color: var(--ion-color-medium); }

    .is-skipped .node-circle { border-color: var(--ion-color-warning); background: var(--ion-color-warning-tiny, #fff8e1); }
    .is-skipped ion-icon { color: var(--ion-color-warning); }

    .is-upcoming .node-circle {
      border-color: var(--ion-color-primary);
      background: var(--ion-color-primary);
      border-radius: 50%; /* Different shape for the focus item */
    }
    .is-upcoming ion-icon { color: #fff; }

    /* Typography */
    .day-text { font-size: 0.65rem; font-weight: 600; color: var(--ion-color-medium); text-transform: uppercase; }
    .date-text { font-size: 0.75rem; font-weight: 700; color: var(--ion-text-color); }
    .highlight { color: var(--ion-color-primary); }

    /* Animations & Overlays */
    .pulse { animation: pulse-border 2s infinite; }
    @keyframes pulse-border {
      0% { box-shadow: 0 0 0 0 rgba(var(--ion-color-primary-rgb), 0.4); }
      70% { box-shadow: 0 0 0 8px rgba(var(--ion-color-primary-rgb), 0); }
      100% { box-shadow: 0 0 0 0 rgba(var(--ion-color-primary-rgb), 0); }
    }

    .edge-fade {
      position: absolute;
      top: 0; bottom: 0; width: 30px; z-index: 2; pointer-events: none;
    }
    .edge-fade.left { left: 0; background: linear-gradient(to right, var(--ion-background-color), transparent); }
    .edge-fade.right { right: 0; background: linear-gradient(to left, var(--ion-background-color), transparent); }
  `]
})
export class TaskCycleTimelineComponent implements OnChanges, AfterViewInit {
  @Input() cycles: TimelineCycleItem[] = [];
  @Input() upcomingCycle: Cycle | null = null;
  @Input() hasMore = false;
  @Input() totalCount = 0;
  @Output() loadMore = new EventEmitter<void>();

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  isLoadingMore = false;
  canScrollLeft = false;
  isAtEnd = true;

  get completedCount(): number { return this.cycles.filter(c => c.displayStatus === 'completed').length; }
  get missedCount(): number { return this.cycles.filter(c => c.displayStatus === 'missed').length; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cycles'] && !changes['cycles'].firstChange) {
      this.isLoadingMore = false;
      // When new items arrive (at the start of the list), we need to adjust 
      // scroll so the user doesn't lose their place, but for simple "history",
      // we just maintain current view.
    }
    this.cycles.sort((a, b) => {
    if(!a && !b) return 0;
    if(!a && b != null) return 1;
    if(a && !b) return -1;
    let aid = a?.cycle?.id ? a?.cycle?.id: 0;
    let bid = b?.cycle?.id ? b?.cycle?.id: 0;
    return aid - bid;
    })
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.scrollToEnd(), 300);
  }

  private scrollToEnd(): void {
    if (this.scrollContainer) {
      const el = this.scrollContainer.nativeElement;
      el.scrollLeft = el.scrollWidth;
      this.updateScrollFlags(el);
    }
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    this.updateScrollFlags(el);

    // Load More Logic: When user scrolls to the far LEFT (beginning of history)
    if (el.scrollLeft <= 20 && this.hasMore && !this.isLoadingMore) {
      this.isLoadingMore = true;
      this.loadMore.emit();
    }
  }

  private updateScrollFlags(el: HTMLElement): void {
    this.canScrollLeft = el.scrollLeft > 10;
    this.isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10;
  }

  formatDate(cycle: Cycle): string {
    const raw = cycle.dueAt || cycle.hardDeadline || cycle.cycleStartDate;
    return raw ? new Date(raw).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--';
  }

  getDayOfWeek(cycle: Cycle): string {
    const raw = cycle.dueAt || cycle.hardDeadline || cycle.cycleStartDate;
    return raw ? new Date(raw).toLocaleDateString('en-US', { weekday: 'short' }) : '';
  }

  getStatusIcon(status: CycleDisplayStatus): string {
    const icons: Record<string, string> = {
      'completed': 'checkmark',
      'missed': 'close',
      'skipped': 'arrow-forward'
    };
    return icons[status] || 'ellipse';
  }
  compareCycles(a:TimelineCycleItem, b:TimelineCycleItem): number{
    return 0;
  }
}