# Login Page Redesign to Match Attached Aura Reference

## Summary
Rebuild [`src/app/features/auth/LoginPage.tsx`](D:\WellnessConnect\src\app\features\auth\LoginPage.tsx) into a self-contained premium two-column auth screen that matches the attached reference as closely as possible on desktop, while preserving the existing `/login` route, `loginRequest` flow, redirect logic, and loader behavior.

The new page should use the attached image as the visual source of truth:
- Top-left `WellnessConnect` wordmark with `Connect. Heal. Thrive.`
- Top-right `Need help?` + headset icon + `Contact Support`
- Left auth form panel
- Right mascot/sofa illustration panel with curved dotted wellness orbit
- Bottom privacy/security bar spanning both sides
- White-to-lavender premium wellness styling with purple CTA emphasis

## Key Changes
### Layout and behavior
- Keep `/login` routed directly to `LoginPage`; do not change routing or auth guards.
- Replace the current simple centered form with a full-viewport composition that mirrors the reference:
  - outer rounded shell with subtle border and shadow
  - left white panel for form content
  - right soft-lavender panel for illustration
  - bottom trust bar visually shared across both columns
- Preserve existing submit behavior:
  - `loginRequest(email, password)`
  - `getPostAuthRedirectPath(user)`
  - `AuthActionLoader` during submit
  - inline error notice area for failed login
- Remove the visible prefilled demo credentials and use empty fields with the reference placeholders.
- Add local UI state for:
  - password visibility toggle
  - remember-me checkbox
  - Google button notice message
- Keep the remember-me checkbox presentational only for this pass; do not change storage or API behavior because current auth always persists via `setAuthState(...)`.
- Make the Google button visually match the reference and, on click, show a safe inline “Google sign-in coming soon” notice without breaking the page.

### Brand and assets
- Use the supplied wellness icon resource from `Counselling_App_Images\AuraConnect\Aura Connect Logo 3.png`, copied into bundled app assets under `src/assets/brand/`.
- Match the attached reference header text exactly:
  - `WellnessConnect`
  - `Connect. Heal. Thrive.`
- Do not use the `Aura Wellness Connect Title` wordmark on this page.
- Add bundled illustration assets under `src/assets/auth/` so the page does not depend on external workspace paths at runtime.
- Build the right-side hero as a reusable vector scene:
  - reuse the existing layered heart mascot source from `Counselling_App_Images\Clinet Flow\Home Login\aura_heart_mascot_layered_production.svg`
  - compose a new hero scene SVG around it with sofa/chair, laptop, side table, mug, left plant, right plant, clouds/leaves, and soft floor shadow
  - create the three orbit icon cards as discrete vector assets or inline SVG fragments: `Body`, `Mind`, `Balance`
  - draw the dotted purple semi-circle arc so `Body` is left, `Mind` is top-center, and `Balance` is right on the same curve
- Use lucide icons where appropriate for UI chrome:
  - `Headphones`, `Mail`, `Lock`, `Eye`, `EyeOff`, `ArrowRight`, `Shield`, `LockKeyhole` or closest equivalent

### Styling implementation
- Implement the page with Tailwind utilities in the login component; avoid broad global theme rewrites.
- Match the reference palette and proportions:
  - purple CTA gradient around `#5B2DFF`
  - deep navy text around `#090B3F`
  - muted secondary text around `#4B5A8A`
  - lavender panel/background around `#F5F2FF` / `#F8F6FF`
  - soft borders around `#DCD7F5`
- Match reference spacing:
  - generous left padding and content max-width
  - large `Welcome back!` headline
  - tall rounded inputs and primary button
  - centered `OR` divider
  - full-width Google button
  - full-width bottom security bar with center divider
- Responsive behavior:
  - desktop: two-column split closely matching the reference
  - tablet: compressed two-column or stacked layout with trust bar preserved
  - mobile: header at top, centered form, hero moved below or softened/partially hidden, no horizontal overflow, full-width controls

## Public Interfaces / Contract Notes
- No route changes.
- No auth API changes.
- No `loginRequest`, redirect, or local auth-state contract changes.
- New UI-only state inside `LoginPage`:
  - `showPassword`
  - `rememberMe`
  - `googleNotice`
- New static bundled assets under `src/assets/brand/` and `src/assets/auth/`.

## Test Plan
- Build verification:
  - `npm run build` succeeds with no TypeScript/Vite errors
- Functional checks:
  - valid login still authenticates and redirects by role
  - failed login still shows inline error
  - loader still appears during login
  - forgot-password link still navigates to `/forgot-password`
  - top-right support link opens `/contact`
  - Google button shows the non-breaking coming-soon notice
  - password show/hide toggle works
- Visual checks against the attached reference:
  - header placement and brand lockup match
  - form spacing, labels, button size, and divider match
  - right illustration composition and mood match
  - orbit icons follow the dotted half-circle correctly
  - bottom trust bar matches the reference layout
- Responsive checks:
  - no horizontal scrolling at mobile widths
  - inputs/buttons remain full width
  - trust bar stacks cleanly on smaller screens
  - mascot panel does not crowd the form on tablet/mobile

## Assumptions and Defaults
- The attached image is the final visual source of truth for this screen.
- The page will render `WellnessConnect` text, not the `Aura Wellness Connect` title asset.
- The supplied logo icon resource will be bundled into app assets rather than referenced from its original workspace path.
- The mascot/scene will be implemented as bundled SVG/vector art for editability and lightweight delivery.
- The remember-me checkbox will not change persistence semantics in this pass.
- Google sign-in is intentionally visual-only for now and will surface a safe inline notice on click.
