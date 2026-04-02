# Implementation Plan: Fix Icon, Add Categories, Enhance Sample Data

## Overview
Fix icon visibility issue, add three default categories, and enhance sample data generation with realistic cycle history.

## Phase 1: Icon Visibility Fix
**Priority:** High

### Tasks:
1. **Fix transparent background** (15 min)
   - File: `android/app/src/main/res/values/ic_launcher_background.xml`
   - Change: Update background color from `#00000000` (transparent) to a visible color
   - Recommended: Use a pleasant teal color like `#26A69A` or a complementary color
   - Why: Transparent background causes the icon to appear black/white against the device background

2. **Verify icon rendering** (10 min)
   - Test in build to confirm icon displays correctly
   - Check both regular and round icon variants
   - Ensure foreground drawable (bell) is visible against new background color

## Phase 2: Add Default Categories
**Priority:** High

### Tasks:
3. **Add three new task types** (20 min)
   - File: `src/app/services/database.service.ts`
   - Location: DEFAULT_TASK_TYPES array (around line 400)
   - Add with appropriate icons and colors:
     * **Health and Sports** - Icon: `flame-outline` or `fitness-outline`, Color: `#FF6B6B` (coral/red)
     * **Social Activity** - Icon: `people-outline` or `chatbubbles-outline`, Color: `#4ECDC4` (teal)
     * **Culture and Learning** - Icon: `book-outline` or `school-outline`, Color: `#95E1D3` (light green)

4. **Test category addition** (10 min)
   - Verify categories appear in Task Types settings page
   - Confirm categories are marked as `isDefault: 1`
   - Check categories can be selected when creating tasks

## Phase 3: Enhance Sample Data Generation
**Priority:** High

### Tasks:
5. **Update SampleDataService with realistic history** (30 min)
   - File: `src/app/services/sample-data.service.ts`
   - Add more days to history for each task:
     * **Daily task**: Add 20 days of history (10 completed + 10 lapsed)
     * **Weekly task**: Add 20 weeks of history (10 completed + 10 lapsed) = ~140 days
     * **Monthly task**: Add 12 months of history (6 completed + 6 lapsed) = ~365 days
   - Use realistic timestamps spread over the past year
   - Ensure proper cycle progression for each frequency

6. **Update cycle sequences** (20 min)
   - For each task, build realistic cycle sequences:
     * Daily task: 10 completed cycles, then 1 lapsed, then 1 open
     * Weekly task: 10 completed weeks, 1 skipped, 1 lapsed, then 1 open
     * Monthly task: 6 completed months, 1 lapsed, then 1 open
   - Ensure tasks are in the correct state (active, with proper cycles)

7. **Test sample data generation** (15 min)
   - Run sample data generation
   - Verify all 3 tasks have realistic history (>15 days total)
   - Check tasks display correctly in task list with appropriate categories
   - Verify current cycle is properly positioned in timeline

## Execution Order
1. Fix icon background color
2. Add default categories to database
3. Update sample data generation with realistic history
4. Test all changes together

## Files to Modify
- `android/app/src/main/res/values/ic_launcher_background.xml` (1 line change)
- `src/app/services/database.service.ts` (add 3 task types)
- `src/app/services/sample-data.service.ts` (enhance history for 3 tasks)

## Expected Outcomes
- Icon displays with visible background color
- Three new default categories available
- Sample data contains 3 tasks with 15+ days of realistic cycle history
- All changes work together seamlessly
