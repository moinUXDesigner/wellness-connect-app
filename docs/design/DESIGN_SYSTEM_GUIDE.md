# Wellness Connect Design System

**Version:** 1.0  
**Brand:** Wellness Connect  
**Tagline:** Mind. Body. Better Together.  
**Platform:** Mobile-first Web Application

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Brand Identity](#brand-identity)
3. [Design Tokens](#design-tokens)
4. [Components Library](#components-library)
5. [Usage Guidelines](#usage-guidelines)
6. [File Structure](#file-structure)

---

## Overview

This is a comprehensive design system for **Wellness Connect**, a premium wellness application combining counselling psychology, gym/personal training, appointment booking, progress tracking, and help desk support.

The design system follows a **mobile-first** approach with a calm, trustworthy, and motivating aesthetic.

---

## Brand Identity

### Brand Personality
- Calm
- Trustworthy
- Motivating
- Professional
- Human
- Premium
- Supportive

### Visual Style
- Clean modern wellness aesthetic
- Soft pastel backgrounds
- White cards with shadows
- Gentle gradients
- Rounded corners (4px, 6px, 8px, 12px)
- Spacious layouts
- Calm emotional feel
- Premium mobile app quality
- Accessible contrast
- Soft shadows

### Typography
- **Font Family:** Inter (imported from Google Fonts)
- **Weights:** 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

---

## Design Tokens

All design tokens are defined in `/src/styles/theme.css` as CSS variables.

### Color System

#### Primary Colors
```css
--primary: #5B4CFF
--primary-dark: #4A3DE8
--primary-light: #E8E6FF
--primary-foreground: #ffffff
```

#### Secondary Colors
```css
--secondary: #00D9D5
--secondary-dark: #00C4C0
--secondary-light: #E0F9F8
--secondary-foreground: #ffffff
```

#### Accent Colors
```css
--purple: #8B5CF6
--purple-light: #EDE9FE
--teal: #14B8A6
--teal-light: #CCFBF1
```

#### Semantic Colors
```css
--success: #10B981
--success-light: #D1FAE5
--warning: #F59E0B
--warning-light: #FEF3C7
--error: #EF4444
--error-light: #FEE2E2
--info: #3B82F6
--info-light: #DBEAFE
```

#### Neutrals
```css
--neutral-900: #111827
--neutral-800: #1F2937
--neutral-700: #374151
--neutral-600: #4B5563
--neutral-500: #6B7280
--neutral-400: #9CA3AF
--neutral-300: #D1D5DB
--neutral-200: #E5E7EB
--neutral-100: #F3F4F6
--neutral-50: #F9FAFB
```

### Typography Scale
```css
--text-xs: 0.75rem    /* 12px */
--text-sm: 0.875rem   /* 14px */
--text-base: 1rem     /* 16px */
--text-lg: 1.125rem   /* 18px */
--text-xl: 1.25rem    /* 20px */
--text-2xl: 1.5rem    /* 24px */
--text-3xl: 1.75rem   /* 28px */
--text-4xl: 2rem      /* 32px */
```

### Spacing Scale
```css
--spacing-1: 0.25rem   /* 4px */
--spacing-2: 0.5rem    /* 8px */
--spacing-3: 0.75rem   /* 12px */
--spacing-4: 1rem      /* 16px */
--spacing-6: 1.5rem    /* 24px */
--spacing-8: 2rem      /* 32px */
--spacing-10: 2.5rem   /* 40px */
--spacing-12: 3rem     /* 48px */
--spacing-16: 4rem     /* 64px */
```

### Border Radius
```css
--radius-sm: 0.25rem   /* 4px */
--radius-md: 0.375rem  /* 6px */
--radius-lg: 0.5rem    /* 8px */
--radius-xl: 0.75rem   /* 12px */
--radius-full: 9999px
```

### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
--shadow-card: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)
--shadow-modal: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)
--shadow-floating: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)
```

---

## Components Library

All components are located in `/src/app/components/`.

### Button Component
**Location:** `/src/app/components/Button.tsx`

**Variants:**
- `primary` - Primary brand color
- `secondary` - Secondary brand color
- `outline` - Outlined with border
- `ghost` - Transparent background
- `danger` - Error/destructive actions

**Sizes:**
- `sm` - Small (height: 36px)
- `md` - Medium (height: 44px) [default]
- `lg` - Large (height: 56px)

**Props:**
- `variant` - Button style variant
- `size` - Button size
- `isLoading` - Shows loading spinner
- `fullWidth` - Takes full width of container
- All standard HTML button attributes

**Example:**
```tsx
import { Button } from './components/Button';

<Button variant="primary" size="md">Click Me</Button>
<Button variant="outline" isLoading>Loading...</Button>
<Button variant="secondary" fullWidth>Full Width</Button>
```

---

### Input Component
**Location:** `/src/app/components/Input.tsx`

**Props:**
- `label` - Input label text
- `error` - Error message (also applies error styling)
- `helperText` - Helper text below input
- `leftIcon` - Icon on the left side
- `rightIcon` - Icon on the right side
- `fullWidth` - Takes full width
- All standard HTML input attributes

**Example:**
```tsx
import { Input } from './components/Input';

<Input 
  label="Email" 
  placeholder="Enter your email"
  fullWidth 
/>
<Input 
  label="Password" 
  type="password"
  error="Password is required"
/>
```

---

### Card Component
**Location:** `/src/app/components/Card.tsx`

**Variants:**
- `default` - White background with border
- `bordered` - White background with thicker border
- `elevated` - White background with shadow

**Padding:**
- `none` - No padding
- `sm` - Small padding (12px)
- `md` - Medium padding (16px) [default]
- `lg` - Large padding (24px)

**Example:**
```tsx
import { Card } from './components/Card';

<Card variant="elevated" padding="lg">
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>
```

---

### Badge Component
**Location:** `/src/app/components/Badge.tsx`

**Variants:**
- `primary`, `secondary`, `success`, `warning`, `error`, `info`, `neutral`

**Sizes:**
- `sm` - Small
- `md` - Medium [default]

**Example:**
```tsx
import { Badge } from './components/Badge';

<Badge variant="success">Active</Badge>
<Badge variant="warning" size="sm">Pending</Badge>
```

---

### Checkbox Component
**Location:** `/src/app/components/Checkbox.tsx`

**Props:**
- `label` - Checkbox label text
- All standard HTML input (checkbox) attributes

**Example:**
```tsx
import { Checkbox } from './components/Checkbox';

<Checkbox label="I agree to terms and conditions" />
<Checkbox label="Remember me" defaultChecked />
```

---

### Toggle Component
**Location:** `/src/app/components/Toggle.tsx`

**Props:**
- `label` - Toggle label text
- All standard HTML input (checkbox) attributes

**Example:**
```tsx
import { Toggle } from './components/Toggle';

<Toggle label="Enable notifications" />
<Toggle label="Dark mode" defaultChecked />
```

---

### BottomNav Component
**Location:** `/src/app/components/BottomNav.tsx`

**Props:**
- `items` - Array of navigation items
  - `id` - Unique identifier
  - `label` - Display label
  - `icon` - Icon (ReactNode)
  - `onClick` - Click handler
- `activeId` - Currently active item ID

**Example:**
```tsx
import { BottomNav } from './components/BottomNav';

const navItems = [
  { id: 'home', label: 'Home', icon: '🏠', onClick: () => {} },
  { id: 'profile', label: 'Profile', icon: '👤', onClick: () => {} },
];

<BottomNav items={navItems} activeId="home" />
```

---

### Tabs Component
**Location:** `/src/app/components/Tabs.tsx`

**Props:**
- `items` - Array of tab items
  - `id` - Unique identifier
  - `label` - Tab label
  - `content` - Tab content (ReactNode)
- `defaultTabId` - Initially active tab
- `variant` - `'default'` or `'pills'`

**Example:**
```tsx
import { Tabs } from './components/Tabs';

<Tabs
  items={[
    { id: 'tab1', label: 'Overview', content: <div>Overview</div> },
    { id: 'tab2', label: 'Details', content: <div>Details</div> },
  ]}
  variant="pills"
/>
```

---

### StatCard Component
**Location:** `/src/app/components/StatCard.tsx`

**Props:**
- `title` - Stat title
- `value` - Stat value (string or number)
- `icon` - Icon (ReactNode)
- `trend` - Optional trend indicator
  - `value` - Trend value (e.g., "12%")
  - `direction` - 'up' or 'down'
- `color` - Card color theme

**Example:**
```tsx
import { StatCard } from './components/StatCard';

<StatCard
  title="Total Sessions"
  value="24"
  icon="📅"
  color="primary"
  trend={{ value: '12%', direction: 'up' }}
/>
```

---

### Avatar Component
**Location:** `/src/app/components/Avatar.tsx`

**Props:**
- `name` - User name (shows initials if no image)
- `src` - Image source URL
- `size` - 'sm', 'md', 'lg', 'xl'
- `showBadge` - Show status badge
- `badgeColor` - 'success', 'warning', 'error'

**Example:**
```tsx
import { Avatar } from './components/Avatar';

<Avatar name="John Doe" size="md" showBadge />
<Avatar src="/avatar.jpg" size="lg" />
```

---

### ProgressBar Component
**Location:** `/src/app/components/ProgressBar.tsx`

**Props:**
- `value` - Current value
- `max` - Maximum value (default: 100)
- `color` - Bar color
- `size` - 'sm', 'md', 'lg'
- `showLabel` - Show percentage label

**Example:**
```tsx
import { ProgressBar } from './components/ProgressBar';

<ProgressBar value={75} color="success" showLabel />
```

---

### Alert Component
**Location:** `/src/app/components/Alert.tsx`

**Props:**
- `variant` - 'success', 'warning', 'error', 'info'
- `title` - Alert title
- `icon` - Custom icon
- `onClose` - Close handler (shows X button)
- `children` - Alert content

**Example:**
```tsx
import { Alert } from './components/Alert';

<Alert variant="success" title="Success!">
  Your changes have been saved.
</Alert>
```

---

### ListItem Component
**Location:** `/src/app/components/ListItem.tsx`

**Props:**
- `title` - Item title
- `subtitle` - Item subtitle
- `leftContent` - Content on the left (e.g., Avatar)
- `rightContent` - Content on the right (e.g., Badge)
- `onClick` - Click handler (makes item clickable)

**Example:**
```tsx
import { ListItem } from './components/ListItem';
import { Avatar } from './components/Avatar';
import { Badge } from './components/Badge';

<ListItem
  title="Dr. Sarah Johnson"
  subtitle="Counselling Session"
  leftContent={<Avatar name="Sarah Johnson" />}
  rightContent={<Badge variant="success">Confirmed</Badge>}
  onClick={() => {}}
/>
```

---

### SearchInput Component
**Location:** `/src/app/components/SearchInput.tsx`

**Props:**
- `onClear` - Clear button click handler
- `value` - Input value
- All standard HTML input attributes

**Example:**
```tsx
import { SearchInput } from './components/SearchInput';

<SearchInput
  placeholder="Search..."
  value={searchValue}
  onChange={(e) => setSearchValue(e.target.value)}
  onClear={() => setSearchValue('')}
/>
```

---

## Usage Guidelines

### Color Usage

- **Primary (`#5B4CFF`)**: Main CTAs, important buttons, active states, focus indicators
- **Secondary (`#00D9D5`)**: Secondary actions, accents, highlights
- **Success (`#10B981`)**: Success messages, completed states, positive trends
- **Warning (`#F59E0B`)**: Warnings, pending states, caution indicators
- **Error (`#EF4444`)**: Error messages, destructive actions, negative trends
- **Info (`#3B82F6`)**: Informational messages, neutral highlights

### Typography Usage

- **Heading 1 (32px Bold)**: Page titles, main headings
- **Heading 2 (24px Semibold)**: Section headings
- **Heading 3 (20px Semibold)**: Subsection headings, card titles
- **Body (16px Regular)**: Body text, descriptions
- **Small (14px Regular)**: Secondary text, captions, labels
- **Extra Small (12px Regular)**: Metadata, timestamps, helper text

### Spacing Guidelines

Use the spacing scale consistently:
- **4px**: Tight spacing within components
- **8px**: Default gap between related elements
- **12px**: Small padding/margin
- **16px**: Standard padding/margin
- **24px**: Large spacing between sections
- **32px+**: Major layout spacing

### Accessibility

- All color combinations meet WCAG AA contrast requirements
- Focus states are clearly visible
- Interactive elements have minimum touch target of 44x44px
- Form inputs have associated labels
- Error messages are descriptive

---

## File Structure

```
/src
  /app
    /components
      Alert.tsx
      Avatar.tsx
      Badge.tsx
      BottomNav.tsx
      Button.tsx
      Card.tsx
      Checkbox.tsx
      Input.tsx
      ListItem.tsx
      ProgressBar.tsx
      SearchInput.tsx
      StatCard.tsx
      Tabs.tsx
      Toggle.tsx
    App.tsx
  /styles
    fonts.css
    theme.css
```

---

## Getting Started for CODEX

1. **Import components** from `/src/app/components/`
2. **Use design tokens** via Tailwind classes (e.g., `bg-primary`, `text-neutral-700`)
3. **Follow mobile-first** approach (375px base, scale up to tablet/desktop)
4. **Maintain consistency** with color usage, spacing, and typography
5. **Reference the showcase** (`App.tsx`) for implementation examples

---

## Notes for Implementation

- All components use **React + TypeScript**
- Styling via **Tailwind CSS v4**
- Components are **fully typed** with TypeScript interfaces
- Components support **all standard HTML attributes** via spread props
- Components use **forwardRef** for ref forwarding where applicable
- All components are **accessible** with proper ARIA attributes

---

**For questions or component requests, refer to the live design system showcase at `/src/app/App.tsx`**
