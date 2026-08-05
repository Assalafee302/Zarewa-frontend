# SOP-03: ACCOUNTING DESK

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Department:** Finance — Accounting Desk  
**System modules:** `/accounting`, `/accounts` (accountant tabs), `/reports`  
**Primary role:** `finance_manager` (Accountant / Head of Accounts)  
**Supporting roles:** `md`, `admin`

---

## 1. PURPOSE AND SCOPE

The Accounting Desk is Zarewa's financial control centre. It manages the General Ledger, bank reconciliation, accounts payable and receivable sub-ledgers, fixed assets, accounting period locks, and the three-phase accounting policy engine (AP1c, AP2, AP3). This SOP covers month-end close, GL operations, and management reporting.

**Segregation:** Accountants reconcile and journal; Cashiers receive and pay. Accountants hold `finance.cross_branch_post` for controlled cross-branch ledger entries.

---

## 2. ACCOUNTING DESK NAVIGATION

Route: `/accounting`

**Zones:** Home · Close · Reports · Registers · Policy · Operations

| Tab | Function |
|-----|----------|
| Overview | Exceptions, cutover readiness, next actions |
| Opening Pack | Register roll-up, capital entry, one journal post |
| Month-end close | Period lock checklist |
| Reconciliation | Bank/cash tie-out |
| Statements / GL | P&L, SOFP, trial balance |
| Creditors / Debtors / Assets | Sub-ledger registers |
| Inter-branch | Cross-branch funding propose/approve/repay |
| Deposit policy (AP1c) | GL cutover dry-run |
| Supplier AP (AP2) | GRNI diagnostics, prepayments |
| Production costing (AP3) | Cost per metre readiness |
| Branch P&L | Draft branch contribution |
| Credit approval | Delivery before full payment |
| Payroll | Bulk bank file after HR locks run |

---

## 3. GENERAL LEDGER STRUCTURE

### 3.1 Chart of Accounts (Key Codes)

| Code | Account | Type |
|------|---------|------|
| 1000 | Cash / Bank | Asset |
| 1200 | Staff Loans Receivable | Asset |
| 1300 | Inventory / Closing Stock | Asset |
| 1500–1504 | Fixed Assets (Plant, Land, Furniture, Generator) | Fixed Asset |
| 2000 | Accounts Payable — Suppliers | Liability |
| 2400 | Pension Payable | Liability |
| 2500 | Customer Advances / Refunds Payable | Liability |
| 3200 | Chairman Withdrawal (Equity Draw) | Equity |
| 4000 | Sales Revenue | Income |
| 5010–5050 | COGS (Fuel, Maintenance, Corrugation, Production, Purchases) | COGS |
| 6000–6400 | Operating Expenses | OpEx |
| 6100 | Depreciation | OpEx |

### 3.2 Expense Category → GL Mapping

| Category | GL | Notes |
|----------|-----|-------|
| Wages | 6000 | Direct production wages |
| Fuel & lubricant | 5010 | |
| Maintenance | 5020 | |
| Outside corrugation | 5030 | |
| Production cost / Accessories | 5040 | |
| Purchases / Carriage inward | 5050 | |
| Admin / Office / HQ / Welfare / Security / Others | 6120 | Others requires 40-char justification |
| Admin salary | 6110 | |
| Pension | 2400 | **Liability** — not expense |
| Staff loan | 1200 | **Asset** — not expense |
| Chairman withdrawal | 3200 | **Equity draw** — not expense |
| Capex categories | 1500–1504 | Auto-registers fixed asset on full payment |

### 3.3 "Others" Expense Controls

| Control | Threshold |
|---------|-----------|
| Minimum justification | 40 characters |
| Finance review flag | > ₦50,000 |
| AP3 unclassified alert | > ₦100,000 |
| Branch coaching alert | >15% of branch expenses |

---

## 4. ACCOUNTING PHASES (AP1c → AP2 → AP3)

### 4.1 AP1c — Production Recognition

**Policy V1:** Revenue recognised at **production completion**, not delivery or invoice date.

On production job completion, system auto-posts:
- Dr Accounts Receivable (customer ledger)
- Cr Sales Revenue (4000)

On receipt clearance:
- Dr Cash/Bank (1000)
- Cr Accounts Receivable

**Dry-run:** Accounting desk → AP1c → run dry-run before go-live.

### 4.2 AP2 — Received-Basis AP + Inventory

- Payables recognised at **GRN** (not payment date)
- Inventory valued at **landed cost** (including carriage inward)
- Supplier advances tracked; applied on GRN
- Diagnostics: `/accounting` → AP2 → supplier advance report

### 4.3 AP3 — Branch P&L + Material Costing

- Standard vs actual material cost per production job
- Payroll labour allocated per job
- Branch P&L draft report
- Costing readiness check before relying on branch margin reports

**Migration rule:** AP3 requires AP2 requires AP1c. Coordinate with MD before phase activation.

---

## 5. BANK RECONCILIATION

### 5.1 Procedure

1. **Accounting** → Reconciliation tab (or `/accounts/bank-reconciliation` redirect).
2. Import bank statement:
   - **CSV:** `bankDateISO,description,amountNgn` with optional header
   - **JSON:** up to 500 lines per batch via `POST /api/bank-reconciliation/import`
3. System fingerprints lines (`bankReconFingerprint.js`) to detect duplicates.
4. Match each line to:
   - Customer receipts (cleared)
   - Expense payments
   - Supplier payments
   - Inter-branch transfers
5. Mark unmatched lines as **Review** for investigation.
6. Weekly: Finance lead reviews all Review lines.
7. Month-end: zero unmatched lines or documented carry-forward.

### 5.2 Control Tie-Out

Run control tie-out report: GL cash balance must equal reconciled bank balance. Discrepancies block period lock.

---

## 6. PAYABLES RECONCILIATION

**Three-way match (month-end):**

| Leg | Source |
|-----|--------|
| Ordered | PO line quantities × prices |
| Received | GRN postings |
| Paid | Supplier payment treasury movements |

1. Run purchase register report (by received date).
2. Compare AP2 supplier diagnostics for unmatched advances.
3. Resolve short receipts with Procurement (MD notified on coil shorts).

---

## 7. RECEIVABLES AND WRITE-OFFS

### 7.1 Debtors Register

Accounting desk → Creditors/Debtors → Debtors (AR) sub-ledger.

Review aging: outstanding balances, days overdue.

### 7.2 Write-Off Policy

Receivable write-offs above configured threshold require MD approval (`receivableWriteOffPolicy.js`).

**Procedure:**
1. Document customer insolvency, legal pursuit exhaustion, or board decision.
2. MD approves write-off on quotation/customer record.
3. Post adjusting journal or use register settlement workflow.
4. Audit trail mandatory.

---

## 8. FIXED ASSETS AND DEPRECIATION

### 8.1 Asset Creation

- **Manual:** Finance creates in Accounting → Assets
- **Automatic:** Capex expense fully paid → `fixedAssetAutomationOps.js` registers asset

| Category | GL | Useful Life |
|----------|-----|-------------|
| Plant & machinery | 1500 | 60 months |
| Land & buildings | 1501 | 240 months |
| Furniture & fittings | 1502 | 84 months |
| Generator | 1504 | 60 months |

### 8.2 Depreciation Run

Monthly (month-end):
1. Run depreciation via `depreciationRunOps.js`
2. Posts: Dr Depreciation (6100), Cr Accumulated Depreciation
3. Verify in trial balance before period lock

### 8.3 Disposal

1. Finance initiates disposal with sale/scrap value
2. GL: Dr Accumulated Depreciation + Dr Cash, Cr Asset Cost, Cr/Dr Gain/Loss
3. Asset removed from active register

---

## 9. INTER-BRANCH LOANS

Cross-branch cash funding recorded as inter-branch loans (not expense):

1. Finance proposes loan: lending branch → borrowing branch
2. MD approves (`inter_branch_loan.md_approve`)
3. Status: proposed → md_approved → executed
4. Repayments tracked until settlement
5. Both branches see loan on treasury reports

---

## 10. REGISTER SETTLEMENTS

Creditor/debtor register lines follow: propose → review → decision → pay

1. Open register line in Accounting desk
2. Propose settlement amount and method
3. Reviewer confirms
4. Finance executes payment
5. Each step tracked in `accounting_register_settlements`

---

## 11. PAYROLL FINANCE HANDOFF

After HR payroll chain complete:

1. Verify payroll run **locked** with MD approval (`md_approved_at_iso` recorded)
2. **Accounting** → Payroll tab
3. Export bulk bank file (`hr.payroll.export`)
4. Execute bank transfers
5. Post treasury movements
6. GL journal CSV: salary expense, PAYE, pension, net pay

**Gate:** Payroll cannot lock without GM HR **or** MD approval; cannot pay without lock.

---

## 12. MONTH-END CLOSE CHECKLIST

| Step | Action | Sign-off |
|------|--------|----------|
| 1 | Stock register locked (all branches) | MD |
| 2 | Bank reconciliation complete | Finance Manager |
| 3 | Payables three-way match | Finance Manager |
| 4 | Receivables aging reviewed | Finance Manager + MD |
| 5 | Depreciation run posted | Finance Manager |
| 6 | AP1c/AP2/AP3 diagnostics clean | Finance Manager |
| 7 | Trial balance in balance | Finance Manager |
| 8 | **Period lock** (`period.manage`) | Finance Manager |
| 9 | Management reports pack generated | Finance Manager → MD |

**Period lock:** `assertPeriodOpen()` blocks all back-dated posts to locked `YYYY-MM`.

---

## 13. MANAGEMENT REPORTS

Route: `/reports` (requires `reports.view`)

| Report | Purpose |
|--------|---------|
| Receipts register | All cleared receipts by period |
| AR as-at | Outstanding customer balances |
| Sales bridge | Quote-to-cash reconciliation |
| Expenses pack | By category and branch |
| Refunds pack | All refunds by status |
| Purchase register | PO/GRN/payment |
| Stock coil as-at | Coil inventory snapshot |
| Governance pack | Dual-control warnings, gate breaches |
| MD operations pack | Executive summary |
| Daily / weekly pack | Cadence reports |

---

## 14. RECEIPT CORRECTIONS (FINANCE AUTHORITY)

1. Identify error from exception queue
2. Gather bank/cash evidence
3. **Reverse** mistaken posting — `POST /api/ledger/reverse-receipt`
4. Verify treasury net corrected
5. **Re-post** true amount only
6. Confirm quotation `paidNgn` syncs via `syncQuotationPaidFromReceipts`
7. Close queue item with audit note

**Split correction:** `POST /api/ledger/correct-receipt-split` for allocation errors.

---

## 15. DAILY / WEEKLY CADENCE

**Daily:** Clear payment exception queue; review new uncleared receipts aging >24h.

**Weekly:** Bank reconciliation Review lines; aged exception report (>7 days) to Finance lead.

**Monthly:** Full close checklist §12.

---

*End of SOP-03. Cross-references: SOP-02 (Cashier), SOP-06 (Procurement AP), SOP-07 (Payroll).*
