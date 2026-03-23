# Debugging: Task detail stuck on loading

Use this to find the cause in a few minutes instead of guessing.

## Step 1: What do you see?

1. Open the app, go to Tasks, tap a task (e.g. "Daily Check" id 4).
2. In the browser console you see `[TaskDetail] loadTaskDetails complete` and `[TaskDetail] isLoading = false`.

**Then check:**

- **Do you see a green line "Loaded: Daily Check" (or the task title) at the top of the content?**
  - **YES** → The task-details block is rendering. The problem is **below** the canary (a child component or a binding further down). Go to Step 2.
  - **NO** → The task-details block is not showing. The problem is either:
    - **Change detection**: Angular is not re-running the template after `isLoading = false`. Try `cdr.detectChanges()` (already added) or run inside `NgZone.run()`.
    - **Condition**: Something is wrong with `task` or `isLoading` (e.g. task is null in the view). In Console run: `ng.getComponent(document.querySelector('app-task-detail'))` and check `.isLoading` and `.task` in the component instance (if you have Angular devtools or can inspect).

## Step 2: Find the exact element that breaks the view

If you **saw the green canary**:

1. Open `src/app/pages/task-management/task-detail/task-detail.page.html`.
2. **Comment out** the whole block from `<!-- Hero -->` down to and including `</app-task-cycle-timeline>` (i.e. leave only the canary and the closing `</div>` of task-details).
3. Save and reload. Open the same task again.
   - **If the page now shows** (canary + maybe header): the problem is in one of the commented sections. Uncomment **half** of it (e.g. Hero + header + cycle block only), reload, test. Repeat until you know which component or block causes the issue.
   - **If the page still doesn’t show**: the problem is in the part you didn’t comment (e.g. header or something in the first visible part). Comment out smaller pieces until the content appears; the last thing you removed is the cause.

## Step 3: Common causes once you know the block

- **Timeline** (`app-task-cycle-timeline`): invalid dates in cycles → we added safe `dayGroups` and `getEventTime`. If it still breaks, check for another getter or binding in that component.
- **Statistics** (`app-task-statistics`): async load or template error → check its template and `loadStatistics` (it has try/catch; look for errors in console).
- **Hero message** (`app-task-hero-message`): simple input; unlikely but possible.
- **Date/formatted text**: any `| date` or method that can throw on bad data → use safe helpers (like `formatCycleDate`) or optional chaining.

## Remove the canary when done

When the issue is fixed, delete the debug line from the template:

```html
<p class="debug-canary" style="...">Loaded: {{ task?.title }}</p>
```
