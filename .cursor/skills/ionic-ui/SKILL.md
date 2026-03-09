---
name: ionic-ui
description: Build Ionic Framework (Ionic 7/8) UI with components, theming, and Capacitor patterns. Use when building or styling Ionic apps, Angular/React/Vue with Ionic, ion-* components, Ionic theming, mobile-first UI, or Capacitor hybrid apps.
---

# Ionic UI Frontend

Use this skill when implementing or refining UI in an Ionic app. Delivers consistent, accessible, platform-aware interfaces using Ionic components and theming.

## When to Apply

- Building pages, tabs, modals, or lists in an Ionic app
- Theming (light/dark, brand colors, CSS variables)
- Navigation (ion-router, ion-nav, tabs, back behavior)
- Forms (ion-input, ion-select, ion-datetime, validation)
- Mobile-first or cross-platform (iOS/Android/Web) UI

## Core Practices

### 1. Use Ionic components

Prefer Ionic components over raw HTML so layout and behavior stay consistent and accessible:

- **Layout**: `ion-header`, `ion-toolbar`, `ion-content`, `ion-footer`, `ion-grid`, `ion-list`
- **Navigation**: `ion-tabs`, `ion-tab-bar`, `ion-back-button`, `ion-router-outlet`
- **Actions**: `ion-button`, `ion-fab`, `ion-fab-button`, `ion-segment`, `ion-chip`
- **Content**: `ion-card`, `ion-item`, `ion-list`, `ion-list-header`, `ion-label`, `ion-note`
- **Forms**: `ion-input`, `ion-textarea`, `ion-select`, `ion-checkbox`, `ion-toggle`, `ion-datetime`, `ion-range`
- **Feedback**: `ion-loading`, `ion-toast`, `ion-alert`, `ion-modal`, `ion-refresher`, `ion-skeleton-text`

Use component props and slots (e.g. `slot="start"`, `slot="end"`) instead of custom wrappers when possible.

### 2. Theming with CSS variables

- Set app-wide tokens in `:root` or in theme files (e.g. `variables.css` / `variables.scss`).
- Use Ionic’s semantic variables: `--ion-background-color`, `--ion-text-color`, `--ion-color-primary`, `--ion-toolbar-background`, etc.
- Prefer stepped colors for hierarchy (e.g. `--ion-color-primary-shade`, `--ion-color-primary-tint`).
- Support dark mode via `prefers-color-scheme` or Ionic’s dark palette (e.g. `@ionic/react/css/palettes/dark.system.css` or equivalent for your framework).
- Use the `theme-color` meta tag and safe-area insets for notched devices and PWAs.

### 3. Layout and navigation

- Put global chrome in `ion-header` / `ion-toolbar` and scrollable content in `ion-content`.
- Use `ion-content` with `fullscreen` when you need full viewport (e.g. modals).
- Prefer `ion-router` / framework router (Angular Router, React Router, Vue Router) with Ionic’s router outlet and `ion-back-button` for back stack.
- Keep tab structure in `ion-tabs` and use `ion-tab-bar` with `ion-tab-button` and labels/icons.

### 4. Forms and validation

- Use `ion-input`, `ion-textarea`, `ion-select`, etc. with `label`, `placeholder`, and `helperText`/`errorText` as needed.
- Pair with framework forms (Reactive Forms, React Hook Form, VeeValidate, etc.) and show validation state via `ion-input`’s error state or helper/error text.
- Use `ion-datetime` for dates/times and `ion-select` for single/multi select; avoid reinventing with raw inputs when these fit.

### 5. Accessibility and platform

- Rely on Ionic’s built-in ARIA and keyboard behavior; avoid stripping or overriding it.
- Test with screen readers and with iOS/Android appearance (Ionic’s mode) when targeting Capacitor.
- Use safe-area insets for notches and home indicators; test on real devices or simulators.

### 6. Performance

- Lazy-load pages/tabs where the framework supports it.
- Use `ion-virtual-scroll` or framework virtual scrolling for long lists.
- Prefer CSS and Ionic animations over heavy JS-driven animations where possible.

## Quick reference

| Need            | Use                          |
|----------------|------------------------------|
| Page shell     | `ion-header` + `ion-content`  |
| Tabs           | `ion-tabs`, `ion-tab-bar`     |
| List           | `ion-list`, `ion-item`       |
| Card           | `ion-card`, `ion-card-header/content` |
| Primary action | `ion-button` (expand/block as needed) |
| Theming        | CSS variables in theme file  |
| Dark mode      | Ionic dark palette + media/preference |

## Out of scope

- Non-Ionic web apps (use a generic frontend or React/Vue skill instead).
- Backend or API design (use backend/API skills).
- Native plugin implementation details (use Capacitor/Native plugin docs when needed).

For full API and examples, see [Ionic Framework Docs](https://ionicframework.com/docs).
