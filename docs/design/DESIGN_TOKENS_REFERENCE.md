# Wellness Connect - Design Tokens Quick Reference

## Colors (Use with Tailwind)

### Primary
- `bg-primary` / `text-primary` → #5B4CFF
- `bg-primary-dark` / `text-primary-dark` → #4A3DE8
- `bg-primary-light` / `text-primary-light` → #E8E6FF

### Secondary
- `bg-secondary` / `text-secondary` → #00D9D5
- `bg-secondary-dark` / `text-secondary-dark` → #00C4C0
- `bg-secondary-light` / `text-secondary-light` → #E0F9F8

### Accents
- `bg-purple` / `text-purple` → #8B5CF6
- `bg-purple-light` / `text-purple-light` → #EDE9FE
- `bg-teal` / `text-teal` → #14B8A6
- `bg-teal-light` / `text-teal-light` → #CCFBF1

### Semantic
- `bg-success` / `text-success` → #10B981
- `bg-warning` / `text-warning` → #F59E0B
- `bg-error` / `text-error` → #EF4444
- `bg-info` / `text-info` → #3B82F6

### Neutrals
- `bg-neutral-900` / `text-neutral-900` → #111827
- `bg-neutral-700` / `text-neutral-700` → #374151
- `bg-neutral-500` / `text-neutral-500` → #6B7280
- `bg-neutral-300` / `text-neutral-300` → #D1D5DB
- `bg-neutral-100` / `text-neutral-100` → #F3F4F6
- `bg-neutral-50` / `text-neutral-50` → #F9FAFB

## Spacing (Tailwind)

- `gap-1` / `p-1` / `m-1` → 4px
- `gap-2` / `p-2` / `m-2` → 8px
- `gap-3` / `p-3` / `m-3` → 12px
- `gap-4` / `p-4` / `m-4` → 16px
- `gap-6` / `p-6` / `m-6` → 24px
- `gap-8` / `p-8` / `m-8` → 32px

## Border Radius

- `rounded` → 4px
- `rounded-md` → 6px
- `rounded-lg` → 8px
- `rounded-xl` → 12px
- `rounded-full` → Full circle

## Shadows

- `shadow-sm` → Small shadow
- `shadow-card` → Card shadow
- `shadow-modal` → Modal shadow
- `shadow-floating` → Floating shadow

## Typography Sizes

- `text-xs` → 12px
- `text-sm` → 14px
- `text-base` → 16px
- `text-lg` → 18px
- `text-xl` → 20px
- `text-2xl` → 24px
- `text-3xl` → 28px
- `text-4xl` → 32px

## Font Weights

- `font-normal` → 400
- `font-medium` → 500
- `font-semibold` → 600
- `font-bold` → 700

## Common Component Patterns

### Button
```tsx
<Button variant="primary" size="md">Click Me</Button>
```

### Input
```tsx
<Input label="Email" placeholder="you@example.com" fullWidth />
```

### Card
```tsx
<Card variant="elevated" padding="lg">Content</Card>
```

### Badge
```tsx
<Badge variant="success">Active</Badge>
```

### Alert
```tsx
<Alert variant="success" title="Success!">Message</Alert>
```

### Avatar
```tsx
<Avatar name="John Doe" size="md" showBadge />
```

### Progress
```tsx
<ProgressBar value={75} color="success" showLabel />
```

## Component Import

```tsx
// Individual imports
import { Button } from './components/Button';
import { Card } from './components/Card';

// Or use index export
import { Button, Card, Badge } from './components';
```

## Color Usage Rules

- **Primary**: Main CTAs, active states
- **Secondary**: Secondary actions, accents
- **Success**: Positive states, completions
- **Warning**: Cautions, pending states
- **Error**: Errors, destructive actions
- **Info**: Neutral information
- **Neutral**: Text, backgrounds, borders

## Semantic Token Usage

Prefer semantic tokens in product components:

- `bg-surface-default` for app backgrounds
- `bg-surface-elevated` for cards, sheets, and popovers
- `text-text-primary` for primary text
- `text-text-secondary` for supporting text
- `border-border-default` for normal borders
- `ring-focus-ring` for keyboard focus
- `bg-action-primary` for primary actions
- `bg-status-success-subtle` with `text-status-success` for success feedback

Raw palette tokens such as `bg-primary` and `text-neutral-900` are still available, but they should mostly be used in token documentation, visual examples, or low-level system code.

## Mobile-First Breakpoints

- Base: 375px (mobile)
- Tablet: 768px
- Desktop: 1440px

Use Tailwind responsive prefixes: `md:`, `lg:`, `xl:`
