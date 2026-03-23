# Contract: Situational Message Levels

**Feature**: 003-task-ux-improvements  
**Consumer**: SituationalMessageService, TaskHeroMessageComponent

## Input

- **taskId**: number  
- **Resolved cycles** for that task (from TaskCycleService): list of cycles with resolution in { done, lapsed, skipped }.  
- **Last action**: resolution of the most recent resolved cycle (done | lapsed | skipped).  
- **Achievement rate**: completed / (completed + missed) over last 10 resolved (skipped excluded from denominator). Fewer than 10: use all resolved.

## Output

- **Level**: One of a finite set (~10) of level identifiers (e.g. `not_started` | `strong_streak` | `good_progress` | `recent_miss` | `recovery` | …).  
- **Message**: Short, display-ready string for the hero. Tone: encouraging, non-shaming (Atomic Habits aligned).

## Update trigger

- When a cycle **ends** (user or system sets resolution to done, lapsed, or skipped), recompute level for that task. If level changed, hero message updates (on task detail page or when user navigates back to it).

## Contract (interface)

```text
getLevel(taskId: number): Promise<{ level: SituationalMessageLevel; message: string }>
getLevelSync(task: Task, resolvedCycles: Cycle[], lastAction: 'done'|'lapsed'|'skipped'): { level: SituationalMessageLevel; message: string }
```

Implementation defines the exact level enum and message map; spec requires ~10 levels and update on cycle end.
