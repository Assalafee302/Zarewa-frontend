# ZAREWA ALUMINIUM AND PLASTICS LTD
## SYSTEM OF OPERATIONS — COMPLETE PROCEDURES, POLICIES & STANDARDS

**Document Title:** Zarewa Integrated ERP System of Operations (SOP Master Manual)  
**Version:** 3.0 — Code-Accurate Edition  
**Effective Date:** 24 June 2026  
**Classification:** Internal — All Staff  
**System:** Zarewa Online Office ERP (React Frontend + Node.js/Express API + MySQL/SQLite)

---

## DOCUMENT CONTROL

| Field | Value |
|-------|-------|
| Prepared by | Zarewa IT & Operations Team |
| Based on | Live system codebase (Zarewa-backend-main, Zarewa-frontend-main) |
| Supersedes | Zarewa_SOP_v2.pdf (June 2026) |
| Review cycle | Quarterly, or after major system release |
| Distribution | All department heads, branch managers, finance, HR, IT admin |
| Master copy | `docs/SOP/` in Zarewa-frontend-main repository |

### Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.0 | 2025 | Operations | Initial paper SOPs (SOP-01 through SOP-10) |
| 2.0 | June 2026 | IT | Code-accurate consolidated PDF (Zarewa_SOP_v2) |
| 3.0 | June 2026 | IT | Expanded 40,000+ word master manual aligned to live ERP |

---

## PURPOSE OF THIS MANUAL

This System of Operations (SOP) manual is the authoritative reference for how Zarewa Aluminium and Plastics Ltd conducts business through its integrated Enterprise Resource Planning (ERP) system. Every procedure described herein maps directly to screens, permissions, workflows, and business rules implemented in the live software. Staff must follow these procedures to ensure:

1. **Financial integrity** — every naira in and out is recorded, cleared, reconciled, and auditable.
2. **Operational control** — stock, coils, production, and deliveries are tracked from purchase to customer handover.
3. **Segregation of duties** — no single person can request, approve, and pay the same transaction.
4. **Regulatory and board compliance** — payroll, tax, pension, discipline, and exit procedures meet company policy.
5. **Branch accountability** — Kaduna HQ, Yola Factory, and Maiduguri Factory each maintain accurate records within a unified system.

This manual is not a generic industry template. It describes **your actual system** — the quotations you create in `/sales`, the receipts you confirm in `/accounts`, the production jobs you complete in `/operations`, and the approvals that flow through `/manager` and `/exec`.

---

## COMPANY IDENTITY

**Legal name:** Zarewa Aluminium and Plastics Ltd  
**Trading name:** Zarewa Industries  
**Industry:** Manufacturing and distribution of roofing sheets, stone-coated tiles, and building accessories  
**Headquarters:** Kaduna, Nigeria  
**Active branches (system-managed):**

| Branch | Code | Branch ID | Role |
|--------|------|-----------|------|
| Kaduna | KD | BR-KD | Headquarters, primary sales office, system default |
| Yola | YL | BR-YOL | Manufacturing factory |
| Maiduguri | MDG | BR-MAI | Manufacturing factory |

### Products and Services

Zarewa manufactures and sells:

- **Long-span and step-tile aluminium/aluzinc roofing sheets** — multiple gauges (0.18 mm to 0.55 mm standard) and colour profiles
- **Stone-coated steel roofing tiles** — stone-flatsheet format with tracked sheet-to-m² conversion
- **Roofing accessories** — ridges, flashings, gutters, fixings, and related consumables
- **Outside corrugation** — sub-contracted to approved third parties where required
- **Transport and installation services** — quoted separately on customer quotations where applicable

All products are measured and tracked in **metres (m)** for sheet production, **kilograms (kg)** for coil raw material, and **NGN (₦)** for all financial values.

---

## DOCUMENT NUMBERING STANDARD

Every business document in the ERP carries a human-readable ID following the format:

```
PREFIX-BRANCHCODE-YY-NNNN
```

Where `YY` is the two-digit calendar year and `NNNN` is a sequential number resetting each year per branch. Legacy IDs without branch codes are still recognised by the system to prevent collisions during migration.

| Prefix | Document Type | Example |
|--------|---------------|---------|
| QT | Sales Quotation | QT-KD-26-0001 |
| CL | Cutting List (Production Order) | CL-KD-26-0001 |
| PJ | Production Job | PJ-KD-26-0001 |
| DLV | Delivery Note | DLV-KD-26-0001 |
| LE | Ledger Entry | LE-KD-26-0001 |
| RCP | Confirmed Sales Receipt | RCP-KD-26-0001 |
| PO | Purchase Order | PO-KD-26-0001 |
| IT | In-Transit Load | IT-KD-26-0001 |
| MINT | Material Incident | MINT-KD-26-0001 |
| MREQ | Material Request | MREQ-KD-26-0001 |
| CREV | Coil Control Event | CREV-KD-26-0001 |
| CREQ | Coil Request | CREQ-KD-26-0001 |
| BD | Bank Deposit | BD-KD-26-0001 |
| BDA | Bank Deposit Allocation | BDA-KD-26-0001 |
| TM | Treasury Movement | TM-KD-26-0001 |
| SM | Stock Movement | SM-KD-26-0001 |
| EXP | Expense Record | EXP-KD-26-0001 |
| WI | Office Work Item | WI-26-0001 |
| OBL | Staff Obligation Account | OBL-KD-26-0001 |
| MACH | Machine Asset | MACH-26-0001 |
| MXPL | Maintenance Plan | MXPL-26-0001 |
| MXWO | Maintenance Work Order | MXWO-26-0001 |
| MXEV | Maintenance Event | MXEV-26-0001 |

Office filing references on approved work items may additionally receive: `ZR/{branch}/{domain}/{year}/{seq}`.

---

## MANUAL STRUCTURE — DEPARTMENT SOPs

This master manual is organised into standalone department SOPs. Each SOP is self-contained but cross-references related procedures.

| File | Title | Primary Users |
|------|-------|---------------|
| [01-COMPANY-GOVERNANCE-AND-SYSTEM.md](./01-COMPANY-GOVERNANCE-AND-SYSTEM.md) | Company governance, ERP architecture, security, cross-cutting rules | All staff, IT admin |
| [SOP-01-SALES-OFFICE.md](./SOP-01-SALES-OFFICE.md) | Sales office — customers, quotations, cutting lists, CRM | Sales officers, branch managers |
| [SOP-02-CASHIER-DESK.md](./SOP-02-CASHIER-DESK.md) | Cashier desk — receipts, advances, bank deposits, payouts | Cashiers |
| [SOP-03-ACCOUNTING-DESK.md](./SOP-03-ACCOUNTING-DESK.md) | Accounting desk — GL, reconciliation, month-end, AP phases | Accountants, finance manager |
| [SOP-04-OPERATIONS-STORE.md](./SOP-04-OPERATIONS-STORE.md) | Operations & store — GRN, coil register, stock, deliveries | Operations officers, storekeepers |
| [SOP-05-PRODUCTION.md](./SOP-05-PRODUCTION.md) | Production floor — jobs, conversion QC, WIP, revenue recognition | Production managers, QCO |
| [SOP-06-PROCUREMENT.md](./SOP-06-PROCUREMENT.md) | Procurement — POs, suppliers, transport, in-transit | MD, procurement officer, operations |
| [SOP-07-HUMAN-RESOURCES.md](./SOP-07-HUMAN-RESOURCES.md) | HR — leave, loans, payroll, discipline, exit | HR admin, GM HR, all staff |
| [SOP-08-EXECUTIVE-OFFICE.md](./SOP-08-EXECUTIVE-OFFICE.md) | Executive office — MD cockpit, approvals, governance | MD, CEO, Chairman |
| [SOP-09-MAINTENANCE.md](./SOP-09-MAINTENANCE.md) | Maintenance — machines, work orders, asset custody | Maintenance manager, technicians |
| [SOP-10-OFFICE-ADMINISTRATION.md](./SOP-10-OFFICE-ADMINISTRATION.md) | Office administration — memos, work items, notices, forum | All staff with office.use |
| [APPENDIX-A-GLOSSARY-AND-REFERENCE.md](./APPENDIX-A-GLOSSARY-AND-REFERENCE.md) | Glossary, GL codes, permission bundles, report index | Reference |
| [ANNEX-B-SCENARIO-WALKTHROUGHS.md](./ANNEX-B-SCENARIO-WALKTHROUGHS.md) | 10 end-to-end worked business scenarios | Training |
| [ANNEX-C-IT-OPERATIONS.md](./ANNEX-C-IT-OPERATIONS.md) | IT admin, security, DR, deployment | IT Admin |
| [ANNEX-D-COMPLIANCE-AND-AUDIT.md](./ANNEX-D-COMPLIANCE-AND-AUDIT.md) | Internal controls, audit, fraud response | Audit, Finance, MD |
| [ANNEX-E-EXTENDED-PROCEDURES.md](./ANNEX-E-EXTENDED-PROCEDURES.md) | Troubleshooting, escalation matrix, training | All departments |
| [ANNEX-F-ACCOUNTING-POLICIES.md](./ANNEX-F-ACCOUNTING-POLICIES.md) | AP1c/AP2/AP3, GL, period close | Finance |
| [ANNEX-G-HR-POLICIES.md](./ANNEX-G-HR-POLICIES.md) | HR policy manual, discipline, exit | HR, all staff |
| [ANNEX-H-INVENTORY-PRODUCTION-STANDARDS.md](./ANNEX-H-INVENTORY-PRODUCTION-STANDARDS.md) | Coil science, QC, stock register | Operations, Production |

**Combined master document:** Run `node docs/SOP/build-master-sop.mjs` to generate `ZAREWA_COMPLETE_SOP_v3.md` (~30,000+ words).

---

## QUICK-START BY ROLE

After signing in, the system routes each user to their role home screen:

| Role | System Key | Default Home | Primary SOP |
|------|------------|--------------|-------------|
| Managing Director | `md` | `/exec` (Command Centre) | SOP-08 |
| CEO | `ceo` | `/exec` (read-only) | SOP-08 |
| Chairman | `chairman` | `/exec` + Executive HR | SOP-08, SOP-07 |
| Branch Manager | `sales_manager` | `/manager` | SOP-01, SOP-04 |
| Sales Officer | `sales_staff` | `/sales` | SOP-01 |
| Cashier | `cashier` | `/accounts` | SOP-02 |
| Accountant / Head of Accounts | `finance_manager` | `/accounting` | SOP-03 |
| Operations Officer / Storekeeper | `operations_officer` | `/operations` | SOP-04, SOP-05 |
| HR Admin | `hr_admin` | `/hr/dashboard` | SOP-07 |
| GM HR | `gmhr` | `/hr/dashboard` | SOP-07 |
| Administrator | `admin` | `/` or `/settings` | All SOPs + 01 |
| HR Portal Only | `hr_portal_only` | `/my-profile` | SOP-07 (self-service) |
| Viewer | `viewer` | `/` (read-only) | 01 (overview only) |

**First login:** All new users must change their password on first sign-in. A role-specific training guide appears automatically. Use **Zare** (life-ring icon, bottom-right) on any screen for step-by-step coaching — Zare explains procedures; you perform every action yourself.

---

## CORE BUSINESS LIFECYCLE (END-TO-END)

The following diagram shows how a typical customer order flows through the entire organisation:

```
CUSTOMER INQUIRY
      │
      ▼
[Sales] Create Customer Record ──────────────────────────────┐
      │                                                         │
      ▼                                                         │
[Sales] Create Quotation (QT) ──► Price floor check            │
      │                              │                          │
      │                    Below floor? ──► [MD] Price exception │
      ▼                                                         │
[Sales/Cashier] Post Receipt(s) ──► [Cashier] Confirm clearance│
      │                                                         │
      ▼                                                         │
[Sales] Attach Cutting List (CL) ──► Payment gate (≥70% paid)  │
      │                              │                          │
      │                    Below threshold? ──► [BM] Override    │
      ▼                                                         │
[Operations] Release to Production Queue                         │
      │                                                         │
      ▼                                                         │
[Production] Start Job (PJ) ──► Allocate Coil ──► Complete     │
      │                              │                          │
      │                    Variance >5%? ──► [BM] QC sign-off    │
      ▼                                                         │
[AP1c] Revenue recognised at production completion             │
      │                                                         │
      ▼                                                         │
[Operations] Create Delivery (DLV) ──► Delivery gate check     │
      │                                                         │
      ▼                                                         │
[Operations] Confirm delivery + POD ───────────────────────────┘
      │
      ▼ (if refund needed)
[Sales] Request Refund ──► [BM/MD] Approve ──► [Cashier] Pay
```

---

## SEGREGATION OF DUTIES — MASTER REFERENCE

| Process | Create / Request | Approve / Confirm | Pay / Execute |
|---------|------------------|-------------------|---------------|
| Customer receipt | Sales / Cashier (`receipts.post`) | Cashier confirms clearance (`cashier.receipts.confirm`) | Treasury auto-posted |
| Customer refund | Sales (`refunds.request`) | BM / MD / Finance (`refunds.approve`) | Cashier / Finance (`finance.pay`) |
| Payment request (expense) | Any authorised staff | BM (≤₦200k) or MD (>₦200k) | Finance pays approved |
| Below-floor price → production | Sales saves quotation | MD (`md.price_exception.approve`) | — |
| Production gate override | — | BM (`approve_production` with note) | — |
| Material incident | Operations (`material_incidents.create`) | BM (`material_incidents.approve`) | Auto-post on approve |
| Purchase order | Procurement / MD | MD / BM per policy | — |
| Supplier payment | Finance | Finance (`finance.approve`) | Finance (`finance.pay`) |
| Payroll | HR Admin prepares | GM HR + MD sign-off | Finance export/pay |
| Leave / loan request | Employee self-service | HR → BM endorse → GM HR | — |
| Inter-branch loan | Finance proposes | MD (`inter_branch_loan.md_approve`) | Treasury |
| Credit exception | Sales requests | BM or MD per amount | — |
| Edit on locked record | Requester | BM/MD issues 6-digit code | Single save consumed |
| Stock register lock | Store confirms | BM → MD → Admin locks | — |

**Critical rules enforced in code:**
- Refund requester cannot approve their own refund
- Refund approver cannot pay the same refund (when `ENFORCE_DUAL_CONTROL_PAYMENTS=1`)
- Refunds above ₦1,000,000 require MD/CEO approval
- Cashier cannot approve refunds — only request and pay after approval
- Payroll cannot be locked without MD approval recorded

---

## DAILY, WEEKLY, AND MONTHLY CADENCE

### Daily (Every Working Day)

| Time | Who | Action | System Location |
|------|-----|--------|-----------------|
| Opening | Cashier | Review pending receipt queue | `/accounts?tab=desk` |
| Opening | Sales | Check quotation follow-up alerts | `/sales` → Quotations |
| Opening | Operations | Review production queue and coil availability | `/operations` |
| Opening | Branch Manager | Clear Manager dashboard inbox | `/manager` |
| Throughout | All | Process office work items within SLA | `/` (Workspace) |
| Closing | Cashier | Reconcile physical cash to treasury balance | `/accounts` |
| Closing | Cashier | Confirm all day's receipts | `/accounts?tab=receipts` |

### Weekly

| Who | Action | System Location |
|-----|--------|-----------------|
| Branch Manager | Review aged pending approvals | `/manager` |
| Finance Manager | Review bank reconciliation unmatched lines | `/accounting` → Reconciliation |
| Finance Manager | Review payment exception queue | `/reports` |
| MD | Review Command Centre alerts and Decide tab | `/exec` |
| HR Admin | Process leave/loan request queue | `/hr/time-absence` |
| Operations | Review low-stock alerts | `/operations` → Overview |

### Monthly (Month-End Close)

| Step | Owner | SOP Reference |
|------|-------|---------------|
| 1. Complete all GRNs for received goods | Operations | SOP-04, SOP-06 |
| 2. Complete all production jobs and deliveries | Production / Operations | SOP-05 |
| 3. Stock register 4-stage sign-off (all branches) | Store → BM → MD → Lock | SOP-04 §4 |
| 4. Bank reconciliation (all treasury accounts) | Finance Manager | SOP-03 §5 |
| 5. Payables reconciliation (PO vs GRN vs paid) | Finance Manager | SOP-03 §6 |
| 6. Receivables review and write-offs | Finance + MD | SOP-03 §7 |
| 7. Depreciation run | Finance Manager | SOP-03 §8 |
| 8. Payroll processing (if pay period) | HR → GM HR → MD → Finance | SOP-07 §4 |
| 9. GL trial balance verification | Finance Manager | SOP-03 §9 |
| 10. Period lock | Finance Manager | SOP-03 §10 |
| 11. Management reports pack | Finance / MD | SOP-08 §3 |

---

## HOW TO USE THIS MANUAL WITH THE ERP

1. **Find your role** in the Quick-Start table above and read your primary SOP first.
2. **Use Zare** for on-screen coaching: open any page, click the life-ring icon, choose "Tour this page."
3. **Cross-reference document IDs** — when this manual mentions a QT, CL, or PO, look up that ID in the system search (`/` → Search).
4. **Report gaps** — if a procedure in the system behaves differently from this manual, report to IT immediately; the manual will be updated after code verification.
5. **Training** — new staff complete role training guide on first login; supervisors verify competency using the checklists at the end of each department SOP.

---

## RELATED TECHNICAL DOCUMENTATION

| Document | Location | Audience |
|----------|----------|----------|
| Operations Manual | `Zarewa-backend-main/docs/OPERATIONS_MANUAL.md` | IT, power users |
| Access Control | `Zarewa-backend-main/docs/ACCESS_CONTROL.md` | IT, admin |
| RBAC Matrix | `Zarewa-backend-main/docs/RBAC_MATRIX.md` | IT, admin |
| Refund Operations | `Zarewa-backend-main/docs/REFUND_OPERATIONS.md` | Finance, sales, BM |
| Accounting Policy AP1c | `Zarewa-backend-main/docs/ACCOUNTING_POLICY_AP1C.md` | Finance |
| Accounting Policy AP3 | `Zarewa-backend-main/docs/ACCOUNTING_POLICY_AP3_COSTING.md` | Finance, production |
| Payment Posting SOP | `Zarewa-backend-main/docs/PAYMENT_POSTING_SOP.md` | Cashier, finance |
| Material Exceptions SOP | `Zarewa-backend-main/docs/MATERIAL_EXCEPTIONS_SOP.md` | Operations, BM |
| HR Policy — Leave | `Zarewa-backend-main/docs/HR/HR-POLICY-LEAVE.md` | HR |
| HR Policy — Payroll | `Zarewa-backend-main/docs/HR/HR-POLICY-PAYROLL.md` | HR, finance |
| Deployment Guide | `Zarewa-backend-main/docs/DEPLOYMENT.md` | IT admin |

---

*End of Master Index. Proceed to individual department SOPs for detailed procedures.*
