import { TestBed } from '@angular/core/testing';
import { CycleRepository, pickPreferredCycleRow } from './cycle.repository';
import { DatabaseService } from '../services/database.service';
import { periodDayFromDueAt } from '../utils/cycle-timestamps.util';

describe('CycleRepository', () => {
  let repo: CycleRepository;
  let dbExecuteQuerySpy: jasmine.Spy;

  beforeEach(() => {
    const dbMock = {
      executeQuery: jasmine.createSpy('executeQuery').and.returnValue(
        Promise.resolve({ values: [], changes: { changes: 0 } })
      ),
    };
    dbExecuteQuerySpy = dbMock.executeQuery as jasmine.Spy;

    TestBed.configureTestingModule({
      providers: [CycleRepository, { provide: DatabaseService, useValue: dbMock }],
    });
    repo = TestBed.inject(CycleRepository);
  });

  describe('insertOrIgnore', () => {
    it('should include periodDay derived from dueAt in INSERT', async () => {
      const dueAt = '2025-05-27T09:00:00.000Z';
      dbExecuteQuerySpy.and.returnValue(
        Promise.resolve({ changes: { lastId: 5, changes: 1 } })
      );

      const result = await repo.insertOrIgnore({
        taskId: 1,
        cycleStartDate: '2025-05-27T00:00:00.000Z',
        dueAt,
        softDeadline: '2025-05-27T09:30:00.000Z',
        hardDeadline: '2025-05-27T14:00:00.000Z',
        resolution: 'open',
      });

      expect(result.inserted).toBeTrue();
      expect(result.id).toBe(5);
      expect(result.periodDay).toBe(periodDayFromDueAt(dueAt));

      const insertCall = dbExecuteQuerySpy.calls.all().find(
        (c) => typeof c.args[0] === 'string' && (c.args[0] as string).includes('INSERT OR IGNORE INTO task_cycles')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall!.args[1]).toEqual([
        1,
        periodDayFromDueAt(dueAt),
        '2025-05-27T00:00:00.000Z',
        dueAt,
        '2025-05-27T09:30:00.000Z',
        '2025-05-27T14:00:00.000Z',
        'open',
      ]);
    });

    it('should re-query by (taskId, periodDay) when INSERT is ignored', async () => {
      const dueAt = '2025-05-28T09:00:00.000Z';
      const periodDay = periodDayFromDueAt(dueAt);
      dbExecuteQuerySpy.and.callFake((sql: string) => {
        if (sql.includes('INSERT OR IGNORE INTO task_cycles')) {
          return Promise.resolve({ changes: { changes: 0 } });
        }
        if (sql.includes('SELECT * FROM task_cycles WHERE taskId = ? AND periodDay = ?')) {
          return Promise.resolve({
            values: [{
              id: 99,
              taskId: 1,
              cycleStartDate: '2025-05-28T00:00:00.000Z',
              dueAt,
              softDeadline: dueAt,
              hardDeadline: dueAt,
              resolution: 'lapsed',
            }],
          });
        }
        return Promise.resolve({ values: [], changes: {} });
      });

      const result = await repo.insertOrIgnore({
        taskId: 1,
        cycleStartDate: '2025-05-28T00:00:00.000Z',
        dueAt,
        softDeadline: dueAt,
        hardDeadline: dueAt,
        resolution: 'lapsed',
      });

      expect(result.inserted).toBeFalse();
      expect(result.id).toBe(99);
      expect(result.periodDay).toBe(periodDay);
    });
  });

  describe('pickPreferredCycleRow', () => {
    it('should prefer done over lapsed for the same periodDay', () => {
      const keepId = pickPreferredCycleRow([
        { id: 1, resolution: 'lapsed' },
        { id: 2, resolution: 'done' },
      ]);
      expect(keepId).toBe(2);
    });

    it('should prefer open over lapsed', () => {
      const keepId = pickPreferredCycleRow([
        { id: 10, resolution: 'lapsed' },
        { id: 11, resolution: 'open' },
      ]);
      expect(keepId).toBe(11);
    });
  });
});
