import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CycleStatusBadgeComponent } from './cycle-status-badge.component';
import { STATUS_CONFIG, CycleDisplayStatus } from '../../models/cycle-display.model';

describe('CycleStatusBadgeComponent (Phase 7 US5 T034)', () => {
  let component: CycleStatusBadgeComponent;
  let fixture: ComponentFixture<CycleStatusBadgeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CycleStatusBadgeComponent],
    });
    fixture = TestBed.createComponent(CycleStatusBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.status = 'upcoming';
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should use STATUS_CONFIG for label, color, icon for each CycleDisplayStatus', () => {
    const statuses: CycleDisplayStatus[] = ['upcoming', 'due', 'overdue', 'completed', 'missed', 'skipped'];
    for (const status of statuses) {
      component.status = status;
      fixture.detectChanges();
      const config = component.config;
      expect(config).toBe(STATUS_CONFIG[status]);
      expect(config?.label).toBe(STATUS_CONFIG[status].label);
      expect(config?.color).toBe(STATUS_CONFIG[status].color);
      expect(config?.icon).toBe(STATUS_CONFIG[status].icon);
    }
  });

  it('should render icon and label in template for known status', () => {
    component.status = 'completed';
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const label = el.querySelector('.label');
    expect(component.config?.icon).toBe(STATUS_CONFIG.completed.icon);
    expect(component.config?.color).toBe(STATUS_CONFIG.completed.color);
    expect(label?.textContent?.trim()).toBe(STATUS_CONFIG.completed.label);
  });

  it('should have config null for unknown status string', () => {
    component.status = 'unknown' as CycleDisplayStatus;
    fixture.detectChanges();
    expect(component.config).toBeNull();
  });
});
