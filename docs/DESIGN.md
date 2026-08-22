---
name: Zarewa Industrial Integrity
version: "1.0.0"
---

# Zarewa design system

Single source of truth for UI across login, shell, desks, and modals.  
**Font:** Plus Jakarta Sans (+ IBM Plex Sans Condensed for tabular refs).  
**Mode:** Light only (ERP desks stay light even when OS prefers dark).

## Color roles

| Token | Hex | Use |
|-------|-----|-----|
| `--z-accent` / `zarewa-teal` | `#134e4a` | Primary actions, sidebar, links |
| `--z-accent-hover` | `#0f3d39` | Hover / pressed primary |
| `--z-accent-muted` | `#2dd4bf` | Active nav, soft accents |
| `--z-accent-soft` | `#c6eae2` | Success banners, tinted chips |
| `--z-bg` | `#f8f9ff` | App canvas |
| `--z-surface` | `#ffffff` | Cards, inputs, modals |
| `--z-surface-muted` | `#eff4ff` | Nested sections, table stripes |
| `--z-text` | `#0b1c30` | Headings, primary copy |
| `--z-text-muted` | `#404946` | Labels, secondary copy |
| `--z-border` | `#bfc9c5` | Dividers, input borders |
| `--z-error` | `#ba1a1a` | Destructive / validation |

Implement via CSS variables in `src/index.css` and Tailwind `@theme` aliases (`zarewa-teal`, etc.).

## Typography

| Role | Size | Weight | Notes |
|------|------|--------|-------|
| Page title | 16–18px | 700 | `.z-page-title` |
| Section title | 14px | 600 | Card / panel headers |
| Body | 14px | 400 | Tables, forms |
| Label caps | 12px | 700, 0.1em tracking | Metadata, field labels on auth |
| UI micro | 11–12px | 500–600 | Chips, table headers |

Numbers in ledgers: `.z-stencil` (IBM Plex Sans Condensed, tabular nums).

## Radius (desks)

| Token | px | Use |
|-------|-----|-----|
| `rounded-sm` | 4 | Chips, badges |
| `rounded-md` / `--radius-zarewa` | 8 | Cards, inputs, buttons |
| `rounded-lg` | 16 | Modals, auth panes |
| `rounded-full` | pill | Status dots |

Auth marketing shells may use 40px outer radius; **do not** use that on ERP desks.

## Elevation

| Level | Style |
|-------|--------|
| Canvas | `--z-bg`, no shadow |
| Card | `--shadow-zarewa-card` (subtle teal-tinted) |
| Overlay | `--shadow-zarewa-overlay` (dropdown, modal) |

Prefer tonal layers over heavy borders.

## Layout

- Max content width: **1400px** (`.PageShell`)
- Sidebar: **256px** fixed (`bg-zarewa-teal`)
- Grid gutters: **24px** desktop, **16px** mobile
- Spacing base unit: **8px**

## Components (canonical classes)

| Pattern | Class / component |
|---------|-------------------|
| Primary button | `<Button>` or `.z-btn-primary` |
| Secondary button | `.z-btn-secondary` |
| Text field | `.z-input` / `FIELD.base` in `designTokens.js` |
| Panel | `.z-soft-panel` / `.z-kpi-card` |
| Page chrome | `<PageHeader>` + `<PageTabs>` |
| Modal body | `<ModalFrame surface="plain">` + `.z-modal-panel` |
| Exec / manager KPIs | `<CommandMetricCard>` on Today tabs only |

## Density split

| Surface | Density |
|---------|---------|
| Login / lock / onboarding | Marketing — larger type, 40px outer card, hero photo |
| ERP desks | Operational — 8px cards, compact tables, 36px toolbar buttons |

Share **color + type** across both; do not share **layout scale**.

## Agent rules

1. Use `zarewa-teal` and CSS variables — never invent a third green.
2. Prefer shared primitives over one-off Tailwind strings.
3. Do not import third-party brand DESIGN.md files into this repo.
4. One image per section for marketing mockups only.
