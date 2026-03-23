import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { TaskDetailPage } from './task-detail.page';
import { TaskCycleService } from '../../../services/task-cycle.service';
import { SituationalMessageService } from '../../../services/situational-message.service';
import { Cycle } from '../../../models/task-cycle.model';

describe('TaskDetailPage', () => {
  let component: TaskDetailPage;
  let fixture: ComponentFixture<TaskDetailPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TaskDetailPage, RouterTestingModule, IonicModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: TaskCycleService, useValue: {} },
        { provide: SituationalMessageService, useValue: { getLevel: () => Promise.resolve({ level: 'not_started', message: '' }) } },
      ],
    });
    fixture = TestBed.createComponent(TaskDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('canShowRetroactiveComplete should be true when mostRecentLapsedCycle is set (Phase 6 T029)', () => {
    component.mostRecentLapsedCycle = {
      id: 5,
      taskId: 1,
      cycleStartDate: '2025-02-01',
      dueAt: '2025-02-01T09:00:00.000Z',
      softDeadline: '2025-02-01T09:30:00.000Z',
      hardDeadline: '2025-02-01T14:00:00.000Z',
      resolution: 'lapsed',
    };
    expect(component.canShowRetroactiveComplete).toBe(true);
  });

  it('canShowRetroactiveComplete should be false when mostRecentLapsedCycle is null', () => {
    component.mostRecentLapsedCycle = null;
    expect(component.canShowRetroactiveComplete).toBe(false);
  });

  it('markRetroactiveComplete should call resolveCycle and loadTaskDetails (Phase 6 T029)', async () => {
    const resolveCycleSpy = jasmine.createSpy('resolveCycle').and.returnValue(Promise.resolve());
    const getCurrentCycleSpy = jasmine.createSpy('getCurrentCycle').and.returnValue(Promise.resolve(null));
    const getMostRecentLapsedCycleSpy = jasmine.createSpy('getMostRecentLapsedCycle').and.returnValue(Promise.resolve(null));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TaskDetailPage, RouterTestingModule, IonicModule.forRoot()],
      providers: [
        provideHttpClient(),
        {
          provide: TaskCycleService,
          useValue: {
            resolveCycle: resolveCycleSpy,
            getCurrentCycle: getCurrentCycleSpy,
            getMostRecentLapsedCycle: getMostRecentLapsedCycleSpy,
          },
        },
        { provide: SituationalMessageService, useValue: { getLevel: () => Promise.resolve({ level: 'not_started', message: '' }) } },
      ],
    });
    const f = TestBed.createComponent(TaskDetailPage);
    const c = f.componentInstance;
    c.taskId = 1;
    c.mostRecentLapsedCycle = { id: 5, taskId: 1, cycleStartDate: '2025-02-01', dueAt: '2025-02-01T09:00:00.000Z', softDeadline: '2025-02-01T09:30:00.000Z', hardDeadline: '2025-02-01T14:00:00.000Z', resolution: 'lapsed' } as Cycle;
    c.loadTaskDetails = jasmine.createSpy('loadTaskDetails').and.returnValue(Promise.resolve());
    await c.markRetroactiveComplete();
    expect(resolveCycleSpy).toHaveBeenCalledWith(5, 'done');
    expect(c.loadTaskDetails).toHaveBeenCalledWith(1);
  });
});
