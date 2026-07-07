# Wellness Connect Layout Guidelines

## Purpose

The layout system makes screen composition predictable across member, expert, support, and admin workflows. Use these primitives before creating page-specific spacing or grid rules.

## Breakpoints

| Range | Target | Pattern |
| --- | --- | --- |
| Base | 375px mobile | Single column, bottom navigation |
| `md` | 768px tablet | Wider content, two-column cards where helpful |
| `lg` | Desktop | Sidebar plus topbar or wide content grids |
| `xl` | 1440px desktop | Dense dashboards and multi-column operational views |

## Public Layout Components

| Component | Purpose |
| --- | --- |
| `AppShell` | Standard page frame with optional topbar, sidebar, and bottom nav |
| `ContentContainer` | Consistent page gutters and max-width control |
| `PageHeader` | Page title, description, eyebrow, and actions |
| `SectionHeader` | Section title, description, and actions |
| `Stack` | Vertical rhythm primitive |
| `Cluster` | Wrapping horizontal layout primitive |
| `ResponsiveGrid` | Token-aligned responsive grid |
| `Topbar` | Desktop/tablet header navigation region |
| `Sidebar` | Desktop navigation rail with active state |

## Recommended Patterns

### Mobile Member Views

- Use `AppShell` with `bottomNav`.
- Use `ContentContainer size="md"`.
- Use single-column `Stack` and `ResponsiveGrid columns={1}`.
- Keep primary actions close to the related card or section.

### Desktop Operational Views

- Use `AppShell` with `topbar` and `sidebar`.
- Use `ContentContainer size="xl"`.
- Use `ResponsiveGrid columns={3}` or `columns={4}` for dashboard summaries.
- Use `SectionHeader` to separate dense operational sections.

### Sensitive Wellness Moments

- Prefer `ContentContainer size="sm"` or `size="md"`.
- Keep text line lengths short.
- Avoid dense multi-column layouts for counselling notes, mood check-ins, and support content.

## Rules

- Do not create page-specific max-widths unless a layout primitive cannot support the use case.
- Do not nest cards inside cards for page structure.
- Use `Stack` for vertical spacing and `Cluster` for wrapping action rows.
- Use `PageHeader` once per page and `SectionHeader` for major sections.
- Keep mobile navigation and desktop navigation behavior consistent across product areas.

