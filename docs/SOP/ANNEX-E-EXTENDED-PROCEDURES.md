# ANNEX E: EXTENDED DEPARTMENT PROCEDURES & TROUBLESHOOTING

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**

---

## E.1 SALES OFFICE — EXTENDED PROCEDURES

### E.1.1 Quotation Line Types Reference

| Category | Unit | Pricing Basis | Production Link |
|----------|------|---------------|-----------------|
| Long-span aluzinc | metres | ₦/m from price list | Cutting list → coil job |
| Step-tile aluzinc | metres | ₦/m | Cutting list → coil job |
| Stone-coated | sheets / m² | ₦/sheet or converted | Stone flatsheet usage |
| Ridge / flashing | metres or pieces | ₦/unit | Accessory fulfillment |
| Gutter / accessory | pieces | ₦/unit | Accessory fulfillment |
| Transport | lump sum | Quoted | No production |
| Installation | lump sum | Quoted | No production |

### E.1.2 Quotation Validity Management

1. Default validity: 30 days from quotation date (configurable per quotation).
2. System generates follow-up alert at 7 days before expiry.
3. Sales officer actions before expiry:
   - Contact customer (log CRM interaction)
   - Extend validity (edit quotation if not locked)
   - Archive if customer declined
4. Expired quotations cannot release cutting list without BM reactivation.

### E.1.3 Multi-Branch Sales Scenarios

**Customer in Kaduna, production at Yola:**
1. Quotation created at Kaduna (BR-KD) — branch-scoped.
2. Cutting list issued at Kaduna.
3. Yola operations sees cutting list if shared via org policy or inter-branch workflow.
4. Production job created at Yola (BR-YOL).
5. Delivery may be from Kaduna stock or in-transit from Yola.

**Branch bar:** Always confirm which branch owns the customer and quotation before posting.

### E.1.4 Sales Troubleshooting

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| "Cutting list blocked — payment" | Paid % below branch threshold | Post more receipts or BM production override |
| "Cutting list blocked — price exception" | Below-floor price without MD approval | MD price exception approval |
| "Duplicate customer phone" | Phone exists on another customer | Search existing; do not create duplicate |
| "Quotation locked" | Edit approval required | Request 6-digit code from BM |
| "Refund blocked — uncleared receipts" | Receipts pending clearance | Cashier must clear first |
| "Order cancellation blocked" | Production completed | Use Unproduced meterage or Other with evidence |

---

## E.2 CASHIER DESK — EXTENDED PROCEDURES

### E.2.1 Treasury Account Selection Guide

| Payment Method | Treasury Account |
|----------------|------------------|
| Cash at office | Cash Safe — [Branch Name] |
| Bank transfer | Designated collection account (GTBank, Access, etc.) |
| POS card payment | POS settlement account |
| Cheque | Cheque clearing account (if configured) |

**Wrong account selection:** Reverse receipt; re-post to correct account. Do not leave misclassified.

### E.2.2 Partial Receipt Scenarios

**Customer pays in instalments:**
1. Each instalment = separate receipt line on same quotation.
2. Never combine two physical payments into one receipt with wrong date.
3. Payment status updates cumulatively: Partial until ≥99.5% paid.

**Customer overpays:**
1. Post full amount received.
2. System may create overpayment balance.
3. Options: apply to next quotation, refund overpayment, or hold as advance.

### E.2.3 End-of-Day Reconciliation Form (Paper Backup)

| Field | Value |
|-------|-------|
| Date | |
| Cashier name | |
| Opening cash balance (system) | ₦ |
| Opening cash balance (physical) | ₦ |
| Total receipts confirmed today | ₦ |
| Total payouts today | ₦ |
| Closing cash balance (system) | ₦ |
| Closing cash balance (physical) | ₦ |
| Variance | ₦ |
| Signed | Cashier / BM |

Retain paper form 90 days even when system reconciled.

### E.2.4 Cashier Troubleshooting

| Issue | Resolution |
|-------|------------|
| Cannot confirm receipt | Verify `cashier.receipts.confirm` permission |
| Refund pay button disabled | Check approver ≠ you; verify Approved status |
| Treasury balance negative | Escalate Finance Manager — data or sequencing error |
| Duplicate receipt error | Verify not already posted; use override only with BM approval |
| Period closed error | Finance must open period or use current date |

---

## E.3 ACCOUNTING DESK — EXTENDED PROCEDURES

### E.3.1 Manual Journal Entry

When required (corrections, accruals, reclassifications):

1. Accounting desk → GL → Manual journal.
2. Enter period key (YYYY-MM) — must be open.
3. Add lines: account code, debit/credit, description, reference.
4. **Debits must equal credits.**
5. Post → journal ID assigned.
6. Document supporting memo in office dossier.

**Restrictions:** No manual journals to Revenue (4000) for customer sales — use AP1c production path.

### E.3.2 Opening Pack (New Branch / Cutover)

For new branch go-live or accounting cutover:

1. Accounting → Opening Pack.
2. Register roll-up: enter opening balances per GL account.
3. Capital entry if applicable.
4. One balanced journal post to establish opening position.
5. Verify trial balance before first operational posting.

### E.3.3 AP1c Dry-Run Procedure

Before enabling AP1c in production:

1. Accounting → AP1c → Dry run.
2. Select date range with completed production jobs.
3. Review proposed GL entries without posting.
4. Compare to expected revenue from production report.
5. Resolve discrepancies with IT if systematic.
6. MD and Finance Manager sign cutover memo.
7. Enable AP1c posting.

### E.3.4 Month-End Journal Entries (Standard)

| Entry | Dr | Cr | Trigger |
|-------|----|----|---------|
| Depreciation | 6100 | Accumulated Dep | Depreciation run |
| Closing stock | 1300 | 5050 | Stock register lock |
| Payroll accrual | 6000/6110 | Various | Payroll lock |
| Pension accrual | 6110 | 2400 | Payroll lock |
| Bank charges | 6170 | 1000 | Bank rec |

---

## E.4 OPERATIONS — EXTENDED PROCEDURES

### E.4.1 Coil Specification Matching

Before allocating coil to job, verify:

| Quotation Spec | Coil Lot Spec | Match Required |
|----------------|---------------|----------------|
| Gauge 0.45 mm | Gauge 0.45 mm | Exact |
| Charcoal Grey | Charcoal Grey | Exact (or approved substitute) |
| Long-span profile | Compatible profile | Per substitution rules |
| Aluzinc | Aluzinc or aluminium | Per quotation line |

**Substitution:** If coil colour/gauge substituted, sales must document on quotation; may affect refund if price difference.

### E.4.2 Stone-Coated Production

1. Stone lines tracked in sheets; system converts via `stoneFlatsheetSheetsToM2`.
2. `production_job_stone_flatsheet_usage` records consumption.
3. Stone inventory separate from coil register.
4. GRN stone materials via Procurement stone PO.

### E.4.3 Accessory Fulfillment

1. `production_job_accessory_usage` links accessories to job.
2. Partial fulfillment across multiple deliveries supported.
3. Shortfall may trigger refund category Accessory shortfall.

### E.4.4 Yard Coil vs Store Coil

- **Yard coils:** `yard_coils` — outdoor storage register
- **Store coils:** `coil_lots` — production-ready register
- Transfer yard → store via coil control event before production allocation.

---

## E.5 PRODUCTION — EXTENDED PROCEDURES

### E.5.1 Conversion Variance Deep Dive

Theoretical metres = coil kg consumed ÷ standard kg/m (from conversion table per gauge).

| Variance % | Band | Required Action |
|------------|------|-----------------|
| 0–3% | OK | Complete normally |
| 3–5% | OK (watch) | Note on completion |
| 5–10% | High or Low | Select reason; BM/QCO sign-off |
| >10% | High or Low | Mandatory investigation; material incident if defect |

### E.5.2 Multi-Coil Jobs

Large orders may span multiple coils:

1. Allocate coil 1 → partial production → return unused kg.
2. Allocate coil 2 → continue until total metres reached.
3. Each allocation logged in `production_job_coils`.
4. Total consumption = sum across coils.

### E.5.3 Job Cancellation

If production cannot complete (coil defect, machine breakdown):

1. Cancel job with reason (requires manager).
2. Release coil reservations.
3. WIP reversed per AP3 rules.
4. Sales notified for customer communication.
5. May trigger refund or re-scheduling.

---

## E.6 PROCUREMENT — EXTENDED PROCEDURES

### E.6.1 Supplier Evaluation Criteria

Before adding new supplier to master:

| Criterion | Documentation |
|-----------|---------------|
| Company registration | CAC certificate |
| Tax compliance | TIN verification |
| Quality certification | Mill test certificates for coil |
| Bank verification | Bank letter or cancelled cheque |
| Reference customers | Minimum 2 references |
| Price competitiveness | Comparison to 2 other quotes |

MD approves new strategic suppliers.

### E.6.2 Coil PO Specification Template

Every coil PO line must specify:
- Gauge (mm)
- Colour RAL or trade name
- Profile/design
- Total kg
- Price per kg (₦)
- Origin/mill if required
- Expected coil count (rolls)
- Tolerance (+/- % on weight)

### E.6.3 Transport Agent Management

1. Register agent with bank details and coverage routes.
2. Link to PO transport field.
3. Haulage cost part of landed cost (AP2).
4. Transport catch-up tab reconciles in-transit vs agent invoices.

---

## E.7 HR — EXTENDED PROCEDURES

### E.7.1 Probation Review

At probation end (default 6 months):

1. HR Dashboard alerts approaching probation end.
2. Line manager submits performance assessment.
3. HR Admin records outcome:
   - Confirm permanent employment
   - Extend probation (max 3 months additional)
   - Terminate (initiate exit clearance)
4. Update `probation_end_date` and employment status.

### E.7.2 ID Card Request

1. Employee → My HR → ID card → Request.
2. HR verifies photo and details.
3. Generate card from HR Documents hub.
4. Record issuance date; charge replacement fee if lost (per policy).

### E.7.3 Scholarship Staff (hr_portal_only)

Mining division / scholarship cohort:
- Access only `/my-profile` scholarship sections
- Cannot access sales, operations, finance modules
- School fee requests via dedicated workflow
- Chairman/Executive HR approves payments

### E.7.4 Domestic Staff (Executive HR)

Chairman/CEO household staff:
- Managed under Executive HR → Family
- Separate payment workflow
- Not on branch payroll runs
- Confidential records

---

## E.8 EXECUTIVE — EXTENDED PROCEDURES

### E.8.1 Setting Branch Sales Targets

1. MD → Settings → Governance → Org manager targets.
2. Set monthly sales target (₦) and production metres target per branch.
3. Targets appear on Manager Dashboard pulse and Command Centre scorecard.
4. Review monthly; adjust quarterly for seasonality.

### E.8.2 Credit Policy Configuration

1. Settings → Governance or org_policy_kv.
2. Set `CREDIT_BRANCH_MANAGER_LIMIT_NGN`.
3. Set `CREDIT_MD_REQUIRED_ABOVE_NGN`.
4. Set default and maximum credit terms days.
5. Communicate to all sales staff via official notice.

### E.8.3 Executive Benefit Payment Workflow

```
draft → submitted → finance_review → md_review → approved → exported → paid
```

Chairman family expenses and school fees follow this chain with `hr.chairman.manage`.

---

## E.9 CROSS-DEPARTMENT ESCALATION MATRIX

| Issue | First Contact | Escalation | Final |
|-------|---------------|------------|-------|
| System down | IT Admin | MD | External vendor |
| Receipt dispute | Cashier | Finance Manager | MD |
| Production delay | Operations | BM | MD |
| Refund dispute | Sales | BM | MD |
| HR grievance | HR Admin | GM HR | MD |
| Supplier quality | Procurement | MD | Legal |
| Coil theft suspicion | Operations | BM + HR | MD + Police |
| Period lock dispute | Finance | MD | Board |

---

## E.10 TRAINING PROGRAM OUTLINE

### Week 1 — All Staff
- Sign in, password, branch selection
- Workspace navigation, official notices
- My HR self-service
- Zare introduction

### Week 2 — Role Specific
- Department SOP for assigned role
- Role training guide completion
- Supervised transaction entry

### Week 3 — Competency
- Checklist sign-off by supervisor
- Independent operation with spot checks

### Quarterly Refresher
- Governance updates
- New feature briefing
- Fraud awareness

---

*End of Annex E — Extended Procedures*
