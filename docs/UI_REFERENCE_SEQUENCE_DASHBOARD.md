# UI reference: Sequence Financial Dashboard (Dribbble)

**Primary reference (source of truth for visuals):**  
[Sequence - Financial Dashboard on Dribbble](https://dribbble.com/shots/23683691-Sequence-Financial-Dashboard)

**Attribution (from Dribbble listing):** Basebern Team — product UI for a finance / B2B banking style dashboard (analytics, charts, currency, transactions, stepper patterns).

**Purpose:** This document locks layout, density, and component placement goals for a full UI overhaul. Implementation should match the **shot** (spacing, table treatment, colors, header/search placement), not generic “dashboard” patterns.

---

## How to use this during implementation

1. Open the Dribbble shot full-screen and keep it beside the app while building.
2. Prefer **screenshot export** from Dribbble (or a saved PNG in your design handoff) for pixel checks; automated fetch of Dribbble pages is often blocked or incomplete.
3. When in doubt, **match the reference** over legacy Zarewa styling for spacing, card shape, and table chrome.

---

## Pilot implementation (Finance)

The **Finance & accounts** route (`/accounts`, `src/pages/Account.jsx`) is the first screen aligned to this reference:

- **`FinancePilotHeader`** (`src/components/layout/FinancePilotHeader.jsx`) — eyebrow + title + subtitle on the left; **tab-scoped search**, primary actions, and Ask AI on the right; **`PageTabs`** on a full-width row below with a light divider.
- **`FinanceSequencePanel`** (`src/components/layout/FinanceSequencePanel.jsx`) — main white content card using `--shadow-sequence` (no glass gradient strip).
- **Left rail KPIs** — white elevated cards with teal accent on liquidity; consistent spacing (`lg:gap-10`) vs the main panel.

Other modules still use the legacy `PageHeader` / `MainPanel` until migrated.

---

## Layout anatomy (target)

Align the live app with this **macro layout** (typical for this shot family):

| Zone | Role | Notes |
|------|------|--------|
| **Left sidebar** | Primary navigation, brand, section grouping | Fixed width, calm background; icons + labels; active state clearly separated from content area. |
| **Top app strip** | Page context + global affordances | Title / breadcrumb on the **left**; **search** and **primary actions** (filters, export, “Add”, etc.) on the **right** — same horizontal band, vertically centered. |
| **Main canvas** | Scrollable content | Light neutral **page** background; content sits in **raised cards**, not flush edge-to-edge except sidebar. |
| **Cards** | Group related modules | Rounded corners, soft shadow, consistent **internal padding**; charts and tables **live inside** cards, not naked on the gray field. |

**Search placement:** In the **header row of the main column** (next to page title area), **right-aligned** with other toolbar controls — not isolated mid-page unless the reference shows that variant.

---

## Spacing & rhythm

- **Page margins:** Generous outer gutter between sidebar and first card column (avoid cramped edge alignment).
- **Vertical rhythm:** Clear separation between page title row and first card block; consistent gap **between** cards (single scale — pick one, e.g. 24px / 32px equivalent in Tailwind).
- **Card padding:** Uniform **large** inner padding (hero metrics and tables should breathe; table should not touch card edges).
- **Alignment:** Grid-align card columns to the same left/right edges within the main canvas.

*(Tune exact pixel values to the screenshot when implementing; the goal is “Sequence-like air”, not minimal admin UI.)*

---

## Color & surface

Interpretation targets (verify against the shot):

- **App background:** Very light cool gray / off-white (flat, not textured).
- **Cards / surfaces:** Clean white with **subtle** border or shadow — premium SaaS, not heavy skeuomorphism.
- **Text:** Near-black primary; stepped **slate** for secondary labels and column headers.
- **Accents:** Restrained — used for links, primary buttons, positive/negative money indicators, and active nav — not rainbow chips everywhere.

**Zarewa alignment:** `src/index.css` already defines_sequence-oriented_ tokens (e.g. `--color-sequence-bg`, `--shadow-sequence`, `--radius-zarewa`). During overhaul, **map** Tailwind/theme tokens to match the Dribbble palette and shadows rather than introducing one-off hex values per page.

---

## Typography

- **Page title:** Strong, short; tight tracking (dashboard headline, not marketing H1).
- **Section labels:** Small caps / wide tracking **or** subtle overlines — match whatever the reference uses for “SECTION” labels above modules.
- **Tables:** Slightly smaller body for dense rows; **tabular figures** for amounts where possible.

---

## Tables (critical)

Match the **table type** from the reference:

- Table sits **inside a white card** with rounded corners matching other cards.
- **Header row:** Distinct from body (background tint **or** bottom border — as in shot); not a heavy Excel grid.
- **Rows:** Comfortable row height; hover state subtle; zebra striping only if the reference shows it (default: **no** unless shot does).
- **Columns:** Clear alignment — text left, numbers right; status as compact pills if shown.
- **Horizontal rules:** Minimal full grids; prefer row dividers or whitespace.

Avoid bare `<table>` on gray page background without a card shell unless the reference explicitly shows that.

---

## Components to standardize in code (checklist)

When overhauling, reuse one pattern everywhere:

- [ ] **Shell:** Sidebar + main with consistent gutters.
- [ ] **Page header:** Title left; search + actions right (same row, responsive collapse rules documented).
- [ ] **Card** wrapper for metrics, charts, and tables.
- [ ] **Data table** variant (header, row density, empty state).
- [ ] **Inputs:** Search field style consistent with other fields (radius, border, focus ring).
- [ ] **Buttons:** Primary / secondary / ghost hierarchy matching reference emphasis.

---

## Out of scope / explicit non-goals

- Do not copy third-party **logos**, **illustrations**, or **proprietary icons** from Dribbble; match **layout and visual language** only.
- Animation on Dribbble is for presentation; adopt only motion that improves UX and fits the stack (e.g. Framer Motion already in project).

---

## Change log

| Date | Note |
|------|------|
| 2026-05-01 | Reference doc created from user-provided Dribbble URL; Dribbble HTML fetch unavailable — layout notes validated against public shot metadata (Basebern Team, finance dashboard tags). |
