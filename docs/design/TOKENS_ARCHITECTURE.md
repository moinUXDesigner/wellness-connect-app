# Wellness Connect Token Architecture

## Token Layers

| Layer | Purpose | Example |
| --- | --- | --- |
| Primitive | Raw values that describe the palette and scales | `--primary`, `--neutral-900`, `--spacing-4` |
| Semantic | Product meaning independent of the raw value | `--surface-default`, `--text-primary`, `--action-primary` |
| Component | Component-specific decisions mapped from semantic tokens | `--button-primary-bg`, `--input-border`, `--card-bg` |

Product components should prefer semantic or component tokens. Primitive tokens should be used mainly inside `src/styles/theme.css`, color swatches, and token documentation.

## Naming Rules

- Use lowercase CSS custom properties.
- Use purpose-first names, not color-first names, for semantic tokens.
- Keep state names consistent: `hover`, `pressed`, `disabled`, `focus`.
- Component tokens should start with the component name.

## Current Semantic Tokens

| Token | Purpose |
| --- | --- |
| `--surface-default` | Main app background |
| `--surface-subtle` | Subtle page bands and inactive controls |
| `--surface-elevated` | Cards, sheets, and elevated containers |
| `--text-primary` | Primary readable text |
| `--text-secondary` | Supporting text |
| `--text-muted` | Placeholder and low-emphasis text |
| `--text-inverse` | Text on strong brand/status backgrounds |
| `--border-default` | Standard borders |
| `--border-strong` | Emphasized borders |
| `--focus-ring` | Keyboard focus outline |
| `--action-primary` | Primary action background |
| `--action-primary-hover` | Primary action hover |
| `--action-secondary` | Secondary action background |
| `--action-danger` | Destructive action background |

## Component Token Policy

- Buttons should map variants to action tokens.
- Inputs should map background, border, text, placeholder, error, and focus tokens.
- Cards should map background, border, text, radius, and shadow tokens.
- Badges and alerts should map to status tokens.
- Navigation should map active state to action or focus tokens.

## Dark Mode Position

Dark mode is present as compatibility scaffolding, but it is not yet a Wellness Connect product theme. Treat it as experimental until a dedicated dark theme token pass is completed.

