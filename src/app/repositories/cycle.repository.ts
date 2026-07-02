import { Injectable } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { Cycle, CycleResolution } from '../models/task-cycle.model';
import { periodDayFromDueAt } from '../utils/cycle-timestamps.util';

export interface InsertCycleParams {
  taskId: number;
  cycleStartDate: string;
  dueAt: string;
  softDeadline: string;
  hardDeadline: string;
  resolution: CycleResolution;
}

export interface InsertCycleResult {
  id: number;
  inserted: boolean;
  periodDay: string;
}

const RESOLUTION_RANK: Record<CycleResolution, number> = {
  done: 4,
  skipped: 3,
  open: 2,
  lapsed: 1,
};

/** Pick the row to keep when multiple cycles share the same (taskId, periodDay). */
export function pickPreferredCycleRow(rows: Array<{ id: number; resolution: string }>): number {
  return rows
    .slice()
    .sort((a, b) => {
      const ra = RESOLUTION_RANK[(a.resolution || 'open') as CycleResolution] ?? 0;
      const rb = RESOLUTION_RANK[(b.resolution || 'open') as CycleResolution] ?? 0;
      if (rb !== ra) return rb - ra;
      return Number(a.id) - Number(b.id);
    })[0].id;
}

@Injectable({ providedIn: 'root' })
export class CycleRepository {
  constructor(private db: DatabaseService) {}

  mapRowToCycle(row: any): Cycle {
    let resolution = row.resolution;
    if (!resolution && row.status === 'completed') resolution = 'done';
    if (!resolution) resolution = 'open';
    return {
      id: row.id,
      taskId: row.taskId,
      cycleStartDate: row.cycleStartDate,
      dueAt: row.dueAt ?? row.cycleStartDate,
      softDeadline: row.softDeadline ?? row.cycleStartDate,
      hardDeadline: row.hardDeadline ?? row.cycleEndDate ?? row.cycleStartDate,
      resolution: resolution as CycleResolution,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      skippedAt: row.skippedAt,
    };
  }

  /**
   * Insert a cycle row; ignored when (taskId, periodDay) already exists (DB unique index + web guard).
   */
  async insertOrIgnore(params: InsertCycleParams): Promise<InsertCycleResult> {
    const periodDay = periodDayFromDueAt(params.dueAt);
    const insertResult = await this.db.executeQuery(
      `INSERT OR IGNORE INTO task_cycles
       (taskId, periodDay, cycleStartDate, dueAt, softDeadline, hardDeadline, resolution)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        params.taskId,
        periodDay,
        params.cycleStartDate,
        params.dueAt,
        params.softDeadline,
        params.hardDeadline,
        params.resolution,
      ]
    );

    const inserted = (insertResult.changes?.changes ?? 0) !== 0;
    let id = insertResult.changes?.lastId as number | undefined;

    if (!id || !inserted) {
      const existing = await this.findByTaskAndPeriodDay(params.taskId, periodDay);
      if (!existing?.id) {
        throw new Error(`Failed to insert or find cycle for task ${params.taskId} on ${periodDay}`);
      }
      id = existing.id;
    }

    return { id, inserted, periodDay };
  }

  async findByTaskAndPeriodDay(taskId: number, periodDay: string): Promise<Cycle | null> {
    const result = await this.db.executeQuery(
      'SELECT * FROM task_cycles WHERE taskId = ? AND periodDay = ? LIMIT 1',
      [taskId, periodDay]
    );
    if (!result.values?.length) return null;
    return this.mapRowToCycle(result.values[0]);
  }

  async findOpenByTaskId(taskId: number): Promise<Cycle | null> {
    const result = await this.db.executeQuery(
      `SELECT * FROM task_cycles WHERE taskId = ? AND resolution = 'open' LIMIT 1`,
      [taskId]
    );
    if (!result.values?.length) return null;
    return this.mapRowToCycle(result.values[0]);
  }

  async getCurrentCycle(taskId: number): Promise<Cycle | null> {
    const result = await this.db.executeQuery(
      `SELECT * FROM task_cycles WHERE taskId = ? ORDER BY CASE WHEN resolution = 'open' THEN 0 ELSE 1 END, cycleStartDate DESC LIMIT 1`,
      [taskId]
    );
    if (!result.values?.length) return null;
    return this.mapRowToCycle(result.values[0]);
  }

  async findById(cycleId: number): Promise<Cycle | null> {
    const result = await this.db.executeQuery('SELECT * FROM task_cycles WHERE id = ?', [cycleId]);
    if (!result.values?.length) return null;
    return this.mapRowToCycle(result.values[0]);
  }

  async findOpenCycles(): Promise<Cycle[]> {
    const result = await this.db.executeQuery("SELECT * FROM task_cycles WHERE resolution = 'open'", []);
    return ((result.values || []) as any[]).map((row) => this.mapRowToCycle(row));
  }

  async updateResolution(
    cycleId: number,
    resolution: CycleResolution,
    timestamps: { completedAt?: string | null; skippedAt?: string | null } = {}
  ): Promise<void> {
    if (resolution === 'done') {
      await this.db.executeQuery(
        'UPDATE task_cycles SET resolution = ?, completedAt = ?, skippedAt = NULL WHERE id = ?',
        [resolution, timestamps.completedAt ?? new Date().toISOString(), cycleId]
      );
    } else if (resolution === 'skipped') {
      await this.db.executeQuery(
        'UPDATE task_cycles SET resolution = ?, skippedAt = ?, completedAt = NULL WHERE id = ?',
        [resolution, timestamps.skippedAt ?? new Date().toISOString(), cycleId]
      );
    } else if (resolution === 'lapsed') {
      await this.db.executeQuery(
        'UPDATE task_cycles SET resolution = ?, completedAt = NULL WHERE id = ?',
        [resolution, cycleId]
      );
    } else {
      await this.db.executeQuery('UPDATE task_cycles SET resolution = ? WHERE id = ?', [resolution, cycleId]);
    }
  }

  async updateOpenCycleTimestamps(
    cycleId: number,
    dueAt: string,
    softDeadline: string,
    hardDeadline: string
  ): Promise<void> {
    const periodDay = periodDayFromDueAt(dueAt);
    await this.db.executeQuery(
      'UPDATE task_cycles SET dueAt = ?, softDeadline = ?, hardDeadline = ?, periodDay = ? WHERE id = ?',
      [dueAt, softDeadline, hardDeadline, periodDay, cycleId]
    );
  }

  async shiftOpenCycleDates(
    cycleId: number,
    cycleStartDate: string,
    dueAt: string,
    softDeadline: string,
    hardDeadline: string
  ): Promise<void> {
    const periodDay = periodDayFromDueAt(dueAt);
    await this.db.executeQuery(
      'UPDATE task_cycles SET cycleStartDate = ?, dueAt = ?, softDeadline = ?, hardDeadline = ?, periodDay = ? WHERE id = ?',
      [cycleStartDate, dueAt, softDeadline, hardDeadline, periodDay, cycleId]
    );
  }

  async deleteAllForTask(taskId: number): Promise<void> {
    await this.db.executeQuery('DELETE FROM task_cycles WHERE taskId = ?', [taskId]);
  }
}
