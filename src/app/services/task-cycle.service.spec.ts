import { TestBed } from '@angular/core/testing';
import { TaskCycleService } from './task-cycle.service';
import { DatabaseService } from './database.service';
import { TaskService } from './task.service';
import { Task } from '../models/task.model';
import { Cycle } from '../models/task-cycle.model';

describe('TaskCycleService (Phase 2 & 4)', () => {
  let service: TaskCycleService;
  let dbExecuteQuerySpy: jasmine.Spy;

  const mockTaskRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 1,
    title: 'Test Task',
    type: 'Custom',
    customerId: null,
    frequency: 'daily',
    startDate: '2025-01-01T00:00:00.000Z',
    notificationTime: '09:00',
    notificationType: 'push',
    notificationValue: null,
    notes: null,
    isArchived: 0,
    state: 'active',
    ...overrides,
  });

  const mockCycleRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 10,
    taskId: 1,
    cycleStartDate: '2025-02-01T00:00:00.000Z',
    dueAt: '2025-02-01T09:00:00.000Z',
    softDeadline: '2025-02-01T09:30:00.000Z',
    hardDeadline: '2025-02-01T14:00:00.000Z',
    resolution: 'open',
    startedAt: null,
    completedAt: null,
    skippedAt: null,
    ...overrides,
  });

  beforeEach(() => {
    const dbMock = {
      executeQuery: jasmine.createSpy('executeQuery').and.returnValue(Promise.resolve({ values: [], changes: {} })),
    };
    dbExecuteQuerySpy = dbMock.executeQuery as jasmine.Spy;

    TestBed.configureTestingModule({
      providers: [
        TaskCycleService,
        { provide: DatabaseService, useValue: dbMock },
        { provide: TaskService, useValue: {} },
      ],
    });
    service = TestBed.inject(TaskCycleService);
  });

  describe('getTask (Phase 2: state mapping)', () => {
    it('should map state from row when present', async () => {
      dbExecuteQuerySpy.and.returnValue(Promise.resolve({ values: [mockTaskRow({ state: 'paused' })] }));
      const task = await service.getTask(1);
      expect(task).toBeTruthy();
      expect(task!.state).toBe('paused');
    });

    it('should map isArchived=1 to state archived when state is missing', async () => {
      dbExecuteQuerySpy.and.returnValue(
        Promise.resolve({ values: [mockTaskRow({ state: null, isArchived: 1 })] })
      );
      const task = await service.getTask(1);
      expect(task!.state).toBe('archived');
    });

    it('should map to active when state and isArchived are missing/false', async () => {
      dbExecuteQuerySpy.and.returnValue(
        Promise.resolve({ values: [mockTaskRow({ state: null, isArchived: 0 })] })
      );
      const task = await service.getTask(1);
      expect(task!.state).toBe('active');
    });

    it('should return null when task not found', async () => {
      dbExecuteQuerySpy.and.returnValue(Promise.resolve({ values: [] }));
      const task = await service.getTask(999);
      expect(task).toBeNull();
    });
  });

  describe('resolveCycle (Phase 2)', () => {
    it('should update cycle to done and set completedAt when resolution is done', async () => {
      dbExecuteQuerySpy
        .withArgs('SELECT * FROM task_cycles WHERE id = ?', jasmine.any(Array))
        .and.returnValue(Promise.resolve({ values: [mockCycleRow({ id: 10, resolution: 'open' })] }));
      dbExecuteQuerySpy
        .withArgs(jasmine.stringContaining('SELECT * FROM tasks WHERE id = ?'), jasmine.any(Array))
        .and.returnValue(Promise.resolve({ values: [mockTaskRow()] }));
      dbExecuteQuerySpy
        .withArgs(jasmine.stringContaining('UPDATE task_cycles SET resolution = ?, completedAt = ?'), jasmine.any(Array))
        .and.returnValue(Promise.resolve({ changes: {} }));
      dbExecuteQuerySpy
        .withArgs(jasmine.stringContaining('SELECT * FROM task_cycles WHERE taskId = ?'), jasmine.any(Array))
        .and.returnValue(Promise.resolve({ values: [] }));
      dbExecuteQuerySpy
        .withArgs(jasmine.stringContaining('INSERT INTO task_cycles'), jasmine.any(Array))
        .and.returnValue(Promise.resolve({ changes: { lastId: 11 } }));

      await service.resolveCycle(10, 'done');

      const updateCalls = dbExecuteQuerySpy.calls.all().filter(
        (c: { args: unknown[] }) => typeof c.args[0] === 'string' && (c.args[0] as string).includes('UPDATE task_cycles SET resolution = ?, completedAt = ?')
      );
      expect(updateCalls.length).toBeGreaterThanOrEqual(1);
      expect(updateCalls[0].args[1][0]).toBe('done');
      expect(updateCalls[0].args[1][1]).toBeDefined(); // completedAt ISO string
    });

    it('should throw when cycle not found', async () => {
      dbExecuteQuerySpy.and.returnValue(Promise.resolve({ values: [] }));
      await expectAsync(service.resolveCycle(999, 'done')).toBeRejectedWithError('Cycle not found');
    });
  });

  describe('ensureOpenCyclesForActiveTasks (Phase 2 - T009)', () => {
    it('should create next cycle for active task that has no open cycle', async () => {
      const task = {
        id: 1,
        title: 'T',
        type: 'Custom',
        frequency: 'daily',
        startDate: '2025-01-01T00:00:00.000Z',
        notificationTime: '09:00',
        notificationType: 'push',
        state: 'active' as const,
      } as Task;

      dbExecuteQuerySpy.and.callFake((sql: string) => {
        if (sql.includes('SELECT id FROM tasks WHERE')) {
          return Promise.resolve({ values: [{ id: 1 }] });
        }
        if (sql.includes('SELECT * FROM tasks WHERE id = ?')) {
          return Promise.resolve({ values: [mockTaskRow()] });
        }
        if (sql.includes('SELECT * FROM task_cycles WHERE taskId = ?')) {
          return Promise.resolve({ values: [] }); // no current cycle
        }
        if (sql.includes('INSERT INTO task_cycles')) {
          return Promise.resolve({ changes: { lastId: 1 } });
        }
        return Promise.resolve({ values: [], changes: {} });
      });

      await service.ensureOpenCyclesForActiveTasks();

      const insertCalls = dbExecuteQuerySpy.calls.all().filter(
        (c: { args: unknown[] }) => typeof c.args[0] === 'string' && (c.args[0] as string).includes('INSERT INTO task_cycles')
      );
      expect(insertCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getCurrentCycle', () => {
    it('should return Cycle with resolution from row', async () => {
      dbExecuteQuerySpy.and.returnValue(
        Promise.resolve({ values: [mockCycleRow({ resolution: 'done', completedAt: '2025-02-01T10:00:00.000Z' })] })
      );
      const cycle = await service.getCurrentCycle(1);
      expect(cycle).toBeTruthy();
      expect(cycle!.resolution).toBe('done');
      expect(cycle!.completedAt).toBe('2025-02-01T10:00:00.000Z');
    });

    it('should return null when no cycles exist', async () => {
      dbExecuteQuerySpy.and.returnValue(Promise.resolve({ values: [] }));
      const cycle = await service.getCurrentCycle(1);
      expect(cycle).toBeNull();
    });
  });

  describe('getMostRecentLapsedCycle (Phase 6 US4)', () => {
    it('should return the most recent lapsed cycle for task', async () => {
      dbExecuteQuerySpy.and.returnValue(
        Promise.resolve({
          values: [mockCycleRow({ id: 20, resolution: 'lapsed', hardDeadline: '2025-02-02T14:00:00.000Z' })],
        })
      );
      const cycle = await service.getMostRecentLapsedCycle(1);
      expect(cycle).toBeTruthy();
      expect(cycle!.resolution).toBe('lapsed');
      expect(cycle!.id).toBe(20);
    });

    it('should return null when no lapsed cycles exist', async () => {
      dbExecuteQuerySpy.and.returnValue(Promise.resolve({ values: [] }));
      const cycle = await service.getMostRecentLapsedCycle(1);
      expect(cycle).toBeNull();
    });
  });

  describe('Phase 10: one-time task auto-archive (T042)', () => {
    it('createNextCycle for frequency once should set task state to archived', async () => {
      const onceTask = {
        id: 99,
        title: 'Once',
        type: 'Custom',
        frequency: 'once' as const,
        startDate: '2025-01-01T00:00:00.000Z',
        notificationTime: '09:00',
        notificationType: 'push',
        state: 'active' as const,
      } as Task;
      dbExecuteQuerySpy.and.returnValue(Promise.resolve({ changes: {} }));
      await service.createNextCycle(onceTask);
      const updateCalls = dbExecuteQuerySpy.calls.all().filter(
        (c: { args: unknown[] }) => typeof c.args[0] === 'string' && (c.args[0] as string).includes("state = 'archived'")
      );
      expect(updateCalls.length).toBeGreaterThanOrEqual(1);
      expect(updateCalls[0].args[0]).toContain("state = 'archived'");
      expect(updateCalls[0].args[1]).toContain(99);
    });
  });

  describe('Phase 10: archive page uses state (T043)', () => {
    it('getArchivedTasks should return tasks from query with state = archived or isArchived = 1', async () => {
      dbExecuteQuerySpy.and.callFake((sql: string, params?: unknown[]) => {
        if (sql.includes("state = 'archived'") || sql.includes('isArchived = 1')) {
          return Promise.resolve({
            values: [mockTaskRow({ id: 1, state: 'archived', isArchived: 1 })],
          });
        }
        if (sql.includes('SELECT * FROM tasks WHERE id = ?')) {
          return Promise.resolve({ values: [mockTaskRow({ id: 1, state: 'archived' })] });
        }
        if (sql.includes('SELECT * FROM task_cycles WHERE taskId = ?')) {
          return Promise.resolve({ values: [mockCycleRow({ taskId: 1, resolution: 'done' })] });
        }
        return Promise.resolve({ values: [], changes: {} });
      });
      const list = await service.getArchivedTasks();
      expect(list.length).toBe(1);
      expect(list[0].task.state).toBe('archived');
    });
  });
});
