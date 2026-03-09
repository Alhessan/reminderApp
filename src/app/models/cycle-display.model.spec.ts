import { deriveDisplayState, STATUS_CONFIG, CycleDisplayStatus } from './cycle-display.model';
import { Cycle } from './task-cycle.model';
import { Task } from './task.model';

describe('cycle-display.model (Phase 1: display state derivation)', () => {
  const baseTask: Task = {
    id: 1,
    title: 'Test',
    type: 'Custom',
    frequency: 'daily',
    startDate: '2025-01-01T00:00:00.000Z',
    notificationType: 'push',
    notificationTime: '09:00',
    state: 'active',
  };

  describe('STATUS_CONFIG', () => {
    it('should have config for all six display statuses', () => {
      const statuses: CycleDisplayStatus[] = ['upcoming', 'due', 'overdue', 'completed', 'missed', 'skipped'];
      statuses.forEach((s) => {
        expect(STATUS_CONFIG[s]).toBeDefined();
        expect(STATUS_CONFIG[s].label).toBeDefined();
        expect(STATUS_CONFIG[s].color).toBeDefined();
        expect(STATUS_CONFIG[s].icon).toBeDefined();
      });
    });

    it('should have human-readable labels', () => {
      expect(STATUS_CONFIG.completed.label).toBe('Completed');
      expect(STATUS_CONFIG.missed.label).toBe('Missed');
      expect(STATUS_CONFIG.due.label).toBe('Due Now');
    });
  });

  describe('deriveDisplayState', () => {
    it('should return "completed" when resolution is done', () => {
      const cycle: Cycle = {
        taskId: 1,
        cycleStartDate: '2025-01-01',
        dueAt: '2025-01-01T09:00:00.000Z',
        softDeadline: '2025-01-01T09:30:00.000Z',
        hardDeadline: '2025-01-01T14:00:00.000Z',
        resolution: 'done',
        completedAt: '2025-01-01T10:00:00.000Z',
      };
      const now = new Date('2025-01-01T12:00:00.000Z');
      expect(deriveDisplayState(cycle, baseTask, now)).toBe('completed');
    });

    it('should return "missed" when resolution is lapsed', () => {
      const cycle: Cycle = {
        taskId: 1,
        cycleStartDate: '2025-01-01',
        dueAt: '2025-01-01T09:00:00.000Z',
        softDeadline: '2025-01-01T09:30:00.000Z',
        hardDeadline: '2025-01-01T14:00:00.000Z',
        resolution: 'lapsed',
      };
      const now = new Date('2025-01-01T15:00:00.000Z');
      expect(deriveDisplayState(cycle, baseTask, now)).toBe('missed');
    });

    it('should return "skipped" when resolution is skipped', () => {
      const cycle: Cycle = {
        taskId: 1,
        cycleStartDate: '2025-01-01',
        dueAt: '2025-01-01T09:00:00.000Z',
        softDeadline: '2025-01-01T09:30:00.000Z',
        hardDeadline: '2025-01-01T14:00:00.000Z',
        resolution: 'skipped',
        skippedAt: '2025-01-01T08:00:00.000Z',
      };
      const now = new Date('2025-01-01T12:00:00.000Z');
      expect(deriveDisplayState(cycle, baseTask, now)).toBe('skipped');
    });

    it('should return "upcoming" when resolution is open and now < dueAt', () => {
      const cycle: Cycle = {
        taskId: 1,
        cycleStartDate: '2025-01-01',
        dueAt: '2025-01-01T12:00:00.000Z',
        softDeadline: '2025-01-01T12:30:00.000Z',
        hardDeadline: '2025-01-01T17:00:00.000Z',
        resolution: 'open',
      };
      const now = new Date('2025-01-01T11:00:00.000Z');
      expect(deriveDisplayState(cycle, baseTask, now)).toBe('upcoming');
    });

    it('should return "due" when resolution is open and now >= dueAt but < softDeadline', () => {
      const cycle: Cycle = {
        taskId: 1,
        cycleStartDate: '2025-01-01',
        dueAt: '2025-01-01T12:00:00.000Z',
        softDeadline: '2025-01-01T12:30:00.000Z',
        hardDeadline: '2025-01-01T17:00:00.000Z',
        resolution: 'open',
      };
      const now = new Date('2025-01-01T12:15:00.000Z');
      expect(deriveDisplayState(cycle, baseTask, now)).toBe('due');
    });

    it('should return "overdue" when resolution is open and now >= softDeadline but < hardDeadline', () => {
      const cycle: Cycle = {
        taskId: 1,
        cycleStartDate: '2025-01-01',
        dueAt: '2025-01-01T12:00:00.000Z',
        softDeadline: '2025-01-01T12:30:00.000Z',
        hardDeadline: '2025-01-01T17:00:00.000Z',
        resolution: 'open',
      };
      const now = new Date('2025-01-01T14:00:00.000Z');
      expect(deriveDisplayState(cycle, baseTask, now)).toBe('overdue');
    });

    it('should return "missed" when resolution is open but now >= hardDeadline (safety net)', () => {
      const cycle: Cycle = {
        taskId: 1,
        cycleStartDate: '2025-01-01',
        dueAt: '2025-01-01T12:00:00.000Z',
        softDeadline: '2025-01-01T12:30:00.000Z',
        hardDeadline: '2025-01-01T17:00:00.000Z',
        resolution: 'open',
      };
      const now = new Date('2025-01-01T18:00:00.000Z');
      expect(deriveDisplayState(cycle, baseTask, now)).toBe('missed');
    });
  });
});
