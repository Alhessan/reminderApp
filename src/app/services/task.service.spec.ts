import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { DatabaseService } from './database.service';
import { NotificationService } from './notification.service';
import { TaskCycleService } from './task-cycle.service';
import { Platform } from '@ionic/angular';
import { Task } from '../models/task.model';

describe('TaskService (Phase 2 & 4: pause, resume, complete)', () => {
  let service: TaskService;
  let dbExecuteQuerySpy: jasmine.Spy;
  let taskCycleServiceSpy: jasmine.SpyObj<Pick<TaskCycleService, 'getCurrentCycle' | 'resolveCycle' | 'createNextCycle'>>;
  let scheduleNotificationSpy: jasmine.Spy;

  const mockTask: Task = {
    id: 1,
    title: 'Test',
    type: 'Custom',
    frequency: 'daily',
    startDate: '2025-01-01T00:00:00.000Z',
    notificationType: 'push',
    notificationTime: '09:00',
    state: 'active',
  };

  beforeEach(() => {
    const dbMock = {
      executeQuery: jasmine.createSpy('executeQuery').and.returnValue(Promise.resolve({ values: [], changes: {} })),
    };
    dbExecuteQuerySpy = dbMock.executeQuery as jasmine.Spy;

    taskCycleServiceSpy = jasmine.createSpyObj('TaskCycleService', ['getCurrentCycle', 'resolveCycle', 'createNextCycle']);
    taskCycleServiceSpy.getCurrentCycle.and.returnValue(Promise.resolve(null));
    taskCycleServiceSpy.resolveCycle.and.returnValue(Promise.resolve());
    taskCycleServiceSpy.createNextCycle.and.returnValue(Promise.resolve(2));

    const platformStub = { is: () => false };
    scheduleNotificationSpy = jasmine.createSpy('scheduleNotification').and.returnValue(Promise.resolve());
    const notificationMock = {
      scheduleNotification: scheduleNotificationSpy,
      sendNotification: jasmine.createSpy('sendNotification').and.returnValue(Promise.resolve()),
    };

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: DatabaseService, useValue: dbMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: TaskCycleService, useValue: taskCycleServiceSpy },
        { provide: Platform, useValue: platformStub },
      ],
    });
    service = TestBed.inject(TaskService);
  });

  describe('getTaskById (state mapping)', () => {
    it('should return task with state from row', async () => {
      dbExecuteQuerySpy.and.returnValue(
        Promise.resolve({
          values: [{
            id: 1,
            title: 'T',
            type: 'Custom',
            frequency: 'daily',
            startDate: '2025-01-01',
            notificationTime: '09:00',
            notificationType: 'push',
            state: 'paused',
            isArchived: 0,
          }],
        })
      );
      const task = await service.getTaskById(1);
      expect(task).toBeTruthy();
      expect(task!.state).toBe('paused');
    });

    it('should map isArchived=1 to state archived when state missing', async () => {
      dbExecuteQuerySpy.and.returnValue(
        Promise.resolve({
          values: [{
            id: 1,
            title: 'T',
            type: 'Custom',
            frequency: 'daily',
            startDate: '2025-01-01',
            notificationTime: '09:00',
            notificationType: 'push',
            state: null,
            isArchived: 1,
          }],
        })
      );
      const task = await service.getTaskById(1);
      expect(task!.state).toBe('archived');
    });
  });

  describe('pauseTask (Phase 4)', () => {
    it('should call executeQuery with UPDATE state to paused', async () => {
      dbExecuteQuerySpy.and.returnValue(Promise.resolve({ changes: {} }));
      await service.pauseTask(1);
      expect(dbExecuteQuerySpy).toHaveBeenCalledWith(
        "UPDATE tasks SET state = 'paused' WHERE id = ?",
        [1]
      );
    });
  });

  describe('resumeTask (Phase 4)', () => {
    it('should update state to active and call createNextCycle', async () => {
      dbExecuteQuerySpy.and.returnValue(
        Promise.resolve({
          values: [{ ...mockTask, state: 'active', id: 1 }],
        })
      );
      await service.resumeTask(1);
      expect(dbExecuteQuerySpy).toHaveBeenCalledWith(
        "UPDATE tasks SET state = 'active' WHERE id = ?",
        [1]
      );
      expect(taskCycleServiceSpy.createNextCycle).toHaveBeenCalledWith(jasmine.objectContaining({ id: 1, state: 'active' }));
    });
  });

  describe('completeTask (Phase 2)', () => {
    it('should call resolveCycle with done when current cycle is open', async () => {
      const openCycle = {
        id: 10,
        taskId: 1,
        cycleStartDate: '2025-02-01',
        dueAt: '2025-02-01T09:00:00.000Z',
        softDeadline: '2025-02-01T09:30:00.000Z',
        hardDeadline: '2025-02-01T14:00:00.000Z',
        resolution: 'open' as const,
      };
      taskCycleServiceSpy.getCurrentCycle.and.returnValue(Promise.resolve(openCycle));
      taskCycleServiceSpy.resolveCycle.and.returnValue(Promise.resolve());

      await service.completeTask(mockTask);

      expect(taskCycleServiceSpy.getCurrentCycle).toHaveBeenCalledWith(1);
      expect(taskCycleServiceSpy.resolveCycle).toHaveBeenCalledWith(10, 'done');
    });

    it('should not call resolveCycle when current cycle is null', async () => {
      taskCycleServiceSpy.getCurrentCycle.and.returnValue(Promise.resolve(null));
      await service.completeTask(mockTask);
      expect(taskCycleServiceSpy.resolveCycle).not.toHaveBeenCalled();
    });

    it('should not call resolveCycle when cycle resolution is not open', async () => {
      taskCycleServiceSpy.getCurrentCycle.and.returnValue(
        Promise.resolve({
          id: 10,
          taskId: 1,
          cycleStartDate: '2025-02-01',
          dueAt: '2025-02-01T09:00:00.000Z',
          softDeadline: '2025-02-01T09:30:00.000Z',
          hardDeadline: '2025-02-01T14:00:00.000Z',
          resolution: 'done',
        })
      );
      await service.completeTask(mockTask);
      expect(taskCycleServiceSpy.resolveCycle).not.toHaveBeenCalled();
    });
  });

  describe('Phase 9 US7: notifications with lifecycle', () => {
    it('getTasksWithPushNotifications should return only tasks with state active (T039)', async () => {
      dbExecuteQuerySpy.and.returnValue(
        Promise.resolve({
          values: [
            { id: 1, title: 'T1', type: 'Custom', frequency: 'daily', startDate: '2025-01-01', notificationTime: '09:00', notificationType: 'push', state: 'active', isArchived: 0 },
            { id: 2, title: 'T2', type: 'Custom', frequency: 'daily', startDate: '2025-01-01', notificationTime: '09:00', notificationType: 'push', state: 'paused', isArchived: 0 },
            { id: 3, title: 'T3', type: 'Custom', frequency: 'daily', startDate: '2025-01-01', notificationTime: '09:00', notificationType: 'push', state: null, isArchived: 1 },
          ],
        })
      );
      const tasks = await service.getTasksWithPushNotifications();
      expect(tasks.length).toBe(1);
      expect(tasks[0].state).toBe('active');
      expect(tasks[0].id).toBe(1);
    });

    it('rescheduleAllPendingNotifications should call scheduleNotification with dueAt when cycle is open', async () => {
      dbExecuteQuerySpy.and.returnValue(
        Promise.resolve({
          values: [
            { id: 1, title: 'T1', type: 'Custom', frequency: 'daily', startDate: '2025-01-01', notificationTime: '09:00', notificationType: 'push', state: 'active', isArchived: 0 },
          ],
        })
      );
      const dueAt = '2025-02-15T09:00:00.000Z';
      taskCycleServiceSpy.getCurrentCycle.and.returnValue(
        Promise.resolve({
          id: 10,
          taskId: 1,
          cycleStartDate: '2025-02-15',
          dueAt,
          softDeadline: '2025-02-15T09:30:00.000Z',
          hardDeadline: '2025-02-15T14:00:00.000Z',
          resolution: 'open',
        })
      );
      await service.rescheduleAllPendingNotifications();
      expect(scheduleNotificationSpy).toHaveBeenCalledWith(jasmine.anything(), false, jasmine.any(Date));
      const scheduledAt = scheduleNotificationSpy.calls.mostRecent().args[2] as Date;
      expect(scheduledAt.toISOString()).toBe(dueAt);
    });
  });
});
