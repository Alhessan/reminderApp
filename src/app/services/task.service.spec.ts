import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { DatabaseService } from './database.service';
import { NotificationService } from './notification.service';
import { TaskCycleService } from './task-cycle.service';
import { Platform } from '@ionic/angular';
import { Task } from '../models/task.model';
import { Subject } from 'rxjs';

describe('TaskService (Phase 2 & 4: pause, resume, complete)', () => {
  let service: TaskService;
  let dbExecuteQuerySpy: jasmine.Spy;
  let taskCycleServiceSpy: jasmine.SpyObj<Pick<TaskCycleService, 'getCurrentCycle' | 'resolveCycle' | 'createNextCycle'>>;
  let scheduleNotificationSpy: jasmine.Spy;
  let sendNotificationSpy: jasmine.Spy;
  let cancelNotificationSpy: jasmine.Spy;

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
      dbReady$: new Subject<boolean>(),
    };
    dbExecuteQuerySpy = dbMock.executeQuery as jasmine.Spy;

    taskCycleServiceSpy = jasmine.createSpyObj('TaskCycleService', ['getCurrentCycle', 'resolveCycle', 'createNextCycle']);
    taskCycleServiceSpy.getCurrentCycle.and.returnValue(Promise.resolve(null));
    taskCycleServiceSpy.resolveCycle.and.returnValue(Promise.resolve());
    taskCycleServiceSpy.createNextCycle.and.returnValue(Promise.resolve(2));

    const platformStub = { is: () => false };
    scheduleNotificationSpy = jasmine.createSpy('scheduleNotification').and.returnValue(Promise.resolve());
    sendNotificationSpy = jasmine.createSpy('sendNotification').and.returnValue(Promise.resolve());
    cancelNotificationSpy = jasmine.createSpy('cancelNotification').and.returnValue(Promise.resolve());
    const scheduleUpcomingSpy = jasmine.createSpy('scheduleUpcomingNotifications').and.returnValue(Promise.resolve());
    const notificationMock = {
      scheduleNotification: scheduleNotificationSpy,
      scheduleUpcomingNotifications: scheduleUpcomingSpy,
      sendNotification: sendNotificationSpy,
      cancelNotification: cancelNotificationSpy,
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

  describe('createTask (cycle engine)', () => {
    it('should insert task then delegate first cycle to taskCycleService.createNextCycle', async () => {
      dbExecuteQuerySpy.and.callFake((query: string) => {
        if (query.includes('INSERT INTO tasks')) {
          return Promise.resolve({ changes: { lastId: 42 } });
        }
        if (query === 'SELECT * FROM tasks WHERE id = ?') {
          return Promise.resolve({
            values: [{
              id: 42,
              title: 'New',
              type: 'Custom',
              frequency: 'daily',
              startDate: '2025-06-01',
              notificationTime: '09:00',
              notificationType: 'push',
              state: 'active',
              isArchived: 0,
            }],
          });
        }
        return Promise.resolve({ values: [], changes: {} });
      });
      taskCycleServiceSpy.createNextCycle.calls.reset();

      await service.createTask({
        title: 'New',
        type: 'Custom',
        frequency: 'daily',
        startDate: '2025-06-01',
        notificationType: 'push',
        notificationTime: '09:00',
      });

      expect(taskCycleServiceSpy.createNextCycle).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 42, title: 'New' })
      );
      const insertCalls = dbExecuteQuerySpy.calls.all().filter(
        (c: { args: unknown[] }) => typeof c.args[0] === 'string' && (c.args[0] as string).includes('INSERT INTO task_cycles')
      );
      expect(insertCalls.length).toBe(0);
    });
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
    it('should call executeQuery with parameterized UPDATE state to paused', async () => {
      dbExecuteQuerySpy.and.returnValue(Promise.resolve({ changes: {} }));
      await service.pauseTask(1);
      expect(dbExecuteQuerySpy).toHaveBeenCalledWith(
        "UPDATE tasks SET state = ? WHERE id = ?",
        ['paused', 1]
      );
    });

    it('should cancel scheduled notification when pausing', async () => {
      dbExecuteQuerySpy.and.returnValue(Promise.resolve({ changes: {} }));
      await service.pauseTask(1);
      expect(cancelNotificationSpy).toHaveBeenCalledWith(1);
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
        "UPDATE tasks SET state = ? WHERE id = ?",
        ['active', 1]
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
    it('getTasksWithPushNotifications should return only active tasks for local types (push/alarm)', async () => {
      dbExecuteQuerySpy.and.returnValue(
        Promise.resolve({
          values: [
            { id: 1, title: 'T1', type: 'Custom', frequency: 'daily', startDate: '2025-01-01', notificationTime: '09:00', notificationType: 'push', state: 'active', isArchived: 0 },
            { id: 2, title: 'T2', type: 'Custom', frequency: 'daily', startDate: '2025-01-01', notificationTime: '09:00', notificationType: 'alarm', state: 'active', isArchived: 0 },
            { id: 3, title: 'T3', type: 'Custom', frequency: 'daily', startDate: '2025-01-01', notificationTime: '09:00', notificationType: 'push', state: 'paused', isArchived: 0 },
            { id: 4, title: 'T4', type: 'Custom', frequency: 'daily', startDate: '2025-01-01', notificationTime: '09:00', notificationType: 'alarm', state: null, isArchived: 1 },
          ],
        })
      );
      const tasks = await service.getTasksWithPushNotifications();
      expect(tasks.length).toBe(2);
      expect(tasks[0].state).toBe('active');
      expect(tasks[0].id).toBe(1);
      expect(tasks[1].id).toBe(2);
    });

    it('rescheduleAllPendingNotifications should call scheduleUpcomingNotifications when cycle is open', async () => {
      dbExecuteQuerySpy.and.returnValue(
        Promise.resolve({
          values: [
            { id: 1, title: 'T1', type: 'Custom', frequency: 'daily', startDate: '2025-01-01', notificationTime: '09:00', notificationType: 'push', state: 'active', isArchived: 0 },
          ],
        })
      );
      const dueAt = '2025-02-15T09:00:00.000Z';
      const openCycle = {
        id: 10,
        taskId: 1,
        cycleStartDate: '2025-02-15',
        dueAt,
        softDeadline: '2025-02-15T09:30:00.000Z',
        hardDeadline: '2025-02-15T14:00:00.000Z',
        resolution: 'open' as const,
      };
      taskCycleServiceSpy.getCurrentCycle.and.returnValue(Promise.resolve(openCycle));
      await service.rescheduleAllPendingNotifications();
      const notif = TestBed.inject(NotificationService) as any;
      expect(notif.scheduleUpcomingNotifications).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 1 }),
        openCycle,
        false
      );
    });

    it('scheduleTaskNotification should treat alarm as local scheduling path', async () => {
      scheduleNotificationSpy.calls.reset();
      sendNotificationSpy.calls.reset();
      const notif = TestBed.inject(NotificationService) as any;
      notif.scheduleUpcomingNotifications.calls.reset();
      taskCycleServiceSpy.getCurrentCycle.and.returnValue(
        Promise.resolve({
          id: 10,
          taskId: 22,
          cycleStartDate: '2025-02-01',
          dueAt: '2025-02-01T09:00:00.000Z',
          softDeadline: '2025-02-01T09:30:00.000Z',
          hardDeadline: '2025-02-01T14:00:00.000Z',
          resolution: 'open',
        })
      );

      const alarmTask: Task = {
        ...mockTask,
        id: 22,
        notificationType: 'alarm',
        state: 'active',
      };

      await (service as any).scheduleTaskNotification(alarmTask);

      expect(notif.scheduleUpcomingNotifications).toHaveBeenCalledTimes(1);
      expect(notif.scheduleUpcomingNotifications.calls.mostRecent().args[0].notificationType).toBe('alarm');
      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('updateTask should cancel existing local notification and reschedule when switching push <-> alarm', async () => {
      const notif = TestBed.inject(NotificationService) as any;
      notif.scheduleUpcomingNotifications.calls.reset();
      cancelNotificationSpy.calls.reset();

      let currentType: 'push' | 'alarm' = 'alarm';
      dbExecuteQuerySpy.and.callFake((query: string) => {
        if (query.startsWith('UPDATE tasks SET')) {
          return Promise.resolve({ changes: { changes: 1 } });
        }

        if (query === 'SELECT * FROM tasks WHERE id = ?') {
          return Promise.resolve({
            values: [{
              id: 1,
              title: 'T',
              type: 'Custom',
              frequency: 'daily',
              startDate: '2025-01-01',
              notificationTime: '09:00',
              notificationType: currentType,
              state: 'active',
              isArchived: 0,
            }],
          });
        }

        return Promise.resolve({ values: [], changes: {} });
      });

      taskCycleServiceSpy.getCurrentCycle.and.returnValue(
        Promise.resolve({
          id: 10,
          taskId: 1,
          cycleStartDate: '2025-02-01',
          dueAt: '2025-02-01T09:00:00.000Z',
          softDeadline: '2025-02-01T09:30:00.000Z',
          hardDeadline: '2025-02-01T14:00:00.000Z',
          resolution: 'open',
        })
      );

      await service.updateTask({ ...mockTask, id: 1, notificationType: 'alarm', state: 'active' });
      expect(cancelNotificationSpy).toHaveBeenCalledWith(1);
      expect(notif.scheduleUpcomingNotifications.calls.mostRecent().args[0].notificationType).toBe('alarm');

      currentType = 'push';
      await service.updateTask({ ...mockTask, id: 1, notificationType: 'push', state: 'active' });
      expect(cancelNotificationSpy).toHaveBeenCalledTimes(2);
      expect(notif.scheduleUpcomingNotifications.calls.count()).toBe(2);
      expect(notif.scheduleUpcomingNotifications.calls.mostRecent().args[0].notificationType).toBe('push');
    });

    it('updateTask should cancel local pending notification and not reschedule when updated to silent', async () => {
      const notif = TestBed.inject(NotificationService) as any;
      notif.scheduleUpcomingNotifications.calls.reset();
      cancelNotificationSpy.calls.reset();

      dbExecuteQuerySpy.and.callFake((query: string) => {
        if (query.startsWith('UPDATE tasks SET')) {
          return Promise.resolve({ changes: { changes: 1 } });
        }

        if (query === 'SELECT * FROM tasks WHERE id = ?') {
          return Promise.resolve({
            values: [{
              id: 1,
              title: 'T',
              type: 'Custom',
              frequency: 'daily',
              startDate: '2025-01-01',
              notificationTime: '09:00',
              notificationType: 'silent',
              state: 'active',
              isArchived: 0,
            }],
          });
        }

        return Promise.resolve({ values: [], changes: {} });
      });

      await service.updateTask({ ...mockTask, id: 1, notificationType: 'silent', state: 'active' });

      expect(cancelNotificationSpy).toHaveBeenCalledWith(1);
      expect(notif.scheduleUpcomingNotifications).not.toHaveBeenCalled();
    });
  });
});
