# File structure campaign (frontend)

Phased cleanup so every file has a home, comments stay useful, duplicates shrink, and the SPA stays fast. Do not big-bang move the repo — there is usually uncommitted desk work in flight.

## Target layout

```
src/
  pages/<domain>/          # route entry only (Sales, Finance, …)
  components/<domain>/     # desk UI
  components/layout/       # shell chrome (sidebar, boundaries, titles)
  components/auth/         # login + route guards
  components/ui/           # primitives
  hooks/                   # React hooks (already domain-named)
  context/                 # providers
  lib/<domain>/            # browser-only helpers
  shared/                  # copies of backend shared/ (source of truth)
```

## Phases

1. **Shell** — done (`layout`, `auth`, `pages/system`).
2. **Pages** — done for stable files. Still at `src/pages/` root until WIP lands: `Sales.jsx`, `Procurement.jsx`, `ManagerDashboard.jsx`, `CustomerDashboard.jsx`.
3. **Sales modals** — done (`QuotationModal`, `ReceiptModal`, `CuttingListModal`, `RefundModal`, `AdvancePaymentModal` → `components/sales/`).
4. **Shared lib** — 94 paired files (`verify:shared`). Includes treasury payout dates, payment-integrity helpers, and office approval routing. Still drifted: `helpKnowledge`, `liveAnalytics`, `refundsStore`, `workspaceNotifications`. Sales/Finance standard-report cuts stay backend-only (`liveAnalytics` / `receiptClearance` / `refundsStore` deps).
5. **God files** — split `Sales.jsx`, `QuotationModal.jsx`, `App.jsx` into composers + domain panels.
6. **Speed** — keep route-lazy chunks; no new shell-eager desk UI; lists via React Query.

## Rules of the road

- One domain per PR/session when moving files.
- Update imports + `manualChunks` + tests in the same change.
- Comment invariants, not mechanics.
- Do not mix this campaign with feature work on the same files.
