# Reminder App Publish Plan

## Overview
**Objective:** Ship a stable, trustworthy Reminder App launch that converts early users into retained customers.

**Launch horizon:** **8-12 weeks** (recommended), with phase exit gates required before moving forward.

---

## Phase 1 — Product Reliability
**Goal:** Ensure core reminders, task cycles, and local notifications are dependable on target devices.

### Checklist
- [ ] Complete smoke tests for task create/edit/delete, cycle rules, customer links, and reminder scheduling.
- [ ] Validate notification delivery (foreground/background/reboot) on key Android versions/devices.
- [ ] Eliminate crash-level and data-loss bugs from critical paths.
- [ ] Verify SQLite migration and upgrade paths on existing test data.
- [ ] Add basic error logging/reporting workflow for production triage.

### Bug Fixes (User-Reported Issues)
- [ ] **Delete Task confirm message** — Remove extra characters/tags from the confirmation dialog.
- [ ] **"Due Now" state** — Ensure complete button is visible in task view when task is due.
- [ ] **System back button** — Implement working back navigation via system/hardware back button.
- [ ] **App Icon** — Fix icon to be properly contained within its space (no overflow/clipping).
- [ ] **Splash screen** — Remove shadow overlay from splash screen.

**Exit gate:** No Sev-1 bugs open, no data-loss issues, crash-free sessions target met (e.g., >99.5% in beta set), and all user-reported issues above resolved.

---

## Phase 2 — Store & Compliance Readiness
**Goal:** Be submission-ready for store review and policy checks.

### Checklist
- [ ] Finalize app metadata: title, short/long description, keywords.
- [ ] Prepare store assets: icon, screenshots, feature graphic, promo text.
- [ ] Publish privacy policy + support contact and link in-app.
- [ ] Review permissions and disclosures (notifications, storage use, etc.).
- [ ] Complete internal release checklist for versioning/signing/build reproducibility.

**Exit gate:** Full submission packet complete; compliance/privacy checklist signed off.

---

## Phase 3 — UX Polish & Retention Core
**Goal:** Improve first-run clarity and weekly habit loops.

### Checklist
- [ ] Polish onboarding and first-task flow to reduce setup friction.
- [ ] Improve empty states, helpful defaults, and reminder presets.
- [ ] Tighten key interactions (feedback/haptics/latency consistency).
- [ ] Add lightweight retention nudges (e.g., streak/check-in prompts).
- [ ] Run usability pass with 5-10 target users; resolve top pain points.

**Exit gate:** Activation and week-1 retention baseline targets reached in beta.

---

## Phase 4 — Monetization + Beta Validation
**Goal:** Validate a trust-first free launch with optional, low-friction monetization.

### Checklist
- [ ] Keep the core product fully usable for free from first launch.
- [ ] Limit ads to optional, lightweight placements on non-critical surfaces only.
- [ ] Keep strict no-ads zones: alarm ring, snooze/dismiss, task completion success, and first-time onboarding.
- [ ] Offer one optional one-time upgrade (Remove Ads / Pro), with clear value and no forced blocking.
- [ ] Show upgrade prompts only at natural, low-pressure moments (e.g., settings or feature discovery screens).
- [ ] Run closed beta and collect feedback on trust, interruption level, and ad acceptance.
- [ ] Track retention + trust metrics first (D1/D7, complaints, rating sentiment), then conversion metrics.
- [ ] Adjust ad frequency/placement and upgrade copy based on user feedback before scaling.

**Exit gate:** Retention/trust and ad acceptance meet targets (stable D1/D7, low complaint rate, positive sentiment), and optional upgrade conversion shows baseline viability.

---

## Phase 5 — Public Launch
**Goal:** Execute launch week smoothly and sustain post-launch operations.

### Checklist
- [ ] Freeze release candidate; run final regression + notification validation.
- [ ] Publish launch communications (website/social/changelog/email).
- [ ] Set up support workflow (response SLA, bug triage ownership).
- [ ] Monitor live KPI dashboard daily during first 14 days.
- [ ] Ship at least one fast-follow update based on real user feedback.

**Exit gate:** Stable launch week (no Sev-1 incidents), support SLAs met, KPI trend stable/improving.

---

## Weekly Founder KPI Dashboard
Track weekly (with WoW trend):

- **Reliability:** crash-free sessions %, reminder delivery success %, Sev-1/Sev-2 open bugs.
- **Activation:** new users, onboarding completion %, first reminder scheduled %, first 24h success rate.
- **Retention:** D1, D7, D30 retention; weekly active users; reminders completed/user/week.
- **Monetization:** paywall views, trial start %, trial→paid conversion %, ARPU/MRR.
- **Trust:** support tickets per 100 users, avg rating, refund rate, privacy/permission complaints.

---

## Go / No-Go Launch Criteria
**Go if all are true:**
- Reliability thresholds met for 2 consecutive weeks.
- No open critical defects in core reminder/task flows.
- Activation + D7 retention at/above target baseline.
- Monetization metrics at or above minimum viability target.
- Compliance/store assets complete and support runbook ready.

**No-Go triggers:**
- Active Sev-1 bug or reminder reliability below threshold.
- Significant trust risk (privacy concern spike, high refund/complaint rate).
- Missing submission/compliance requirements.

---

## Ownership & Timeline Template

| Phase | Owner | Start Week | End Week | Dependencies | KPI Target | Status |
|---|---|---|---|---|---|---|
| Phase 1 Product Reliability |  |  |  |  |  |  |
| Phase 2 Store & Compliance Readiness |  |  |  | Phase 1 gate |  |  |
| Phase 3 UX Polish & Retention Core |  |  |  | Phase 1 gate |  |  |
| Phase 4 Monetization + Beta Validation |  |  |  | Phase 2-3 gates |  |  |
| Phase 5 Public Launch |  |  |  | Phase 4 gate |  |  |
