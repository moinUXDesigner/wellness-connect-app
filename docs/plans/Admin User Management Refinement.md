# Admin User Management Refinement

## Summary
Refine the admin `/admin/users` screen to closely match the reference layout while keeping the existing route, auth, user data source, reset-password flow, and delete-user flow intact.

This will be a **hybrid refinement**:
- Make the new layout, stats, tabs, search, filters, sorting, chart, and CSV export functional from real user data.
- Keep invite-specific areas **truthful**, not fictional. Use pending-account/onboarding wording instead of “invites”.
- Preserve existing destructive/admin actions, but move them into a cleaner compact action model with the primary reset/delete controls in an overflow menu.

## Implementation Changes

### Frontend layout and behavior
- Keep `UserManagementPage` as the route target, but redesign it into a premium admin console layout with:
  - Header with title, subtitle, primary `Add User` button shell, and real `Export` action.
  - KPI card row for:
    - Total Users
    - Active Users
    - Pending Accounts
    - Admins
    - Trainers
    - Clients
  - Main content area with:
    - segmented tabs: `All Users`, `Trainers`, `Clients`, `Admins`, `Pending`
    - local search by name, email, and phone
    - dropdown filters for role and status
    - sort control with `Newest First` default and `Oldest First` optional
    - responsive user table on desktop and stacked cards on mobile
  - Right rail with:
    - `Role Distribution`
    - `Recent Pending Accounts`
    - `Quick Actions`
    - support/help card
- Match the reference structure closely on desktop, stack the rail below content on tablet, and convert the table into readable cards on mobile.
- Preserve the existing admin chrome, sidebar, topbar, route, and permission boundaries.

### Frontend data model and interactions
- Extend the admin user presentation model to support:
  - `phone`
  - `lastActiveAt`
  - derived role/status labels
  - derived KPI totals
  - role distribution chart data
  - recent pending-account list
- Keep search, tabs, role/status filters, and sorting **frontend-side** against the fetched user list.
- Make `Export` real:
  - export the **currently visible filtered list** as CSV
  - include at least name, email, phone, role, status, last active, and joined date
- Keep `Add User` non-destructive for now:
  - render it as a polished placeholder shell or informational action state
  - do not invent a create-user backend flow
- Replace the current wide reset/delete button row with a compact action cell:
  - visible compact actions may include safe utilities like `Copy email`
  - overflow menu contains the existing real admin actions:
    - `Reset password`
    - `Delete user`
    - `Open role management`
- Keep all current error, loading, empty, blocked-deletion, and confirmation states, but restyle them to fit the new screen.

### Backend and interface additions
- Extend the admin users payload returned by `GET /api/v1/admin/users` to include:
  - `phone` from `users.phone`
  - `lastActiveAt`, derived from the user’s most recent Sanctum token `last_used_at` when available
- Keep the existing response additive:
  - no breaking change to existing fields
  - continue returning `id`, `name`, `email`, `role`, `status`, `joinedAt`
- Update the shared frontend `UserSummary` type to include the new additive fields used by the redesigned table.
- Do not add invite models, add-user endpoints, or announcement workflows in this refinement.

## Public Interfaces / Types
- Extend admin users API payload with:
  - `phone: string | null`
  - `lastActiveAt: string | null`
- Extend the frontend admin user type accordingly.
- No route changes.
- No changes to existing reset-password or delete-user contracts.

## Test Plan
- Backend:
  - add or update admin user-management feature coverage so `GET /api/v1/admin/users` returns the additive `phone` and `lastActiveAt` fields
  - verify users with no token usage return `lastActiveAt: null`
  - keep existing reset-password, delete-user blocker, self-delete prevention, and last-admin protections passing
- Frontend:
  - validate loading, populated, empty, and error states
  - validate tab filtering, role filtering, status filtering, search, and sorting
  - validate CSV export respects current visible filters
  - validate overflow menu still triggers reset-password and delete flows correctly
  - validate responsive layout at desktop, tablet, and mobile widths
- Regression:
  - `/admin/users` route unchanged
  - sidebar/topbar/auth/navigation unaffected
  - admin role-management and permission pages remain unchanged

## Assumptions and Defaults
- Scope is admin-only and limited to the existing `UserManagementPage`.
- “Invite” language from the reference will be translated into truthful copy such as `Pending Accounts` / `Recent Pending Accounts`.
- `Last Active` will use Sanctum token `last_used_at` as the source of truth when available.
- `Add User` is a visual shell only in this pass; no new backend workflow will be invented.
- Search, tabs, filters, sort, chart totals, and recent pending-account rail content will be computed from the fetched user list on the frontend.
- Existing reset-password and delete-user capabilities stay available, but are moved into a cleaner overflow-based action model.
