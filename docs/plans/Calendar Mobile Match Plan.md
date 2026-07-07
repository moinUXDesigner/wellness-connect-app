# Calendar Mobile Match Plan

## Summary
Refine the Client Calendar mobile view at 375px width to match the expected iPhone 12 Mini screenshot, while preserving the existing desktop calendar and event-list layout. The change should be limited to mobile responsive styling and mobile-only calendar behavior.

## Key Changes
- In `ClientAppointmentsPage.tsx`, add mobile-specific spacing and sizing for the calendar-focused layout:
  - Reduce page wrapper gaps and tune mobile bottom padding so the calendar card ends above the fixed bottom nav.
  - Set mobile title to the expected scale, weight, top spacing, and left alignment.
  - Force the subtitle into the expected two-line wrap by using the current sentence with a mobile max width and line height.
- Adjust the mobile calendar card only:
  - Match expected card width, radius, border, white background, and subtle shadow.
  - Use a centered `May 2026` title with only previous/next arrow buttons visible on mobile.
  - Hide the extra “jump to selected schedule” calendar-icon button on mobile.
  - Tighten weekday and date-grid spacing to match the expected card proportions.
  - Keep date `13` selected with a purple circular button and white text.
  - On mobile, show event dots only under selected date `13`, with exactly purple, blue, and green dots; do not render scattered dots on other dates.
  - Keep previous/next month dates light gray.
  - Keep legend labels exactly: `Session`, `Training`, `Nutrition`, `Mindfulness`, with the fourth item centered/wrapped below on mobile.
- Ensure the event-list section remains hidden on mobile:
  - No `Events for today`, `Upcoming for this week`, selected-date details, or event cards below the calendar at 375px.
  - Preserve the existing larger-screen event list behavior.
- Tune shared mobile shell components:
  - In `Topbar.tsx`, adjust mobile-only button dimensions, padding, border radius, border color, and shadow to match the expected top app bar without changing desktop.
  - In `BottomNav.tsx`, tune mobile height, icon size, label size, active Calendar background, and muted inactive color.
  - Keep visible mobile items as `Home`, `Book A...`, `Calendar`, `Progress`, `Menu`.

## Public Interfaces
- No API, route, data model, or permission changes.
- No new components required.
- Existing appointment fetching stays intact; only mobile rendering of calendar dots changes.

## Test Plan
- Run `npm run build` in `wellness-connect-app`.
- Start the Vite dev server and visually verify `/client/appointments` at 375px width.
- Confirm at 375px:
  - Header buttons align like the expected image.
  - Subtitle wraps into the two expected lines.
  - Calendar card size, date grid, selected date, dots, and legend match the target.
  - Event cards are not visible.
  - Bottom nav is fixed, Calendar is active, and content does not overlap it.
- Spot-check desktop width to confirm the event list and existing desktop layout still render.

## Assumptions
- The expected image is the source of truth for mobile only.
- Desktop behavior should remain functionally unchanged.
- Mobile calendar dots should intentionally be presentation-specific for this screen: only the selected date shows the three expected dots, regardless of additional appointment data.
