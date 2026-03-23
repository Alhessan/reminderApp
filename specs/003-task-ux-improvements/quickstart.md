# Quickstart: Task View UX (003)

**Branch**: `003-task-ux-improvements`

## Run & Test

```bash
cd d:\Projects\reminderApp
npm start
```

1. Open http://localhost:4200
2. Use **Generate Sample Data** from menu
3. Open "Daily Check" — timeline should show 4 completed + 1 upcoming
4. Open "Weekly Update" — 1 done, 2 skipped, 1 upcoming
5. Open "Monthly Review" — empty timeline, only upcoming

## Key Files

| File | Purpose |
|------|---------|
| `task-detail.page.ts` | Loads task, cycles, timeline; refreshes on markComplete/skip/retroactive |
| `task-cycle-timeline.component.ts` | Renders timeline (day-grouped or flat); receives cycles + upcomingCycle |
| `task-cycle.service.ts` | `getResolvedCycles(taskId, limit, offset)` |
| `situational-message.service.ts` | `getLevel(taskId)` — used only when resolvedCycles.length >= 3 |
| `sample-data.service.ts` | Creates Daily Check, Weekly Update, Monthly Review with cycle history |

## Verification

- Timeline shows all resolved cycles (not just last one)
- Hero message hidden for Monthly Review (0 resolved)
- Sample task names are professional
