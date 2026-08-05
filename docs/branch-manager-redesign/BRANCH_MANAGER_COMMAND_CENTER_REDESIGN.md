# Branch Manager Command Center — Architecture & UX Redesign

**Zarewa Aluminium ERP — `/manager` route**
Prepared for: AsSalafee | Date: 8 July 2026
Companion file: `branch-manager-command-center-mockup.html` (open in a browser)

---

## 1. Why this redesign

The current `/manager` page (`src/pages/ManagerDashboard.jsx`) already does real work — it merges an approvals inbox, a health strip, and a performance section into one route. But it was built incrementally, feature by feature, and it shows:

- **Two UI surfaces repeat the same numbers.** The health strip (9 chips: Orders, POs, Cash, Production, Material, Governance, Stock register, Low stock, Attendance) and the Command Inbox's own tab badges count almost the same underlying queues twice.
- **The inbox and the performance section are strangers.** A manager has to scroll past the entire approvals queue to reach sales/production KPIs, or vice versa — there's no single "here's my day" moment.
- **10 inbox tabs and 8 pill colors** ask a lot of a manager who is also expected to be on the shop floor. The app's own written standard (`docs/UX_STANDARDS.md`) specifies four status colors (green/amber/red/slate); the current inbox uses violet, rose, teal, indigo, slate, and amber for kind-pills alone.
- **No cross-department view.** A Branch Manager is the one role accountable for sales, cash, production and stock simultaneously, yet today they must leave `/manager` and open `/sales`, `/operations`, and (for anything finance-related) rely on numbers baked into the snapshot rather than a real finance pulse — and `/accounting` is blocked to them entirely by RBAC.
- **The manager is scored by a scorecard they can't see.** The Executive Command Centre (`/exec`) has a branch-vs-branch scorecard used to judge every branch manager, but `exec.dashboard.view` is MD/CEO-only — the BM has no comparable view of their own standing.
- **No opening/closing discipline.** Every other desk in the SOP (Sales Office, Cashier, Accounting, Operations/Store) has a documented checklist. The Branch Manager — the person accountable for all of them — has none.
- **Visual language is out of date.** The codebase already contains a locked design mandate for exactly this kind of page — `docs/UI_REFERENCE_SEQUENCE_DASHBOARD.md`, piloted on `/accounts` via `FinancePilotHeader` / `FinanceSequencePanel` — but `/manager` still uses the older glass-morphism `Card`/`z-kpi-card` look. This redesign finishes that migration on the one page where it matters most.

Everything below is designed to fix these seven things without inventing a new visual language — it finishes migrating `/manager` onto Zarewa's own documented "Sequence" standard, and reuses the data plumbing that already exists.

---

## 2. Who this is for — grounded in the SOP, not assumptions

Research basis: `docs/SOP/00-MASTER-INDEX.md` through `SOP-08-EXECUTIVE-OFFICE.md`, `ANNEX-B` and `ANNEX-D`, plus `ZAREWA-ORG-STRUCTURE-AND-TITLES.md` and `OPERATIONS_MANUAL.md`.

**Position.** Branch Manager (app role key `sales_manager`, Grade Level 5) reports directly to the Managing Director. An Assistant Branch Manager, Sales Officers, the Store Keeper chain, Production Supervisor → Machine Operators, Cashier, Driver, Security and Cleaner report up through them, directly or indirectly.

**What they're accountable for, daily:**

| Desk | BM's role |
|---|---|
| Sales | Quotation clearance, order sign-off, production-gate override, refund approval, credit exceptions within limit |
| Cashier | Escalation only — receives discrepancy reports, doesn't post cash |
| Accounting | No formal role — `/accounting` is outside their RBAC |
| Operations / Store | Approves material incidents (damage, offcut, missing/lost assets); Stage 2 of the 4-stage monthly stock-register sign-off; can grant delivery credit |
| Production | QC sign-off on variance bands; production-payment-gate override authority |
| HR | Line-manager endorsement step for branch leave/loan requests |
| Expenses | Approves branch payment requests up to a threshold (₦200,000 per the Operations Manual) |

**Approval authority (as documented — see §9 for one unresolved conflict):**
- Refunds up to a capped threshold, shared with MD/CEO above it — self-approval and approve-and-pay-same-transaction are both blocked by dual control.
- Credit exceptions below a configurable per-branch limit.
- Production-gate override when a job is below the paid-percentage floor, gated by a mandatory ≥10-character justification.
- Material incident approval/rejection/void (void requires a reason and is BM-only).
- Staff purchase-credit endorsement, capped per purchase and per staff member.
- Explicitly **cannot**: reset passwords, approve price exceptions (MD-only), post GL, touch treasury balances.

**Red flags that should escalate to them:** cash discrepancies at open/close, conversion variance beyond tolerance, coil short-receipt, payment-gate breaches, below-floor pricing, refunds aging past the 48-hour SLA, an "Others" expense category exceeding 15% of branch expenses (a documented fraud/coaching signal), repeated refunds to the same customer inside 30 days, and coil-quantity drops with no matching production job.

**Documented gaps this redesign exists to close:** no numeric cash-accuracy / stock-accuracy / attendance / complaint KPI is formally assigned to the BM role; no opening/closing checklist exists for the BM desk (every other desk has one); no explicit "what makes a good Branch Manager" evaluation rubric exists anywhere in the SOP corpus; the branch-vs-branch scorecard that implicitly judges them lives on a route they can't open.

This tells us what "all the information a Branch Manager needs" concretely means: **not just their own branch's transactional queue, but a read-only pulse on sales, production and finance company-wide, framed against their own branch, plus the operational discipline tools (checklist, health score) that every other desk already has and they don't.**

---

## 3. Design principles

1. **One page, four moments, not one long scroll.** "Today" (do this now), "Business Intelligence" (how are sales/production/finance doing, including outside my branch), "Branch Operations" (my people, my stock, my checklist), "Performance" (my trend, my scorecard). Tabs, not scroll depth — the same pattern the Executive Command Centre already uses one level up, so it feels familiar rather than novel.
2. **Say it once.** Every number appears in exactly one place. The health strip becomes a status rail that deep-links into the queue instead of duplicating its counts next to it.
3. **Four colors, not eight.** Green = resolved/on track, amber = pending/needs review, red = overdue/urgent, slate = informational. Kind is communicated with an icon and label, not a sixth accent color.
4. **Show the trend, not just the point.** `recharts` is already an installed dependency used nowhere on this page. Sparklines and small area/bar charts replace bare numbers wherever a trend exists.
5. **Cross-department visibility is read-only and clearly scoped.** The BM sees sales, production and finance pulses for their branch, and a company benchmark line — never a write surface into GL, treasury, or another branch's operational queue. This matches, not violates, the existing RBAC boundary.
6. **Match the brand the app has already chosen.** `--color-zarewa-teal` (#134e4a), `--color-zarewa-mint` (#2ECC71), Plus Jakarta Sans, the `--shadow-sequence` / `--radius-zarewa` tokens, and the `FinancePilotHeader`/`FinanceSequencePanel` shell already piloted on `/accounts`. Nothing here requires a new dependency or a new color.
7. **Close the documented SOP gaps deliberately, not silently.** The Daily Checklist and Branch Health Score below are new capabilities, explicitly labelled as new — they are proposed answers to gaps the SOP research surfaced, not existing features being redesigned.

---

## 4. Information architecture

```
/manager
├── Command bar (persistent)                — branch context, global search, Ask Zare, notifications, avatar
├── Priority banner (persistent, collapsible) — the single most urgent item, if any
├── Tab: Today (default)
│   ├── Pulse row — 5 KPI cards with sparklines
│   ├── Priority Action Center — the unified queue (replaces 10 tabs + health strip)
│   └── Daily Checklist — NEW, opening/closing discipline
├── Tab: Business Intelligence
│   ├── Sales pulse      (from /api/sales/dashboard/*)
│   ├── Production pulse (from /api/reports/production-status)
│   ├── Finance pulse    (from /api/finance/desk-overview, read-only)
│   └── Branch Scorecard vs Company — NEW, read-only slice of the exec scorecard
├── Tab: Branch Operations
│   ├── Stock & inventory snapshot
│   ├── Staff on duty / attendance roll
│   └── Material incidents & delivery credit queue
└── Tab: Performance
    ├── Branch Health Score — NEW composite metric
    ├── Sales & production trend charts (12-week)
    └── Top customers ranking
```

Route stays `/manager`; tabs are query-param addressable (`/manager?tab=intelligence`) so links, deep-links (`?inbox=attention`, `?quoteRef=`, etc.) and the notification bell keep working exactly as they do today.

---

## 5. Tab-by-tab specification

### 5.1 Command bar (persistent across all tabs)

Reuses `FinancePilotHeader` pattern (already piloted on `/accounts`) instead of the legacy `PageHeader`.

- **Left:** eyebrow "Branch manager" (teal, small caps) → `<h1>` branch name, e.g. "Kaduna (HQ)" → one-line subtitle stating the single most important number ("₦4.2M in queue needs your sign-off today").
- **Center-right:** global search (quotation ref, customer, PO, job ID — same deep-link params the page already accepts).
- **Right:** "Ask Zare" button (surfaces the existing Help Assistant, already branch-scoped via `helpGuardrails.js`), notification bell (unified — see §7), avatar/branch-switcher for multi-branch-eligible users.

### 5.2 Priority banner

One line, appears only when something is genuinely urgent (SLA breach, cash-gate breach, governance item). Rose-tinted, dismissible, single primary action button. This replaces three separate always-visible banners in the current build (order sign-off / stock register / expense-coaching) with one slot that shows whichever is most urgent, ranked the same way the notification bell already ranks severity (critical=100, warning=70, info=40).

### 5.3 Tab: Today

**Pulse row** — five `Card`-based KPI tiles, Sequence-flat style (no glass blur), each with a 7-day sparkline (recharts `AreaChart`, 40px tall, teal stroke):

1. Sales produced (MTD) vs target — reuses existing `bm` snapshot figure.
2. Cash & bank (cleared) — reuses existing liquidity breakdown.
3. Production metres (MTD) vs target.
4. Open actions — count from the unified queue, amber if >0.
5. Branch Health Score (see §6.3) — new, single number 0–100 with a one-word status (Strong/Watch/At risk).

**Priority Action Center** — replaces the health strip + 10-tab inbox with:
- A single **status rail** (not a duplicate chip row) showing category counts as a slim horizontal bar chart (one bar per category: Orders, Cash, Production, Material, Procurement, Governance, Stock, Attendance) — click a bar to filter, rather than two separate widgets showing the same number.
- **One primary tab set, four tabs instead of ten:** *Needs approval* (merges Orders/Cash out/QC/Material/Procurement/Governance/Edits behind secondary filter chips — the "Everything" tab's existing filter-chip pattern, promoted to be the default view instead of a rarely-used option), *Attendance*, *Credit exceptions*, *Stock register*. This keeps every existing queue and every existing API call (`/api/management/items`, `/api/management/attention`, `/api/edit-approvals/pending`, `/api/stock-register/inbox`, `/api/hr/attendance/daily-roll`) — it only changes how many top-level clicks reach them.
- Row pattern unchanged (id/name line, one metadata line, status pill, explicit action verb) because the research confirmed this is the most mature approvals-queue pattern in the codebase — it should be preserved, not rebuilt.
- Row color reduced to the four-color standard: **amber** = pending/needs review, **red** = breached SLA or dual-control conflict, **slate** = informational/no action needed. Kind (order, PO, material, governance…) is shown as a small icon + label instead of a dedicated hue.
- SLA age is now visible on every row where one exists (e.g. "Refund · 51h — SLA breached" in red), not just implied by queue position.

**Daily Checklist (NEW)** — small card at the foot of the tab, closing the SOP gap that every other desk has a checklist and the BM doesn't:
- Opening: cash float confirmed, overnight security handover reviewed, attendance roll started, machines pre-shift checked.
- Closing: cash count reconciled, stock movements posted, next-day production plan confirmed, incident log cleared.
- Each item is a simple checkbox with a timestamp and the manager's name recorded on completion — feeds the Branch Health Score's "operational discipline" component.

### 5.4 Tab: Business Intelligence

*This is the tab that directly answers "see what finance, production and sales are up to without going to that department page."* Three side-by-side panels plus one comparison panel, each a condensed read-only version of that department's own dashboard — same data, same branch scope, zero write actions.

**Sales pulse** — from `/api/sales/dashboard/summary`, `/revenue-trend`, `/receivables-aging`, `/top-customers`, `/demand-mix`, `/alerts`:
- Revenue trend line chart (12-week), quotations pending/approved counts, receivables aging bar (0-30/31-60/61-90/90+), top-5 customers this month, demand mix donut (product categories).

**Production pulse** — from `/api/reports/production-status`:
- Status mix (planned/in-progress/complete) as a stacked bar, planned-vs-actual metre variance outliers list, QC gap count, payment-gate exception count — each links straight into the relevant Priority Action Center filter rather than out to `/operations`.

**Finance pulse** — from `/api/finance/desk-overview`, `/api/finance/ap3-branch-pl` (**read-only; no GL access, consistent with the existing RBAC block on `/api/gl/*`**):
- Cash & bank cleared position, trial-exception count, branch P&L snapshot **explicitly labelled "material costs only — excludes labour & overhead"** (the same disclaimer the Exec Command Centre research confirmed is necessary — this redesign does not fabricate a precision the underlying data doesn't have), expense pack summary.

**Branch Scorecard vs Company (NEW)** — the direct fix for "the BM is benchmarked by a scorecard they can't see":
- A read-only, branch-locked slice of the same scorecard logic the Exec Command Centre already computes (`execDashboardOps.js` → branch comparison table), hard-scoped so a BM only ever sees their own branch's row plus a company-wide benchmark row — never another branch's operational detail. Metrics: revenue, collections, expenses, gross margin, all shown as "you" vs "company average," not branch-by-branch ranking (avoids morale-damaging leaderboarding while still giving useful context).

### 5.5 Tab: Branch Operations

- **Stock & inventory** — existing `useInventory()` data (stock level, low-stock threshold, gauge) as a compact table with the same status-pill language, plus a "request restock" action that opens the existing procurement flow.
- **Staff on duty** — today's attendance roll (`HrDailyRollPanel`, already built) plus a simple roster view (who's scheduled, who's absent, who's on leave) — currently attendance only surfaces inside a queue tab; here it gets a standing home.
- **Material incidents & delivery credit** — the existing `CreditExceptionPanel` and material-incident approval flow, given a stable location instead of living only inside the merged queue.

### 5.6 Tab: Performance

- **Branch Health Score (NEW)** — see §6.3 for the full definition; shown here with its component breakdown (not just the single number from the Today pulse row).
- **Trend charts** — 12-week `recharts` `AreaChart`/`BarChart` for sales produced, production metres, and queue resolution time (how fast the BM clears approvals — a discipline metric, not a vanity one).
- **Top customers** — the existing ranked list with animated bar (kept as-is; it already works well), moved here from the old Pulse section since it's a performance/relationship view, not a daily-action view.

---

## 6. New capabilities this redesign proposes

These three items don't exist today. Each is scoped to be buildable on top of the existing architecture, not a rewrite.

### 6.1 Unified Priority Action Center
Not new data — a new presentation layer over the existing `/api/management/items`, `/api/management/attention`, `/api/edit-approvals/pending`, `/api/stock-register/inbox` calls already made by `useBranchManagerWorkstation.js`. Effort: frontend-only.

### 6.2 Branch Scorecard vs Company
Requires one new backend capability: expose a branch-locked, read-only slice of the logic already in `execDashboardOps.js`. Recommended shape: a new composer file `server/bmDashboardOps.js`, mirroring the existing pattern of `execDashboardOps.js` / `execWorkingCapitalOps.js` / `execTargetsOps.js`, exposed as `GET /api/manager/dashboard` and gated so `resolveExecDashboardBranchScope` can never return `'ALL'` for a `sales_manager` — it always resolves to their own branch plus the company aggregate. This is the same branch-scoping pattern already enforced everywhere else in the codebase (`resolveBootstrapBranchScope`), applied to one more endpoint.

### 6.3 Branch Health Score
A single 0–100 composite metric, addressing the SOP-confirmed gap that no numeric cash-accuracy / stock-accuracy / attendance / SLA metric is formally assigned to the BM role today. Proposed components (weights are a starting point for discussion with the SOP owner, not a final answer):

| Component | Weight | Source |
|---|---|---|
| Approval SLA compliance (% of items cleared within their SLA, e.g. 48h for refunds) | 25% | Derived from existing `/api/management/attention` timestamps |
| Cash reconciliation accuracy (variance-free closes / total closes) | 20% | New — requires logging close-time variance, natural extension of the Daily Checklist |
| Stock accuracy (variance at monthly stock-register sign-off) | 20% | Existing `/api/stock-register/inbox` sign-off data |
| Attendance discipline (roll-call completion rate, not staff attendance itself) | 15% | Existing `/api/hr/attendance/daily-roll` |
| Sales & production target attainment | 20% | Existing snapshot targets |

This should be validated with the MD/SOP owner before being treated as an official KPI — it is a proposal that turns four things the SOP already implies matter into one number a manager can watch move day to day, not a claim that this formula is already policy.

---

## 7. Notifications — one source, not two

Research confirmed the notification bell (`buildWorkspaceNotifications()` in `src/lib/workspaceNotifications.js`) and the `/manager` Command Inbox already read from the same underlying queue data (`getManagementQueueCounts`) but are built as two independent UI components. This redesign formalizes that into one: the bell becomes a compact preview of the Priority Action Center's top 5 items by the same severity ranking, and clicking "View all" lands on `/manager?tab=today` scrolled to the Priority Action Center — not a separate mental model.

---

## 8. Visual system (no new tokens required)

Everything below already exists in `src/index.css` / `src/components/ui/` / `src/components/layout/` — this redesign is a consistent *application* of the existing system, not a new one.

| Element | Token / component to use |
|---|---|
| Page shell | `FinancePilotHeader` + `FinanceSequencePanel` (already piloted on `/accounts`) instead of legacy `PageHeader` + glass `Card` |
| Background | `--color-sequence-bg` (#F9FAFB) |
| Cards | Flat white, `--radius-zarewa` (24px), `--shadow-sequence` — no backdrop-blur |
| Primary brand color | `--color-zarewa-teal` (#134e4a) — buttons, active tab, primary icons |
| Status colors | Tailwind emerald (success), amber (pending), rose (urgent), slate (neutral) — four only |
| Typography | Plus Jakarta Sans; `.z-page-title`, `.z-section-title`, `.z-meta-text` utility classes |
| Buttons | `src/components/ui/button.jsx` variants (`default`, `secondary`, `outline`, `ghost`, `destructive`) |
| Tables | `AppDataTable.jsx` primitives, right-aligned tabular numbers, no zebra striping |
| Charts | `recharts` — already a dependency, currently used only in `CustomerDashboard.jsx`; this redesign is what finally puts it to work on the BM and BI views |
| Motion | `framer-motion` card entrances and progress fills, consistent with the rest of the app |
| Icons | `lucide-react` exclusively |

---

## 9. Open questions to resolve before build

1. **Refund approval threshold conflict.** One SOP source states the BM/MD escalation line is ₦1,000,000; the Operations Manual states ₦500,000. This needs reconciling with the SOP owner before any threshold is hardcoded into the Priority Action Center's urgency logic or shown as copy in the UI.
2. **Branch Health Score weighting** (§6.3) is a proposal, not policy — needs sign-off from whoever owns BM performance evaluation (currently no one, per the SOP gap analysis) before it's presented to managers as an official score rather than an internal indicator.
3. **Cross-branch scorecard visibility** — confirm the MD is comfortable with BMs seeing a "you vs company average" comparison (no peer-branch ranking is proposed, precisely to avoid this becoming a political flashpoint, but it's worth an explicit go-ahead).

---

## 10. Build phasing

**Phase 1 — presentation-layer rework (frontend only, no new endpoints).**
Migrate `/manager` onto `FinancePilotHeader`/`FinanceSequencePanel`. Introduce the four-tab structure (Today / Business Intelligence / Branch Operations / Performance). Collapse the health strip + 10 inbox tabs into the status rail + 4-tab Priority Action Center. Add recharts sparklines/trend charts to existing numbers. Add the Daily Checklist as local/branch-scoped state. This alone resolves the scroll-depth, duplicated-numbers, and color-proliferation problems, and can ship without backend changes.

**Phase 2 — Business Intelligence tab (mostly composition of existing endpoints).**
Wire in `/api/sales/dashboard/*`, `/api/reports/production-status`, `/api/finance/desk-overview`, `/api/finance/ap3-branch-pl` — all already exist and are already branch-scoped. No new backend logic beyond response shaping for the compact panel format.

**Phase 3 — new backend capability.**
`server/bmDashboardOps.js` for the Branch Scorecard vs Company (§6.2). Extend the Daily Checklist and stock-register sign-off data into the Branch Health Score components (§6.3). Formalize the unified notification source (§7).

---

## 11. What "impressive" means here

Not a new color palette or a novel layout pattern pulled from nowhere — the app already wrote down what "impressive" should look like in `docs/UI_REFERENCE_SEQUENCE_DASHBOARD.md` and has one working example of it on `/accounts`. The most convincing version of this redesign is the one where a Branch Manager opens `/manager` and it finally looks and feels like it belongs to the same product as the Finance desk, while quietly answering four questions in under five seconds: *what do I need to act on right now, how is my branch doing against the company, what are sales/production/finance doing without me leaving this page, and am I improving.*

See `branch-manager-command-center-mockup.html` for a working visual walkthrough of all four tabs against this specification.
