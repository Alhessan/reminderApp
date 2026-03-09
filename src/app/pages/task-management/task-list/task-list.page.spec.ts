import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { TaskListPage } from './task-list.page';
import { TaskCycleService } from '../../../services/task-cycle.service';
import { BehaviorSubject } from 'rxjs';
import { TaskListItem } from '../../../models/task-cycle.model';
import { Task } from '../../../models/task.model';
import { Cycle } from '../../../models/task-cycle.model';

function taskListItem(taskId: number, customerId: number | null): TaskListItem {
  const task: Task = {
    id: taskId,
    title: `Task ${taskId}`,
    type: 'custom',
    frequency: 'daily',
    startDate: '2025-01-01',
    notificationTime: '09:00',
    notificationType: 'push',
    state: 'active',
    customerId: customerId ?? undefined,
  };
  const cycle: Cycle = {
    id: taskId * 10,
    taskId,
    cycleStartDate: '2025-02-01',
    dueAt: '2025-02-01T09:00:00.000Z',
    softDeadline: '2025-02-01T09:30:00.000Z',
    hardDeadline: '2025-02-01T14:00:00.000Z',
    resolution: 'open',
  };
  return { task, currentCycle: cycle, isOverdue: false, nextDueDate: cycle.dueAt };
}

describe('TaskListPage', () => {
  let component: TaskListPage;
  let fixture: ComponentFixture<TaskListPage>;
  let resolveCycleSpy: jasmine.Spy;
  let loadTaskListSpy: jasmine.Spy;
  let taskListSubject: BehaviorSubject<TaskListItem[]>;

  beforeEach(() => {
    resolveCycleSpy = jasmine.createSpy('resolveCycle').and.returnValue(Promise.resolve());
    loadTaskListSpy = jasmine.createSpy('loadTaskList').and.returnValue(Promise.resolve());
    taskListSubject = new BehaviorSubject<TaskListItem[]>([]);
    const taskCycleServiceMock = {
      resolveCycle: resolveCycleSpy,
      loadTaskList: loadTaskListSpy,
      taskList$: taskListSubject.asObservable(),
    };
    TestBed.configureTestingModule({
      imports: [TaskListPage, RouterTestingModule, IonicModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: TaskCycleService, useValue: taskCycleServiceMock },
      ],
    });
    fixture = TestBed.createComponent(TaskListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onQuickComplete should call resolveCycle(cycleId, done) and loadTasks (Phase 6 T028)', async () => {
    await component.onQuickComplete(10);
    expect(resolveCycleSpy).toHaveBeenCalledWith(10, 'done');
    expect(loadTaskListSpy).toHaveBeenCalled();
  });

  describe('Phase 8 US6 T036: customer filter', () => {
    it('should filter filteredTasks by customerId when customerIdFilter is set', (done) => {
      const list = [
        taskListItem(1, 100),
        taskListItem(2, 100),
        taskListItem(3, 200),
      ];
      component.customerIdFilter = 100;
      taskListSubject.next(list);
      setTimeout(() => {
        expect(component.filteredTasks.length).toBe(2);
        expect(component.filteredTasks.every(t => t.task.customerId === 100)).toBe(true);
        done();
      }, 0);
    });

    it('should show all tasks when customerIdFilter is undefined', (done) => {
      const list = [
        taskListItem(1, 100),
        taskListItem(2, 200),
      ];
      taskListSubject.next(list);
      setTimeout(() => {
        expect(component.filteredTasks.length).toBe(2);
        done();
      }, 0);
    });
  });
});
