# SOP-02: CASHIER DESK

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Department:** Finance — Cashier Desk  
**System modules:** `/accounts` (Desk, Receipts, Movements tabs)  
**Primary role:** `cashier`  
**Supporting roles:** `finance_manager`, `md`

---

## 1. PURPOSE AND SCOPE

### 1.1 Purpose

The Cashier Desk is the physical and system control point for all cash and bank money entering and leaving Zarewa at branch level. The cashier confirms that money recorded in the system matches money actually received or paid. This SOP ensures every receipt is cleared before entering financial reports, every payout is properly authorised, and daily cash balances reconcile to treasury accounts.

### 1.2 Scope

- Receipt confirmation and clearance
- Customer receipt posting (where cashier holds `receipts.post`)
- Advance deposit recording
- Bank deposit registration and allocation
- Refund payment execution (after approval)
- Payment request / expense payout execution
- Treasury transfers between accounts
- Staff obligation cash repayments
- End-of-day cash reconciliation

**Out of scope:** GL journals, bank reconciliation, period close (SOP-03 Accounting Desk).

### 1.3 Segregation of Duties

| Cashier CAN | Cashier CANNOT |
|-------------|----------------|
| Post receipts | Approve refunds (`refunds.approve` removed in Phase 11A) |
| Confirm receipt clearance | Approve payment requests above own authority |
| Pay approved refunds | Access Accounting desk (`/accounting`) |
| Execute treasury payouts | Lock accounting periods |
| Request refunds | Approve own refund requests |
| Process staff cash repayments | Reconcile bank statements (Accounting desk) |

**Critical:** Refund requester ≠ approver ≠ payer (when `ENFORCE_DUAL_CONTROL_PAYMENTS=1`).

---

## 2. SYSTEM ACCESS

### 2.1 Navigation

1. Sign in → auto-routes to `/accounts` (Finance module).
2. Sidebar shows **Finance desk** (not "Sales" or "Accounting").
3. Available tabs for cashier:
   - **Desk** — work queues (refunds awaiting payment, payouts, staff recovery)
   - **Receipts** — confirm payment received
   - **Movements** — fund transfers between treasury accounts

Accountant tabs (Payment register, Audit) are hidden or read-only for cashier role.

### 2.2 Permissions Required

| Permission | Purpose |
|------------|---------|
| `cashier.desk.view` | Access cashier desk queues |
| `cashier.receipts.confirm` | Confirm receipt clearance |
| `receipts.post` | Post new receipts (if delegated from sales) |
| `finance.pay` | Execute payouts |
| `refunds.request` | Initiate refund requests (not approve) |
| `treasury.manage` | Treasury account operations |

---

## 3. DAILY CASHIER ROUTINE

### 3.1 Opening Procedures (Start of Day)

1. Sign in; confirm workspace branch.
2. Open **Finance** → **Desk** tab.
3. Review overnight queue:
   - Refunds approved awaiting payment
   - Payment requests approved awaiting payout
   - Staff recovery items
4. Open **Finance** → **Receipts** tab.
5. Review **Pending clearance** receipts from previous day/sales postings.
6. Count physical cash in safe(s); note opening balance.
7. Compare to treasury cash account balance in system.
8. Report discrepancies to Branch Manager immediately — do not proceed with postings until resolved.

### 3.2 During the Day

- Process receipt confirmations as sales post new payments
- Execute approved payouts promptly (same day where possible)
- Register bank deposits as bank statement credits arrive
- Process treasury transfers as directed by Finance Manager

### 3.3 Closing Procedures (End of Day)

1. Confirm all physical receipts received today are posted and cleared in system.
2. Count closing cash balance in safe(s).
3. Compare to treasury cash account — must match.
4. Clear any remaining pending receipts or escalate with note.
5. Review Desk queue — no approved items should remain unpaid without documented reason.
6. Report daily summary to Branch Manager if required by branch policy.

---

## 4. RECEIPT CONFIRMATION

### 4.1 Receipt Lifecycle

```
Sales/Cashier posts receipt → Pending clearance → Cashier confirms → Cleared → In reports/GL
```

**Critical rule:** Only **confirmed (Cleared)** receipts are recognised in ledger and financial reports. Unconfirmed receipts remain in cashier pending queue — invisible to management reports.

### 4.2 Posting a New Receipt

**When:** Customer payment received (cash, transfer, cheque, POS).

**Procedure:**

1. Obtain quotation reference or customer name from sales/customer.
2. Open quotation in **Finance** → **Receipts** (or Sales → Payments if cross-trained).
3. Review **blue history section** — already-posted receipts are read-only.
4. In editable section, enter **only today's new money**:
   - **Amount (₦)**
   - **Payment date**
   - **Treasury account** — select correct cash safe or bank account
   - **Reference text** — transfer ref, POS slip number, cheque number, depositor name
5. **High-value control:** Amounts ≥ ₦100,000 require typing the amount twice.
6. Click **Post Receipt**.
7. System creates:
   - Ledger entry (type RECEIPT)
   - Sales receipt record (status: Pending clearance)
   - Treasury movement (pending)
8. Note receipt ID (e.g., RCP-KD-26-0088) for customer acknowledgement.

**Duplicate detection:** System blocks same quotation/amount/date combination. Override only with valid reason — audit captures override.

### 4.3 Confirming Receipt Clearance

**When:** Bank/cash evidence verified — money is physically in account.

**Procedure:**

1. **Finance** → **Receipts** tab.
2. Filter or locate **Pending clearance** items.
3. For each receipt:
   - Verify amount matches bank alert, deposit slip, or cash count
   - Verify customer and quotation reference
   - Verify treasury account selection was correct
4. Click **Confirm Payment Received**.
5. API: `PATCH /api/sales-receipts/:id/bank-confirmation` with `{ confirmed: true }`
6. Status changes to **Cleared**.
7. Treasury movement finalised; GL auto-posted (AP1c):
   - Dr Cash/Bank (1000)
   - Cr Accounts Receivable

**If evidence does not match:**
- Do not confirm
- Contact sales officer or customer for clarification
- If wrong posting: escalate to Finance Manager for reversal (SOP-03) — never edit cleared receipt

### 4.4 Receipt Clearance and Refunds

**Refunds on a quotation are blocked until all receipts on that quote are Cleared.**

Before processing refund payment, verify all quotation receipts show Cleared status.

---

## 5. ADVANCE DEPOSITS

### 5.1 Customer Advance (Payment Before Quotation)

**Procedure:**

1. Customer pays without active quotation.
2. **Finance** → select customer → **Record Advance**.
3. Enter amount, date, treasury account, reference.
4. Post → creates `ADVANCE_IN` ledger entry.
5. Customer advance balance visible on customer dashboard.

### 5.2 Applying Advance to Quotation

1. When quotation created, open **Link Advance** on quotation or customer dashboard.
2. Select advance deposit(s) to apply.
3. System creates `ADVANCE_APPLIED` entries; reduces quotation balance due.

### 5.3 Refunding Advance

If customer requests return of unapplied advance:

1. Finance Manager approves advance refund.
2. Cashier executes via treasury payout.
3. Creates `ADVANCE_REFUND` or equivalent ledger entry.

---

## 6. BANK DEPOSIT WORKFLOW

### 6.1 Purpose

Unlinked bank credits on the bank statement (not yet tied to a customer receipt) are registered in the Bank Deposit pool, then allocated to their source.

### 6.2 Registering a Bank Deposit

1. Bank statement shows credit not matching any receipt.
2. **Finance** → Bank deposit register (or Accounting desk for complex cases).
3. Create new deposit:
   - Amount, date, bank account
   - Description from bank statement
4. Assigns ID: `BD-KD-26-0003`
5. Status: **OPEN**

### 6.3 Allocating Deposits

| Status | Meaning |
|--------|---------|
| OPEN | Registered, not linked |
| RESERVED | Temporarily reserved (30-min window) |
| PARTIAL | Partially linked |
| ALLOCATED | Fully linked to receipts/advances |
| RECLASSIFIED | Non-sales: expense_offset, inter_branch, refund_out, other_income |
| REVERSED | Bank error or returned transfer |

**Procedure to allocate:**

1. Open deposit → **Allocate**.
2. Link to customer receipt(s) or advance deposit(s).
3. Confirm allocation amounts sum to deposit total.
4. Status → ALLOCATED.

---

## 7. REFUND PAYMENT

### 7.1 Prerequisites

Before paying any refund:

- [ ] Refund status = **Approved**
- [ ] Approver ≠ current cashier (dual control)
- [ ] All quotation receipts **Cleared**
- [ ] Payee bank details verified
- [ ] Sufficient balance in paying treasury account

### 7.2 Payment Procedure

1. **Finance** → **Desk** tab → **Refunds awaiting payment** queue.
2. Select approved refund.
3. Review: customer, amount, payee bank, approver name.
4. Verify bank balance sufficient.
5. Click **Pay Refund**.
6. API: `POST /api/refunds/:id/pay`
7. System creates treasury movement (source: REFUND_PAYOUT).
8. Refund status → **Paid**.
9. Execute actual bank transfer using bank portal.
10. File transfer confirmation with refund record.

**High-value refunds (>₦1,000,000):** Verify MD approval recorded before payment.

---

## 8. PAYMENT REQUEST / EXPENSE PAYOUT

### 8.1 Flow

```
Staff creates expense request → BM/MD approves → Cashier pays from Desk
```

### 8.2 Payment Procedure

1. **Finance** → **Desk** tab → **Approved payment requests**.
2. Review: payee, amount, expense category, approver.
3. Verify approval within authority (BM ≤₦200k; MD above).
4. Click **Pay** → treasury movement created.
5. Execute bank transfer or cash disbursement.
6. Obtain payee signature on payment voucher where required.

---

## 9. TREASURY TRANSFERS

### 9.1 Inter-Account Transfers

Move funds between treasury accounts (e.g., cash safe → bank deposit):

1. **Finance** → **Movements** tab.
2. **New Transfer**:
   - From account
   - To account
   - Amount, date, reference
3. Post → creates paired treasury movements.
4. Both accounts update immediately.

### 9.2 Staff Obligation Cash Repayment

Staff repays loan/purchase credit in cash:

1. Look up staff obligation account (OBL-XX-YY-NNNN).
2. Record cash repayment at cashier.
3. Dr Cash/Bank, Cr Staff Obligation Ledger.
4. Reduces outstanding obligation balance.

---

## 10. CONTROLS AND AUDIT

### 10.1 Key Controls

| Control | Enforcement |
|---------|-------------|
| Receipt clearance mandatory | Unconfirmed receipts excluded from reports |
| High-value double entry | ≥₦100,000 amount typed twice |
| Duplicate receipt block | Same quote/amount/date rejected |
| Period lock | Cannot post to closed period |
| Refund payer ≠ approver | Server-side dual control check |
| Zero amount block | Cannot post ₦0 receipt |
| CSRF on all writes | Session security |

### 10.2 Audit Trail

All cashier actions logged:
- `receipt.post` — new receipt
- `receipt.bank_confirmation` — clearance
- `refund.pay` — refund payout
- `treasury.transfer` — inter-account move
- `payment_request.pay` — expense payout

Review: Settings → Audit log (admin) or Finance → Audit tab (accountant).

---

## 11. ERROR CORRECTION

**Cashier does not reverse receipts.** Escalate to Finance Manager:

1. Identify error (wrong amount, wrong customer, duplicate).
2. Document evidence (bank statement, customer confirmation).
3. Finance Manager executes **reversal** → `POST /api/ledger/reverse-receipt`.
4. Verify treasury net corrected.
5. Re-post correct receipt if needed.
6. Never delete or overwrite cleared receipts.

---

## 12. DAILY CHECKLIST

### Opening
- [ ] Branch confirmed
- [ ] Desk queue reviewed
- [ ] Pending receipts from yesterday identified
- [ ] Physical cash count matches treasury opening balance

### During Day
- [ ] Each customer payment confirmed same day where possible
- [ ] Approved refunds paid within 24 hours
- [ ] Bank deposits registered as credits appear

### Closing
- [ ] All today's receipts cleared or escalated
- [ ] Physical cash matches treasury closing balance
- [ ] No approved payouts left in queue without reason
- [ ] Discrepancies reported to BM

---

## 13. TRAINING COMPETENCY

- [ ] Post receipt with double-entry for ₦100k+
- [ ] Confirm clearance on pending receipt
- [ ] Pay approved refund from Desk queue
- [ ] Register and allocate bank deposit
- [ ] Execute treasury transfer
- [ ] Explain why unconfirmed receipts don't appear in reports
- [ ] Demonstrate escalation path for receipt error

---

*End of SOP-02. Cross-references: SOP-01 (Sales), SOP-03 (Accounting), SOP-08 (MD approvals).*
