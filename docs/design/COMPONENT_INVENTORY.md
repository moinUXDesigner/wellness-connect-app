# Wellness Connect Component Inventory

> Public inventory for the Wellness Connect design-system API.

## Summary

| Category | Count |
| --- | ---: |
| Core components | 14 |
| Layout components | 9 |
| Public components total | 23 |

## Component Maturity

| Component | Status | Notes |
| --- | --- | --- |
| Button | Beta | Variants, loading state, focus-visible state |
| Input | Beta | Label, helper, error, `aria-describedby`, and invalid state wiring |
| Checkbox | Beta | Native input with custom visual state |
| Toggle | Beta | Native checkbox with switch semantics |
| SearchInput | Beta | Search input with accessible clear action |
| Card | Beta | Tokenized container primitive |
| Badge | Beta | Semantic variants available |
| Avatar | Draft | Needs fallback image error behavior and status label guidance |
| StatCard | Draft | Product-specific pattern; needs responsive and content rules |
| ListItem | Beta | Keyboard activation for clickable rows |
| ProgressBar | Beta | Progressbar semantics and safe max handling |
| BottomNav | Beta | Mobile navigation landmark and active state |
| Tabs | Beta | Tab semantics with arrow, Home, and End keyboard support |
| Alert | Beta | Status and alert roles |
| AppShell | Beta | Responsive app frame with optional topbar, sidebar, and bottom nav |
| ContentContainer | Beta | Standard gutters and max-widths |
| PageHeader | Beta | Page title, description, eyebrow, and actions |
| SectionHeader | Beta | Section title, description, and actions |
| Stack | Beta | Vertical rhythm primitive |
| Cluster | Beta | Wrapping horizontal layout primitive |
| ResponsiveGrid | Beta | Responsive grid primitive |
| Topbar | Beta | Header navigation region |
| Sidebar | Beta | Desktop navigation rail |

## Core Components

### Form Controls

| Component | Purpose | Key variants or props |
| --- | --- | --- |
| Button | Primary action button | `primary`, `secondary`, `outline`, `ghost`, `danger`; `sm`, `md`, `lg`; loading |
| Input | Text input field | label, helper text, error, icons, full width |
| Checkbox | Checkbox selection | label, native input props |
| Toggle | Switch-style binary setting | label, native input props |
| SearchInput | Search field | clear action, native input props |

### Data Display

| Component | Purpose | Key variants or props |
| --- | --- | --- |
| Card | Container card | `default`, `bordered`, `elevated`; padding scale |
| Badge | Status badge | primary, secondary, success, warning, error, info, neutral |
| Avatar | User avatar | sizes, initials fallback, badge indicator |
| StatCard | Statistics display | icon, trend, color |
| ListItem | List row | left/right content, clickable row |
| ProgressBar | Progress indicator | color, size, label |

### Navigation And Feedback

| Component | Purpose | Key variants or props |
| --- | --- | --- |
| BottomNav | Mobile navigation | items, active item |
| Tabs | Tabbed interface | default, pills |
| Alert | Feedback message | success, warning, error, info |

## Layout Components

| Component | Purpose |
| --- | --- |
| AppShell | Standard application frame |
| ContentContainer | Page gutter and width control |
| PageHeader | Page-level title and actions |
| SectionHeader | Section-level title and actions |
| Stack | Vertical spacing primitive |
| Cluster | Wrapping horizontal spacing primitive |
| ResponsiveGrid | Responsive card/grid layout |
| Topbar | Header navigation |
| Sidebar | Desktop navigation rail |

## Public Import

```tsx
import {
  AppShell,
  Button,
  Card,
  ContentContainer,
  PageHeader,
  ResponsiveGrid,
} from './components';
```

## Known Gaps

- No Storybook or component-state gallery yet.
- No automated unit, accessibility, or visual regression tests yet.
- `Avatar` needs image failure handling.
- Domain components are not implemented yet.
- Figma component/variable mapping is not implemented yet.
- Generated `ui/` primitives need a formal public/internal boundary.

## Version

Design system version: `1.2.0`
