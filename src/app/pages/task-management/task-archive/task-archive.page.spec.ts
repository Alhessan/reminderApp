import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, AlertController } from '@ionic/angular';
import { TaskArchivePage } from './task-archive.page';
import { TaskCycleService } from '../../../services/task-cycle.service';
import { TaskListItem } from '../../../models/task-cycle.model';
import { Task } from '../../../models/task.model';
import { Cycle } from '../../../models/task-cycle.model';

describe('TaskArchivePage (Phase 10 T043)', () => {
  let component: TaskArchivePage;
  let fixture: ComponentFixture<TaskArchivePage>;
  let getArchivedTasksSpy: jasmine.Spy;
  let unarchiveTaskSpy: jasmine.Spy;

  const mockArchivedTask = (id: number): TaskListItem => {
    const task: Task = {
      id,
      title: `Archived ${id}`,
      type: 'custom',
      frequency: 'daily',
      startDate: '2025-01-01',
      notificationTime: '09:00',
      notificationType: 'push',
      state: 'archived',
    };
    const cycle: Cycle = {
      id: id * 10,
      taskId: id,
      cycleStartDate: '2025-02-01',
      dueAt: '2025-02-01T09:00:00.000Z',
      softDeadline: '2025-02-01T09:30:00.000Z',
      hardDeadline: '2025-02-01T14:00:00.000Z',
      resolution: 'done',
    };
    return {
      task,
      currentCycle: cycle,
      displayStatus: 'completed',
      isOverdue: false,
      nextDueDate: cycle.dueAt,
    };
  };

  beforeEach(() => {
    getArchivedTasksSpy = jasmine.createSpy('getArchivedTasks').and.returnValue(Promise.resolve([mockArchivedTask(1)]));
    unarchiveTaskSpy = jasmine.createSpy('unarchiveTask').and.returnValue(Promise.resolve());
    const taskCycleServiceMock = {
      getArchivedTasks: getArchivedTasksSpy,
      unarchiveTask: unarchiveTaskSpy,
    };
    TestBed.configureTestingModule({
      imports: [TaskArchivePage, IonicModule.forRoot()],
      providers: [
        { provide: TaskCycleService, useValue: taskCycleServiceMock },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    });
    fixture = TestBed.createComponent(TaskArchivePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load archived tasks using getArchivedTasks (state-based archive)', async () => {
    await component.loadArchivedTasks();
    expect(getArchivedTasksSpy).toHaveBeenCalled();
    expect(component.archivedTasks.length).toBe(1);
    expect(component.archivedTasks[0].task.state).toBe('archived');
  });

  it('unarchiveTask should call taskCycleService.unarchiveTask and reload list', async () => {
    component.archivedTasks = [mockArchivedTask(1)];
    getArchivedTasksSpy.and.returnValue(Promise.resolve([]));
    await component.unarchiveTask(component.archivedTasks[0]);
    expect(unarchiveTaskSpy).toHaveBeenCalledWith(1);
    expect(getArchivedTasksSpy).toHaveBeenCalled();
  });
});
