# ANNEX B: DETAILED SCENARIO WALKTHROUGHS

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Purpose:** End-to-end worked examples mapping real business scenarios to exact system steps.

---

## SCENARIO B1: STANDARD QUOTE-TO-CASH-TO-DELIVERY (KADUNA BRANCH)

**Situation:** Customer Alhaji Musa Ibrahim wants 250 metres of 0.45 mm aluzinc long-span roofing in Charcoal Grey for his building project in Kaduna. Total quotation value: ₦2,875,000. Customer pays 80% advance by bank transfer.

### Actors
- Sales Officer: Amina (sales_staff)
- Cashier: Ibrahim (cashier)
- Branch Manager: Yusuf (sales_manager)
- Operations Officer: Hassan (operations_officer)
- Production: factory team Yola (operations_officer at Yola branch)

### Step-by-Step

**Day 1 — Customer and Quotation (Sales Office)**

1. Amina signs in; confirms workspace branch = Kaduna (BR-KD).
2. Navigates to `/sales` → Customers → searches phone 08031234567.
3. No match found → creates new customer:
   - Name: Alhaji Musa Ibrahim
   - Phone: 08031234567
   - Address: Plot 42, Barnawa, Kaduna
   - Branch: BR-KD (auto)
4. Creates quotation QT-KD-26-0156:
   - Line 1: Long-span aluzinc, 0.45 mm, Charcoal Grey, 250 m @ ₦11,500/m = ₦2,875,000
   - Payment terms: Partial advance
   - Validity: 30 days
5. System validates price against floor — at floor; no exception needed.
6. Saves quotation; status = active.

**Day 1 — Payment (Cashier Desk)**

7. Customer transfers ₦2,300,000 (80%) to Zarewa GTBank account.
8. Amina (or Ibrahim) opens quotation → Record Payment:
   - Amount: ₦2,300,000
   - Date: today
   - Treasury account: GTBank Kaduna Main
   - Reference: "TRF Musa Ibrahim 250m roofing 80pct"
9. Amount > ₦100,000 → types amount twice.
10. Posts receipt → RCP-KD-26-0091 created; status Pending clearance.
11. Ibrahim opens `/accounts` → Receipts → locates RCP-KD-26-0091.
12. Verifies bank alert matches → Confirm Payment Received.
13. Status = Cleared. Quotation payment_status = Partial (80%).

**Day 2 — Cutting List (Sales Office)**

14. Amina opens QT-KD-26-0156 → Create Cutting List.
15. Payment gate: 80% > 70% threshold — gate passes.
16. Enters cutting list CL-KD-26-0042:
    - Line 1: 250 m long-span 0.45 Charcoal Grey
17. Saves; status cutting_list_issued.

**Day 2 — Production Release (Operations — Yola)**

18. Hassan at Yola switches workspace to Yola (BR-YOL) or receives inter-branch cutting list per branch policy.
19. `/operations` → Production line → sees CL-KD-26-0042 in queue.
20. Releases to production → PJ-YL-26-0088 created (Planned).
21. Allocates coil lot CL-2024-8847 (0.45 mm Charcoal Grey, 4,200 kg remaining).
22. Starts job → Running. WIP opened.

**Day 3 — Production Complete (Yola)**

23. Factory produces 248 m actual (2 m variance — within 5%).
24. Hassan completes job:
    - Produced metres: 248 m
    - Conversion band: OK
25. AP1c auto-posts:
    - Dr AR ₦2,852,000 (248m × ₦11,500)
    - Cr Revenue ₦2,852,000
26. Job status = Completed.

**Day 4 — Delivery (Operations — Kaduna)**

27. 248 m transported Kaduna → Hassan (Kaduna) creates DLV-KD-26-0033.
28. Delivery gate: 80% paid — warn mode shows notice; proceeds.
29. Customer signs delivery note.
30. Hassan confirms delivery with POD reference.
31. Stock deducted; quotation status progresses toward completed.

**Day 5 — Balance Payment**

32. Customer pays balance ₦552,000 (remaining on adjusted 248 m + any agreed adjustment).
33. Receipt posted and cleared.
34. Quotation payment_status = Paid.

### System Records Created
QT-KD-26-0156 → CL-KD-26-0042 → PJ-YL-26-0088 → DLV-KD-26-0033 → RCP-KD-26-0091, RCP-KD-26-0098 → GL entries via AP1c

---

## SCENARIO B2: BELOW-FLOOR PRICING WITH MD EXCEPTION

**Situation:** Competitor undercuts market. Customer wants 500 m at ₦10,800/m (floor is ₦11,200/m). BM agrees commercially; MD must approve before production.

1. Sales creates quotation with unit price ₦10,800/m.
2. System shows **Below Floor** warning on save — allowed.
3. Cutting list blocked — error message references price exception.
4. BM notifies MD with competitor quote evidence.
5. MD opens quotation → Price Exception panel → approves with note: "Competitor XYZ quote dated 20/06/2026 attached. One-time match to secure 500m order."
6. `md_price_exception_approved_at_iso` recorded.
7. Cutting list now creatable.
8. Production proceeds normally.

**Audit trail:** quotation record, approval_actions, MD user ID.

---

## SCENARIO B3: CUSTOMER REFUND — UNPRODUCED METERAGE

**Situation:** Customer paid 100% on 300 m order. Production completed only 180 m due to coil defect. Customer requests refund for 120 m unproduced.

1. Sales Officer opens QT → Refunds → New.
2. Category: **Unproduced meterage**.
3. System preview suggests 120 m × unit price = refund amount.
4. Production alignment check shows 180 m completed — consistent.
5. Submits refund → Pending.
6. BM opens `/manager` → Cash out → reviews:
   - Lifecycle timeline: quote → CL → PJ (180m) → delivery
   - Payment 100% cleared
   - Approves ₦1,380,000 (120 × ₦11,500).
7. Ibrahim (Cashier) pays from Desk queue.
8. Treasury REFUND_PAYOUT movement created.
9. Customer receives bank transfer.

**If amount were ₦1,500,000 (>₦1M threshold):** MD must approve, not BM alone.

---

## SCENARIO B4: COIL PROCUREMENT TO GRN (FULL CHAIN)

**Situation:** MD orders 20 tonnes aluzinc coil 0.50 mm from Supplier SteelCo.

1. MD creates PO-KD-26-0024 at `/procurement`:
   - Supplier: SteelCo Nigeria Ltd
   - Line: Coil 0.50 mm, 20,000 kg @ ₦485/kg
   - Transport: Haulier Express, ₦180,000 haulage
2. Approves PO → Approved.
3. Assigns transport → On loading.
4. Pays haulage → In Transit.
5. Coil arrives Yola — Operations posts GRN:
   - Coil nos: SC-2026-4410, SC-2026-4411 (two rolls)
   - Weights: 10,200 kg + 9,850 kg = 20,050 kg (50 kg over PO — within tolerance)
6. AP2: Dr Inventory, Cr AP at landed cost.
7. PO status → Received.
8. Finance pays SteelCo per payment terms.

**Short receipt variant:** If received 18,500 kg vs 20,000 ordered (1,500 kg short = 7.5%):
- Above tolerance → MD work item auto-created.
- MD decides: accept partial, claim supplier, or cancel balance.

---

## SCENARIO B5: MONTHLY PAYROLL (FULL CHAIN)

**Situation:** June 2026 payroll for 47 Kaduna staff.

1. HR Admin (Fatima) prepares payroll run PR-2026-06-KD.
2. Reviews lines: basic, transport allowance, loan deductions (3 staff), attendance deductions (2 staff).
3. Submits for GM HR review.
4. GM HR (Grace) → GM approve.
5. MD opens Executive HR → Compensation → Payroll summary → MD sign-off.
6. Fatima locks payroll run.
7. Finance Manager exports bank file from Accounting desk.
8. Executes bulk transfer June 28.
9. Posts treasury movements.
10. Staff view payslips on My HR June 29.

**Blocked scenario:** If MD forgets sign-off → lock button disabled with message referencing `md_approved_at_iso`.

---

## SCENARIO B6: MATERIAL INCIDENT — COIL DAMAGE

**Situation:** Forklift damages coil CL-2024-7721 in yard. 340 kg declared unusable.

1. Hassan logs material incident MINT-KD-26-0007:
   - Type: coil_damage
   - Coil: CL-2024-7721
   - Before: 2,100 kg → After: 1,760 kg
   - Storekeeper + operator names recorded
2. Saves draft → photographs attached → Submits.
3. BM Yusuf reviews → Approve & post.
4. Coil qty_remaining reduced 340 kg.
5. If negligence established → HR discipline case linked.
6. Recovery schedule if staff fault → payroll deduction via OBL account.

---

## SCENARIO B7: EXPENSE REQUEST — BRANCH MOTOR FUEL

**Situation:** Sales team needs ₦85,000 diesel for generator during power outage.

1. Sales Officer creates Office Record → Expense request:
   - Category: Fuel & lubricant (GL 5010)
   - Payee: Total Energies station
   - Amount: ₦85,000
   - Justification: "Generator fuel 3 days power outage week 24 — sales office operational continuity"
2. Routes to BM Yusuf (below ₦200k threshold).
3. Yusuf approves on Manager dashboard.
4. Ibrahim pays from Finance Desk.
5. Filing reference ZR/KD/expense/2026/0142 issued.

---

## SCENARIO B8: LEAVE REQUEST — FULL WORKFLOW

**Situation:** Employee John (L3, 14 days annual leave) requests 5 days annual leave.

1. John → My HR → Time off → Request:
   - Type: Annual
   - Dates: 10–14 July 2026
2. Status: submitted → hr_review.
3. HR Admin triages → hr_review approved.
4. John's line manager (BM) → Team HR → Endorses.
5. GM HR → final approval.
6. Leave balance: 14 - 5 = 9 days remaining.
7. Calendar updated; payroll notified if unpaid leave (not applicable here).

---

## SCENARIO B9: EDIT APPROVAL ON LOCKED QUOTATION

**Situation:** Customer changes colour after quotation confirmed but before production.

1. Sales attempts edit on QT-KD-26-0200 → blocked.
2. Submits edit approval request: "Customer changed Charcoal Grey to Ocean Blue — same price."
3. BM opens `/edit-approvals` → reviews → issues code 847291.
4. Sales enters code → changes colour field → saves once.
5. Code consumed; further edits require new approval.

---

## SCENARIO B10: INTER-BRANCH LOAN

**Situation:** Yola factory cash short; Kaduna HQ lends ₦5,000,000.

1. Finance Manager proposes inter-branch loan:
   - Lender: BR-KD
   - Borrower: BR-YOL
   - Amount: ₦5,000,000
   - Purpose: Supplier payment bridge
2. MD approves on Command Centre → Decide tab.
3. Treasury movements executed both branches.
4. Loan status: executed.
5. Yola repays ₦2,500,000 month 1, ₦2,500,000 month 2.
6. Loan status: settled.

---

*End of Annex B — Scenario Walkthroughs*
