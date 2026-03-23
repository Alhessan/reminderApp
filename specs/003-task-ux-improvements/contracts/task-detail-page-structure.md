# Contract: Task Detail Page Structure

**Feature**: 003-task-ux-improvements  
**Consumer**: Task detail page template and components

## Section order (top to bottom)

1. **Hero section** (new)  
   - Single block at top of `<ion-content>` (below toolbar).  
   - Renders situational message via `app-task-hero-message`.  
   - No actions; message only. Layout: hero first, then all other content.

2. **Page header** (existing, unchanged)  
   - `unified-page-header`: task title, state (Active / Paused / Completed / Archived).

3. **Status card** (existing)  
   - Current cycle display (e.g. `app-cycle-status-badge`).  
   - This block is the **subject of the geometric transition**: when cycle changes after "Mark complete", this (and optionally the primary actions) animates (slide/fade).

4. **Work bench** (existing, layout change)  
   - **Primary actions** (current-cycle): Mark complete, Skip. Visually grouped (e.g. same row/card section).  
   - **Correct previous step** (retroactive): "I did it last time" / "Mark last occurrence as done". Must be in the same card but **distinguished** (e.g. separate row, or secondary style, or label) so it is clearly not "complete this cycle."  
   - Pause/Resume, Edit, Delete unchanged.

5. **Info card** (existing)

6. **Task statistics** (existing)

7. **Task cycle timeline** (new)  
   - Renders `app-task-cycle-timeline`. Shows last N cycles + upcoming; "Load more" via horizontal slide.

## Error and loading states

- Loading: existing `isLoading`; hero can show neutral or empty until task loaded.
- Task not found: existing error state; no hero.
- No cycle / archived: hero still shows; status card and primary actions may be minimal or hidden per existing logic.
