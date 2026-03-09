import {
  calculateDueAt,
  calculateSoftDeadline,
  calculateHardDeadline,
  calculateNextCycleStart,
  getFirstCycleStartDate,
  BUFFER_MINUTES,
  GRACE_HOURS,
} from './cycle-timestamps.util';
import { Frequency } from '../models/task.model';

describe('cycle-timestamps.util (Phase 1: timestamp calculations)', () => {
  describe('calculateDueAt', () => {
    it('should set due time from cycle start date and notification time (local time)', () => {
      const start = '2025-02-15T00:00:00.000Z';
      const result = calculateDueAt(start, '09:30');
      const d = new Date(result);
      expect(d.getHours()).toBe(9);
      expect(d.getMinutes()).toBe(30);
      expect(d.getSeconds()).toBe(0);
    });

    it('should handle HH:mm format and return valid ISO string', () => {
      const start = '2025-01-01T00:00:00.000Z';
      const result00 = calculateDueAt(start, '00:00');
      const result2359 = calculateDueAt(start, '23:59');
      expect(new Date(result00).getTime()).toBeDefined();
      expect(new Date(result2359).getTime()).toBeDefined();
      expect(result2359).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    });

    it('should return start as-is for invalid date', () => {
      const invalid = 'not-a-date';
      expect(calculateDueAt(invalid, '09:00')).toBe(invalid);
    });
  });

  describe('calculateSoftDeadline', () => {
    it('should add buffer minutes for daily frequency', () => {
      const dueAt = '2025-02-15T09:00:00.000Z';
      const result = calculateSoftDeadline(dueAt, 'daily');
      const due = new Date(dueAt);
      const soft = new Date(result);
      const diffMs = soft.getTime() - due.getTime();
      expect(diffMs).toBe(BUFFER_MINUTES['daily'] * 60 * 1000);
    });

    it('should use "once" fallback for unknown frequency', () => {
      const dueAt = '2025-02-15T09:00:00.000Z';
      const result = calculateSoftDeadline(dueAt, 'unknown');
      const due = new Date(dueAt);
      const soft = new Date(result);
      expect(soft.getTime()).toBeGreaterThan(due.getTime());
    });
  });

  describe('calculateHardDeadline', () => {
    it('should add grace hours for daily frequency', () => {
      const dueAt = '2025-02-15T09:00:00.000Z';
      const result = calculateHardDeadline(dueAt, 'daily');
      const due = new Date(dueAt);
      const hard = new Date(result);
      const diffMs = hard.getTime() - due.getTime();
      expect(diffMs).toBe(GRACE_HOURS['daily'] * 60 * 60 * 1000);
    });

    it('should add more hours for weekly than daily', () => {
      const dueAt = '2025-02-15T09:00:00.000Z';
      const dailyHard = new Date(calculateHardDeadline(dueAt, 'daily')).getTime();
      const weeklyHard = new Date(calculateHardDeadline(dueAt, 'weekly')).getTime();
      expect(weeklyHard).toBeGreaterThan(dailyHard);
    });
  });

  describe('calculateNextCycleStart', () => {
    it('should add one day for daily frequency', () => {
      const prev = '2025-02-15T00:00:00.000Z';
      const next = calculateNextCycleStart(prev, 'daily');
      const prevD = new Date(prev);
      const nextD = new Date(next);
      expect(nextD.getUTCDate()).toBe(prevD.getUTCDate() + 1);
    });

    it('should add 7 days for weekly frequency', () => {
      const prev = '2025-02-15T00:00:00.000Z';
      const next = calculateNextCycleStart(prev, 'weekly');
      const prevD = new Date(prev);
      const nextD = new Date(next);
      expect((nextD.getTime() - prevD.getTime()) / (24 * 60 * 60 * 1000)).toBe(7);
    });

    it('should return same date for once frequency', () => {
      const prev = '2025-02-15T00:00:00.000Z';
      const next = calculateNextCycleStart(prev, 'once');
      expect(next).toBe(prev);
    });

    it('should handle monthly (add one month)', () => {
      const prev = '2025-01-15T00:00:00.000Z';
      const next = calculateNextCycleStart(prev, 'monthly');
      const nextD = new Date(next);
      expect(nextD.getUTCMonth()).toBe(1); // February
      expect(nextD.getUTCDate()).toBe(15);
    });
  });

  describe('getFirstCycleStartDate', () => {
    it('should return start date when due (start + time) is in the future', () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      const startDate = future.toISOString().split('T')[0] + 'T00:00:00.000Z';
      const notifTime = '09:00';
      const result = getFirstCycleStartDate(startDate, notifTime, 'daily');
      expect(result).toContain(future.toISOString().split('T')[0]);
    });

    it('should advance past today when due is in the past for daily', () => {
      const past = new Date();
      past.setDate(past.getDate() - 2);
      const startDate = past.toISOString().split('T')[0] + 'T00:00:00.000Z';
      const notifTime = '09:00';
      const result = getFirstCycleStartDate(startDate, notifTime, 'daily');
      const resultDate = new Date(result);
      expect(resultDate.getTime()).toBeGreaterThanOrEqual(new Date().setHours(0, 0, 0, 0));
    });
  });
});
