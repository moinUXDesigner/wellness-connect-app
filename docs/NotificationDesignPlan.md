# Convert persistent notice banners to auto-dismissing, type-colored toasts (app-wide)

## Context

Across the app, ~20+ pages implement the same anti-pattern to show feedback messages: local `useState('')` (or a `NoticeState {tone, text}`) holding a message string, rendered as a persistent inline `<p>`/`<div>` banner at the top of the page. These never auto-dismiss and each page hardcodes its own ad-hoc color (indigo/amber/emerald/rose/violet). The user hit this on Admin → Membership Plans ("Add at least one pricing tier before publishing.") but confirmed the fix should be app-wide, using color-coded, auto-dismissing toasts instead — and confirmed adding a missing `info` color token to match the existing success/warning/danger tokens.

Investigation found the pieces are already mostly in place, just disconnected:
- `sonner` (v2.0.3) is installed but **never used** anywhere (`toast(...)` has zero call sites in the app).
- `src/app/components/ui/sonner.tsx` is a stock shadcn `<Toaster />` wrapper, but it's **never mounted** anywhere (not in `src/app/App.tsx`, not in `src/main.tsx`), and it uses `next-themes`' `useTheme()`, which has no provider mounted in this app (the app's real dark-mode toggle is `useThemeMode()` in `src/app/features/theme/useThemeMode.ts`, driving a `.dark` class on `<html>`) — so today it would always report `"system"` and desync from the app's actual theme if it were mounted as-is.
- `src/styles/theme.css` (`@theme inline` block, line 224+) **already defines everything needed for colors**: `--info: #3B82F6` / `--info-light: #DBEAFE` (line 44-45), and semantic `--status-success(-subtle)` / `--status-warning(-subtle)` / `--status-error(-subtle)` / `--status-info(-subtle)` (lines 91-98), all re-exposed as Tailwind utilities via `--color-status-*` (lines 307-314). This means Tailwind utility classes like `bg-status-success-subtle text-status-success` **already exist and work today** — no new CSS is required, just referencing these classes from the Toaster config.
- `src/design/tokens/colors.ts` (lines 36-42) has `success`/`warning`/`danger` (+ Light variants) but no `info` — needs one added, matching `theme.css`'s existing `#3B82F6`/`#DBEAFE` values (not a new/different color) for consistency, even though actual toast styling will come from the Tailwind utilities above, not this JS object.
- Two files already have a more evolved local pattern worth using as the migration model: `UserManagementPage.tsx` (`NoticeState {tone, text}` + local `NoticeBanner` component, tones `success`/`error`/`info`) and `NotificationsPage.tsx` (same idea).
- No shared `src/app/lib/` exists; shared code lives under `src/app/features/shared/`.

## Approach

### 1. Design token (bookkeeping only)
Add to `src/design/tokens/colors.ts`, after the existing `dangerLight` entry:
```
info:      '#3B82F6',
infoLight: '#DBEAFE',
```
(Matches `theme.css`'s existing `--info`/`--info-light` — same color, not inventing a new one.)

### 2. Shared toast helper
Create `src/app/features/shared/lib/toast.ts` (new `lib/` subfolder, sibling to the existing `services/`/`components/` convention) re-exporting sonner's `toast` plus a small `toErrorMessage(error, fallback)` helper to replace the `error instanceof Error ? error.message : 'fallback'` idiom repeated at every call site today. All ~20 migrated call sites import from this one module, not from `'sonner'` directly — keeps a single swap point if the toast library ever changes.

### 3. Rework `src/app/components/ui/sonner.tsx`
- Replace `next-themes`' `useTheme()` with the app's own `useThemeMode()` (`src/app/features/theme/useThemeMode.ts`), passing the resolved `'light' | 'dark'` mode into `<Sonner theme={...}>` — fixes the dead/desynced theme wiring.
- Add `toastOptions={{ classNames: { success: 'bg-status-success-subtle text-status-success border-status-success', warning: 'bg-status-warning-subtle text-status-warning border-status-warning', error: 'bg-status-error-subtle text-status-error border-status-error', info: 'bg-status-info-subtle text-status-info border-status-info' } }}` — reuses the Tailwind utilities that already exist from `theme.css`, no new CSS needed anywhere.
- Keep the existing generic `--normal-bg/text/border` style block for untyped `toast(...)` calls.
- Toaster props: `position="top-center"` (matches where banners currently sit), `closeButton` (so longer error text can be dismissed early), `duration={5000}` default; the shared helper's `notifyError` (see below) uses a longer `duration: 8000` since error text tends to be longer/more important to read.

### 4. Mount the Toaster
In `src/app/App.tsx`, import `Toaster` from `./components/ui/sonner` and render it once, as a sibling after `<AppRoutes />`/`<PwaInstallPrompt />`, inside `<BrowserRouter>`.

### 5. Migration pattern (apply per call site)
Two existing shapes to convert:
- **Shape A** (most files): `useState('')` + inline `<p>{notice}</p>` banner with hardcoded color classes → delete the state, the JSX banner, and the color classes; replace each `setNotice('...')` with `toast.success/error/warning/info('...')` at the same point in the code, preserving the exact message text (including backend-sourced messages like the 422 "Add at least one pricing tier before publishing." — classify by **origin** (a caught error/failed request → `toast.error`, even though the text reads like guidance), not by how the text sounds.
- **Shape B** (`UserManagementPage.tsx`, `NotificationsPage.tsx`): `NoticeState {tone, text}` + local `NoticeBanner` component → delete the type, the `NoticeBanner` component, the state, and its render; map `tone: 'success'|'error'|'info'` 1:1 onto `toast.success/error/info(text)`. Remove now-pointless `setNotice(null)` "clear" calls (toasts self-dismiss).

Type heuristic: catch blocks / failed requests / "Unable to…" → `error`. Successful mutation confirmations → `success`. Non-error informational state → `info`. Soft cautions (rare in current code) → `warning`.

### 6. Rollout order (batches, not one diff)
0. **Infra** (this plan's steps 1-4) — lands first, independently verifiable (temporarily fire a manual `toast.success('test')` to confirm mount + styling + dark mode, then remove the test call).
1. `AdminModulePages.tsx` (6 occurrences — the originally reported page, validates Shape A against real backend 422 messages).
2. `UserManagementPage.tsx` + `NotificationsPage.tsx` (validates Shape B, removes the duplicated local `NoticeState`/`NoticeBanner`).
3. Remaining admin pages: `AdminEscalationsPage.tsx`, `WorkflowConfigurationPage.tsx`, `ProgramManagementPage.tsx`, `PerformanceDashboardPage.tsx`.
4. Role feature pages: helpdesk (`HelpdeskTicketsPage`), finance (`FinanceBillingPage`), trainer (`TrainerPlansPage`, `TrainerCheckinsPage`).
5. Client + profile pages: `ProfilePage`, `ClientProfilePage`, `ClientMembershipPage`, `ClientAppointmentsPage`, `ClientIntakeFlowPage`.
6. Public + auth: `PricingPage`, `SignupPage`, `ResetPasswordPage`, `ForgotPasswordPage`.

Batch 0 is a hard prerequisite; batches 1-6 are independent and can be done in any order.

## Verification
- No frontend lint/test scripts exist (per CLAUDE.md) — `npx tsc --noEmit` after each batch is the primary automated safety net, catching leftover references to removed `notice`/`setNotice`/`NoticeBanner`/`NoticeState` symbols and unused imports.
- Grep sweep after each batch for leftover `setNotice`, `NoticeBanner`, `NoticeState`, and hardcoded banner color classes in the touched files — confirm zero remain.
- Manual runtime pass per migrated page: trigger both a success and a failure path per action, confirm the toast appears top-center, auto-dismisses (~5s success / ~8s error), shows the exact preserved message text, and is manually dismissible via the close button.
- Toggle the app's dark-mode switch and confirm toasts recolor correctly (validates the `useThemeMode` rewire).
- Confirm no leftover empty container/spacing gap where each banner used to render.

### Critical files
- `src/app/App.tsx` (Toaster mount)
- `src/app/components/ui/sonner.tsx` (theme rewire + per-type classNames)
- `src/design/tokens/colors.ts` (add `info`/`infoLight`)
- `src/app/features/shared/lib/toast.ts` (new shared helper)
- `src/app/features/admin/pages/AdminModulePages.tsx`, `UserManagementPage.tsx`, `NotificationsPage.tsx` (first real migrations / reference models)
- Remaining ~14 files listed in the rollout batches above
