# CODEX Handoff Instructions

> **Complete guide for building Wellness Connect application screens using this design system**

---

## 🎯 Overview

You now have a mobile-first design-system foundation for **Wellness Connect**. This document provides instructions on how to use these components to build the full application.

---

## 📚 Documentation Files

Before starting, familiarize yourself with these files:

1. **README.md** - Project overview and quick start
2. **DESIGN_SYSTEM_GUIDE.md** - Complete component API documentation
3. **DESIGN_TOKENS_REFERENCE.md** - Quick reference for colors, spacing, etc.
4. **COMPONENT_INVENTORY.md** - List of all 14 components with props
5. **App.tsx** - Live showcase of all components (currently running)

---

## 🏗️ Application Screens to Build

Based on the original requirements (`wellness-connect-design-system.md`), here are the screens to implement:

### 1. Public / First Visit Screens

#### A. Welcome Landing Page
**File:** `src/app/pages/Landing.tsx`

**Required Elements:**
- Hero section with brand message: "Your safe space for a stronger mind and healthier body"
- Service cards highlighting:
  - 🧠 Counselling
  - 💪 Personal Training
  - 📅 Appointments
  - 📊 Progress Tracking
  - 💬 Support
- Two CTAs: "Create Account" and "Log In"

**Components to Use:**
```tsx
- Button (primary variant for CTAs)
- Card (for service highlights)
- Badge (for service tags)
```

**Design Tokens:**
```tsx
bg-neutral-50 (background)
bg-primary (CTAs)
shadow-card (service cards)
```

---

#### B. Login Screen
**File:** `src/app/pages/Login.tsx`

**Required Elements:**
- Email input
- Password input
- "Remember me" checkbox
- Login button
- "Forgot password?" link
- "Create account" link

**Components to Use:**
```tsx
<Card variant="elevated" padding="lg">
  <Input label="Email" type="email" fullWidth />
  <Input label="Password" type="password" fullWidth />
  <Checkbox label="Remember me" />
  <Button variant="primary" fullWidth>Log In</Button>
</Card>
```

---

#### C. Signup Screen
**File:** `src/app/pages/Signup.tsx`

**Required Fields:**
- Name
- Email
- Phone
- Password
- Interest selection (Counselling / Training / Both)

**Components to Use:**
```tsx
<Input label="Name" fullWidth />
<Input label="Email" type="email" fullWidth />
<Input label="Phone" type="tel" fullWidth />
<Input label="Password" type="password" fullWidth />
<Checkbox label="Counselling" />
<Checkbox label="Training" />
<Button variant="primary" fullWidth>Create Account</Button>
```

---

### 2. Client App Screens

#### A. Client Dashboard
**File:** `src/app/pages/client/Dashboard.tsx`

**Required Elements:**
- Greeting (e.g., "Good morning, Sarah")
- Mood check-in widget
- Upcoming counselling session card
- Upcoming gym session card
- Quick actions (Book appointment, View progress)
- Progress summary stats

**Components to Use:**
```tsx
// Greeting
<h1>Good morning, Sarah</h1>

// Mood Check-in
<Card variant="elevated">
  <h3>How are you feeling today?</h3>
  {/* Mood selector buttons */}
</Card>

// Upcoming Session
<Card variant="elevated">
  <ListItem
    title="Dr. Emily Chen - Counselling"
    subtitle="Today at 2:00 PM"
    leftContent={<Avatar name="Dr. Emily Chen" showBadge />}
    rightContent={<Badge variant="success">Confirmed</Badge>}
  />
  <Button variant="primary" size="sm">Join Session</Button>
</Card>

// Stats
<div className="grid grid-cols-2 gap-4">
  <StatCard title="Sessions" value="24" icon="📅" color="primary" />
  <StatCard title="Streak" value="15" icon="🔥" color="warning" />
</div>
```

**Bottom Navigation:**
```tsx
<BottomNav
  items={[
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'sessions', label: 'Sessions', icon: '📅' },
    { id: 'progress', label: 'Progress', icon: '📊' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ]}
  activeId="home"
/>
```

---

#### B. Appointment Booking
**File:** `src/app/pages/client/Booking.tsx`

**Required Elements:**
- Service type selector (Counselling / Training)
- Expert list with avatars
- Calendar picker
- Time slot selector
- Booking confirmation

**Components to Use:**
```tsx
<Tabs
  items={[
    { id: 'counselling', label: 'Counselling', content: <ExpertList /> },
    { id: 'training', label: 'Training', content: <TrainerList /> },
  ]}
  variant="pills"
/>

// Expert List Item
<ListItem
  title="Dr. Sarah Johnson"
  subtitle="Clinical Psychologist • 10+ years"
  leftContent={<Avatar name="Dr. Sarah Johnson" size="lg" showBadge />}
  rightContent={<Badge variant="success">Available</Badge>}
  onClick={() => {}}
/>

<Button variant="primary" fullWidth>Book Appointment</Button>
```

---

#### C. Progress Screen
**File:** `src/app/pages/client/Progress.tsx`

**Required Elements:**
- Weekly goal progress
- Session history
- Wellness score
- Trends and insights

**Components to Use:**
```tsx
// Weekly Goals
<Card variant="elevated">
  <h3>Weekly Goals</h3>
  <div className="space-y-4">
    <div>
      <div className="flex justify-between mb-2">
        <span>Meditation</span>
        <span>5/7 days</span>
      </div>
      <ProgressBar value={71} color="purple" showLabel />
    </div>
    {/* More goals */}
  </div>
</Card>

// Wellness Score
<StatCard
  title="Wellness Score"
  value="87"
  icon="💪"
  color="secondary"
  trend={{ value: '5%', direction: 'up' }}
/>
```

---

#### D. Profile Screen
**File:** `src/app/pages/client/Profile.tsx`

**Required Elements:**
- User avatar and info
- Settings toggles
- Subscription info
- Logout button

**Components to Use:**
```tsx
<Card variant="elevated">
  <div className="flex items-center gap-4">
    <Avatar name="Sarah Johnson" size="xl" />
    <div>
      <h3>Sarah Johnson</h3>
      <p className="text-neutral-600">sarah@example.com</p>
    </div>
  </div>
</Card>

<Card variant="elevated">
  <Toggle label="Push notifications" defaultChecked />
  <Toggle label="Email updates" />
  <Toggle label="Dark mode" />
</Card>

<Button variant="danger" fullWidth>Log Out</Button>
```

---

### 3. Counsellor Dashboard
**File:** `src/app/pages/counsellor/Dashboard.tsx`

**Required Elements:**
- Today's sessions list
- Client list
- Notes section
- Progress insights
- Follow-ups
- Messages

**Components to Use:**
```tsx
// Today's Sessions
<Card variant="elevated">
  <h3>Today's Sessions</h3>
  <ListItem
    title="Sarah Johnson"
    subtitle="2:00 PM - Initial Consultation"
    leftContent={<Avatar name="Sarah Johnson" showBadge />}
    rightContent={<Badge variant="info">In 2 hours</Badge>}
  />
  {/* More sessions */}
</Card>

// Client List
<SearchInput placeholder="Search clients..." />
<Card variant="elevated" padding="none">
  <ListItem
    title="Sarah Johnson"
    subtitle="Last session: Yesterday"
    leftContent={<Avatar name="Sarah Johnson" />}
    onClick={() => {}}
  />
</Card>
```

---

### 4. Gym Trainer Dashboard
**File:** `src/app/pages/trainer/Dashboard.tsx`

**Required Elements:**
- Client list
- Today's sessions
- Workout plans
- Measurements tracker
- Progress charts
- Chat

**Components to Use:**
```tsx
// Stats Overview
<div className="grid grid-cols-2 gap-4">
  <StatCard title="Active Clients" value="12" icon="👥" color="primary" />
  <StatCard title="Today's Sessions" value="5" icon="💪" color="success" />
</div>

// Client Progress
<Card variant="elevated">
  <h3>Client Progress</h3>
  <ListItem
    title="John Smith"
    subtitle="Bench Press: +15 lbs this month"
    leftContent={<Avatar name="John Smith" />}
    rightContent={<Badge variant="success">On Track</Badge>}
  />
</Card>
```

---

### 5. Help Desk Dashboard
**File:** `src/app/pages/helpdesk/Dashboard.tsx`

**Required Elements:**
- Appointment queue
- User profiles access
- Reschedule tools
- Support requests
- Follow-up tasks

**Components to Use:**
```tsx
// Support Requests
<Card variant="elevated" padding="none">
  <ListItem
    title="Reschedule Request - Sarah Johnson"
    subtitle="Requested 2 hours ago"
    leftContent={<Avatar name="Sarah Johnson" />}
    rightContent={<Badge variant="warning">Pending</Badge>}
    onClick={() => {}}
  />
</Card>

// Quick Actions
<Button variant="primary" fullWidth>View All Appointments</Button>
<Button variant="outline" fullWidth>Manage Reschedules</Button>
```

---

### 6. Admin Dashboard
**File:** `src/app/pages/admin/Dashboard.tsx`

**Required Elements:**
- KPIs (revenue, users, sessions)
- User management
- Expert management
- Reports
- Activity log

**Components to Use:**
```tsx
// KPIs
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <StatCard
    title="Total Revenue"
    value="$24,500"
    icon="💰"
    color="success"
    trend={{ value: '12%', direction: 'up' }}
  />
  <StatCard
    title="Active Users"
    value="1,247"
    icon="👥"
    color="primary"
    trend={{ value: '8%', direction: 'up' }}
  />
  <StatCard
    title="Sessions"
    value="350"
    icon="📅"
    color="secondary"
  />
  <StatCard
    title="Satisfaction"
    value="4.8"
    icon="⭐"
    color="warning"
  />
</div>

// Recent Activity
<Card variant="elevated">
  <h3>Recent Activity</h3>
  <ListItem
    title="New user registered"
    subtitle="Sarah Johnson - 2 minutes ago"
    leftContent={<Avatar name="Sarah Johnson" size="sm" />}
  />
</Card>
```

---

## 🎨 Design Pattern Guidelines

### Consistent Layout Structure

Every page should follow this structure:

```tsx
<div className="min-h-screen bg-neutral-50 pb-24">
  {/* Header (if needed) */}
  <header className="bg-white border-b border-border p-4">
    <h1>Page Title</h1>
  </header>

  {/* Main Content */}
  <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
    {/* Content sections with Cards */}
  </main>

  {/* Bottom Navigation (mobile) */}
  <BottomNav items={navItems} activeId="current" />
</div>
```

### Spacing Consistency

```tsx
// Section spacing
<div className="space-y-6">  // Between major sections

// Card content spacing
<div className="space-y-4">  // Between card items

// Inline element spacing
<div className="flex gap-3">  // Between buttons/badges
```

### Responsive Grid Patterns

```tsx
// Stats Grid
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">

// Card Grid
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

// List
<div className="space-y-3">
```

---

## 🚀 Implementation Checklist

### Phase 1: Public Screens
- [ ] Landing Page
- [ ] Login Screen
- [ ] Signup Screen

### Phase 2: Client App
- [ ] Client Dashboard
- [ ] Appointment Booking
- [ ] Progress Tracking
- [ ] Profile Screen

### Phase 3: Provider Dashboards
- [ ] Counsellor Dashboard
- [ ] Trainer Dashboard
- [ ] Help Desk Dashboard
- [ ] Admin Dashboard

### Phase 4: Additional Features
- [ ] Session view (video call interface)
- [ ] Chat/messaging
- [ ] Notifications
- [ ] Settings pages
- [ ] Store (future feature)

---

## 💡 Best Practices

### 1. Component Imports
```tsx
// ✅ Good - Use index imports
import { Button, Card, Badge } from '../components';

// ❌ Avoid - Multiple individual imports
import { Button } from '../components/Button';
import { Card } from '../components/Card';
```

### 2. Color Usage
```tsx
// ✅ Good - Use design tokens
<Button className="bg-primary text-white">

// ❌ Avoid - Hardcoded colors
<Button style={{ backgroundColor: '#5B4CFF' }}>
```

### 3. Spacing
```tsx
// ✅ Good - Use spacing scale
<div className="gap-4 p-6">

// ❌ Avoid - Arbitrary values
<div className="gap-[17px] p-[25px]">
```

### 4. Typography
```tsx
// ✅ Good - Use text utilities
<h1 className="text-2xl font-semibold">

// ❌ Avoid - Inline styles
<h1 style={{ fontSize: '24px', fontWeight: 600 }}>
```

---

## 🎯 Success Criteria

Your implementation should:

1. ✅ Use **only** components from the design system
2. ✅ Follow the **design tokens** (no hardcoded values)
3. ✅ Maintain **visual consistency** across all screens
4. ✅ Be **mobile-first** and responsive
5. ✅ Follow **accessibility** guidelines
6. ✅ Use **TypeScript** with proper typing
7. ✅ Match the **brand personality** (calm, trustworthy, professional)

---

## 📞 Reference Materials

- **Live Showcase:** View `App.tsx` for component examples
- **API Docs:** `DESIGN_SYSTEM_GUIDE.md`
- **Quick Reference:** `DESIGN_TOKENS_REFERENCE.md`
- **Component List:** `COMPONENT_INVENTORY.md`

---

## 🎨 Visual Consistency Checklist

For each screen, verify:

- [ ] Uses bg-neutral-50 for main background
- [ ] Cards use "elevated" variant with proper padding
- [ ] Primary actions use primary Button variant
- [ ] Status indicators use appropriate Badge variants
- [ ] Spacing follows the 4/8/16/24px scale
- [ ] Text uses neutral-700/900 for content
- [ ] Interactive elements have hover states
- [ ] Mobile: has BottomNav component
- [ ] Responsive: adapts to tablet/desktop breakpoints

---

## 🚀 Getting Started

1. **Study the showcase:** Open the running app to see all components
2. **Pick a screen:** Start with Landing Page or Login (easiest)
3. **Create the file:** `src/app/pages/Landing.tsx`
4. **Import components:** Use the index export
5. **Build the layout:** Follow the structure guidelines above
6. **Add navigation:** Implement BottomNav for mobile
7. **Test responsiveness:** Check mobile, tablet, desktop views
8. **Verify design tokens:** Ensure no hardcoded values

---

**Good luck building Wellness Connect!** 🌟

The design system is ready for foundation-level screen building. Components now have a clearer maturity path toward enterprise-grade accessibility, responsiveness, testing, and governance.

**Mind. Body. Better Together.**
