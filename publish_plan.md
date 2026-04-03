# RoutineLoop Publish Plan

## Overview
**Objective:** Ship a stable, trustworthy RoutineLoop launch that converts early users into retained customers.

**Launch horizon:** **8-12 weeks** (recommended), with phase exit gates required before moving forward.

> **Last reviewed:** April 2, 2026 — Phases 1–3 complete. Entering Phase 4.

---

## Phase 1 — Product Reliability ✅ COMPLETE
**Goal:** Ensure core reminders, task cycles, and local notifications are dependable on target devices.

### Checklist
- [x] Complete smoke tests for task create/edit/delete, cycle rules, customer links, and reminder scheduling.
- [x] Validate notification delivery (foreground/background/reboot) on key Android versions/devices.
- [x] Eliminate crash-level and data-loss bugs from critical paths.
- [x] Verify SQLite migration and upgrade paths on existing test data.
- [x] Add basic error logging/reporting workflow for production triage.

### Bug Fixes (User-Reported Issues)
- [x] **Delete Task confirm message** — Remove extra characters/tags from the confirmation dialog.
- [x] **"Due Now" state** — Ensure complete button is visible in task view when task is due.
- [x] **System back button** — Implement working back navigation via system/hardware back button.
- [x] **App Icon** — Fix icon to be properly contained within its space (no overflow/clipping).
- [x] **Splash screen** — Remove shadow overlay from splash screen. *(Partially resolved — dim overlay persists on some devices; root cause unknown. Revisit in Phase 4.)*
- [x] **Timeline focus** — Center and emphasize current open cycle in timeline view.

**Exit gate:** ✅ Met — No Sev-1 bugs open, no data-loss issues, crash-free sessions target met, all user-reported issues resolved or tracked.

---

## Phase 2 — Store & Compliance Readiness ✅ COMPLETE
**Goal:** Be submission-ready for store review and policy checks.

### Checklist
- [x] Finalize app metadata: title, short/long description, keywords (EN + AR).
- [x] Prepare store assets: icon, screenshots, feature graphic, promo text.
- [x] Publish privacy policy + support contact and link in-app.
- [x] Review permissions and disclosures (notifications, storage use, etc.).
- [x] Complete internal release checklist for versioning/signing/build reproducibility.
- [x] Debug menu hidden in production builds via `isDevMode`.
- [x] Sidebar footer shows app version (RoutineLoop v1.0.0).

**Exit gate:** ✅ Met — Full submission packet complete; compliance/privacy checklist signed off.

---

## Phase 3 — UX Polish & Retention Core ✅ COMPLETE
**Goal:** Improve first-run clarity and weekly habit loops.

### Checklist
- [x] Polish onboarding and first-task flow to reduce setup friction.
- [x] Improve empty states, helpful defaults, and reminder presets.
- [x] Tighten key interactions (feedback/haptics/latency consistency).
- [x] Add lightweight retention nudges (e.g., streak/check-in prompts).
- [x] Run usability pass with 5-10 target users; resolve top pain points.

**Exit gate:** ✅ Met — Activation and week-1 retention baseline targets reached in beta.

---

## Phase 4 — Pre-Launch Hardening & Monetization ✅ COMPLETE
**Goal:** Fix all critical and high-priority issues found in the readiness review, add lightweight optional monetization, and validate with a closed beta before public launch.

> **Context:** A full readiness review (April 2, 2026) identified 4 critical blockers, 6 high-priority issues, and several medium/low items. All critical and high items must be resolved before Phase 5.
> **Completed:** April 3, 2026. All 4A, 4B, 4C, 4E items implemented and reviewed. 4D (beta validation) is pending human action.

### 4A — Critical Blockers (must fix before any release)
- [x] **C1 — Remove `android:usesCleartextTraffic="true"`** from `AndroidManifest.xml`. ✅ Removed from `<application>` tag (no external HTTP needed since C2).
- [x] **C2 — Disable external notification types** (email, SMS, WhatsApp, Telegram) for v1.0. ✅ `sendNotification()` skips external API calls for these types. `getEnabledNotificationTypes()` returns only local types.
- [x] **C3 — Reconcile privacy policy** ✅ Updated `docs/privacy-policy.md` to state v1.0 stores all data locally with no external transmission.
- [x] **C4 — Build minimal onboarding flow** ✅ 3-screen onboarding at `src/app/pages/onboarding/`: what app does, how cycles work, create first routine. Permission request included. First-launch routing in `app.component.ts`. Uses teal primary theme.

### 4E — Beta "Coming Soon" UX (features intentionally inactive in beta)
- [x] **B1 — Email, SMS, WhatsApp notification types — "Coming Soon" gate** ✅ Toast messages on toggle activation in `notification-types.page.ts`. Cards remain visible; activation blocked with friendly message. WhatsApp has separate premium messaging.
- [x] **B2 — Contact-linked task notifications — "Coming Soon" gate** ✅ Info note added in `task-form.component.html`/`.scss` when a contact is linked. Contact-linking UI remains fully functional.

### 4B — High Priority (fix before beta)
- [x] **H1 — Fix observable memory leaks** ✅ `destroy$` + `takeUntil` pattern added to `task-form.component.ts`, `task-detail.page.ts`, `customer-form.component.ts`. `darkModeListener` removal in `ngOnDestroy` added to `app.component.ts`. `OnDestroy` implemented in all four files.
- [x] **H2 — Refactor N+1 database queries** ✅ `getTasksByIds()` batch method added to `database.service.ts`. `closeLapsedCycles()` and `loadTaskList()` in `task-cycle.service.ts` refactored to batch fetch tasks and use `Map<id, Task>` for O(1) lookups.
- [x] **H3 — Gate all `console.log` behind `environment.enableConsoleLogs`** ✅ `database.service.ts` (40+ calls) and `task-form.component.ts` (13 calls) all gated. `console.error` remains ungated.
- [x] **H4 — Defer `loadTasks()` until DB is confirmed ready** ✅ `TaskService` now subscribes to `dbService.dbReady$` before calling `loadTasks()`. Errors propagated.
- [x] **H5 — Handle `SCHEDULE_EXACT_ALARM` denial gracefully** ✅ `notification.service.ts` wrapped exact alarm scheduling in try/catch. Shows user-facing `AlertController` explanation on denial, falls back to inexact alarms.
- [x] **H6 — Replace deprecated `.toPromise()`** ✅ `notification.service.ts` lines 369 and 415 updated to `firstValueFrom()` from `rxjs`.

### 4C — Monetization (trust-first, optional only)
- [x] **v1.0 launch: 100% free, zero ads.** ✅ Confirmed in plan.
- [x] **Add "Support the App ☕" link** ✅ Added in `settings.page.ts` using `@capacitor/browser` to open `https://ko-fi.com/routineloop`. `@capacitor/browser@7` added to `package.json`.
- [ ] **Plan AdMob integration for v1.1** — banner ad on Archive page only (non-critical surface). Strict no-ads zones must be respected at all times:
  - ❌ Task completion success screen
  - ❌ Alarm ring / snooze / dismiss
  - ❌ Onboarding
  - ❌ Task form (creation/editing)
- [ ] **Plan one-time "Remove Ads" IAP (~$1.99)** for v1.1 — show only in Settings, never as a blocking prompt.
- [ ] **Update privacy policy before v1.1** to accurately reflect AdMob data collection when ads are enabled.

### 4D — Beta Validation ⏳ PENDING (human action)
- [ ] Run closed beta and collect feedback on trust, interruption level, and overall experience.
- [ ] Track retention + trust metrics first (D1/D7, complaints, rating sentiment), then conversion metrics.
- [ ] Resolve top pain points from beta feedback before proceeding to Phase 5.

**Exit gate:** ✅ All critical (4A) and high (4B) items resolved; monetization (4C) complete except planning items; 4D (beta) pending human action.

---

## Phase 5 — Public Launch
**Goal:** Execute launch week smoothly and sustain post-launch operations.

### Checklist
- [ ] Freeze release candidate; run final regression + notification validation on Android 12, 13, 14.
- [ ] Verify `SCHEDULE_EXACT_ALARM` permission flow on Android 12+ (graceful degradation confirmed).
- [ ] Confirm privacy policy is accurate and up to date for v1.0 scope.
- [ ] Publish launch communications (website/social/changelog/email).
- [ ] Set up support workflow (response SLA, bug triage ownership).
- [ ] Monitor live KPI dashboard daily during first 14 days.
- [ ] Ship at least one fast-follow update (v1.0.1) based on real user feedback within 2 weeks.
  - [ ] Plan v1.1 milestone: AdMob integration, "Remove Ads" IAP, backup/restore, external notification types (Email, SMS, Telegram), contact-linked task notifications. WhatsApp notifications may be gated behind a paid tier.

**Exit gate:** Stable launch week (no Sev-1 incidents), support SLAs met, KPI trend stable/improving.

---

## Known Issues Tracker

| ID | Issue | Severity | Status | Target |
|---|---|---|---|---|
| KI-1 | Splash screen dim overlay on some devices | Low | Open — root cause unknown | v1.1 |
| KI-2 | External notification types (email/SMS/WhatsApp/Telegram) non-functional | High | ✅ Resolved — disabled for v1.0; friendly "coming soon" toast shown to user | v1.1 (WhatsApp possibly paid) |
| KI-3 | Web SQL interpreter does not support OR conditions in WHERE | Low | Dev-only, acceptable | v1.1+ |
| KI-4 | Contact-linked task notifications (notify contact on cycle completion) non-functional | Medium | ✅ Resolved — not active in beta; contact-linking UI remains; friendly "coming soon" note shown | v1.1 |

---

## Medium & Low Priority Backlog (post-launch)

These items were identified in the April 2026 readiness review. Address in v1.1 or later:

- [ ] **M1** — Add `aria-label` to task list action buttons (complete/skip/options); fix medium-gray text contrast (≈2.8:1 → needs 4.5:1 for WCAG AA).
- [ ] **M2** — Disable task form visually during `isSubmitting` to prevent double-submit.
- [ ] **M3** — Reset `isLoading = false` on task list error path (spinner persists behind error alert).
- [ ] **M4** — Set `android:allowBackup="false"` in `AndroidManifest.xml` for privacy.
- [ ] **M5** — Remove dead code: unused private methods (`calculateDaysSince`, `calculateNextCycleEnd`, `formatDate`), unused `DbRow` interface, unused imports in `notification.service.ts`, deprecated `updateTaskCycleStatus()`.
- [ ] **M6** — Decouple permission request from `getEnabledNotificationTypes()` — currently triggers a permission dialog as a side effect of a read-only query.
- [ ] **M7** — Add `lang` attribute to `<html>` element; switch dynamically for Arabic.
- [ ] **L1** — Replace generic `<ion-spinner>` with per-component skeleton screens (per `ui_ux enhancement.md`).
- [ ] **L2** — Split `database.service.ts` (1,597 lines) — extract web SQL interpreter to `database.web.service.ts`.
- [ ] **L3** — Add backup/restore feature (export/import JSON) — high user concern for local-only apps.
- [ ] **L4** — Add home screen widget showing today's routines.
- [ ] **L5** — Add nudge/prompt to discover statistics page after first cycle completion.

---

## Weekly Founder KPI Dashboard
Track weekly (with WoW trend):

- **Reliability:** crash-free sessions %, reminder delivery success %, Sev-1/Sev-2 open bugs.
- **Activation:** new users, onboarding completion %, first routine scheduled %, first 24h success rate.
- **Retention:** D1, D7, D30 retention; weekly active users; routines completed/user/week.
- **Monetization:** "Support" link clicks, (v1.1+) ad impressions, IAP views, conversion %.
- **Trust:** support tickets per 100 users, avg rating, privacy/permission complaints.

---

## Go / No-Go Launch Criteria
**Go if all are true:**
- All Phase 4A critical blockers resolved.
- All Phase 4B high-priority items resolved.
- Reliability thresholds met for 2 consecutive weeks in beta.
- No open critical defects in core reminder/task flows.
- Activation + D7 retention at/above target baseline.
- Compliance/store assets complete and support runbook ready.
- Privacy policy accurate for v1.0 scope (local-only, no external API).

**No-Go triggers:**
- Any Phase 4A critical blocker still open.
- Active Sev-1 bug or reminder reliability below threshold.
- Significant trust risk (privacy concern spike, high complaint rate).
- Missing submission/compliance requirements.

---

## Ownership & Timeline Template

| Phase | Owner | Start Week | End Week | Dependencies | KPI Target | Status |
|---|---|---|---|---|---|---|
| Phase 1 Product Reliability | | | | | | ✅ Done |
| Phase 2 Store & Compliance Readiness | | | | Phase 1 gate | | ✅ Done |
| Phase 3 UX Polish & Retention Core | | | | Phase 1 gate | | ✅ Done |
| Phase 4 Pre-Launch Hardening & Monetization | | | | Phase 2-3 gates | | ✅ Done |
| Phase 5 Public Launch | | | | Phase 4 gate | | ⏳ Pending |
