# SOP-01: SALES OFFICE

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Department:** Sales Office  
**System modules:** `/sales`, `/customers`, `/customers/:id`, `/pricing-policy` (read)  
**Primary roles:** `sales_staff`, `sales_manager`  
**Supporting roles:** `md` (price exceptions), `cashier` (receipt posting)

---

## 1. PURPOSE AND SCOPE

### 1.1 Purpose

The Sales Office is the commercial front door of Zarewa. Every customer relationship, quotation, cutting list, and refund request originates here. This SOP defines how sales officers and branch managers use the ERP to manage the complete sales cycle from first customer contact through quotation, payment tracking, production handoff, and refund initiation.

### 1.2 Scope

This SOP covers:
- Customer registration and CRM
- Quotation creation, editing, and lifecycle management
- Pricing, floor price exceptions, and credit exceptions
- Cutting list preparation and production gate compliance
- Payment status monitoring (read-only for sales — posting is Cashier/Finance)
- Refund request initiation
- Staff purchase credit requests
- Sales dashboard and KPI review

This SOP does **not** cover receipt confirmation (SOP-02), production execution (SOP-04/05), or refund approval/payment (SOP-02, Branch Manager procedures).

### 1.3 Roles and Responsibilities

| Role | Responsibilities |
|------|------------------|
| Sales Officer (`sales_staff`) | Create customers, build quotations, attach cutting lists, monitor payment status, request refunds |
| Branch Manager (`sales_manager`) | All sales officer duties plus quotation clearance, order sign-off, production gate override, refund approval, credit exception approval (within limit) |
| MD (`md`) | Price exception approval, credit exceptions above BM limit, high-value refund approval |

---

## 2. SYSTEM ACCESS AND NAVIGATION

### 2.1 Accessing the Sales Module

1. Sign in to Zarewa Online Office.
2. Confirm workspace branch in the top bar (e.g., Kaduna / BR-KD).
3. Click **Sales** in the sidebar → navigates to `/sales`.
4. Available tabs: **Quotations**, **Payments**, **Cutting list**, **Refunds**, **Customers**.

**Permission required:** `sales.view` minimum; `quotations.manage` for create/edit; `customers.manage` for customer CRUD.

**Cashiers are excluded** from the Sales module — they use Finance desk only.

### 2.2 Customer Dashboard

Navigate to `/customers` for the customer directory, or `/customers/:customerId` for individual customer dashboard showing:
- Profile and contact details
- All quotations with status and payment %
- Ledger balance and transaction history
- Advance deposits
- Refund history
- CRM interaction log

---

## 3. CUSTOMER MANAGEMENT

### 3.1 Creating a New Customer

**When:** Before first quotation for a new buyer.

**Who:** Sales Officer or Branch Manager.

**Procedure:**

1. Go to **Sales** → **Customers** tab (or `/customers`).
2. Click **New Customer**.
3. Complete required fields:
   - **Legal / trading name** — as it will appear on quotations and receipts
   - **Phone number** — primary deduplication key (normalised by system)
   - **Email** (optional) — secondary deduplication key
   - **Branch** — auto-set to current workspace branch
   - **Address** — delivery and correspondence
   - **Customer tier** — if pricing policy uses tiered pricing
   - **CRM tags** — optional categorisation
4. Click **Save**.
5. System checks for duplicate phone/email and warns if match found.
6. Customer receives internal ID; visible on dashboard.

**Controls:**
- Phone normalisation via `customerPhoneKey.js` — enter in local format; system canonicalises
- Duplicate customers cause quotation and ledger confusion — always search before creating
- Customer data is branch-scoped; other branches cannot see unless org-wide read permission

### 3.2 Updating Customer Records

1. Open customer from list → Customer Dashboard.
2. Click **Edit** on profile section.
3. Update permitted fields.
4. **Sensitive edits** on customers with active quotations may require Edit Approval (6-digit code from BM/MD) — see SOP-10.

### 3.3 CRM Interactions

Log every significant customer touchpoint:

1. On Customer Dashboard → **Interactions** section.
2. Click **Log Interaction**.
3. Select kind: Call, Site visit, Follow-up, Complaint, Other.
4. Enter notes and date.
5. Optionally link to specific quotation reference.
6. Save — creates `customer_crm_interactions` record.

**Best practice:** Log interactions within 24 hours. Use for quotation follow-up alerts and MD customer intelligence in Command Centre.

### 3.4 Customer Search

- Use workspace search (`/` → Search) for cross-entity lookup
- Filter customer list by name, phone, tier
- CEO role cannot access customer screens (executive summary only)

---

## 4. QUOTATION MANAGEMENT

### 4.1 Quotation Lifecycle Overview

```
draft → active (approved) → cutting_list_issued → in_production → completed
                              ↓
                         cancelled (triggers refund if paid)
```

| Status | Meaning | Who Triggers |
|--------|---------|--------------|
| Draft | Created, not yet confirmed | Sales staff |
| Active | Confirmed quotation — production eligible when paid | Sales / BM |
| Cutting list issued | CL generated and sent to factory | Sales / BM / Operations |
| In production | Factory currently producing | System on job start |
| Completed | All production and delivery confirmed | System on full delivery |
| Cancelled | Voided — refund workflow if payments received | BM / MD |

### 4.2 Creating a Quotation

**Procedure:**

1. **Sales** → **Quotations** → **New Quotation**.
2. Select **customer** from dropdown (or create new customer first).
3. Set quotation header fields:
   - **Quotation date** — defaults to today
   - **Validity period** — system tracks expiry; follow-up alerts generated
   - **Payment terms** — Cash, Partial advance, Credit (requires credit exception)
   - **Delivery location** — if different from customer address
   - **Notes** — special instructions visible to operations
4. Add **line items** for each product:
   - **Category** — Long-span, Step-tile, Stone-coated, Accessory, Transport, Installation, Other
   - **Product / profile** — select from catalogue
   - **Gauge (mm)** — 0.18 to 0.55 standard range
   - **Colour** — from active colour register
   - **Quantity** — metres for sheets, units for accessories, sheets for stone
   - **Unit price (₦/m or ₦/unit)** — defaults from price list; editable
   - **Line total** — auto-calculated
5. Review **quotation total** at footer.
6. Click **Save** → system assigns ID e.g. `QT-KD-26-0042`.

**Pricing validation:**
- System checks each line against **price list floor** (`/price-list`) and **material pricing workbook**
- Price **at or above floor**: saves normally
- Price **below floor**: save allowed with **warning banner**; cutting list and production **blocked** until MD approves price exception
- Price snapshot captured at creation — subsequent price list changes do not affect saved quotation

### 4.3 Below-Floor Price Exception

**When:** Sales needs to offer price below approved floor (competitive deal, bulk discount, loyal customer).

**Procedure:**

1. Save quotation with below-floor lines (warning displayed).
2. Notify Branch Manager or MD with commercial justification.
3. MD opens quotation → **Price Exception** panel.
4. MD reviews lines, enters approval note, clicks **Approve Price Exception**.
5. API: `PATCH /api/quotations/:id/md-price-exception-approve`
6. Permission: `md.price_exception.approve`
7. Cutting list and production gates now pass for this quotation.

**Audit:** Approval recorded with MD user ID, timestamp, and note on quotation record.

### 4.4 Credit Exception

**Default policy:** All sales require advance or cash payment. Customer credit requires formal Credit Exception.

**Procedure:**

1. From quotation or customer dashboard → **Request Credit Exception**.
2. Enter:
   - Requested credit amount
   - Credit terms (days) — default 14, maximum 90
   - Commercial justification
3. Submit → status `pending`.
4. **Approval routing:**
   - Below BM limit (`CREDIT_BRANCH_MANAGER_LIMIT_NGN`): Branch Manager approves
   - Above BM limit: MD approval required
   - No policy configured: MD approval always required
5. On approval: status `approved`; delivery gate bypassed while exception active
6. Exception may be `revoked` or `expired` — system enforces expiry date

### 4.5 Quotation Follow-Up and Archiving

- System generates **follow-up alerts** for quotations approaching validity expiry
- **Archived** quotations are read-only; unarchive requires manager action
- Review stale quotations weekly on Sales dashboard

### 4.6 Quotation Clearance (Branch Manager)

Branch Manager reviews paid quotations for order sign-off:

1. Open **Manager Dashboard** (`/manager`) → **Order review** tab.
2. Review quotations meeting payment threshold (≥99.5% treated as fully paid).
3. Clear or flag quotations with notes.
4. MD/admin may release payment holds and block refunds on specific quotations.

---

## 5. CUTTING LIST MANAGEMENT

### 5.1 Purpose

A Cutting List (CL) is the production instruction sent from Sales to the factory. It specifies exact metres per line, links to the quotation, and gates production start.

### 5.2 Prerequisites

Before creating a cutting list:

1. Quotation must be **active** (not draft or cancelled).
2. **Payment gate:** Customer must have paid ≥ `cutting_list_min_paid_fraction` of quotation value (default **70%**).
3. **Price gate:** No below-floor lines without MD price exception approval.
4. If payment below threshold: Branch Manager may grant **production gate override** with documented justification (≥10 char note).

### 5.3 Creating a Cutting List

**Procedure:**

1. Open quotation in **Sales** → **Quotations**.
2. Click **Create Cutting List** (or **Cutting list** tab).
3. System pre-fills lines from quotation.
4. Enter/adjust **metres per line**:
   - **Line type** — sheet, accessory, stone
   - **Length (m)** per piece
   - **Sheets** count where applicable
   - **Total metres** — auto-calculated
5. Verify **total metres** match commercial agreement.
6. Add accessory and stone lines if not already on quotation.
7. Click **Save** → assigns ID e.g. `CL-KD-26-0015`.
8. Status: cutting list issued; visible in Operations production queue.

**Material readiness check:** System may flag if coil stock insufficient for requested gauge/colour — coordinate with Operations before promising customer dates.

### 5.4 Cutting List Amendments

- Edits before production start: sales officer or BM
- Edits after production started: requires Edit Approval or manager unlock
- Metre changes after job completion: **production completion adjustments** (Operations) — see SOP-05

### 5.5 Production Gate Override (Branch Manager)

When customer has not met 70% payment but BM authorises production start:

1. BM opens **Manager Dashboard** → production gate queue.
2. Select quotation → **Approve Production** panel.
3. Enter justification note (minimum 10 characters).
4. Submit → records `manager_production_approved_at_iso`, approver, note, paid fraction at override.
5. Cutting list release now permitted.
6. Override visible to MD in Executive Dashboard decision queue.

---

## 6. PAYMENT STATUS MONITORING

### 6.1 Sales Officer Role in Payments

**Sales officers may post receipts** if granted `receipts.post` permission. In many deployments, Cashier posts and confirms all receipts. Sales always has **read access** to payment status.

**Payment status values (derived from receipts):**

| Status | Meaning |
|--------|---------|
| Unpaid | No receipts posted |
| Partial | Some payment received; balance outstanding |
| Paid | Receipts cover ≥99.5% of quotation total |

### 6.2 Viewing Payment History

1. Open quotation → **Payments** section (blue history area).
2. Already-posted receipts are **read-only** — cannot edit in place.
3. Each receipt shows: amount, date, treasury account, clearance status (Pending/Cleared).
4. **Paid total** and **balance due** displayed prominently.

### 6.3 Posting a Receipt (if permitted)

See SOP-02 for full receipt posting procedure. Summary for sales:

1. Open quotation → **Record Payment**.
2. Enter **only new money** — do not re-enter historical receipts.
3. Amount, date, treasury account (cash/bank), reference text.
4. Amounts ≥ ₦100,000: type amount twice for confirmation.
5. Post → creates ledger entry and treasury movement (pending clearance).
6. Cashier must **confirm clearance** before receipt appears in financial reports.

**Critical rule:** Never mark a quotation as paid verbally or on paper without a system receipt. Production gates read system data only.

### 6.4 Advance Deposits

Customer pays before quotation exists:

1. Finance or Sales → **Advance deposit** against customer.
2. Creates `ADVANCE_IN` ledger entry.
3. When quotation created → **Link advance** to apply against quotation.
4. Creates `ADVANCE_APPLIED` entry; reduces balance due.

---

## 7. REFUND REQUESTS

### 7.1 When to Request a Refund

| Category | Typical Cause |
|----------|---------------|
| Order cancellation | Customer cancels before/during production |
| Unproduced meterage | Production not completed for ordered quantity |
| Overpayment | Customer paid more than invoice value |
| Transport issue | Delivery problem attributed to logistics |
| Installation issue | Defect discovered during/after installation |
| Accessory shortfall | Accessories not included with delivery |
| Stone flatsheet shortfall | Stone tiles short on delivery |
| Calculation error | Pricing or quantity mistake on quotation |
| Substitution difference | Gauge/profile substituted; price difference refunded |
| Customer commission | Sales agent commission credited to customer |
| Other | Catch-all; requires written justification |

**Minimum refundable balance:** ₦1,000 (`MIN_REFUND_QUOTATION_REMAINING_NGN`)

### 7.2 Refund Request Procedure

**Who:** Sales Officer (`refunds.request` permission).

**Procedure:**

1. **Sales** → **Refunds** tab → **New Refund Request**.
2. Select **quotation** and **customer**.
3. Select **refund category** from list above.
4. Review **system-suggested lines** — starting points only; verify against evidence.
5. Adjust amounts per line with justification.
6. Enter **payee bank details** for transfer.
7. Review **production alignment warnings** (if any):
   - Order cancellation blocked if production completed (unless override note ≥10 chars)
   - Multi-category overlap requires acknowledgement
8. Click **Preview** → review calculated total.
9. Submit → status **Pending**.
10. Notify Branch Manager for approval.

**Sales officer cannot:** approve or pay refunds.

### 7.3 After Submission

- Track status on **Refunds** tab: Pending → Approved → Paid (or Rejected)
- Respond promptly to approver queries
- Gather evidence: photos, signed acknowledgements, site visit notes
- Approved refunds appear in Cashier desk queue for payment — see SOP-02

---

## 8. STAFF PURCHASE CREDIT

### 8.1 Policy

Staff may purchase roofing materials on personal credit:

| Rule | Value |
|------|-------|
| Minimum service for eligibility | 1 year employment |
| Maximum outstanding obligation | ₦5,000,000 |
| Maximum per purchase | ₦2,000,000 |
| Maximum repayment period | 12 months |
| Maximum concurrent active credits | 1 |
| Obligation account format | OBL-{BranchCode}-{YY}-{seq} |
| Repayment | Monthly payroll deduction + optional cash at cashier |

### 8.2 Request Procedure

1. Staff member (or HR on behalf) → **Staff Purchase Credit Request**.
2. Link to quotation for materials.
3. BM endorses → creates obligation account.
4. Repayment tracked via `hr_payroll_line_loans` and `hr_staff_obligation_transactions`.

---

## 9. PRICING ADMINISTRATION (READ ACCESS)

Sales staff have read access to current prices:

- **Price list** (`/price-list`) — floor prices per gauge/profile (MD manages)
- **Pricing policy** (`/pricing-policy`) — tier rules, customer price book
- Customer-facing price book: `/api/pricing/customer-price-book.html`

Sales officers must not alter price list — escalate to MD for changes.

---

## 10. SALES DASHBOARD AND KPIs

### 10.1 Sales Dashboard (`/api/sales/dashboard/*`)

| KPI | Description |
|-----|-------------|
| Active quotations | Count by status |
| Pipeline value | Total ₦ of open quotations |
| Collections (period) | Receipts cleared in date range |
| Follow-up alerts | Quotations nearing expiry |
| Payment gate queue | Quotations below production threshold |

### 10.2 Branch Manager Pulse

On Manager Dashboard:
- Produced sales progress vs org targets
- Production metres progress
- Open actions count

Targets configured: Settings → Governance → Org manager targets.

---

## 11. DAILY SALES OFFICE CHECKLIST

### Sales Officer — Start of Day

- [ ] Confirm correct workspace branch
- [ ] Review quotation follow-up alerts
- [ ] Check payment status on quotations awaiting cutting list
- [ ] Clear CRM interaction backlog from previous day
- [ ] Review Manager dashboard for any returned/rejected items

### Sales Officer — End of Day

- [ ] Log all customer interactions from today
- [ ] Update quotation notes for any verbal agreements
- [ ] Escalate blocked cutting lists (payment/price gate) to BM
- [ ] Confirm no draft quotations left incomplete with customers waiting

### Branch Manager — Weekly

- [ ] Review order sign-off queue on Manager Dashboard
- [ ] Clear stale quotations (archive or follow up)
- [ ] Review credit exceptions expiring this week
- [ ] Check refund pending queue — approve or reject within 48 hours

---

## 12. EXCEPTION HANDLING

| Situation | Action |
|-----------|--------|
| Customer phone duplicate warning | Search existing customer; merge if same entity; use different phone only if genuinely different person |
| Cutting list blocked — payment | Check receipt clearance status; request BM override if commercial decision made |
| Cutting list blocked — price | Escalate to MD for price exception |
| Customer disputes quotation total | Do not edit locked quotation; create credit note via refund or new quotation |
| System shows wrong paid amount | Ask Finance to run "Sync paid from receipts"; do not manually override |
| Refund rejected | Review approver notes; gather additional evidence; resubmit if appropriate |

---

## 13. TRAINING COMPETENCY CHECKLIST

New sales officer must demonstrate:

- [ ] Create customer without duplicate
- [ ] Create quotation with 3+ line types
- [ ] Identify below-floor warning and escalation path
- [ ] Create cutting list on paid quotation
- [ ] Read payment status and explain clearance workflow
- [ ] Submit refund request with correct category
- [ ] Log CRM interaction
- [ ] Use Zare "Tour this page" on Sales module

---

*End of SOP-01. Cross-references: SOP-02 (Cashier), SOP-04 (Operations), SOP-08 (Executive approvals).*
