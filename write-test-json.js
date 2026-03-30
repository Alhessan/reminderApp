const fs = require('fs');

const testResult = `## Manual Test Checklist — Routine Loop Enhancements (004)

### Pre-test Setup

**Reset app to clean state before testing:**
1. Uninstall the app from the device/emulator (long press → Uninstall)
2. Clear app data: Go to Android Settings → Apps → RoutineLoop → Clear Data / Clear Storage
3. Reinstall the APK or rebuild: npx cap sync android && npx cap open android
4. On first launch, the app should generate fresh sample data
5. Verify sample tasks appear in the list before proceeding with tests

---

### US1: Most Recent Missed Cycle Correction

| Test ID | Feature Area | Precondition | Steps to Execute | Expected Result | Pass/Fail |
|---------|--------------|--------------|------------------|-----------------|------------|
| T007-01 | Missed Cycle Button Visibility | Create a task with daily frequency, let at least one cycle pass without completion (task becomes overdue) | 1. Open app → Task List 2. Tap on an overdue task to open Task Detail 3. Scroll to see if correction button appears | Correction button labeled "I did [Day, Mon DD]" appears near the top of the detail view | [ ] |
| T007-02 | Button Shows Correct Date | Task has at least one missed cycle from a specific date | View the task detail of an overdue task | Button label shows the actual date of the most recently missed cycle (e.g., "I did Mon, Mar 23") | [ ] |
| T007-03 | Correction Button Marks Cycle Done | Have a task with missed cycles | 1. Tap the correction button 2. Observe the task status update | Clicking the button marks the most recent missed cycle as completed retroactively; task status updates accordingly | [ ] |
| T007-04 | No Button for Active Tasks | Task is not overdue (all cycles completed or future cycles only) | Open Task Detail for an active/upcoming task | No correction button appears for tasks without missed cycles | [ ] |

---

### US2: Early Completion (Grace Period = 0)

| Test ID | Feature Area | Precondition | Steps to Execute | Expected Result | Pass/Fail |
|---------|--------------|--------------|------------------|-----------------|------------|
| T017-01 | Early Complete - No Soft Deadline | Create a task with grace period = 0 (no soft deadline), set due time to later today | 1. Create task with grace period = 0 2. Wait until before the due time 3. Open task detail | "Mark Complete" button is enabled/available before the due time | [ ] |
| T017-02 | Complete Blocked Until Soft Deadline | Create a task with grace period > 0 (soft deadline before hard deadline) | 1. Create task with grace period = 2 hours (soft deadline) 2. Current time is before soft deadline 3. Open task detail | "Mark Complete" button is disabled or shows "Available at [soft deadline time]" | [ ] |
| T017-03 | Complete Allowed After Soft Deadline | Same task as T017-02, but now current time is after soft deadline | 1. Wait until after soft deadline OR create task with past soft deadline 2. Open task detail | "Mark Complete" button becomes enabled after soft deadline passes | [ ] |
| T017-04 | Paused Task Cannot Be Completed | Create a task and pause it | 1. Pause the task 2. Open task detail | "Mark Complete" button is disabled for paused tasks | [ ] |

---

### US3: Paused Tasks Tab

| Test ID | Feature Area | Precondition | Steps to Execute | Expected Result | Pass/Fail |
|---------|--------------|--------------|------------------|-----------------|------------|
| T018-01 | Five Tabs Visible | Fresh app with tasks | 1. Open Task List 2. Swipe or tap tabs | Five tabs visible: All, Due, Upcoming, Overdue, Paused | [ ] |
| T018-02 | Paused Tasks in Separate Tab | Have at least one paused task | 1. Tap on "Paused" tab 2. Observe the list | Paused tasks appear only in the Paused tab | [ ] |
| T018-03 | Paused Not in Other Tabs | Have paused tasks | 1. Check "All" tab 2. Check "Due", "Upcoming", "Overdue" tabs | Paused tasks do NOT appear in All/Due/Upcoming/Overdue tabs | [ ] |
| T018-04 | Pause Button Changes to Resume | Task is currently paused | 1. Open a paused task OR view in list 2. Find the action button | Button shows "Resume" (with play icon) instead of "Pause" for paused tasks | [ ] |
| T018-05 | Resume Button Has Play Icon | Task is paused | View the paused task in list or detail | Resume button displays a play icon | [ ] |
| T018-06 | No Notifications for Paused Tasks | Have a paused task with notifications scheduled | 1. Pause a task 2. Wait for notification time OR check notification schedule 3. Observe | No notifications fire for paused tasks | [ ] |

---

### US4: Branding

| Test ID | Feature Area | Precondition | Steps to Execute | Expected Result | Pass/Fail |
|---------|--------------|--------------|------------------|-----------------|------------|
| T019-01 | Teal Theme - Toolbar | App is open | 1. Open the app 2. Look at the top toolbar/header | Toolbar background is teal (#2CB996) | [ ] |
| T019-02 | Teal Theme - Buttons | App has action buttons | 1. Create a task or open any page with buttons 2. Observe button colors | Primary buttons use teal (#2CB996) color | [ ] |
| T019-03 | Teal Theme - Accents | Various UI elements | 1. Navigate through app 2. Look for highlights, toggles, icons | Accent elements (toggles, icons, highlights) use teal | [ ] |
| T019-04 | Sidebar Logo | Open sidebar/menu | 1. Open the sidebar (hamburger menu) 2. Look at the header area | Sidebar header shows RoutineLoop logo | [ ] |
| T019-05 | Logo Light/Dark Theme | Device theme setting | 1. Set device to Light mode → check logo 2. Set device to Dark mode → check logo | Logo switches between light and dark version based on system theme | [ ] |
| T019-06 | Android Icon | Check device home screen | 1. Look at app icon on home screen/app drawer 2. Long press to see app info | Android icon is a teal rounded square | [ ] |
| T019-07 | Splash Screen | Launch app (cold start) | 1. Force close and relaunch app 2. Observe splash screen | Splash shows RoutineLoop logo centered on neutral light background | [ ] |

---

### Post-test Notes
- All tests require a physical Android device or Android emulator
- Tests cannot be run headlessly
- If any test fails, note the specific behavior and device/emulator details
- For best results, test on both light and dark system themes
- Ensure app has necessary permissions (notifications) for notification-related tests
`;

const data = {
  id: 'TASK-001',
  title: 'Routine Loop enhancements — finalization & testing',
  status: 'in_progress',
  priority: 'high',
  assignee: 'orchestrator',
  created: '2026-03-25',
  goal: 'Complete remaining work: T020 debug cleanup + manual test guidance for T007/T017/T018/T019',
  plan: {
    steps: [
      { step: 1, action: 'T020: Remove debug console.log statements from all modified service and page files', agent: 'ionic-expert', status: 'done' },
      { step: 2, action: 'Review all changes for quality and consistency', agent: 'review', status: 'done' },
      { step: 3, action: 'T007/T017/T018/T019: Provide manual test checklist for user to execute on device', agent: 'test', status: 'done' }
    ]
  },
  artifacts: {
    files_modified: [
      'src/app/pages/task-management/task-detail/task-detail.page.ts',
      'src/app/services/task-cycle.service.ts',
      'src/app/pages/task-management/task-list/task-list.page.ts',
      'src/app/services/task.service.ts',
      'src/app/services/notification.service.ts'
    ],
    files_created: [],
    tests_created: []
  },
  review_notes: 'Feature implementations (US1-US4): PASS. SQL injection safety: PASS. Type safety: PASS. Angular/Ionic best practices: PASS. Error handling: PASS. Project consistency: PASS. Accessibility: PASS. Android resources: PASS. T020 required 2 rounds - initially only page/service files were targeted; second pass cleaned task.service.ts and notification.service.ts. All console.log debug statements removed. Files compile without errors.',
  test_result: testResult,
  notes: 'T007, T017, T018, T019 are manual device tests — cannot be run headlessly. T020 is the only code change. All 4 user stories (US1-US4) are implemented and need cleanup + manual verification.'
