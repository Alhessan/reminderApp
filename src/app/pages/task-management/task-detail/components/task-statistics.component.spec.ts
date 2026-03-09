import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskStatisticsComponent } from './task-statistics.component';
import { DatabaseService } from '../../../../services/database.service';
import { Task } from '../../../../models/task.model';
import { STATUS_CONFIG } from '../../../../models/cycle-display.model';

describe('TaskStatisticsComponent (Phase 5 US3)', () => {
  let component: TaskStatisticsComponent;
  let fixture: ComponentFixture<TaskStatisticsComponent>;
  let executeQuerySpy: jasmine.Spy;

  const mockTask: Task = {
    id: 1,
    title: 'Test',
    type: 'Custom',
    frequency: 'daily',
    startDate: '2025-01-01',
    notificationTime: '09:00',
    notificationType: 'push',
    state: 'active',
  };

  beforeEach(() => {
    const dbMock = {
      executeQuery: jasmine.createSpy('executeQuery').and.returnValue(Promise.resolve({ values: [], changes: {} })),
    };
    executeQuerySpy = dbMock.executeQuery as jasmine.Spy;
    TestBed.configureTestingModule({
      imports: [TaskStatisticsComponent],
      providers: [{ provide: DatabaseService, useValue: dbMock }],
    });
    fixture = TestBed.createComponent(TaskStatisticsComponent);
    component = fixture.componentInstance;
    component.task = mockTask;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate completion rate as done/(done+lapsed) excluding skipped (Phase 5 T023)', async () => {
    executeQuerySpy.and.callFake((sql: string) => {
      if (sql.includes('task_cycles')) {
        return Promise.resolve({
          values: [
            { id: 1, taskId: 1, resolution: 'done', cycleStartDate: '2025-01-01', completedAt: '2025-01-01T10:00:00.000Z' },
            { id: 2, taskId: 1, resolution: 'done', cycleStartDate: '2025-01-02', completedAt: '2025-01-02T10:00:00.000Z' },
            { id: 3, taskId: 1, resolution: 'lapsed', cycleStartDate: '2025-01-03', hardDeadline: '2025-01-03T14:00:00.000Z' },
            { id: 4, taskId: 1, resolution: 'skipped', cycleStartDate: '2025-01-04', skippedAt: '2025-01-04T09:00:00.000Z' },
            { id: 5, taskId: 1, resolution: 'skipped', cycleStartDate: '2025-01-05', skippedAt: '2025-01-05T09:00:00.000Z' },
          ],
        });
      }
      if (sql.includes('task_history')) return Promise.resolve({ values: [] });
      return Promise.resolve({ values: [] });
    });
    await component.loadStatistics();
    expect(component.statistics).toBeTruthy();
    expect(component.statistics!.completedCycles).toBe(2);
    expect(component.statistics!.lapsedCycles).toBe(1);
    expect(component.statistics!.skippedCycles).toBe(2);
    expect(component.statistics!.completionRate).toBe(67);
  });

  it('should exclude paused periods when building active intervals (Phase 5 T026)', async () => {
    executeQuerySpy.and.callFake((sql: string) => {
      if (sql.includes('task_cycles')) {
        return Promise.resolve({
          values: [
            { id: 1, taskId: 1, resolution: 'done', cycleStartDate: '2025-01-01T00:00:00.000Z', completedAt: '2025-01-01T10:00:00.000Z' },
            { id: 2, taskId: 1, resolution: 'lapsed', cycleStartDate: '2025-01-15T00:00:00.000Z', hardDeadline: '2025-01-15T14:00:00.000Z' },
          ],
        });
      }
      if (sql.includes('task_history')) {
        return Promise.resolve({
          values: [
            { timestamp: '2025-01-10T00:00:00.000Z', action: 'paused' },
            { timestamp: '2025-01-12T00:00:00.000Z', action: 'resumed' },
          ],
        });
      }
      return Promise.resolve({ values: [] });
    });
    await component.loadStatistics();
    expect(component.statistics).toBeTruthy();
    expect(component.statistics!.totalCycles).toBe(2);
  });

  describe('Phase 7 US5 T033: STATUS_CONFIG for legend labels', () => {
    it('should expose STATUS_CONFIG for legend (completed, skipped, missed labels)', () => {
      expect(component.STATUS_CONFIG).toBe(STATUS_CONFIG);
      expect(component.STATUS_CONFIG.completed.label).toBe('Completed');
      expect(component.STATUS_CONFIG.skipped.label).toBe('Skipped');
      expect(component.STATUS_CONFIG.missed.label).toBe('Missed');
    });
  });
});
