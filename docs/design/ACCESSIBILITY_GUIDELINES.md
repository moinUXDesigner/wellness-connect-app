# Wellness Connect Accessibility Guidelines

## Target

The design system should meet WCAG 2.2 AA for product UI unless a product owner explicitly approves a different requirement.

## Baseline Requirements

- Every interactive element must be reachable by keyboard.
- Every interactive element must have a visible `focus-visible` state.
- Form errors must be announced through text and programmatic relationships where practical.
- Icons that are decorative should be hidden from assistive technology.
- Icon-only buttons must have an accessible name.
- Motion should be brief and should not be required to understand state.
- Color must not be the only way to communicate status.

## Component State Requirements

Each stable component should document and support:

- default
- hover
- focus-visible
- active or pressed
- disabled
- loading, where applicable
- error, where applicable
- selected, where applicable

## Current Component Notes

| Component | Accessibility expectation |
| --- | --- |
| Button | Native button, disabled state, loading state announced through visible text |
| Input | Label support, helper/error text, visible focus ring |
| Checkbox | Native checkbox input, visible custom control, label support |
| Toggle | Native checkbox input with switch role where appropriate |
| SearchInput | Clear button must have an accessible label |
| Tabs | Tablist, tab, selected state, tabpanel semantics, and Arrow/Home/End keyboard support |
| ProgressBar | Progressbar role with value attributes |
| Alert | Status or alert role based on urgency |
| BottomNav | Navigation landmark with active state |

## Review Checklist

- Can the component be used without a mouse?
- Is focus visible and easy to locate?
- Is the accessible name clear?
- Are selected, expanded, checked, or busy states exposed?
- Does text meet contrast requirements?
- Does the component still work when text is longer than expected?
