# Admin Notifications Refinement Plan

## Summary
Refine `/admin/notifications` into a premium, reference-matched admin inbox while keeping the existing route, auth, sidebar, data source, and per-notification read toggle intact.

The redesign will be **admin-only** inside the existing shared `NotificationsPage` component. Other role notification pages will keep their current simpler experience for now. The page will gain a polished header, segmented filters, search, a grouped notification list, a right-side overview rail, quick-action links to existing admin modules, and a real **Mark all as read** action backed by a new bulk API.

## Implementation Changes
### Frontend behavior and layout
- Keep `NotificationsPage` as the route target, but branch the rendering by `role === 'admin'`.
- Preserve the current fetch flow from `getNotifications()` and existing single-item `updateNotification()`.
- Replace the current flat admin list with a reference-style layout:
  - Header with eyebrow label, title, subtitle, unread pill, and primary `Mark all as read` button.
  - Filter/search row with segmented tabs:
    - `All`
    - `Unread`
    - `Read`
    - `Escalations`
    - `Approvals`
    - `System`
  - Sort control with `Newest first` as default.
  - Main list card grouped into time buckets:
    - `Today`
    - `Yesterday`
    - `Earlier`
  - Right rail with:
    - `Notification Overview`
    - `Quick Actions`
    - `Notification Preferences`
- Use human-friendly labels everywhere; avoid raw notification `type` strings in visible UI.
- Keep mobile/tablet responsive behavior decision-complete:
  - Desktop: two-column layout with right rail.
  - Tablet: right rail stacks below the inbox.
  - Mobile: filters wrap, rows become stacked cards, no horizontal scrolling.

### Admin notification presentation model
- Add a frontend presentation layer that maps raw notifications into admin-friendly view models:
  - `label`
  - `category`
  - `severity`
  - `ctaLabel`
  - `entityName`
  - `entityMeta`
  - `icon`
  - `accent styles`
- Derive categories from existing `type` and `meta` with fixed rules:
  - `escalation`, `workflow_sla_breach` -> `Escalations`
  - types/messages containing approval or application signals -> `Approvals`
  - system/no-show/workflow/config/service signals -> `System`
  - everything else -> `All` only
- Derive severity from `meta.priority` when present; otherwise use deterministic defaults:
  - escalation / SLA breach -> `High`
  - approval/application and service warnings -> `Medium`
  - informational updates -> `Low`
- Derive CTA labels without inventing new backend workflows:
  - escalations -> `Review` or `Resolve`
  - approvals/applications -> `Review`
  - system/workflow items -> `View details`
  - fallback -> `Open`
- Show the existing message as the primary readable description, with metadata-enhanced labels where possible.

### Interaction model
- Search is frontend-side for this pass, filtering the already-loaded admin inbox by message/title/category/entity text.
- Category tabs are frontend-side for this pass.
- Sort remains `Newest first`; the sort control is present and styled, with `Oldest first` optional if easy from the already-loaded list.
- Each row keeps the existing read/unread behavior and adds a three-dot menu shell with:
  - `Mark as read` / `Mark as unread`
  - `Copy summary`
  - `Open related page`
- `Quick Actions` link only to existing routes:
  - `/admin/escalations`
  - `/admin/approvals`
  - `/admin/health`
  - `/admin/workflows`
- `Notification Preferences` is informational only for now unless a real preferences route already exists; if none exists, render it as a polished placeholder card with a non-destructive button state.

## API / Interface Changes
### Frontend API additions
- Extend `notificationsApi.ts` with a bulk-read helper, for example `markAllNotificationsRead()`.
- Add local admin-only helpers for:
  - notification categorization
  - severity mapping
  - time grouping
  - overview metric calculation

### Backend API additions
- Add a bulk notification update endpoint for the authenticated user, scoped only to their own notifications.
- Recommended shape:
  - `PATCH /api/v1/notifications/mark-all-read`
  - body optional or empty
  - marks all unread notifications for the current user as read
  - returns updated unread count and/or success message
- Keep the existing single-notification `PATCH /notifications/{id}` unchanged.
- Do not change the existing inbox payload shape unless needed; compute overview cards on the frontend from the returned items.

### Public interface expectations
- Existing `GET /notifications` response continues to work unchanged for all roles.
- Existing `PATCH /notifications/{id}` contract continues to work unchanged.
- New bulk endpoint is additive only.

## Test Plan
### Backend
- Add feature coverage for the new bulk endpoint:
  - authenticated user marks all their unread notifications as read
  - only that user’s notifications are updated
  - unread count becomes `0`
  - already-read notifications remain valid
  - another user’s notifications are untouched
- Keep existing notification inbox tests passing.

### Frontend
- Validate admin page states:
  - loading state
  - populated state
  - empty state
  - error state
  - unread-only filter
  - category tab filtering
  - search filtering
  - grouped sections for today/yesterday/earlier
  - mark single item read/unread
  - mark all as read
- Responsive acceptance:
  - 1920px desktop matches the reference structure closely
  - tablet wraps filters and stacks rail below content
  - mobile converts rows into readable stacked cards with no overflow
- Regression checks:
  - `/admin/notifications` route unchanged
  - other role notification routes still render and use existing data flow
  - sidebar/topbar/auth/navigation unaffected

## Assumptions and Defaults
- Scope is **admin-only** for the refined premium experience.
- `Mark all as read` will be **real functionality**, not visual-only.
- Search and category filtering will be frontend-side against the fetched inbox for this pass.
- Right-rail metrics are computed from the inbox items already returned by the API.
- Quick actions will only navigate to existing admin routes; no new business workflows will be invented in this refinement.
