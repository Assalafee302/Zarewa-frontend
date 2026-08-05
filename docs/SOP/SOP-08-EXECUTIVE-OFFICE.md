# SOP-08: EXECUTIVE OFFICE

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Department:** Executive Office  
**System modules:** `/exec`, `/executive-hr/*`, `/manager` (when MD acts as BM)  
**Primary roles:** `md`, `ceo`, `chairman`  
**CEO/Chairman:** read-only on transactions; approval authority on sensitive items

---

## 1. PURPOSE AND SCOPE

The Executive Office provides strategic oversight, high-value approval authority, and company-wide performance monitoring. The Managing Director operates the business through the **Command Centre** (`/exec`); CEO and Chairman have read-focused executive views with targeted approval permissions.

---

## 2. COMMAND CENTRE

Route: `/exec`

### 2.1 Tabs

| Tab | Focus | Primary User |
|-----|-------|--------------|
| Today | Daily executive briefing | MD |
| Decide | Approval decisions queue | MD |
| Customers | Customer intelligence | MD |
| Trace | Transaction tracing | MD |
| Review | KPIs, alerts, approval queues | MD, CEO |
| Intelligence | Forecasts, coil actions, BI | MD |
| Finance | Cash, working capital, treasury | MD |

### 2.2 Period Filters

| Key | Range |
|-----|-------|
| today | Current calendar day |
| week | Last 7 days |
| month | Current calendar month (default) |
| last_month | Previous full month |
| custom | User-specified dates |

### 2.3 Branch Filters

All · Kaduna · Yola · Maiduguri

---

## 3. EXECUTIVE DASHBOARD PANELS

| Panel | Data |
|-------|------|
| Sales Summary | Revenue, collections, quotations by branch |
| Expense Summary | By category; productive vs non-productive |
| Receivables | Outstanding balances, overdue, days outstanding |
| Branch Scorecard | Revenue, collections, expenses, gross margin |
| BI Analytics | SKU weeks-cover; cash horizon |
| Working Capital | Cash, payables, receivables, net WC |
| MD Cockpit | Low stock, overdue deliveries, stale quotes, blocked coils |
| Champion Customers | Top customers by revenue/collections |
| Material Costing (AP3) | Standard vs actual variance |
| Staff Activity | Pending HR approvals, attendance exceptions |
| Target vs Actual | Branch sales targets vs actual |
| MD Attention Inbox | All pending decisions |
| Stock Register Inbox | Registers awaiting MD approval |
| Payroll Sign-Off Queue | Runs awaiting MD approval |
| Bank Reconciliation Status | Unreconciled periods |
| Reserve Policy | Accounts below minimum reserve |

---

## 4. MD DECISION QUEUE (`/exec?tab=decide`)

Aggregated pending decisions sorted by tier (critical → urgent → normal) and age:

| Decision Type | MD Action |
|---------------|-----------|
| Credit exceptions (above BM limit) | Approve / reject |
| Below-floor price exceptions | Approve for production |
| Refunds above ₦1,000,000 | Approve / reject |
| Staff loan/leave (exceptional) | Final decision |
| Inter-branch loans | Approve / reject |
| Payroll runs | MD sign-off (mandatory) |
| Production gate overrides | Review (if escalated) |
| Staff purchase credit | Endorse |
| Work item decisions | Approve / reject |
| Stock register (stage 3) | Approve all branches |
| Coil short receipt | Review notification |

---

## 5. MD APPROVAL AUTHORITY SUMMARY

| Area | Threshold / Rule | Permission |
|------|------------------|------------|
| Refunds | Above ₦1,000,000 | `refunds.approve` + executive threshold |
| Expenses (payment requests) | Above ₦200,000 | Office governance |
| Credit exceptions | Above BM limit | Policy-driven |
| Price exceptions | Any below-floor | `md.price_exception.approve` |
| Payroll | All runs | `hr.payroll.md_approve` — mandatory |
| Inter-branch loans | All | `inter_branch_loan.md_approve` |
| Receivable write-offs | Above policy | Board/MD |
| Delivery override | Per delivery (if configured) | `ALLOW_MD_DELIVERY_OVERRIDE` |
| Treasury reserve policy | Set minimums | `treasury.reserve_policy.manage` |

---

## 6. TREASURY RESERVE POLICY

MD sets minimum cash balance for designated treasury accounts:

1. **Command Centre** → Finance tab → Reserve Policy
2. Set minimum per account
3. Accounts below minimum flagged on Executive Dashboard
4. Branch managers notified for replenishment

---

## 7. ORG-WIDE GOVERNANCE

### 7.1 Settings Access (MD)

- Settings → Governance → Office approval thresholds
- Settings → Governance → Org manager targets (sales/production)
- Org policy KV overrides (with audit)
- Price list and pricing policy (`/price-list`, `/pricing-policy`)

### 7.2 Governance Pack

`GET /api/reports/governance-pack`:
- Misaligned refunds
- Dual-control warnings
- Payment gate breaches
- QC gaps

Export for board meetings and audit.

---

## 8. CEO AND CHAIRMAN ROLE

### 8.1 CEO (`ceo`)

- **Read-only** Command Centre and Reports
- Cannot post transactions, create quotations, or access line-level finance
- Routes: `/exec`, `/reports` (if permitted)
- Minimal sidebar: Command Centre → Reports → Account

### 8.2 Chairman (`chairman`)

- CEO permissions plus:
- Executive HR family/scholarship accounts
- `hr.chairman.manage`
- Exceptional loan approval alongside MD

---

## 9. DAILY MD ROUTINE

### Morning (30 minutes)

1. Open **Command Centre** → **Today** tab
2. Review critical alerts (red badges)
3. Open **Decide** tab — clear urgent approvals
4. Check **Payroll sign-off queue** if pay period
5. Review **Reserve policy** warnings

### Weekly

1. **Intelligence** tab — coil forecasts, SKU cover
2. **Finance** tab — working capital trend
3. **Reports** → weekly pack
4. All-branch **stock register** progress
5. **Governance pack** review

### Monthly

1. Sign stock registers (stage 3) all branches
2. Review branch scorecard vs targets
3. Approve month-end payroll
4. Board pack from Reports → MD operations pack

---

## 10. BUSINESS INTELLIGENCE

Route: `/analytics` or `/exec?tab=intelligence`

- SKU weeks-cover (4-month lookback)
- Revenue trends and gross margin by branch/product
- Customer segmentation: champions, at-risk, dormant
- Cash horizon projections
- Branch comparative performance

---

## 11. TRANSACTION TRACING

**Trace** tab (`/exec?tab=trace`):
- Follow quotation → cutting list → production → delivery → refund → treasury
- `GET /api/quotations/:id/lifecycle-timeline`
- Used for customer disputes and audit investigations

---

## 12. OFFICIAL NOTICES

MD holds `notices.manage`:
- Company-wide announcements
- Require acknowledgement
- Pin to board
- Set expiry and branch/role targeting

---

*End of SOP-08. Cross-references: All department SOPs for items in Decide queue.*
