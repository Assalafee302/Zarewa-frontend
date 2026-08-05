# ANNEX F: ACCOUNTING POLICIES & FINANCIAL REPORTING MANUAL

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Authority:** Finance Manager + MD approval  
**Reference:** `docs/ACCOUNTING_POLICY_AP1C.md`, `docs/ACCOUNTING_POLICY_AP3_COSTING.md`

---

## F.1 ACCOUNTING POLICY OVERVIEW

Zarewa operates a three-phase accounting model implemented in the ERP:

| Phase | Name | Status | Key Principle |
|-------|------|--------|---------------|
| AP1c | Production Recognition | Active (Policy V1) | Revenue at production completion |
| AP2 | Received-Basis AP + Inventory | Active | Payables at GRN; landed cost inventory |
| AP3 | Branch P&L + Material Costing | Progressive rollout | Standard vs actual cost per job |

Phases are additive: AP3 requires AP2 requires AP1c.

---

## F.2 POLICY V1 — REVENUE RECOGNITION (AP1c)

### F.2.1 Principle

Revenue is recognised when the company has completed production of goods for the customer — not when:
- Cash is received (cash basis)
- Goods are delivered (delivery basis)
- Invoice is issued (invoice basis)

### F.2.2 Journal Entries

**At production job completion:**
```
Dr  Accounts Receivable (customer sub-ledger)    XXX
    Cr  Sales Revenue (4000)                         XXX
```
Amount = produced metres × agreed unit price (from quotation snapshot).

**At receipt clearance:**
```
Dr  Cash/Bank (1000)                              XXX
    Cr  Accounts Receivable                          XXX
```

**At customer advance receipt (before production):**
```
Dr  Cash/Bank (1000)                              XXX
    Cr  Customer Advances (2500)                     XXX
```

**At advance applied to quotation:**
```
Dr  Customer Advances (2500)                      XXX
    Cr  Accounts Receivable                          XXX
```

### F.2.3 Implications for Management Reporting

| Report | What It Shows |
|--------|---------------|
| Sales (produced, MTD) | Revenue from completed jobs — may exceed cash collected |
| Cash & bank (cleared) | Actual money in treasury |
| AR as-at | Customers who owe after production recognition |
| Sales bridge | Reconciles quote → production → cash |

**MD and BM must understand:** Strong production month may show high revenue before cash collection follows.

### F.2.4 Refund Interaction with AP1c

Refunds reduce customer AR balance. If refund for unproduced metres after revenue recognised:
- Refund reverses portion of recognised revenue
- GL impact via refund posting workflow
- Production alignment check ensures metres claim matches job records

---

## F.3 AP2 — RECEIVED-BASIS ACCOUNTS PAYABLE

### F.3.1 Principle

Supplier liabilities recognised at goods receipt (GRN), not at payment date.

### F.3.2 Journal at GRN

```
Dr  Inventory (1300)                              XXX
    Cr  Accounts Payable — Suppliers (2000)          XXX
```
At landed cost including allocated carriage inward.

### F.3.3 Supplier Payment

```
Dr  Accounts Payable (2000)                       XXX
    Cr  Cash/Bank (1000)                             XXX
```

### F.3.4 Supplier Advances

Pre-payment before GRN:
```
Dr  Supplier Advance (asset/sub-ledger)           XXX
    Cr  Cash/Bank (1000)                             XXX
```

On GRN, advance applied:
```
Dr  Accounts Payable (2000)                       XXX
    Cr  Supplier Advance                             XXX
    Cr  Cash/Bank (if balance due)                   XXX
```

### F.3.5 AP2 Diagnostics

Monthly run from Accounting desk:
- Unmatched supplier advances
- GRNI aging (received not paid)
- Inventory GL alignment check

---

## F.4 AP3 — MATERIAL COSTING AND BRANCH P&L

### F.4.1 Purpose

Allocate true production cost per metre for branch profitability analysis.

### F.4.2 Cost Components per Production Job

| Component | Source |
|-----------|--------|
| Coil material | Coil kg consumed × landed cost/kg |
| Accessories | Issues from stock at standard cost |
| Stone flatsheet | Sheets consumed × unit cost |
| Direct labour | Payroll hours allocated per job (progressive) |
| Overhead allocation | Configurable % or activity-based |

### F.4.3 Standard vs Actual

| Metric | Calculation |
|--------|-------------|
| Standard cost/m | From `product_standard_costs` and conversion table |
| Actual cost/m | Total job cost ÷ produced metres |
| Variance | Actual - Standard |
| Variance % | Variance ÷ Standard × 100 |

Report: Accounting → AP3 → Material cost report.

### F.4.4 Branch P&L Structure

| Line | Source |
|------|--------|
| Revenue | AP1c production recognition by branch |
| COGS | AP3 job costs + accessory issues |
| Gross profit | Revenue - COGS |
| Operating expenses | Expense categories by branch |
| Net branch contribution | Gross profit - OpEx |

**Note:** Inter-branch loans and HQ allocations may require manual adjustment entries.

---

## F.5 INVENTORY VALUATION

### F.5.1 Coil Inventory

- Valued at landed cost per kg
- `qty_remaining` × unit cost/kg
- Month-end snapshot: `inventory_coil_snapshots`

### F.5.2 Finished Goods

- Standard cost or last production cost per SKU
- `inventory_product_snapshots` at month-end

### F.5.3 WIP

- Open production jobs: coil cost in WIP balance
- Closed at job completion to COGS

### F.5.4 Closing Stock Entry (perpetual inventory)

Zarewa posts inventory **perpetually** (GRN Dr 1300 / Cr 2100; scrap and production COGS Cr 1300). Therefore stock register **lock does not re-capitalise full closing stock** into 1300 (that would double-count).

At stock register **capture & lock**:
1. Freeze `inventory_coil_snapshots` / `inventory_product_snapshots` and store closing valuation on the period.
2. Post **count variance** only when BM physical overrides change valued quantity:
```
Shortage:  Dr  Inventory count variance (5055)     XXX
               Cr  Raw materials inventory (1300)       XXX

Surplus:   Dr  Raw materials inventory (1300)       XXX
               Cr  Inventory count variance (5055)      XXX
```
3. Manual SKU **Adjust** posts the same 5055 ↔ 1300 pattern when a unit cost is available.
4. **Accounting period lock** remains a separate Finance control (blocks backdated GL). Month-end close checklist tracks both **stock register locked** and **period locked**.

Finance Manager may still prepare management “opening/closing stock” schedules from locked snapshots for board packs without changing the perpetual GL method.

---

## F.6 FIXED ASSET ACCOUNTING

### F.6.1 Capitalisation Threshold

Expenditure capitalised as fixed asset when:
- Category is capex (Land, Plant, Furniture, Generator)
- Amount exceeds materiality threshold (per finance policy)
- Future economic benefit >1 year

Auto-capitalisation on full payment for configured capex expense categories.

### F.6.2 Depreciation Methods

Straight-line over useful life:
- Plant & machinery: 60 months
- Land & buildings: 240 months
- Furniture: 84 months
- Generator: 60 months

### F.6.3 Disposal Accounting

```
Dr  Accumulated Depreciation                     XXX
Dr  Cash (proceeds)                               XXX
Dr  Loss on disposal (if loss)                     XXX
    Cr  Asset cost (150x)                            XXX
    Cr  Gain on disposal (if gain)                   XXX
```

---

## F.7 CUSTOMER LEDGER ACCOUNTING

### F.7.1 Ledger Entry Types

| Type | Meaning |
|------|---------|
| RECEIPT | Customer payment against quotation |
| ADVANCE_IN | Deposit before quotation |
| ADVANCE_APPLIED | Advance applied to quotation |
| ADVANCE_REFUND | Advance returned to customer |
| OVERPAY_ADVANCE | Excess payment held as advance |
| OVERPAY_APPLIED | Overpayment applied |
| REFUND_* | Refund-related entries |

### F.7.2 Quotation paid_ngn Derivation

**Critical rule:** `quotations.paid_ngn` derived **only from sales receipts** — not bank reconciliation directly.

Function: `syncQuotationPaidFromReceipts` — run if discrepancy suspected.

### F.7.3 Customer Statement

Generated from customer dashboard ledger history:
- Opening balance
- Production recognition (AR increase)
- Receipts (AR decrease)
- Refunds
- Closing balance

---

## F.8 TREASURY ACCOUNTING

### F.8.1 Treasury Movement Sources

| source_kind | Description |
|-------------|-------------|
| RECEIPT | Customer receipt clearance |
| REFUND_PAYOUT | Customer refund payment |
| EXPENSE | Payment request payout |
| SUPPLIER_PAYMENT | PO supplier payment |
| TRANSFER | Inter-account transfer |
| PAYROLL | Salary disbursement |
| INTER_BRANCH | Inter-branch loan movement |

### F.8.2 Treasury Balance

Each `treasury_accounts` record maintains running balance from cleared movements.

**Daily check:** Sum of treasury accounts = GL 1000 balance (after reconciliation).

---

## F.9 FINANCIAL REPORTING CALENDAR

| Report | Frequency | Owner | Distribution |
|--------|-----------|-------|--------------|
| Daily pack | Daily | Finance | MD |
| Cash position | Daily | Cashier/Finance | BM, MD |
| Weekly pack | Weekly | Finance | MD, Board |
| Branch scorecard | Monthly | Finance | MD, BMs |
| Trial balance | Monthly | Finance | MD, Auditor |
| Management accounts | Monthly | Finance | Board |
| AR aging | Monthly | Finance | MD, Sales |
| AP aging | Monthly | Finance | MD, Procurement |
| Stock valuation | Monthly | Finance + Operations | MD |
| Payroll summary | Per run | HR + Finance | MD |
| Annual accounts | Yearly | External auditor | Board, FIRS |

---

## F.10 CHART OF ACCOUNTS MAINTENANCE

New GL accounts require:
1. Finance Manager proposal with account code, name, type
2. MD approval for income statement impact
3. IT/Admin seeds in `gl_accounts` table
4. Update expense category mapping if applicable
5. Update this SOP appendix

**No user-created GL accounts without Finance Manager authority.**

---

## F.11 PERIOD CLOSE DETAILED CHECKLIST

### Day T-5 (Before Month End)
- [ ] Notify all branches: no backdated posts after T+2 without approval
- [ ] Chase open GRNs — post all received goods
- [ ] Chase open production jobs — complete or document WIP carry
- [ ] HR confirms payroll data final if pay period

### Day T (Last Business Day)
- [ ] Final receipts and payments posted
- [ ] Operations completes deliveries in transit
- [ ] Stock register physical count begins

### Day T+1 to T+3
- [ ] Stock register 4-stage sign-off
- [ ] Bank reconciliation completed
- [ ] Depreciation run
- [ ] AP2/AP3 diagnostics
- [ ] Manual accrual journals

### Day T+5 (Target)
- [ ] Trial balance review
- [ ] MD reviews branch scorecard
- [ ] **Period lock**
- [ ] Reports pack distributed

---

## F.12 TAX AND STATUTORY FILING

| Obligation | Frequency | Data Source | Owner |
|------------|-----------|-------------|-------|
| PAYE remittance | Monthly | Payroll export | Finance |
| Pension remittance | Monthly | Payroll export | Finance |
| VAT (if applicable) | Monthly | GL / invoices | Finance |
| WHT certificates | Per payment | Payment register | Finance |
| Annual tax return | Yearly | Trial balance + adjustments | External accountant |

---

*End of Annex F — Accounting Policies*
