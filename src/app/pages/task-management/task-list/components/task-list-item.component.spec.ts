import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { TaskListItemComponent } from './task-list-item.component';
import { TaskListItem } from '../../../../models/task-cycle.model';
import { Task } from '../../../../models/task.model';
import { Cycle } from '../../../../models/task-cycle.model';

describe('TaskListItemComponent (Phase 6 US4)', () => {
  let component: TaskListItemComponent;
  let fixture: ComponentFixture<TaskListItemComponent>;

  const mockTask: Task = {
    id: 1,
    title: 'Test Task',
    type: 'Custom',
    frequency: 'daily',
    startDate: '2025-01-01',
    notificationTime: '09:00',
    notificationType: 'push',
    state: 'active',
  };

  const mockCycleOpen: Cycle = {
    id: 10,
    taskId: 1,
    cycleStartDate: '2025-02-01',
    dueAt: '2025-02-01T09:00:00.000Z',
    softDeadline: '2025-02-01T09:30:00.000Z',
    hardDeadline: '2025-02-01T14:00:00.000Z',
    resolution: 'open',
  };

  const mockCycleDone: Cycle = {
    ...mockCycleOpen,
    id: 11,
    resolution: 'done',
    completedAt: '2025-02-01T10:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TaskListItemComponent, RouterTestingModule, IonicModule.forRoot()],
    });
    fixture = TestBed.createComponent(TaskListItemComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.taskItem = {
      task: mockTask,
      currentCycle: mockCycleOpen,
      displayStatus: 'upcoming',
      isOverdue: false,
      nextDueDate: mockCycleOpen.dueAt,
    };
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('canQuickComplete should be true when current cycle is open (Phase 6 T027)', () => {
    component.taskItem = {
      task: mockTask,
      currentCycle: mockCycleOpen,
      displayStatus: 'upcoming',
      isOverdue: false,
      nextDueDate: mockCycleOpen.dueAt,
    };
    expect(component.canQuickComplete).toBe(true);
  });

  it('canQuickComplete should be false when current cycle is not open', () => {
    component.taskItem = {
      task: mockTask,
      currentCycle: mockCycleDone,
      displayStatus: 'completed',
      isOverdue: false,
      nextDueDate: mockCycleDone.dueAt!,
    };
    expect(component.canQuickComplete).toBe(false);
  });

  it('onQuickComplete should emit cycleId when cycle is open', () => {
    component.taskItem = {
      task: mockTask,
      currentCycle: mockCycleOpen,
      displayStatus: 'upcoming',
      isOverdue: false,
      nextDueDate: mockCycleOpen.dueAt,
    };
    fixture.detectChanges();
    let emitted: number | undefined;
    component.quickComplete.subscribe((id: number) => (emitted = id));
    component.onQuickComplete(new Event('click'));
    expect(emitted).toBe(10);
  });

  it('onQuickComplete should not emit when cycle is not open', () => {
    component.taskItem = {
      task: mockTask,
      currentCycle: mockCycleDone,
      displayStatus: 'completed',
      isOverdue: false,
      nextDueDate: mockCycleDone.dueAt!,
    };
    let emitted = false;
    component.quickComplete.subscribe(() => (emitted = true));
    component.onQuickComplete(new Event('click'));
    expect(emitted).toBe(false);
  });

  describe('Phase 7 US5: STATUS_CONFIG for status display', () => {
    it('getStatusColor should return color from STATUS_CONFIG for displayStatus', () => {
      expect(component.getStatusColor('completed')).toBe('success');
      expect(component.getStatusColor('missed')).toBe('medium');
      expect(component.getStatusColor('skipped')).toBe('medium');
      expect(component.getStatusColor('upcoming')).toBe('medium');
      expect(component.getStatusColor('')).toBe('medium');
    });

    it('getStatusIcon should return icon from STATUS_CONFIG for displayStatus', () => {
      expect(component.getStatusIcon('completed')).toBe('checkmark-circle');
      expect(component.getStatusIcon('due')).toBe('notifications-outline');
      expect(component.getStatusIcon('unknown')).toBe('help-outline');
    });

    it('formatStatus should return label from STATUS_CONFIG for displayStatus', () => {
      expect(component.formatStatus('completed')).toBe('Completed');
      expect(component.formatStatus('missed')).toBe('Missed');
      expect(component.formatStatus('skipped')).toBe('Skipped');
    });
  });
});
