# Official unveil — mobile and QA checklist

Use this matrix before tagging a release. **Automated gate:** `npm run verify:ci` and `npm test` must pass.

## Definition of done (responsive)

- Viewports **375px** and **768px** (Chrome device toolbar or real devices).
- No **unintended** horizontal scroll at the page level (narrow columns inside `overflow-x-auto` / `z-scroll-x` / `AppTableWrap` are OK).
- Primary actions reachable without pinch-zoom; form fields use at least **16px** font on iOS where zoom-on-focus is a problem (`text-base` on critical inputs).
- Modals: `max-h` + internal scroll; safe-area respected on notched phones where applicable.

## Definition of done (UX)

- Page chrome follows [UX_STANDARDS.md](./UX_STANDARDS.md) (`PageHeader`, `z-*` utilities).
- One dominant primary button per section; secondary actions visually subordinate.

## Route QA matrix

Check each route: load, primary action, open/close main modal (if any), scroll longest list, confirm no page-level horizontal overflow.

| Route | Path | Notes |
|-------|------|--------|
| Home / Workspace | `/` | Role-dependent redirect for exec/manager |
| Executive | `/exec` | |
| Manager | `/manager` | |
| Sales | `/sales` | Tabs, lists, modals |
| Procurement | `/procurement` | |
| Production / Operations | `/operations` | Wide tables — use scroll hosts |
| Finance / Account | `/accounts` | |
| Reports | `/reports` | |
| Office | `/office` | |
| Customers | `/customers` | |
| Customer dashboard | `/customer-dashboard` | |
| Coil profile | `/coil-profile` | |
| Settings | `/settings/*` | |
| Edit approvals | `/edit-approvals` | |
| Price list admin | `/price-list` | |
| Supplier / transport profiles | `/supplier/*`, `/transport/*` | |
| Not found | any unknown | |

## Wide tables

- Prefer [`AppTableWrap`](../src/components/ui/AppDataTable.jsx) or [`ResponsiveTableShell`](../src/components/layout/ResponsiveTableShell.jsx) (alias) around `<table>`.
- For non-table wide content, wrap with `className="z-scroll-x min-w-0 w-full"`.

## Sign-off

- [ ] **Automated:** `npm run verify:ci` (lint + build; lint may report hook warnings but must exit 0) and `npm test` — run before unveil tag.
- [ ] **Manual:** matrix above completed for 375 + 768 (human owner initials + date in release notes).
- [ ] **Print smoke (optional):** quotation + cutting list A4 preview once per release
