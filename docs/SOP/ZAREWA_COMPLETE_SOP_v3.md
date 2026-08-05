# ZAREWA ALUMINIUM AND PLASTICS LTD
## COMPLETE SYSTEM OF OPERATIONS — MASTER DOCUMENT

**Generated:** 2026-06-24  
**Version:** 3.0 Code-Accurate Edition  
**Total words:** 30,788  
**Source:** Zarewa ERP (frontend + backend codebase)

---



---

<!-- SOURCE: 00-MASTER-INDEX.md (2,432 words) -->

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


---

<!-- SOURCE: 01-COMPANY-GOVERNANCE-AND-SYSTEM.md (3,320 words) -->

# PART 1: COMPANY GOVERNANCE, ERP ARCHITECTURE & CROSS-CUTTING RULES

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Applies to:** All staff, IT administrators, external auditors  
**System modules:** Platform-wide

---

## 1. INTRODUCTION

### 1.1 Scope

This section establishes the governance framework within which all Zarewa business operations are conducted through the integrated ERP system. It covers company identity, organisational structure, technology architecture, authentication and security controls, branch data isolation, document standards, approval thresholds, audit requirements, and the cross-cutting business rules that apply regardless of department.

Every staff member — from the sales officer creating a quotation in Kaduna to the production manager completing a job in Yola — operates within the boundaries defined here. Department-specific procedures in SOP-01 through SOP-10 build upon this foundation.

### 1.2 Authority

The Managing Director (MD) holds ultimate operational authority. The Board of Directors, through the Chairman and CEO, exercises strategic oversight via the Executive Command Centre. Day-to-day system administration is delegated to the System Administrator (`admin` role). Financial period control rests with the Accountant / Head of Accounts (`finance_manager` role).

### 1.3 Compliance Obligation

All staff are required to:

1. Use the ERP for every business transaction — no parallel paper-only processes for items the system tracks.
2. Operate only within their assigned role permissions — attempting to access unauthorised modules is logged.
3. Complete mandatory training before independent transaction entry.
4. Report system errors, discrepancies, or suspected misuse immediately to their line manager and IT.

---

## 2. ORGANISATIONAL STRUCTURE

### 2.1 Branch Network

Zarewa operates three active sites, each configured as a branch in the ERP:

**Kaduna (BR-KD) — Headquarters**
- Primary sales office and commercial hub
- Default workspace branch for new users unless otherwise assigned
- Hosts executive functions, procurement HQ, and central pricing administration
- Cutting list minimum paid fraction: 70% (configurable in `branches` table)

**Yola Factory (BR-YOL) — Manufacturing**
- Primary production facility for coil rolling and corrugation
- Receives cutting lists from Kaduna sales; dispatches finished goods
- Maintains independent coil register, WIP balances, and stock register
- GRN posts against procurement POs received at Yola

**Maiduguri Factory (BR-MAI) — Manufacturing**
- Secondary production and distribution point
- Same operational modules as Yola
- Inter-branch material requests may transfer stock between factories

### 2.2 Functional Desks

The ERP organises work by functional desk, each mapped to system modules and role permissions:

| Desk | System Route | Primary Roles |
|------|--------------|---------------|
| Sales Office | `/sales`, `/customers` | sales_staff, sales_manager |
| Cashier Desk | `/accounts` (Desk, Receipts tabs) | cashier |
| Accounting Desk | `/accounting` | finance_manager |
| Procurement | `/procurement` | md, operations_officer |
| Operations / Store | `/operations` | operations_officer |
| Production Floor | `/operations` → Production line | operations_officer, production manager |
| Branch Management | `/manager` | sales_manager |
| Executive Office | `/exec` | md, ceo, chairman |
| HR Administration | `/hr/*` | hr_admin, gmhr |
| Team HR | `/team-hr/*` | sales_manager (line managers) |
| Executive HR | `/executive-hr/*` | md, ceo, chairman |
| Self-Service HR | `/my-profile/*` | all staff |
| Office Administration | `/` (Workspace) | all with `office.use` |
| System Administration | `/settings/*` | admin, md (limited) |

### 2.3 Reporting Lines

Operational reporting follows the designation hierarchy encoded in HR:

- **Managing Director** (`desig_md`) — ultimate approver for high-value transactions, payroll, inter-branch loans, price exceptions
- **Executive Directors** (Operations, Finance, Commercial) — functional oversight within their domains
- **General Manager** (`desig_gm`) — operational coordination
- **GM HR** (`desig_gmhr`) — final HR approvals for leave, loans, transfers, exit clearance
- **Branch Manager** (`desig_bm`, `desig_actbm`) — branch-level sales, production, refund, and expense approvals
- **Department heads** (Production Manager, Head of Procurement, HR Representative, etc.) — domain-specific supervision

---

## 3. ERP SYSTEM ARCHITECTURE

### 3.1 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 19 + Vite 8 + Tailwind CSS 4 | Single-page application; role-gated routing |
| Backend API | Node.js + Express 5 | REST API with server-side session management |
| Database | MySQL (production) / SQLite (development) | 124+ tables; synchronous write transactions |
| Authentication | Session cookies + CSRF tokens | bcrypt password hashing; sliding timeout |
| Shared logic | `shared/` directory | Cross-cutting business rules used by API and UI |
| AI Assistant | Zare (OpenAI/Ollama optional) | In-app coaching, memo polish, operational Q&A |
| Testing | Vitest (unit) + Playwright (e2e) | Automated workflow verification |

### 3.2 Deployment Models

**Combined deployment (recommended for single-server):**
- API serves the built React SPA from the same origin
- Environment variable: `ZAREWA_STATIC_DIR` points to frontend `dist/`
- Simplifies cookie and CSRF handling

**Split deployment (CDN + API server):**
- Frontend on static host; API on VM
- Requires `VITE_API_BASE`, `CORS_ORIGIN`, and careful cookie SameSite configuration
- See `docs/SPLIT_DEPLOYMENT_AND_MIGRATION.md`

**Development stack:**
- `npm run dev:stack` — API on port 8787, Vite dev server on 5173 with proxy

### 3.3 Bootstrap Data Model

On login, the SPA loads `GET /api/bootstrap` — a filtered workspace snapshot containing branches, permissions, master data, and entity lists the user may see. Additional lazy snapshots load on demand:

- `GET /api/workspace/sales-snapshot`
- `GET /api/workspace/operations-snapshot`
- `GET /api/workspace/finance-snapshot`
- `GET /api/workspace/procurement-snapshot`

**Security note:** Bootstrap filtering is a performance convenience, not a security boundary. Every API endpoint enforces `requirePermission()` independently. Calling an API directly without permission returns 403 even if bootstrap omitted the data.

### 3.4 Data Scope Rules

| Data Type | Scope | Notes |
|-----------|-------|-------|
| Customers, quotations, receipts, coils, production | Branch-scoped | Filtered by `branch_id` |
| Suppliers, transport agents | Company-wide | Shared across all branches |
| Users, roles, org policy | Company-wide | Admin-managed |
| GL, treasury (with permission) | Branch or org-wide | `hq.view_all_branches` for rollup |
| HR staff profiles | Branch-assigned with org-wide HR access | HR admin sees all |
| Office threads, work items | Branch or company scope | Depends on record type |

---

## 4. AUTHENTICATION AND SESSION SECURITY

### 4.1 Sign-In Procedure

1. Navigate to the Zarewa URL provided by IT (e.g., `https://office.zarewa.com` or local dev URL).
2. Enter **username** and **password**.
3. Optional: use **Google sign-in** if Firebase authentication is configured.
4. On success, the system routes to the role default home (see Master Index Quick-Start table).
5. If `must_change_password` flag is set, the user is forced to set a new password before proceeding.
6. Role training guide modal appears on first successful login after password change.

### 4.2 Password Policy

| Control | Requirement |
|---------|-------------|
| Minimum length | 8 characters |
| Complexity | At least one uppercase, one lowercase, one digit, one special character |
| First login | Must change temporary password set by admin |
| Reset | Admin distributes reset code; token TTL 60 minutes |
| Storage | bcrypt hashed; plaintext never stored or transmitted in logs |

### 4.3 Session Controls

| Control | Default | Environment Variable |
|---------|---------|---------------------|
| Session timeout | 120 minutes sliding | `SESSION_TIMEOUT_MINUTES` (range 5–480) |
| Failed login lock | 5 consecutive failures | `FAILED_LOGIN_LOCK_THRESHOLD` |
| Lock duration | 30 minutes | `ACCOUNT_LOCK_MINUTES` |
| CSRF protection | Required on all mutating requests | Automatic |
| Activity tracking | `POST /api/session/activity` extends session | Automatic on user interaction |

**Account lock recovery:** Only Administrator or MD can unlock locked accounts via Settings → Team & access. Branch Managers cannot reset passwords or unlock accounts.

### 4.4 Workspace Branch Selection

1. Confirm the branch shown in the top workspace bar matches your physical location.
2. Admin, MD, CEO, and Chairman may switch branches or enable "view all branches" for org-wide rollup.
3. All writes (quotations, receipts, GRNs, production jobs) post to the **current workspace branch**.
4. Finance with `finance.cross_branch_post` may post receipts to customers in other branches under controlled rules.

**Critical rule:** Before posting any financial transaction, verbally confirm branch with a colleague if uncertain. Cross-branch mis-posting requires reversal and re-posting with audit trail.

---

## 5. ROLE-BASED ACCESS CONTROL (RBAC)

### 5.1 Permission Model

The system uses granular string permissions (100+ keys) assigned to roles in `server/auth.js` → `ROLE_DEFINITIONS`. Individual users may receive custom overrides in `app_users.permissions_json`, audited via `org_policy_audit`.

Permission check pattern: `requirePermission('permission.key')` on API routes; `ModuleRouteGuard` and desk-specific guards on frontend routes.

### 5.2 Complete Role Catalogue

| Role Key | Display Title | Permission Summary |
|----------|---------------|-------------------|
| `admin` | System Administrator | `*` (all permissions) |
| `md` | Managing Director | Org-wide strategic control, all approvals, pricing, treasury reserve, executive HR |
| `ceo` | Chief Executive Officer | `exec.dashboard.view` + `dashboard.view` only — read-only executive |
| `chairman` | Chairman (Board) | CEO permissions + `hr.chairman.manage` for family/scholarship accounts |
| `finance_manager` | Accountant / Head of Accounts | Accounting desk, GL, reconciliation, treasury oversight, cross-branch posting |
| `cashier` | Cashier | Cashier desk only: receipts confirm, treasury payouts, refund pay — no approve |
| `sales_manager` | Branch Manager | Sales, operations, production, refund approve, material incident approve, team HR |
| `sales_staff` | Sales Officer | Customers, quotations, receipts post, refund request |
| `operations_officer` | Operations Officer / Storekeeper | Inventory, production, deliveries, GRN, material incident create |
| `hr_admin` | HR Administrator | Full HR: directory, payroll prep, attendance, discipline, exit |
| `gmhr` | GM, Human Resources | Org-wide HR final approvals: leave, loans, transfers, exit clearance |
| `hr_portal_only` | HR Portal (Self-Service Only) | Self-service only — mining division / scholarship staff |
| `viewer` | Read-Only Viewer | `dashboard.view` only |

**Legacy aliases:** `storekeeper` and `store_keeper` normalise to `operations_officer`.

### 5.3 Finance Desk Separation (Phase B)

A core internal control separates Cashier and Accounting desks:

| Desk | Route | Required Permission | Capabilities |
|------|-------|---------------------|--------------|
| Cashier Desk | `/accounts` (cashier tabs) | `cashier.desk.view`, `cashier.receipts.confirm` | Receive payments, confirm receipts, process payouts, transfers |
| Accounting Desk | `/accounting` | `accounting.desk.view` | GL journals, trial balance, reconciliation, bank deposits, fixed assets, period close |

**Enforcement:** `FinanceDeskRouteGuard` in frontend; GL API endpoints reject cashier role; legacy tab RBAC in `/accounts`.

**Rationale:** One person must not both receive cash and reconcile the bank account. This satisfies basic segregation of duties for cash handling.

### 5.4 Module Visibility Matrix

| Module / Route | Accessible Roles |
|----------------|------------------|
| `/sales` | All except `hr_portal_only`, `cashier` |
| `/customers` | sales_manager, sales_staff, finance_manager, md, admin |
| `/procurement` | operations_officer, sales_manager, finance_manager, md, admin |
| `/operations` | operations_officer, sales_manager, md, admin |
| `/accounts` | finance_manager, cashier, md, admin (BM redirected to `/manager`) |
| `/accounting` | finance_manager, md, admin |
| `/manager` | sales_manager, admin |
| `/exec` | md, ceo, chairman, admin |
| `/hr/*` | hr_admin, gmhr |
| `/team-hr/*` | sales_manager |
| `/executive-hr/*` | md, ceo, chairman |
| `/my-profile/*` | all staff |
| `/reports` | finance_manager, sales_manager, md, admin, ceo, chairman |
| `/settings` | admin, md (limited) |
| `/edit-approvals` | sales_manager, md, admin |

---

## 6. CROSS-CUTTING BUSINESS RULES

### 6.1 Approval Thresholds

Configurable under Settings → Governance → Office approval thresholds and `org_policy_kv`:

| Threshold | Default | Applies To |
|-----------|---------|------------|
| Expense BM approval limit | ₦200,000 | Payment requests — above requires MD |
| Refund MD approval threshold | ₦1,000,000 | Refunds — above requires MD/CEO |
| Credit BM limit | Configurable | Credit exceptions below BM limit |
| Credit MD required above | Configurable | Credit exceptions above BM limit |
| High-value receipt double-entry | ₦100,000 | Amount must be typed twice |
| Others expense finance review | ₦50,000 | Flagged for finance review |
| AP3 unclassified alert | ₦100,000 | Triggers costing alert |
| Others branch coaching | 15% of branch expenses | Coaching alert to BM |

### 6.2 Payment and Production Gates

**Cutting List Payment Gate:**
- Default: customer must have paid ≥70% of quotation value before cutting list release
- Configurable per branch: `cutting_list_min_paid_fraction` in `branches` table
- Branch Manager may override with documented justification (`approve_production` on `/manager`)
- Override logged with approver, note, and paid fraction at time of override

**Delivery Payment Gate:**
- Environment: `DELIVERY_PAYMENT_GATE` = `off` | `warn` | `enforce`
- `enforce`: delivery blocked until balance cleared or active credit exception exists
- `ALLOW_MD_DELIVERY_OVERRIDE=true`: MD may bypass per delivery
- `DELIVERY_PAYMENT_GATE_STRICT_FINANCE`: finance must confirm before dispatch

**Below-Floor Price Gate:**
- Quotation saves below price list floor are allowed with warning
- Cutting list and production blocked until MD records price exception approval
- API: `PATCH /api/quotations/:id/md-price-exception-approve`

### 6.3 Accounting Period Control

- All financial writes enforce `assertPeriodOpen()` for the posting date's period (`YYYY-MM`)
- Posting to a closed period returns a hard error
- Period locks managed by `finance_manager` with `period.manage` permission
- Back-dated corrections require period to be open or admin override

### 6.4 Edit Approval System

Changes to confirmed/settled documents require Edit Approval:

1. User attempts edit on locked quotation, PO, customer, or delivery record.
2. System prompts edit approval request.
3. Designated approver (BM or MD) opens `/edit-approvals`.
4. Approver issues **6-digit one-time code** to requester.
5. Requester enters code → single save is consumed.
6. All actions logged in `approval_actions` and `audit_log`.

### 6.5 Audit Trail Requirements

Every significant mutation writes to `audit_log` with:
- Actor user ID and display name
- Timestamp (ISO format)
- Action type (e.g., `refund.create`, `receipt.bank_confirmation`, `material_incident.approve`)
- Target entity type and ID
- Branch ID
- Optional JSON payload with before/after values

HR-specific actions additionally log to `hr_audit_events`. Custom permission changes log to `customPermissionAudit`.

**Audit records are immutable** — they cannot be deleted or modified by any user including admin.

### 6.6 Rate Limiting

Authenticated ledger money POSTs (receipt, advance, refund-advance) are rate-limited per user:
- Default: 45 requests per minute
- Configure: `ZAREWA_LEDGER_POST_MAX`, `ZAREWA_LEDGER_POST_WINDOW_MS`

Login and forgot-password endpoints have separate rate limits to prevent brute force.

### 6.7 Filing Standards

On approval of payment/refund work items, the system may issue filing reference: `ZR/{branch}/{domain}/{year}/{seq}` stored in `work_item_filing`.

Filing completeness (`filingCompleteness.js`) is checked before work items can be formally closed. Documents without filing numbers cannot be archived.

Print snapshots captured at lock/closure stored in `work_item_print_snapshots` — protects against retrospective document alteration.

---

## 7. ORGANISATIONAL POLICY SETTINGS

Stored in `org_policy_kv` with full audit trail in `org_policy_audit`:

| Policy Key | Description | Default |
|------------|-------------|---------|
| `CREDIT_BRANCH_MANAGER_LIMIT_NGN` | Max credit BM can approve alone | Not set |
| `CREDIT_MD_REQUIRED_ABOVE_NGN` | Threshold requiring MD for credit | Not set |
| `DELIVERY_PAYMENT_GATE` | off / warn / enforce | off |
| `ALLOW_MD_DELIVERY_OVERRIDE` | MD bypass per delivery | false |
| `DELIVERY_PAYMENT_GATE_STRICT_FINANCE` | Finance confirm before dispatch | false |
| `SESSION_TIMEOUT_MINUTES` | Idle timeout | 120 |
| `FAILED_LOGIN_LOCK_THRESHOLD` | Failed logins before lock | 5 |
| `ACCOUNT_LOCK_MINUTES` | Lock duration | 30 |
| `OTHERS_MIN_JUSTIFICATION_LEN` | Min chars for Others expense | 40 |
| `OTHERS_FINANCE_REVIEW_THRESHOLD_NGN` | Others finance review flag | 50000 |
| `AP3_UNCLASSIFIED_ALERT_THRESHOLD_NGN` | AP3 costing alert | 100000 |
| `OTHERS_BRANCH_COACH_THRESHOLD_PCT` | Others % coaching alert | 15 |
| `maternityLeaveDays` | Maternity leave entitlement | Per policy |

Changes to org policy require MD or admin authority and are permanently audited.

---

## 8. OFFLINE AND DEGRADED MODE

If the API becomes unavailable:

1. UI displays "System offline" banner with last synced workspace data.
2. **No new transactions can be saved** — all write operations queue-fail.
3. User should click "Try reconnect" or refresh after IT confirms server health.
4. **Do not** record transactions on paper intending to "catch up later" without supervisor approval — risk of duplicate posting.
5. IT monitors `/api/health`, `/api/readyz`, `/api/livez` endpoints.

Health endpoint exposes `DELIVERY_PAYMENT_GATE` mode and other feature flags for operational awareness.

---

## 9. IT ADMINISTRATION RESPONSIBILITIES

### 9.1 User Lifecycle

| Action | Procedure | System Location |
|--------|-----------|-----------------|
| Create user | Set username, role, branch, temporary password | Settings → Team & access |
| Reset password | Generate reset code; user changes on next login | Settings → Team & access |
| Unlock account | Clear lock after failed login threshold | Settings → Team & access |
| Custom permissions | Grant/revoke individual permission overrides | Settings → Team & access (audited) |
| Deactivate user | Only after HR exit clearance complete (all 5 stages) | Settings → Team & access |

### 9.2 Database and Migrations

- Migrations run automatically on API startup via `server/migrate.js`
- Schema defined in `server/schemaSql.js` with incremental migrations
- Production cutover: set `ZAREWA_EMPTY_SEED=1` for clean numbering from 0001
- Backup procedures: see `docs/DEPLOYMENT.md` § Backup and recovery

### 9.3 Regular Maintenance Schedule

| Frequency | Task | Owner |
|-----------|------|-------|
| Daily | Confirm server uptime; review failed login attempts in audit log | IT Admin |
| Weekly | Verify database backup integrity; review session activity | IT Admin |
| Monthly | Database integrity check; review custom permission changes; verify stock register progress | IT Admin + Finance |
| Quarterly | Rotate admin credentials; audit user access list; test disaster recovery | IT Admin + MD |
| Per release | Run `npm run test` and `npm run test:e2e`; verify migration success | IT Admin |

### 9.4 Integration API Keys

External systems may read trial balance and journal register via Bearer token:
- `GET /api/integration/v1/trial-balance`
- `GET /api/integration/v1/journals`
- Keys managed in Settings; read-only access only

---

## 10. ZARE AI ASSISTANT

### 10.1 Purpose

Zare is the built-in AI assistant providing:
- Natural language Q&A on ERP workflows
- "Tour this page" step-by-step coaching
- Memo drafting and polish (`/api/office/ai/polish-memo`)
- Transaction-specific contextual help
- Workflow coaching for blocked actions
- Business analysis insights for MD and senior staff

### 10.2 Usage Rules

1. Zare explains procedures — **you perform every action yourself**.
2. Zare does not post transactions, approve items, or override gates on your behalf.
3. Queries are logged in `help_query_log`; knowledge gaps in `help_knowledge_gaps` for improvement.
4. User memory (`help_user_memory`) and branch memory (`help_branch_memory`) personalise responses.
5. RAG knowledge base in `help_rag_chunks` weighted by `help_article_weights`.

### 10.3 When to Use Zare vs This Manual

| Situation | Use |
|-----------|-----|
| "How do I post a receipt on this screen?" | Zare → Tour this page |
| "What is the approval chain for refunds above ₦1M?" | This manual § Segregation table |
| "Why is my cutting list blocked?" | Zare (reads live quotation state) |
| Month-end close checklist | This manual + SOP-03 |
| Policy interpretation dispute | Line manager + this manual |

---

## 11. GLOSSARY (KEY TERMS)

| Term | Definition |
|------|------------|
| AP1c | Accounting Phase 1c — revenue recognised at production completion with auto GL |
| AP2 | Accounting Phase 2 — received-basis AP; inventory at landed cost |
| AP3 | Accounting Phase 3 — branch P&L, material costing, payroll labour per job |
| Bootstrap | Initial workspace data snapshot loaded on login |
| CL | Cutting List — production work order from sales |
| COGS | Cost of Goods Sold (GL 5010–5050) |
| Credit Exception | Formal approval for customer credit terms |
| CSRF | Cross-Site Request Forgery token required on writes |
| Delivery Gate | Payment check before goods dispatch |
| GRN | Goods Received Note — store receipt against PO |
| OBL | Staff Obligation Account — loans, credits, recoveries |
| POD | Proof of Delivery — customer sign-off on delivery |
| RBAC | Role-Based Access Control |
| WIP | Work-in-Progress — goods in production |
| Zare | Zarewa AI assistant |

Full glossary: [APPENDIX-A-GLOSSARY-AND-REFERENCE.md](./APPENDIX-A-GLOSSARY-AND-REFERENCE.md)

---

*End of Part 1. Proceed to department SOPs for operational procedures.*


---

<!-- SOURCE: SOP-01-SALES-OFFICE.md (2,783 words) -->

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


---

<!-- SOURCE: SOP-02-CASHIER-DESK.md (1,873 words) -->

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


---

<!-- SOURCE: SOP-03-ACCOUNTING-DESK.md (1,571 words) -->

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


---

<!-- SOURCE: SOP-04-OPERATIONS-STORE.md (1,013 words) -->

# SOP-04: OPERATIONS & STORE

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Department:** Operations / Store  
**System modules:** `/operations`, `/operations/coils/:coilNo`, `/operations/material-exceptions`  
**Primary role:** `operations_officer` (Storekeeper)  
**Supporting roles:** `sales_manager`, `md`

---

## 1. PURPOSE AND SCOPE

Operations and Store is the authoritative source for physical inventory truth: coil register, accessory stock, stone inventory, goods receipt (GRN), customer deliveries, and material exceptions. Sales sees status read-only; Operations confirms what was produced and delivered.

---

## 2. OPERATIONS MODULE NAVIGATION

Route: `/operations`

| Tab | Function |
|-----|----------|
| Overview | Production dashboard, coil control, live job monitor |
| Stock management | GRN, coil registration, SKU adjustments |
| Material exceptions | Incident queue |
| Production line | Release queue, complete jobs, deliveries |

---

## 3. GOODS RECEIPT (GRN)

### 3.1 Prerequisites

- Approved PO in status **On loading**, **In Transit**, or **Approved** (per local policy)
- Physical goods arrived at branch
- Weighbridge ticket (coil) or packing list (accessories/stone)

### 3.2 Coil GRN Procedure

1. **Operations** → **Stock management** → **Post GRN**.
2. Select PO and PO line.
3. Enter received data:
   - **Coil number** (manufacturer serial — unique)
   - **Gross weight (kg)**
   - **Gauge, colour, profile, material type** (aluzinc/aluminium)
   - **Received date**
4. System creates `coil_lots` record; updates `qty_remaining`.
5. GL (AP2): Dr Inventory (1300), Cr AP (2000).
6. If short-receipt vs PO qty: system notifies MD (`notifyMdCoilShortReceipt`).

### 3.3 Accessory / Stone GRN

1. Select PO line (accessory or stone type).
2. Enter quantity received vs PO quantity.
3. Updates `products` branch stock (`stock_level`).
4. Stone: track sheets; system converts sheets to m² for production.

### 3.4 GRN Controls

- Cannot GRN against cancelled PO
- Short receipt tolerance configurable; above tolerance → MD work item
- Landed cost includes carriage inward from PO transport fields

---

## 4. COIL REGISTER MANAGEMENT

### 4.1 Coil Lot Attributes

| Field | Description |
|-------|-------------|
| Coil number | Unique manufacturer serial |
| qty_remaining | Kg left on roll |
| qty_reserved | Kg allocated to production jobs |
| Gauge, colour, profile | Specification |
| current_status | Available (default) |
| production_blocked | Blocks job assignment if true |

### 4.2 Coil Profile

Navigate: `/operations/coils/:coilNo`

Shows: full traceability, control events (CREV), production allocations, reservation history.

### 4.3 Coil Control Events (CREV)

Every coil movement logged immutably:

| Event Type | When |
|------------|------|
| Return inward | Coil returned from production unused |
| Return outward | Coil sent to production floor |
| Head trim | Trimming coil head |
| Supplier defect | Damage attributed to supplier |
| Split | Roll split into two lots |
| Scrap | Coil scrapped |
| Finish roll | Remaining ≤85 kg tail threshold |

**Tail finish:** When remaining ≤85 kg, system flags "Roll Finished" and clears residual.

### 4.4 Coil Requests

Store requests coil from yard/register:
1. Create **Coil Request** (CREQ-XX-YY-NNNN)
2. Approve and fulfil
3. Stock movement recorded

---

## 5. STOCK MANAGEMENT

### 5.1 Finished Goods (FG)

Post-production stock tracked in `products` by gauge, colour, type per branch.

### 5.2 Low Stock Alerts

Dashboard KPI: SKUs below threshold. Review daily on Overview tab.

### 5.3 Stock Adjustments

Requires `inventory.adjust` permission. Document reason; manager approval for material adjustments.

### 5.4 In-Transit Loads

Factory-to-branch goods in transit: `IT-KD-26-NNNN`. Reconciled at month-end stock register.

---

## 6. DELIVERIES

### 6.1 Authority

**Operations confirms delivery — not Sales.** Sales sees delivery status read-only.

### 6.2 Delivery Procedure

1. FG ready from completed production job.
2. **Operations** → create **Delivery** (DLV-XX-YY-NNNN).
3. Link to quotation and delivery lines (metres per product).
4. **Delivery gate check:**
   - `DELIVERY_PAYMENT_GATE=enforce`: blocked if balance due and no credit exception
   - `warn`: warning shown but proceeds
   - `off`: no check
5. Dispatch goods; customer signs delivery note (POD).
6. **Confirm delivery** in system with POD reference.
7. Stock deducted; quotation delivery status updated.

### 6.3 Delivery Credit

If dispatch before full payment required:
- Active **credit exception** on customer, OR
- Branch Manager **delivery credit** approval on Manager dashboard

---

## 7. MATERIAL EXCEPTIONS

See dedicated workflow — summary:

1. **New incident** → type, coil/job links, kg/metres, storekeeper + operator names
2. **Save draft** → print with draft watermark if needed
3. **Submit** → Branch Manager queue
4. **Approve & post** → stock adjusted; metres to offcut pool
5. **Void** (not delete) with manager reason if error

**Types:** coil_damage, production_offcut, missing_asset, asset_loss

Full detail: backend `docs/MATERIAL_EXCEPTIONS_SOP.md` and SOP-05 §6.

---

## 8. MONTHLY STOCK REGISTER — 4-STAGE SIGN-OFF

| Stage | Owner | Action | Status After |
|-------|-------|--------|--------------|
| 1 | Operations Officer | Physical count vs system | store_confirmed |
| 2 | Branch Manager | Review; adjustment window | bm_approved |
| 3 | MD | Review all branches | md_approved |
| 4 | Admin/MD | Lock; print snapshot captured | locked |

**Locked register:** No further edits; snapshot in `work_item_print_snapshots`.

Capture via **Reports** → Stock register month-end.

---

## 9. MATERIAL REQUESTS (INTER-BRANCH)

Branch requests stock from another branch:

1. Create **Material Request** (MREQ-XX-YY-NNNN)
2. Fulfilling branch approves and dispatches
3. Stock movements on both branches
4. May create inter-branch treasury loan if applicable

---

## 10. DAILY OPERATIONS CHECKLIST

**Opening:**
- [ ] Branch confirmed
- [ ] Review production queue
- [ ] Check coil availability for today's cutting lists
- [ ] Review in-transit loads expected today

**During day:**
- [ ] GRN all arrivals same day
- [ ] Register new coil lots immediately after weighbridge
- [ ] Log material incidents before end of shift

**Closing:**
- [ ] Complete open GRNs
- [ ] Confirm deliveries dispatched are confirmed in system
- [ ] Report discrepancies to BM

---

## 11. CONTROLS

- Coil movements audited via `coil_control_events`
- No delete on material incidents — void only
- GRN creates AP liability under AP2 — coordinate with Finance
- Operations is authoritative for produced metres and delivery truth

---

*End of SOP-04. Cross-references: SOP-05 (Production), SOP-06 (Procurement GRN link), SOP-01 (Cutting lists).*


---

<!-- SOURCE: SOP-05-PRODUCTION.md (1,005 words) -->

# SOP-05: PRODUCTION

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Department:** Production  
**System modules:** `/operations` → Production line, Live Production Monitor  
**Primary roles:** `operations_officer`, Production Manager (`desig_pm`), QCO (`desig_qco`)  
**Supporting roles:** `sales_manager` (QC sign-off)

---

## 1. PURPOSE AND SCOPE

Production transforms raw coil into finished roofing metres per cutting list instructions. This SOP covers production job lifecycle, coil allocation, conversion quality control, WIP accounting, revenue recognition trigger (AP1c), and post-completion adjustments.

---

## 2. PRODUCTION WORKFLOW OVERVIEW

```
Cutting List issued → Production Job created (Planned)
    → Coil allocated → Job Started (Running)
    → Metres recorded → Conversion check
    → Job Completed → Revenue recognised (AP1c)
    → Delivery created → Customer POD
```

| Job Status | Meaning |
|------------|---------|
| Planned | Created, not started |
| Running | Production in progress |
| Completed | Finished; metres recorded |
| Cancelled | Aborted |

---

## 3. RELEASING TO PRODUCTION QUEUE

### 3.1 Prerequisites

- [ ] Cutting list exists and status = issued
- [ ] Payment gate passed OR BM production override recorded
- [ ] Price exception approved (if below-floor quotation)
- [ ] Coil stock available for gauge/colour

### 3.2 Procedure

1. **Operations** → **Production line** → **Production queue**.
2. Select cutting list / quotation.
3. Click **Release to production**.
4. System creates Production Job `PJ-KD-26-NNNN` (status: Planned).
5. Job appears in Live Production Monitor.

---

## 4. COIL ALLOCATION

### 4.1 Procedure

1. Open production job.
2. **Allocate coil(s)** from available coil lots:
   - Match gauge, colour, profile to cutting list requirements
   - Enter kg to allocate per coil
3. System reserves kg on `coil_lots.qty_reserved`.
4. Logs coil control event (CREV) — return outward to floor.
5. Links recorded in `production_job_coils`.

### 4.2 Blocked Coils

If `production_blocked=true` on coil lot:
- Cannot allocate until block reason resolved
- MD auto-notified on coil short-receipt blocks

### 4.3 Coil Consumption

Consumption follows actual coil tag weights through production. On completion, remaining kg returned via control event or finish-roll if ≤85 kg.

---

## 5. STARTING AND RUNNING PRODUCTION

### 5.1 Start Job

1. Open job in Live Production Monitor.
2. Click **Start production**.
3. Status → **Running**.
4. WIP balance opened (AP3): coil cost debited to WIP.

### 5.2 During Production

- Record progress metres per line
- Log material issues via **Report material issue** (quick-create material incident)
- Monitor coil remaining weight

---

## 6. COMPLETING PRODUCTION

### 6.1 Completion Procedure

1. Measure actual output metres per line.
2. Enter **produced metres** on job completion form.
3. System computes **conversion variance** vs theoretical (standard kg/m per gauge).
4. If variance **>5%**: flagged for manager review.
5. Select **conversion reason** if band = High or Low:
   - Material defect, coil splicing, cutting error, specification change, calibration difference
6. Click **Complete job**.
7. Status → **Completed**.

### 6.2 Conversion QC Bands

| Band | Action |
|------|--------|
| OK | Within tolerance — auto-pass |
| High | Actual > theoretical — BM/QCO sign-off required |
| Low | Actual < theoretical — BM/QCO sign-off required |
| Pending | Awaiting review |

**BM QC sign-off:** Manager Dashboard → Production QC tab.

### 6.3 Offcut Usage

If production uses material from incident offcut pool:
- Select incident(s) on completion form
- Completion shows "supplied from offcut"
- Pool metres decremented

### 6.4 Accessory and Stone Usage

- `production_job_accessory_usage` — accessory fulfillment per job
- `production_job_stone_flatsheet_usage` — stone sheets consumed
- Tracked separately from sheet metres

---

## 7. REVENUE RECOGNITION (AP1c)

**Policy V1 — critical accounting rule:**

Revenue is recognised at **production completion**, not delivery or invoice date.

On job completion, system auto-posts GL:
- **Dr** Accounts Receivable (customer ledger)
- **Cr** Sales Revenue (GL 4000)

**Implication:** Customer balance shows revenue on books before physical delivery. Finance and Sales must understand this for customer statements and refund calculations.

---

## 8. WIP AND COSTING (AP3)

| Event | WIP Effect |
|-------|------------|
| Job start | Coil cost → WIP debit |
| Job complete | WIP cleared → COGS (AP3 classification) |
| Accessory usage | Added to job cost |

AP3 reports: standard vs actual cost per metre; costing readiness check on Accounting desk.

---

## 9. PRODUCTION COMPLETION ADJUSTMENTS

Post-completion metre corrections (customer dispute, measurement error):

1. Operations or BM initiates adjustment
2. Documents reason (≥10 chars)
3. Adjusts produced metres on job
4. May trigger revenue/AR adjustment via AP1c rules
5. Audited in `production_completion_adjustments`

---

## 10. JOB INTELLIGENCE PANEL

API: `GET /api/production-jobs/:id/intel`

Displays:
- Conversion alert band
- Planned vs actual metre variance %
- Stone/accessory rollup
- Quote paid % and BM production-gate override status
- Refund risk flags

Available in Live Production Monitor — collapsible panel.

---

## 11. PRODUCTION PAYMENT GATE OVERRIDE

When quotation below 70% paid but BM authorises production:

1. BM → Manager Dashboard → Production gate
2. **Approve production** with note (≥10 chars)
3. Records: `manager_production_approved_by_*`, note, paid fraction at override
4. Also available: **ProductionPaymentGateOverridePanel** in Live Production Monitor

---

## 12. QUALITY CONTROL (QCO)

Quality Control Officer (`desig_qco`) responsibilities:

- Sign off on High/Low conversion bands
- Verify gauge and colour match cutting list
- Reject completion if specification deviation — return to Running
- Link QC flag to production job record

---

## 13. PRODUCTION DASHBOARD KPIs

| KPI | Source |
|-----|--------|
| Metres produced (MTD) | Completed jobs sum |
| Jobs in queue | Planned + Running count |
| Conversion QC gaps | High/Low without sign-off |
| Payment gate breaches | Quotations in production below threshold |

---

## 14. DAILY PRODUCTION CHECKLIST

- [ ] Release new cutting lists to queue (morning)
- [ ] Allocate coils before start
- [ ] Complete jobs same day where possible
- [ ] QC sign-off on all High/Low completions before close
- [ ] Report material incidents for scrap/damage
- [ ] Coordinate deliveries with Operations store

---

*End of SOP-05. Cross-references: SOP-04 (Store/GRN), SOP-03 (AP1c revenue), SOP-01 (Cutting lists).*


---

<!-- SOURCE: SOP-06-PROCUREMENT.md (877 words) -->

# SOP-06: PROCUREMENT

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Department:** Procurement  
**System modules:** `/procurement`, `/procurement/suppliers/:id`, `/procurement/transport-agents/:id`  
**Primary roles:** `md`, Procurement Officer (`desig_po`, `desig_hop`)  
**Supporting roles:** `operations_officer` (GRN), `finance_manager` (payment)

---

## 1. PURPOSE AND SCOPE

Procurement manages the acquisition of raw materials (coil, stone, accessories), transport haulage, and supplier relationships. At Zarewa, procurement is centralised at HQ under MD authority. This SOP covers the complete PO lifecycle from requisition through payment.

---

## 2. PROCUREMENT MODULE

Route: `/procurement`

| Tab | Function |
|-----|----------|
| Purchases | PO create, approve, status tracking |
| Payments | Supplier payables, treasury-linked payments |
| Transport catch-up | In-transit reconciliation vs agents |
| Suppliers | Master data register |
| Conversion | Coil density standards, price list, material pricing |

---

## 3. SUPPLIER MANAGEMENT

### 3.1 Scope

Suppliers are **company-wide** master data — not branch-scoped. Shared across Kaduna, Yola, Maiduguri.

### 3.2 Registering a Supplier

1. **Procurement** → **Suppliers** → **New Supplier**.
2. Complete:
   - Legal name, trading name
   - Tax ID (deduplication key)
   - Phone (normalised)
   - Contact persons
   - Bank account details (multiple accounts supported)
   - Attachments (contracts, certificates)
3. Save → supplier profile at `/procurement/suppliers/:supplierId`.

### 3.3 Transport Agents

Haulage partners managed separately at `/procurement/transport-agents/:agentId`. Linked to PO transport and in-transit loads.

---

## 4. PURCHASE ORDER TYPES

Derived from line items (`poLineTypes.js`):

| PO Kind | Description | GRN Effect |
|---------|-------------|------------|
| Coil | Steel coil purchase | Creates `coil_lots` |
| Accessories | Fixings, ridges, gutters | Updates `products` stock |
| Stone/flatsheet | Stone-coated substrates | Updates stone inventory |
| Supplier advance | Pre-payment before receipt | AP2 advance tracking |
| Mixed | Combination in single PO | Multiple GRN types |

---

## 5. PO LIFECYCLE

### 5.1 Status Flow

```
Draft → Pending → Approved → On loading → In Transit → Received
                  ↘ Rejected
```

| Status | Meaning |
|--------|---------|
| Pending | Submitted awaiting approval |
| Approved | Committed; awaiting loading |
| On loading | Goods being loaded at supplier |
| In Transit | Haulage paid / goods moving |
| Received | GRN complete; quantities finalised |

### 5.2 Creating a Purchase Order

1. **Procurement** → **Purchases** → **New PO**.
2. Select **supplier**.
3. Select PO type modal: **Coil** / **Stone** / **Accessory**.
4. Add lines:
   - **Coil:** gauge, colour, kg, price per kg, expected coil specs
   - **Stone:** sheets, m², product type
   - **Accessory:** SKU, quantity, unit price
5. Enter transport fields: agent, haulage cost, expected delivery date.
6. Save → `PO-KD-26-NNNN` (branch code of creating workspace).
7. Status: Pending (or Approved if creator has authority).

### 5.3 PO Approval

- MD approves major coil POs (default policy)
- BM may approve within local limits if configured
- Rejected POs cannot proceed to loading

### 5.4 Transport and In-Transit

1. Assign **transport agent** on approved PO.
2. Update status → **On loading** when loading commences.
3. Post **haulage payment** (optional) → may advance to **In Transit**.
4. `syncPurchaseOrderTransportPaymentState` links treasury payment to status.
5. Create **In-Transit Load** (`IT-KD-26-NNNN`) for tracking.

### 5.5 Goods Receipt (Handoff to Operations)

When goods arrive at branch — **Operations posts GRN** (SOP-04 §3):
- PO status → **Received** when all lines fully received
- Short receipt: tolerance check; above tolerance → MD work item (`procurementWorkItems.js`)

---

## 6. SUPPLIER PAYMENT

### 6.1 Procedure

1. **Procurement** → **Payments** tab (or Finance desk).
2. Select PO / payable line.
3. Verify three-way match readiness: ordered, received, due.
4. Finance posts **supplier payment**:
   - Links to PO and treasury account
   - Updates `accounts_payable` and `supplier_paid_ngn`
5. AP2: payment clears AP liability created at GRN.

### 6.2 Supplier Advances (AP2)

Pre-payment before goods receipt:
1. Record advance on PO
2. Tracked as supplier advance under AP2
3. On GRN: advance applied against payable
4. Diagnostics: Accounting desk → AP2 → unmatched advances

---

## 7. MATERIAL REQUESTS

Internal branch-to-branch or store requests:

1. Create **Material Request** (MREQ-XX-YY-NNNN) from Office or Operations
2. Approve and fulfil
3. Stock movements; optional inter-branch treasury entries

---

## 8. CONVERSION STANDARDS

**Procurement** → **Conversion** tab:

- Coil density (kg/m) per gauge — used for conversion variance calculation
- Price list administration (also `/price-list`)
- Material pricing workbook floors

Changes affect production conversion checks — coordinate with Production Manager before updating.

---

## 9. PROCUREMENT DASHBOARD

`/api/procurement/dashboard/*`:
- Open POs by status
- In-transit loads
- Supplier payable aging
- Short receipt alerts

---

## 10. CONTROLS

| Control | Detail |
|---------|--------|
| MD notification | Coil short receipt above tolerance |
| Company-wide suppliers | Single supplier record prevents duplicate payments |
| PO edit after Received | Requires Edit Approval |
| Transport payment sync | Status auto-updates on haulage treasury post |
| AP2 liability | GRN creates AP; payment clears — not payment-created liability |

---

## 11. MONTH-END PROCUREMENT CHECKLIST

- [ ] All received goods GRN'd
- [ ] In-transit loads reconciled
- [ ] Supplier payables match GRN register
- [ ] Unmatched advances investigated (AP2 diagnostics)
- [ ] Open POs documented (on order vs in transit)

---

*End of SOP-06. Cross-references: SOP-04 (GRN), SOP-03 (AP2 payables), SOP-08 (MD approvals).*


---

<!-- SOURCE: SOP-07-HUMAN-RESOURCES.md (1,331 words) -->

# SOP-07: HUMAN RESOURCES

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Department:** Human Resources  
**System modules:** `/hr/*`, `/team-hr/*`, `/executive-hr/*`, `/my-profile/*`  
**Primary roles:** `hr_admin`, `gmhr`  
**All staff:** self-service via `/my-profile`

---

## 1. PURPOSE AND SCOPE

HR manages the complete employee lifecycle: onboarding, time & absence, payroll, loans, discipline, transfers, separations, and executive benefits. The ERP enforces multi-stage approval chains and blocks account deactivation until exit clearance completes.

---

## 2. HR MODULE STRUCTURE

| Hub | Route | Users |
|-----|-------|-------|
| HR Dashboard | `/hr/dashboard` | hr_admin, gmhr |
| Employees | `/hr/employees` | hr_admin |
| Time & Absence | `/hr/time-absence` | hr_admin, gmhr |
| Payroll & credit | `/hr/payroll` | hr_admin, gmhr, finance |
| Talent | `/hr/talent` | hr_admin |
| Cases & exit | `/hr/discipline-exit` | hr_admin, gmhr |
| Documents | `/hr/documents` | hr_admin |
| Analytics | `/hr/analytics` | hr_admin, gmhr |
| Administration | `/hr/settings` | hr_admin |
| Team HR | `/team-hr/*` | sales_manager (line managers) |
| Executive HR | `/executive-hr/*` | md, ceo, chairman |
| Self-Service | `/my-profile/*` | all staff |

---

## 3. EMPLOYEE ONBOARDING

### 3.1 Staff Master File — Required Fields

Assessed by `assessStaffFileCompleteness()`:

- Full name, date of birth, phone
- Branch / site, job title / designation
- Date joined, probation end date (permanent staff)
- Bank account details
- Next of kin (name + phone)
- Highest academic qualification

### 3.2 Registration Procedure

1. **HR** → **Employees** → **Register Employee**.
2. Complete all required fields.
3. Assign designation, salary level (L1–L7), branch.
4. Create system login (Settings → Team & access) with appropriate role.
5. Set `selfServiceEligible=true` for My HR access.
6. Probation tracked — alert when approaching end (default 6 months).

### 3.3 Staff Numbering

Human-readable staff numbers assigned via `hrStaffNumbering.js` per branch policy.

---

## 4. LEAVE MANAGEMENT

### 4.1 Leave Types

| Type | Balance Tracked | Entitlement |
|------|-----------------|-------------|
| Annual | Yes | L1–L3: 14 days/yr; L4–L7: 21 days/yr |
| Sick | No | Medical certificate for extended periods |
| Maternity | Yes | Configurable via `maternityLeaveDays` |
| Compassionate | No | Case-by-case |
| Leave without pay | No | Requires GMHR or MD approval |
| Other | No | Special circumstances |

### 4.2 Leave Request Workflow

```
Employee draft → submit → hr_review → branch_manager_review → gm_hr_review → approved
                      ↘ rejected (at any stage)
```

| Step | Actor | API / Permission |
|------|-------|------------------|
| Submit | Employee | Self-service + own HR file |
| HR review | HR Admin | `hr.requests.hr_review` |
| Branch endorse | Line manager | `hr.branch.endorse_staff` |
| GM HR final | GM HR | `hr.requests.gm_approve` |

### 4.3 Employee Procedure

1. **My HR** → **Time off** → **Request leave**.
2. Select type, dates, reason.
3. Submit → track status on **My requests**.

### 4.4 Team HR Endorsement (Branch Manager)

1. **Team HR** → **Time & absence**.
2. Review team member requests.
3. Endorse or return with comments.

---

## 5. LOAN MANAGEMENT

### 5.1 Staff Loan Workflow

Same chain as leave: submit → HR review → branch endorse → GM HR final approve.

### 5.2 On Approval

- Creates **Staff Obligation Account** (OBL-XX-YY-NNNN)
- `disbursement` transaction recorded
- Repayment via `hr_payroll_line_loans` monthly deductions
- Optional cash repayment at Cashier desk

### 5.3 Exceptional Loans

Above policy limits: **Executive HR** → **Approvals** → MD or Chairman (`exceptional_loan.approve`).

---

## 6. PAYROLL

### 6.1 Sign-Off Sequence (MANDATORY)

```
HR Admin prepares → GM HR approves → MD approves → Lock → Finance pays
```

| Step | Actor | Permission |
|------|-------|------------|
| Prepare run | HR Admin | `hr.payroll.manage` |
| GM approve | GM HR | `hr.payroll.gm_approve` |
| MD approve | MD | `hr.payroll.md_approve` — **cannot be bypassed** |
| Lock | HR Admin | Requires GM **or** MD approval recorded |
| Export / pay | Finance | `hr.payroll.pay`, `hr.payroll.export` |

**Critical:** Payroll cannot be paid without MD's explicit approval in system.

### 6.2 Monthly Payroll Procedure

1. **HR** → **Payroll** → **Prepare monthly run** for period.
2. Review lines: basic, allowances, deductions, loan recoveries, attendance deductions.
3. Submit for GM HR review.
4. GM HR → **GM approve**.
5. MD → **Executive HR** → **Compensation** → **Payroll summary** → MD sign-off.
6. HR → **Lock** run.
7. Finance → **Accounting desk** → **Payroll** → export bank file + treasury post.
8. Employees view payslips: **My HR** → **Payslips**.

### 6.3 PAYE and Pension

- PAYE computed per staff; exported for filing
- Pension: employer + employee portions → GL 2400 (Pension Payable — liability)

---

## 7. ATTENDANCE

### 7.1 Daily Roll

- Team HR / HR Admin marks daily attendance
- Permissions: `attendance.mark`, `daily_roll.mark`
- Uploads via `hr_attendance_uploads` for bulk import
- Deductions flow into payroll

### 7.2 Team HR

Branch managers mark attendance for direct reports at `/team-hr/time-absence`.

---

## 8. DISCIPLINE

### 8.1 Four-Stage Ladder (Board Resolution)

| Stage | Action | Owner |
|-------|--------|-------|
| 1 | Verbal warning — documented | Immediate supervisor |
| 2 | Written warning / query | Supervisor + HR |
| 3 | Final warning / suspension | GMHR (MD-approved suspension) |
| 4 | Demotion / transfer / separation | MD + GMHR |

**Gross misconduct** (theft, fraud, file tampering): may skip to Stage 4.

### 8.2 Discipline Case Workflow

```
draft → open → awaiting_employee_response → under_investigation
    → awaiting_hr_review → awaiting_management_decision → action_issued → closed
```

Case types: query, verbal_warning, written_warning, suspension, gross_misconduct, negligence, absenteeism, theft_fraud, etc.

### 8.3 Incident Recovery

1. Link material incident to discipline case
2. Record responsibility weights per party
3. Generate recovery schedule (`hrIncidentRecoveryOps`)
4. Deduct via payroll → staff obligation account

---

## 9. EMPLOYEE EXIT — 5-STAGE CLEARANCE

| Stage | Action | Permission |
|-------|--------|------------|
| 1 Initiate | Exit with reason and effective date | `hr.exit.initiate` |
| 2 HR Clearance | ID, loans, documents | `hr.exit.view` |
| 3 Finance Clearance | Obligations settled | `hr.exit.finance_clear` |
| 4 Admin Clearance | Assets returned, access revoked | `hr.exit.admin_clear` |
| 5 Final Clearance | GMHR or MD closes record | `hr.exit.final_clear` |

**All 5 stages required before ERP account deactivation.**

---

## 10. EXECUTIVE HR

### 10.1 Access

`/executive-hr/*` — md, ceo, chairman

### 10.2 Modules

| Section | Content |
|---------|---------|
| Family & household | Scholarship, domestic staff, executive benefits |
| Compensation | Payroll summary for MD sign-off, branch contributions |
| Approvals | Sensitive HR, exceptional loans |
| Reports | MD/Chairman HR packs |

### 10.3 Chairman Family Accounts

`hr.chairman.manage` permission:
- School fees for dependents
- Family expense payments
- Scholarship payments
- Domestic staff management

---

## 11. DOCUMENTS AND COMPLIANCE

- Employment letters: `hr.letters.generate`
- ID card requests: employee self-service → HR fulfilment
- Policy acknowledgements: `hr_policy_acknowledgements`
- Document expiry alerts on HR Dashboard
- Staff files retained minimum **7 years**

---

## 12. TRANSFERS

| Transfer Type | Minimum Service | Override |
|---------------|-----------------|----------|
| Branch transfer | 3 years | MD exception memo |
| Internal rotation | 2 years | GMHR or MD exception |
| BM transfer | No minimum | MD judgement |

Enforced in `transferTenurePolicy.js`.

---

## 13. RECRUITING

Public careers: `GET/POST /api/public/careers/*` (no authentication).

HR manages: `hr_job_postings`, `hr_applicants` at `/hr/talent` → Recruit.

---

## 14. HR DASHBOARD KPIs

Active staff · Pending HR review · Awaiting GM final · Payroll awaiting GM · Probation ending · Expiring documents · Open incidents · Queue lines · Overdue SLA

---

## 15. SELF-SERVICE COHORTS

| Cohort | My HR Sections |
|--------|----------------|
| Employee | Time off, requests, payslips, loans, documents, ID card, benefits, policies |
| Scholarship | School, payments, requests (hr_portal_only) |
| Domestic | Home, payments, documents (executive household staff) |

---

*End of SOP-07. Cross-references: SOP-02 (Cashier loan repayment), SOP-03 (Payroll finance), SOP-08 (MD sign-off).*


---

<!-- SOURCE: SOP-08-EXECUTIVE-OFFICE.md (1,004 words) -->

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


---

<!-- SOURCE: SOP-09-MAINTENANCE.md (752 words) -->

# SOP-09: MAINTENANCE

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Department:** Maintenance  
**System modules:** Machines registry (via Operations/Settings), Maintenance plans and work orders  
**Primary roles:** Maintenance Manager (`desig_mm`), Maintenance Technician (`desig_mtech`)  
**Supporting roles:** `finance_manager` (capex, cost posting), `operations_officer`

---

## 1. PURPOSE AND SCOPE

Maintenance ensures production machinery remains operational, safe, and cost-effective. The ERP tracks machines, meter readings, preventive maintenance plans, corrective work orders, maintenance events, and cost lines linked to GL 5020 (Maintenance COGS).

---

## 2. MACHINE REGISTRY

### 2.1 Machine Records

| Field | Description |
|-------|-------------|
| Machine ID | MACH-YY-NNNN |
| Name / description | e.g., Corrugation Line 1 |
| Location | Branch / production hall |
| Fixed asset link | `machine_asset_links` → GL 1500 |
| Status | Active, under maintenance, decommissioned |

### 2.2 Meter Logs

`machine_meter_logs` track usage:
- Operating hours
- Metres produced (where meter fitted)
- Fuel consumption links
- Used for preventive maintenance scheduling

### 2.3 Responsibilities

| Role | Duties |
|------|--------|
| Maintenance Manager (`desig_mm`) | Plans, work order approval, technician assignment |
| Maintenance Technician (`desig_mtech`) | Execute work orders, log events, parts usage |
| Production Manager | Report breakdowns; release machine for maintenance window |

---

## 3. PREVENTIVE MAINTENANCE

### 3.1 Maintenance Plans (MXPL-YY-NNNN)

Recurring scheduled maintenance:

| Plan Type | Example Frequency |
|-----------|-------------------|
| Daily | Oil level check, visual inspection |
| Weekly | Belt tension, lubrication |
| Monthly | Full inspection, filter replacement |
| Quarterly | Major service, alignment check |

**Procedure:**

1. Create **Maintenance Plan** linked to machine.
2. Set frequency, checklist items, estimated duration.
3. System generates **Work Orders** when due.
4. MM assigns technician; tracks completion.

---

## 4. CORRECTIVE MAINTENANCE

### 4.1 Work Orders (MXWO-YY-NNNN)

Ad-hoc or plan-generated repair jobs:

1. **Report breakdown** — Production or Operations logs issue.
2. MM creates **Maintenance Work Order**:
   - Machine, fault description, priority
   - Link to material request if parts needed
3. Status: Opened → acknowledged → approved → closed
4. Technician executes; logs **Maintenance Event** (MXEV-YY-NNNN).

### 4.2 Maintenance Events

Completion record:
- Date, technician, hours spent
- Parts used (linked to stock or expense)
- Labour cost
- Root cause notes

### 4.3 Cost Lines

`maintenance_cost_lines` classify under:
- **Maintenance** expense → GL 5020 (COGS)
- May link to **payment request** for external contractor invoices

---

## 5. MATERIAL REQUESTS FOR PARTS

When maintenance requires spare parts:

1. Create **Material Request** from work order
2. Operations fulfils from store or Procurement raises PO
3. Cost allocated to maintenance work order

---

## 6. ASSET CUSTODY

Maintenance tools and portable equipment tracked via `asset_custody_events`:

| Event | When |
|-------|------|
| assign | Tool issued to technician |
| transfer | Custody change |
| confirm_present | Periodic verification |
| report_missing | Triggers material incident + discipline if negligence |

Linked to HR discipline and recovery schedules if staff negligence established.

---

## 7. GATE PASS EVENTS

Equipment leaving site:
- Record `gate_pass_events` with authorisation
- Security verification
- Return confirmation on re-entry

---

## 8. FIXED ASSET LINKAGE

Production machines linked to fixed asset register:
- Acquisition cost from capex PO or manual registration
- Depreciation via monthly run (60-month useful life for plant)
- Disposal through Accounting desk (SOP-03 §8)

---

## 9. DOWNTIME REPORTING

On machine breakdown:

1. Production Manager stops job allocation to affected machine
2. MM creates urgent work order (priority: Critical — 4hr SLA)
3. Log downtime start/end on work order
4. Production reschedule communicated to Sales via official notice or memo
5. Post-incident review if downtime >4 hours

---

## 10. MAINTENANCE KPIs

| KPI | Target |
|-----|--------|
| Planned maintenance completion | 100% on schedule |
| Breakdown response time | <2 hours acknowledgment |
| Mean time between failures | Track per machine |
| Maintenance cost as % of production COGS | Review monthly |

Reports: maintenance cost lines in expenses pack; machine meter trends on Operations overview.

---

## 11. MONTHLY MAINTENANCE CHECKLIST

- [ ] All due preventive plans completed or rescheduled with reason
- [ ] Open work orders cleared or escalated
- [ ] Meter logs entered for all active machines
- [ ] Asset custody verification for portable tools
- [ ] Maintenance costs reviewed with Finance (GL 5020)
- [ ] Critical spares stock level checked with Operations

---

*End of SOP-09. Cross-references: SOP-04 (Material requests), SOP-03 (Fixed assets), SOP-07 (Asset custody/discipline).*


---

<!-- SOURCE: SOP-10-OFFICE-ADMINISTRATION.md (1,027 words) -->

# SOP-10: OFFICE ADMINISTRATION

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Department:** Office Administration  
**System modules:** `/` (Workspace), `/edit-approvals`, Office threads, Forum, Notices  
**Primary roles:** All staff with `office.use`  
**Senior roles:** `md`, `admin`, `hr_admin`, `gmhr` (notices.manage)

---

## 1. PURPOSE AND SCOPE

Office Administration is the digital workplace for internal communication, structured requests, document filing, and cross-department coordination. Every staff member with `office.use` accesses the **Workspace** (`/`) as their collaboration hub.

---

## 2. WORKSPACE DESK PROFILES

Desk layout adapts by role (`workspaceDeskNav.js`):

| Profile | Sections |
|---------|----------|
| Staff | My Desk, Create Office Record, My Requests, Tasks, Official Notices, Forum, Search |
| Branch (BM) | Branch Desk, Today's Work, Endorsements, Team Requests, Expense Conversions, Incidents, Branch Forum, Filing, Monitoring, Search |
| Office (Finance/HR) | Office Desk, Review Queue, Approvals, Expense Conversions, Filing, Notices, Forum, Monitoring, Records, Search |
| Executive (MD) | Executive Desk, High-value Approvals, Branch Monitoring, Notices, Branch Contributions, Overdue Items, Expense Oversight, Records, Search |

---

## 3. CREATE OFFICE RECORD WIZARD

### 3.1 Record Types

| Type | Purpose | Approval Route |
|------|---------|----------------|
| Memo | Internal communication | Filing / thread conversation |
| Expense request | Authorise spending | BM/MD → Finance payout |
| Official notice | Company announcement | Senior staff publish |
| Forum post | Discussion topic | Moderation by senior roles |
| Material request | Stock transfer request | Operations fulfilment |

### 3.2 Expense Request Procedure

1. **Workspace** → **Create Office Record** → **Expense request**.
2. Select **expense category** (see GL mapping in SOP-03).
3. **"Others" category:** minimum 40-character justification required.
4. Add lines: payee, amount, description, supporting attachment.
5. Submit → routes to Branch Manager (≤₦200k) or MD (>₦200k).
6. On approval → appears in **Finance Desk** queue for payout.
7. Filing reference issued: `ZR/{branch}/{domain}/{year}/{seq}`.

### 3.3 Smart Memo Composer

Structured internal communications with:
- To/From/Cc routing
- Subject and body
- Attachment support
- AI polish optional (`/api/office/ai/polish-memo`)

---

## 4. WORK ITEMS AND SLA

### 4.1 Unified Inbox

Views: **Action Inbox**, **Work Tray**, **Filed**, **Unfiled**

### 4.2 SLA by Priority

| Priority | SLA Window |
|----------|------------|
| Critical | 4 hours |
| Urgent / High | 24 hours |
| Normal | 48 hours |

### 4.3 Routing by Role

| Role | Office Desk |
|------|-------------|
| sales_manager | branch_manager |
| sales_staff | sales |
| operations_officer | operations |
| finance_manager / cashier | finance |
| md | executive |
| admin | office_admin |

### 4.4 Work Item Lifecycle

1. Created (from office record, system event, or manual)
2. Assigned to desk/role
3. Decision recorded (`work_item_decisions`)
4. Filed with reference
5. Print snapshot at closure (`work_item_print_snapshots`)

---

## 5. EDIT APPROVALS

### 5.1 When Required

Sensitive edits to locked records:
- Confirmed quotations
- Received POs
- Cleared customer records
- Confirmed deliveries

### 5.2 Procedure

1. User attempts edit → system blocks with **Edit Approval Required**.
2. User submits edit approval request with description of change.
3. Approver (BM or MD) opens `/edit-approvals`.
4. Reviews change; issues **6-digit one-time code** to requester.
5. Requester enters code → **single save consumed**.
6. Logged in `approval_actions` and `audit_log`.

**Security:** Code expires; cannot reuse; approver cannot be requester.

---

## 6. OFFICIAL NOTICES

### 6.1 Authority

`notices.manage`: md, admin, hr_admin, gmhr, ceo, chairman

### 6.2 Publishing Procedure

1. **Workspace** → **Official Notices** → **New Notice**.
2. Set title, body, attachments.
3. Target: all staff, specific branch(es), role(s), or department(s).
4. Options:
   - **Require acknowledgement** — staff must click Acknowledge
   - **Pin to board** — stays at top
   - **Expiry date** — auto-archive
5. Publish → `official_notices` + read/acknowledgement tracking.

### 6.3 Staff Procedure

1. Check **Official Notices** on Workspace daily.
2. Read and **Acknowledge** where required.
3. Unacknowledged notices appear in dashboard alerts.

---

## 7. COMPANY FORUM

| Scope | Visibility | Create Permission |
|-------|------------|-------------------|
| Branch | Branch staff only | All with office.use |
| Company | All staff | Senior roles only |

**Rules:**
- Professional conduct — discipline policy applies
- No customer pricing or confidential financial data
- HR may remove posts; gross misconduct triggers discipline case

---

## 8. OFFICE DOSSIERS AND FILING

### 8.1 Dossiers

Document cabinet for filed office records:
- `office_dossiers` + `office_dossier_links`
- Version history in `office_record_versions`

### 8.2 Filing Completeness

Before work item closure:
- `filingCompleteness.js` checks required fields
- Documents without filing number cannot be archived
- AI-assisted filing: `/api/office/threads/:id/ai-file`

### 8.3 Inter-Branch Office Requests

Cross-branch coordination:
- Branch manager creates request
- Tracked as work item
- May convert to material request or payment request

---

## 9. CONFIDENTIAL ACCESS

Work items and threads may be marked **confidential**:
- Only participants (`userIsWorkItemParticipant`) or elevated access (`workspaceConfidentialAccess.js`) can view
- Used for sensitive HR, legal, and financial matters
- Do not screenshot or forward outside system

---

## 10. WORKSPACE SEARCH

`GET /api/workspace/search`:
- Authenticated; results filtered by entity permissions
- Search customers, quotations, coils, work items, staff
- CEO has empty search (no line-level access)

---

## 11. EXPENSE CATEGORY COACHING

System monitors **"Others"** expense category:
- >₦50,000: Finance review flag
- >15% of branch expenses: coaching alert to BM
- MD sees trend on Command Centre

Staff should use specific categories where possible; reserve Others for genuine exceptions.

---

## 12. DAILY OFFICE ADMINISTRATION CHECKLIST

**All staff:**
- [ ] Check Action Inbox on Workspace
- [ ] Read unacknowledged official notices
- [ ] File completed work items (move from Unfiled to Filed)

**Branch Manager:**
- [ ] Clear endorsement queue
- [ ] Approve expense requests within SLA
- [ ] Review branch forum for issues

**MD / Admin:**
- [ ] Review executive desk overdue items
- [ ] Publish company notices as needed

---

## 13. AI ASSISTANT (ZARE) IN OFFICE CONTEXT

- **Tour this page** on Workspace for navigation coaching
- Memo polish for formal communications
- Cannot approve, file, or post on user's behalf
- Queries logged for knowledge base improvement

---

*End of SOP-10. Cross-references: SOP-02 (Expense payout), SOP-08 (MD approvals), SOP-01 (Sales handoffs).*


---

<!-- SOURCE: APPENDIX-A-GLOSSARY-AND-REFERENCE.md (1,524 words) -->

# APPENDIX A: GLOSSARY, REFERENCE TABLES & REPORT INDEX

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**

---

## A.1 COMPLETE GLOSSARY

| Term | Definition |
|------|------------|
| AP1c | Accounting Phase 1c — production-completion revenue recognition with automatic GL posting |
| AP2 | Accounting Phase 2 — received-basis accounts payable; inventory valued at landed cost |
| AP3 | Accounting Phase 3 — branch P&L, material cost classification, payroll labour per production job |
| Advance (Customer) | Payment received before quotation; ledger type ADVANCE_IN |
| Bootstrap | Initial workspace data snapshot loaded on login via GET /api/bootstrap |
| BM | Branch Manager (role key: sales_manager) |
| CL | Cutting List — production work order issued from sales |
| COGS | Cost of Goods Sold — GL accounts 5010–5050 |
| Credit Exception | Formal approval allowing customer credit terms with expiry |
| CREV | Coil Control Event — immutable log of coil movements |
| CSRF | Cross-Site Request Forgery token required on all mutating API requests |
| Delivery Gate | Payment enforcement before dispatch (off/warn/enforce) |
| FG | Finished Goods — post-production stock |
| GL | General Ledger |
| GMHR | General Manager, Human Resources (role key: gmhr) |
| GRN | Goods Received Note — store receipt against purchase order |
| GRNI | Goods Received Not Invoiced — AP liability at GRN under AP2 |
| MD | Managing Director (role key: md) |
| OBL | Staff Obligation Account — unified ledger for loans, credits, recoveries |
| PAYE | Pay As You Earn — income tax withholding on payroll |
| POD | Proof of Delivery — customer sign-off on delivery note |
| PO | Purchase Order |
| PPGI | Pre-Painted Galvanised Iron — aluzinc coil |
| QC / QCO | Quality Control / Quality Control Officer |
| RAG | Retrieval-Augmented Generation — AI knowledge architecture for Zare |
| RBAC | Role-Based Access Control — 100+ permission keys |
| RCP | Confirmed Sales Receipt document ID prefix |
| Reserve Policy | MD-set minimum cash balance for treasury accounts |
| SLA | Service Level Agreement — work item response windows |
| SOFP | Statement of Financial Position (balance sheet) |
| SOP | Standard Operating Procedure |
| WIP | Work-in-Progress — goods currently in production |
| Zare | Zarewa built-in AI assistant for navigation and coaching |

---

## A.2 COMPLETE GL CHART OF ACCOUNTS

| Code | Account Name | Type | Typical Use |
|------|--------------|------|-------------|
| 1000 | Cash / Bank | Asset | Treasury accounts |
| 1200 | Staff Loans Receivable | Asset | Staff loan disbursements |
| 1300 | Inventory / Closing Stock | Asset | Coil, FG, accessories |
| 1500 | Plant & Machinery | Fixed Asset | Production equipment |
| 1501 | Land & Buildings | Fixed Asset | Premises |
| 1502 | Furniture & Fittings | Fixed Asset | Office furniture |
| 1504 | Generator | Fixed Asset | Power equipment |
| 2000 | Accounts Payable — Suppliers | Liability | GRN-based payables |
| 2400 | Pension Payable | Liability | Payroll pension contributions |
| 2500 | Customer Advances / Refunds Payable | Liability | Unapplied advances, approved refunds |
| 3200 | Chairman Withdrawal | Equity | Equity draw — not expense |
| 4000 | Sales Revenue | Income | AP1c production recognition |
| 5010 | Fuel & Lubricant | COGS | Production fuel |
| 5020 | Maintenance | COGS | Plant maintenance |
| 5030 | Outside Corrugation | COGS | Sub-contracted corrugation |
| 5040 | Production Cost / Accessories | COGS | Direct production costs |
| 5050 | Purchases / Carriage Inward | COGS | Raw materials, freight |
| 6000 | Wages | COGS/OpEx | Direct wages |
| 6100 | Depreciation | OpEx | Non-cash depreciation |
| 6110 | Admin Salary | OpEx | Office salaries |
| 6120 | Admin / Office / HQ / Others | OpEx | General overhead |
| 6130 | Rent & Utilities | OpEx | Premises costs |
| 6140 | IT & Software | OpEx | Technology |
| 6150 | Insurance | OpEx | Premiums |
| 6160 | Professional Fees / Tax | OpEx | Audit, legal, levies |
| 6170 | Bank Charges | OpEx | Bank fees |
| 6180 | Zakat & Sallah | OpEx | Religious obligations |
| 6300 | Interest Expense | OpEx | Finance charges |
| 6400 | Marketing & Advertising | OpEx | Promotional spend |

---

## A.3 HR PERMISSION BUNDLES

| Bundle | Roles | Key Permissions |
|--------|-------|-----------------|
| selfService | All staff | hr.self, my_profile.view, my_leave.request, my_loan.request, my_payslip.view |
| branchManager | sales_manager | + hr.team.view, attendance.mark, leave.endorse, loan.endorse |
| hrAdmin | hr_admin | staff.manage, all exit stages, asset custody, recovery.manage |
| gmhr | gmhr | gm_approve, final_approve, exit.final_clear, letters.approve |
| mdExecutive | md | executive.view, payroll.md_approve, exceptional_loan.approve |
| executiveScholarshipDomestic | ceo, chairman | chairman.manage, benefits, payroll.view_sensitive |
| financeHr | finance_manager | payroll.pay, payroll.export, loan.disburse, exit.finance_clear |

---

## A.4 REFUND REASON CATEGORIES

| Category | System Key Area |
|----------|-----------------|
| Order cancellation | Blocked if production completed without override |
| Unproduced meterage | Production alignment check |
| Overpayment | Ledger reconciliation |
| Transport issue | Delivery records |
| Installation issue | Customer evidence |
| Additional services | Quotation lines |
| Accessory shortfall | Accessory fulfillment |
| Stone flatsheet shortfall | Stone usage records |
| Calculation error | Quotation audit |
| Substitution difference | Gauge substitution logic |
| Customer commission | Sales policy |
| Other | Requires written justification |

---

## A.5 REPORTS INDEX

| Report | API Endpoint | Primary Users |
|--------|--------------|---------------|
| Summary counts | GET /api/reports/summary | All with reports.view |
| Pending approvals | GET /api/reports/pending-approvals | BM, MD, Finance |
| Production status | GET /api/reports/production-status | Operations, BM |
| Governance pack | GET /api/reports/governance-pack | MD, Finance |
| Receipts register | GET /api/reports/receipts-register | Finance |
| AR as-at | GET /api/reports/ar-as-at | Finance, MD |
| Sales bridge | GET /api/reports/sales-bridge | Finance |
| Expenses pack | GET /api/reports/expenses-pack | Finance, MD |
| Refunds pack | GET /api/reports/refunds-pack | Finance, BM |
| Purchase register | GET /api/reports/purchase-register | Procurement, Finance |
| Stock coil as-at | GET /api/reports/stock-coil-as-at | Operations, Finance |
| MD operations pack | GET /api/reports/md-operations-pack | MD |
| Daily pack | GET /api/reports/daily-pack | MD, BM |
| Weekly pack | GET /api/reports/weekly-pack | MD, Finance |
| Material transaction | GET /api/reports/material-transaction | Operations |
| Revenue production | GET /api/reports/revenue-production | Finance, MD |
| Business intelligence | GET /api/analytics/business-intelligence | MD, Finance |

---

## A.6 APPLICATION ROUTE MAP

| Route | Module |
|-------|--------|
| / | Workspace / Dashboard |
| /sales | Sales desk |
| /customers | Customer directory |
| /customers/:id | Customer dashboard |
| /procurement | Procurement hub |
| /operations | Operations & production |
| /operations/coils/:coilNo | Coil profile |
| /operations/material-exceptions | Material incidents |
| /accounts | Finance & accounts |
| /accounting | Accounting desk |
| /manager | Branch manager workstation |
| /exec | Command Centre |
| /reports | Management reports |
| /analytics | Business intelligence |
| /hr/* | HR administration |
| /team-hr/* | Team HR |
| /executive-hr/* | Executive HR |
| /my-profile/* | Self-service HR |
| /settings/* | Administration |
| /edit-approvals | Edit approval queue |
| /price-list | Price list admin |
| /pricing-policy | Pricing policy admin |

---

## A.7 ENVIRONMENT VARIABLES (OPERATIONS)

| Variable | Purpose | Default |
|----------|---------|---------|
| SESSION_TIMEOUT_MINUTES | Session idle timeout | 120 |
| FAILED_LOGIN_LOCK_THRESHOLD | Failed logins before lock | 5 |
| ACCOUNT_LOCK_MINUTES | Lock duration | 30 |
| DELIVERY_PAYMENT_GATE | off / warn / enforce | off |
| ENFORCE_DUAL_CONTROL_PAYMENTS | Approver ≠ payer | 0 (enable in production) |
| REFUND_MD_APPROVAL_THRESHOLD_NGN | MD refund gate | 1000000 |
| EXPENSE_MD_APPROVAL_THRESHOLD_NGN | MD expense gate | 200000 |
| ZAREWA_LEDGER_POST_MAX | Rate limit posts/min | 45 |

---

## A.8 DESIGNATION CODES

| Code | Title |
|------|-------|
| desig_md | Managing Director |
| desig_edo | Executive Director, Operations |
| desig_edf | Executive Director, Finance |
| desig_edc | Executive Director, Commercial |
| desig_gmhr | GM, Human Resources |
| desig_bm | Branch Manager |
| desig_po | Procurement Officer |
| desig_hop | Head of Procurement |
| desig_pm | Production Manager |
| desig_qco | Quality Control Officer |
| desig_mm | Maintenance Manager |
| desig_mtech | Maintenance Technician |
| desig_hrrep | HR Representative |
| desig_aud | Auditor |

---

*End of Appendix A. Return to [00-MASTER-INDEX.md](./00-MASTER-INDEX.md) for document navigation.*


---

<!-- SOURCE: ANNEX-B-SCENARIO-WALKTHROUGHS.md (1,454 words) -->

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


---

<!-- SOURCE: ANNEX-C-IT-OPERATIONS.md (1,418 words) -->

# ANNEX C: IT OPERATIONS, SECURITY & DISASTER RECOVERY

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Audience:** IT administrators, MD (oversight), external IT contractors

---

## C.1 IT GOVERNANCE

### C.1.1 Responsibilities

| Role | Responsibility |
|------|----------------|
| System Administrator (`admin`) | User management, deployments, backups, migrations |
| MD | Approve production changes, credential policy |
| Finance Manager | Period lock policy, integration API keys approval |
| All staff | Report incidents, protect credentials |

### C.1.2 Change Management

1. All production deployments follow change window (typically Sunday 02:00–06:00 WAT).
2. Run `npm run test` and `npm run test:e2e` before deploy.
3. Database migrations auto-run on startup — review `server/migrate.js` changelog before deploy.
4. Rollback plan: restore database backup + previous API build.

---

## C.2 REPOSITORY STRUCTURE

| Repository | Purpose |
|------------|---------|
| Zarewa-backend-main | Node.js API, database, shared business logic |
| Zarewa-frontend-main | React SPA, UI, in-app help/SOP content |

### Key backend paths
- `server/index.js` — API entry
- `server/httpApi.js` — route registration
- `server/auth.js` — roles and permissions
- `server/schemaSql.js` — database DDL
- `server/migrate.js` — incremental migrations
- `shared/` — cross-cutting business rules

### Key frontend paths
- `src/App.jsx` — routing
- `src/lib/moduleAccess.js` — RBAC UI
- `src/lib/roleTrainingGuide.js` — onboarding
- `src/lib/helpOperationalCatalog.js` — Zare knowledge (~1000 entries)

---

## C.3 ENVIRONMENT CONFIGURATION

### C.3.1 Required Production Variables

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | production |
| `ZAREWA_DB_URL` or MySQL vars | Database connection |
| `SESSION_SECRET` | Session cookie signing (strong random) |
| `COOKIE_SECURE` | true (HTTPS only) |
| `CORS_ORIGIN` | Frontend origin (split deploy) |
| `ZAREWA_STATIC_DIR` | SPA dist path (combined deploy) |

### C.3.2 Security Variables

| Variable | Recommended Production Value |
|----------|-------------------------------|
| `ENFORCE_DUAL_CONTROL_PAYMENTS` | 1 |
| `DELIVERY_PAYMENT_GATE` | enforce |
| `SESSION_TIMEOUT_MINUTES` | 120 |
| `FAILED_LOGIN_LOCK_THRESHOLD` | 5 |

### C.3.3 Optional Features

| Variable | Purpose |
|----------|---------|
| `ZAREWA_AI_API_KEY` | Enable Zare AI (OpenAI) |
| `ZAREWA_EMPTY_SEED` | Clean numbering from 0001 on fresh DB |
| `VITE_API_BASE` | API URL for split frontend |

See `docs/ENVIRONMENT.md` and `docs/DEPLOYMENT.md` in backend repo.

---

## C.4 DEPLOYMENT PROCEDURES

### C.4.1 Combined Deployment

1. Build frontend: `cd Zarewa-frontend-main && npm run build`
2. Set `ZAREWA_STATIC_DIR` to `dist/` path
3. Start API: `cd Zarewa-backend-main && npm start`
4. Verify: `GET /api/health` returns 200
5. Verify: login page loads, bootstrap succeeds

### C.4.2 Split Deployment

1. Deploy API to VM with HTTPS
2. Deploy frontend static files to CDN/host
3. Set `VITE_API_BASE` to API URL at frontend build time
4. Configure `CORS_ORIGIN` on API
5. Cookie SameSite=None; Secure=true for cross-origin

### C.4.3 Health Checks

| Endpoint | Purpose |
|----------|---------|
| GET /api/health | General health + feature flags |
| GET /api/readyz | Ready to serve traffic |
| GET /api/livez | Process alive |

Monitor these every 60 seconds in production.

---

## C.5 DATABASE ADMINISTRATION

### C.5.1 Backup Schedule

| Frequency | Method | Retention |
|-----------|--------|-----------|
| Daily | Automated mysqldump or SQLite copy | 30 days |
| Weekly | Full backup to off-site storage | 12 weeks |
| Pre-deploy | Manual snapshot | Until deploy verified |

### C.5.2 Backup Procedure (MySQL)

```bash
mysqldump -u zarewa -p zarewa_prod > zarewa_backup_$(date +%Y%m%d).sql
```

Verify backup integrity weekly by restore to staging environment.

### C.5.3 Migration Safety

1. Migrations run in transactions where supported
2. Tracked in `zarewa_schema_migrations` table
3. Never edit applied migrations — create new migration file
4. Test migrations on staging copy of production data first

### C.5.4 Data Reset (NON-PRODUCTION ONLY)

Admin data reset available in Settings for development/training environments.
**Never run data reset in production without MD written authorisation.**

---

## C.6 SECURITY HARDENING CHECKLIST

### Pre-Production (Mandatory)

- [ ] Replace all demo passwords
- [ ] Remove or disable demo `viewer` account
- [ ] HTTPS enabled with valid certificate
- [ ] `COOKIE_SECURE=true`
- [ ] `ENFORCE_DUAL_CONTROL_PAYMENTS=1`
- [ ] Strong `SESSION_SECRET` (32+ random bytes)
- [ ] Database credentials not in source code
- [ ] API not exposed to public internet without firewall
- [ ] Admin account limited to named individuals (not shared)
- [ ] Integration API keys rotated from defaults

### Ongoing

- [ ] Quarterly credential rotation (admin, integration keys)
- [ ] Review `customPermissionAudit` monthly
- [ ] Review failed login attempts weekly
- [ ] Patch Node.js dependencies monthly (`npm audit`)
- [ ] Verify backup restore quarterly

---

## C.7 INCIDENT RESPONSE

### C.7.1 Severity Levels

| Level | Example | Response Time |
|-------|---------|---------------|
| P1 Critical | System down, cannot post receipts | 30 minutes |
| P2 High | Module unavailable (HR, production) | 2 hours |
| P3 Medium | Degraded performance, single branch | 4 hours |
| P4 Low | UI cosmetic, non-blocking bug | Next business day |

### C.7.2 P1 Response Procedure

1. Confirm outage via `/api/health` and user reports
2. Notify MD and department heads
3. Check server process, database connectivity, disk space
4. Review recent deployments — rollback if correlated
5. Communicate ETA to staff via official notice
6. Post-incident review within 48 hours

### C.7.3 Data Integrity Incident

If suspected data corruption or unauthorised access:

1. Isolate affected system (read-only mode if available)
2. Preserve audit logs — do not delete
3. Notify MD and external auditor if required
4. Restore from last known-good backup to staging
5. Compare affected records; determine scope
6. Correct through controlled reversals (not direct DB edits)
7. Document in incident report

---

## C.8 DISASTER RECOVERY

### C.8.1 Recovery Time Objectives

| Scenario | RTO Target | RPO Target |
|----------|------------|------------|
| API server failure | 4 hours | 24 hours (daily backup) |
| Database corruption | 8 hours | 24 hours |
| Complete site loss | 24 hours | 24 hours |

### C.8.2 DR Procedure

1. Provision replacement server
2. Restore latest database backup
3. Deploy latest verified API + frontend builds
4. Update DNS to new server
5. Verify health checks and login
6. Run reconciliation: treasury balances, open quotations, production queue
7. Communicate restoration to all branches

### C.8.3 Degraded Mode Operations

If ERP unavailable >4 hours during business hours:

1. BM authorises paper-only recording for receipts and GRNs
2. **Single designated person** maintains paper log
3. Double-entry prohibited on paper — one writer
4. Full catch-up within 24 hours of restoration
5. IT supervises catch-up to prevent duplicates

---

## C.9 TESTING AND QA

### C.9.1 Automated Test Suites

| Suite | Command | Coverage |
|-------|---------|----------|
| Unit tests | `npm run test` | API business rules, RBAC |
| E2E tests | `npm run test:e2e` | Full workflow Playwright specs |

Key E2E specs:
- `sales-gate.spec.js` — payment and price gates
- `sales-refund-finance-checklist.spec.js` — refund dual control
- `access-control.spec.js` — role restrictions
- `hr-smoke.spec.js` — HR workflows
- `operational-sop-matrix-500.spec.js` — SOP route coverage

### C.9.2 Pre-Release Checklist

- [ ] All unit tests pass
- [ ] E2E smoke pass on staging
- [ ] Migration tested on staging DB copy
- [ ] RBAC regression check (cashier cannot approve refund)
- [ ] MD payroll gate still enforced
- [ ] Backup taken immediately before deploy

---

## C.10 INTEGRATION API

### C.10.1 Read-Only GL Export

External accounting or BI tools may consume:

- `GET /api/integration/v1/trial-balance` — Bearer token auth
- `GET /api/integration/v1/journals` — journal register export

### C.10.2 Key Management

1. Create key in Settings → Integrations
2. Assign descriptive name and expiry
3. Distribute securely to integration owner
4. Rotate quarterly; revoke on staff departure
5. Monitor usage in audit log

---

## C.11 MONITORING AND LOGS

### C.11.1 Application Logs

- API logs: stdout/stderr captured by process manager (pm2, systemd)
- Audit log: `audit_log` table — query via Settings or SQL
- HR audit: `hr_audit_events` table

### C.11.2 Workspace Monitoring

`/workspace/monitoring` — admin/exec view of:
- Active sessions
- Office activity levels
- Work item SLA breaches

---

## C.12 USER SUPPORT TIERS

| Tier | Handles | Contact |
|------|---------|---------|
| L1 | Password reset, navigation, Zare coaching | HR Admin / office admin |
| L2 | Workflow errors, permission requests | IT Admin |
| L3 | Database, deployment, integration | IT Admin + vendor |

**Zare is L1 support** — staff should try Zare "Tour this page" before escalating.

---

*End of Annex C — IT Operations*


---

<!-- SOURCE: ANNEX-D-COMPLIANCE-AND-AUDIT.md (1,143 words) -->

# ANNEX D: COMPLIANCE, CONTROLS & AUDIT FRAMEWORK

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Audience:** Internal audit, finance, MD, external auditors

---

## D.1 INTERNAL CONTROL FRAMEWORK

Zarewa ERP implements a three-layer control model:

| Layer | Mechanism | Examples |
|-------|-----------|----------|
| Preventive | Blocks invalid action before it occurs | Period lock, duplicate receipt block, refund self-approval block |
| Detective | Alerts and reports after event | Governance pack, exception queue, dual-control warnings |
| Corrective | Reversal and adjustment workflows | Receipt reversal, material incident void, edit approval |

---

## D.2 SEGREGATION OF DUTIES MATRIX (COMPLETE)

| Process | Initiate | Approve | Execute | Record | Reconcile |
|---------|--------|---------|---------|--------|-----------|
| Customer sale | Sales | BM (clearance) | Operations (delivery) | System auto | Finance (AR) |
| Customer receipt | Sales/Cashier | Cashier (clearance) | Cashier (post) | System auto | Finance (bank rec) |
| Customer refund | Sales | BM/MD/Finance | Cashier/Finance | System auto | Finance |
| Expense payment | Staff | BM/MD | Cashier/Finance | System auto | Finance |
| Purchase order | Procurement/MD | MD | — | System | Finance (AP) |
| Goods receipt | Operations | — | Operations | System auto | Store (stock register) |
| Supplier payment | Finance | Finance | Finance | System auto | Finance (AP rec) |
| Production job | Operations | BM (QC) | Operations | System auto | Finance (AP1c) |
| Payroll | HR Admin | GMHR + MD | Finance | System auto | Finance |
| GL journal | Finance | — | Finance | Finance | Finance (TB) |
| Period close | — | — | Finance | Finance | MD review |
| User creation | Admin | MD policy | Admin | System auto | Admin audit |
| Price list change | MD | — | MD | System auto | Sales review |
| Material incident | Operations | BM | System auto-post | System | Store |

---

## D.3 FINANCIAL CONTROLS DETAIL

### D.3.1 Revenue Recognition Control (AP1c)

**Risk:** Revenue recognised before production or after cash only.  
**Control:** AP1c auto-posts at production job completion only.  
**Test:** Select completed jobs; verify GL Cr 4000 matches produced metres × price.  
**Frequency:** Monthly.

### D.3.2 Cash Receipt Control

**Risk:** Fictitious receipts inflate sales.  
**Control:** Cashier clearance required; amounts ≥₦100k double-entered.  
**Test:** Sample 25 receipts; trace to bank statement.  
**Frequency:** Weekly.

### D.3.3 Refund Control

**Risk:** Fraudulent refunds to colluding parties.  
**Control:** Requester ≠ approver ≠ payer; MD gate >₦1M; production alignment check.  
**Test:** All refunds >₦500k monthly; verify evidence on file.  
**Frequency:** Monthly.

### D.3.4 Procurement Control

**Risk:** Kickbacks, unauthorised purchases.  
**Control:** MD approval on POs; three-way match at month-end.  
**Test:** Sample 10 POs; trace PO → GRN → payment.  
**Frequency:** Monthly.

### D.3.5 Inventory Control

**Risk:** Coil theft, unrecorded usage.  
**Control:** Coil control events immutable; stock register 4-stage sign-off.  
**Test:** Physical coil count vs system for 5 random lots.  
**Frequency:** Monthly (at stock register).

---

## D.4 HR AND PAYROLL CONTROLS

### D.4.1 Ghost Employee Risk

**Control:** Payroll run requires active HR profile; exit clearance blocks deactivation bypass.  
**Test:** Reconcile payroll headcount to HR active staff report.

### D.4.2 Unauthorized Salary Change

**Control:** Salary matrix changes require `salary_structure.approve` (MD).  
**Test:** Review all salary changes in period against approved requests.

### D.4.3 Loan Fraud

**Control:** Loan approval chain; obligation account tracks balance; payroll deduction auto-calculated.  
**Test:** OBL balances agree to loan agreements on file.

---

## D.5 AUDIT LOG REVIEW PROCEDURES

### D.5.1 Daily Review (IT Admin)

Query `audit_log` for:
- `login.failed` — brute force attempts
- `permission.override` — custom permission changes
- `admin.data_reset` — must be empty in production
- `refund.dual_control.admin_trial` — admin bypass flags

### D.5.2 Weekly Review (Finance Manager)

- Receipt reversals
- Refund approvals and payouts
- Period lock attempts
- Treasury corrections

### D.5.3 Monthly Review (MD + Internal Audit)

- Governance pack export
- All refunds >₦1,000,000
- Others expense category >15% branches
- Dual-control warnings
- Edit approval usage

### D.5.4 Audit Log Export

`GET /api/audit/export.ndjson` — admin only; full export for external auditor.

---

## D.6 REGULATORY COMPLIANCE

### D.6.1 PAYE and Tax

- Payroll computes PAYE per staff per Nigerian tax bands
- Export from HR payroll module for FIRS filing
- Finance retains payslips and tax schedules 6 years

### D.6.2 Pension (PENCOM)

- Employer and employee contributions calculated per statute
- GL posts to 2400 Pension Payable (liability)
- Monthly remittance schedule exported with payroll

### D.6.3 Data Protection

- Staff personal data in `hr_staff_profiles` — access restricted by HR permissions
- Bank details encrypted at rest (`hrBankCrypto.js`)
- Confidential work items restricted to participants
- Staff files retained 7 years post-separation; then secure destruction per policy

---

## D.7 FRAUD INDICATORS AND RESPONSE

| Indicator | Investigation Step |
|-----------|-------------------|
| Multiple refunds to same customer in 30 days | Review lifecycle timeline; interview sales officer |
| Receipts cleared without matching bank credit | Bank rec investigation; cashier interview |
| Production metres consistently High conversion | QC review; possible metre inflation |
| Others expenses spike at branch | BM coaching; MD review |
| Same user login from two IPs simultaneously | Session security review; password reset |
| Coil qty drops without production job | Material incident search; CCTV if available |
| Payroll line for separated employee | Exit clearance audit |

**Response:** Suspend ERP access pending investigation (Admin); preserve audit logs; escalate to MD; law enforcement if criminal.

---

## D.8 EXTERNAL AUDIT PREPARATION

### Documents to Prepare

| Package | Source |
|---------|--------|
| Trial balance | Accounting desk |
| GL activity by account | Reports |
| Receipts register | Reports |
| Purchase register | Reports |
| Stock register (locked) | Reports |
| Payroll summary + MD sign-off | HR + Executive HR |
| Bank reconciliation | Accounting desk |
| Governance pack | Reports |
| Audit log export | Admin |
| Related party transactions | Inter-branch loans, chairman accounts |

### Auditor System Access

Provide `viewer` role or read-only custom role with `reports.view` — never admin credentials.

---

## D.9 CONTROL DEFICIENCY REPORTING

Staff who identify control weaknesses:

1. Report to line manager and Finance Manager (if financial)
2. Do not exploit weakness
3. IT logs remediation ticket
4. MD notified if material
5. Fix verified in next audit cycle

---

## D.10 BOARD REPORTING (QUARTERLY)

MD presents to Board from Command Centre:

- Branch scorecard vs targets
- Governance pack summary
- Material incidents and discipline summary
- Stock register status all branches
- AP1c/AP2/AP3 readiness
- IT incident summary
- Fraud indicators (if any)

---

*End of Annex D — Compliance & Audit Framework*


---

<!-- SOURCE: ANNEX-E-EXTENDED-PROCEDURES.md (1,939 words) -->

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


---

<!-- SOURCE: ANNEX-F-ACCOUNTING-POLICIES.md (1,542 words) -->

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

### F.5.4 Closing Stock Entry

At stock register lock:
```
Dr  Inventory — Closing (1300)                    XXX
    Cr  COGS / Purchases (5050)                      XXX
```
Or reverse for opening. Finance Manager determines exact mapping per period.

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


---

<!-- SOURCE: ANNEX-G-HR-POLICIES.md (2,000 words) -->

# ANNEX G: HR POLICIES, DISCIPLINE & EMPLOYEE RELATIONS MANUAL

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Authority:** GM HR + MD + Board  
**Reference:** `docs/HR/HR-POLICY-LEAVE.md`, `docs/HR/HR-POLICY-PAYROLL.md`

---

## G.1 EMPLOYMENT PHILOSOPHY

Zarewa is committed to fair employment practices, transparent compensation, and disciplined workforce management. The ERP HR module enforces policy through system gates — leave balances, approval chains, payroll MD sign-off, and exit clearance cannot be bypassed without administrator intervention (which is fully audited).

---

## G.2 RECRUITMENT AND ONBOARDING

### G.2.1 Manpower Planning

1. Department head submits manpower request via office memo to GM HR.
2. GM HR and MD approve headcount and budget.
3. HR Admin creates job posting at `/hr/talent` → Recruit.
4. Public listing at `/api/public/careers/*` (unauthenticated).

### G.2.2 Selection Process

| Stage | Owner | System Record |
|-------|-------|---------------|
| Application receipt | HR Admin | `hr_applicants` |
| Shortlisting | HR + line manager | Applicant status update |
| Interview | Panel | CRM notes / office memo |
| Offer | HR Admin | Employment letter draft |
| Acceptance | Candidate | Signed letter upload |
| Onboarding | HR Admin | Staff profile creation |

### G.2.3 Onboarding Checklist

- [ ] Staff profile created with all required fields (§13.2 SOP-07)
- [ ] ERP login created (Settings → Team & access)
- [ ] Role and branch assigned
- [ ] `selfServiceEligible` = true
- [ ] Bank details entered and verified
- [ ] NOK recorded
- [ ] Probation end date set (default +6 months)
- [ ] Policy acknowledgements sent
- [ ] ID card request initiated
- [ ] Asset custody assigned (laptop, phone, uniform if applicable)
- [ ] Department SOP training scheduled
- [ ] Line manager introduced on Team HR

---

## G.3 COMPENSATION STRUCTURE

### G.3.1 Salary Levels

| Level | Band | Annual Leave | Typical Roles |
|-------|------|--------------|---------------|
| L1 | Junior | 14 days | Drivers, cleaners, junior operators |
| L2 | Junior | 14 days | Sales assistants, store assistants |
| L3 | Junior | 14 days | Sales officers, machine operators |
| L4 | Senior | 21 days | Supervisors, senior sales, technicians |
| L5 | Senior | 21 days | Department heads, senior accountants |
| L6 | Senior | 21 days | Branch managers, production managers |
| L7 | Senior | 21 days | GM, executive directors |

### G.3.2 Salary Matrix

Maintained at `/hr/payroll` → Salary matrix:
- Rows: levels L1–L7
- Columns: steps 1–5 (annual increment progression)
- Changes require `salary_structure.approve` (MD)

### G.3.3 Allowances

| Allowance | Eligibility | Payroll Treatment |
|-----------|-------------|-------------------|
| Transport | Per level policy | Taxable earning |
| Housing | L5+ or designated | Taxable earning |
| Meal subsidy | All staff | Taxable earning |
| Shift premium | Production night shift | Taxable earning |
| Acting allowance | Acting BM/HOD | Temporary; MD approved |

### G.3.4 Special Increments

Outside annual increment cycle:
1. Department head submits justification memo.
2. GM HR reviews.
3. MD approves via `special_increment.approve`.
4. HR Admin updates salary matrix effective date.
5. Reflected in next payroll run.

---

## G.4 LEAVE POLICY (DETAILED)

### G.4.1 Annual Leave Accrual

- Accrual: monthly via `hr_leave_accrual_ledger`
- Junior band: 14 days ÷ 12 = 1.17 days/month
- Senior band: 21 days ÷ 12 = 1.75 days/month
- Maximum carry-forward: 5 days (configurable in org policy)
- Leave encashment: on separation only; GM HR approval

### G.4.2 Sick Leave

- No fixed balance
- 1–2 days: self-certification
- 3+ days: medical certificate required
- Extended illness: HR welfare visit; may trigger disability review
- Unpaid if statutory entitlement exhausted

### G.4.3 Maternity Leave

- Days: `maternityLeaveDays` in org_policy_kv
- Paid per company policy and statutory minimum
- HR plans cover during absence
- Return-to-work interview at 2 weeks before resumption

### G.4.4 Compassionate Leave

- Bereavement: spouse/parent/child — 3 days paid
- Extended family — 1 day paid
- GM HR discretion for additional unpaid days

### G.4.5 Leave Planning

- Peak season (rainy season roofing demand): BM may restrict leave to 20% of team simultaneously
- Blackout dates published via official notice
- Leave calendar visible at `/hr/time-absence` → Calendar

---

## G.5 STAFF LOAN POLICY

### G.5.1 Eligibility

| Criterion | Requirement |
|-----------|-------------|
| Minimum service | 12 months |
| Discipline record | No active final warning |
| Existing obligation | No overdue OBL balance |
| Maximum amount | Lesser of 3× monthly net or ₦2,000,000 |
| Maximum term | 36 months |

### G.5.2 Approval Chain

Employee → HR review → BM endorse → GM HR final → (MD if above ₦1,000,000 exceptional)

### G.5.3 Interest

Per company policy (configurable):
- Emergency loans: 0% interest
- General loans: 5% flat or as per board resolution
- Recorded in loan agreement PDF (`POST /api/hr/loan-requests/:id/agreement-letter`)

### G.5.4 Default

3 consecutive missed payroll deductions:
1. HR issues demand letter
2. Discipline case if negligence
3. MD may authorise full balance acceleration
4. Write-off requires MD + Board if unrecoverable

---

## G.6 STAFF PURCHASE CREDIT (HR PERSPECTIVE)

Linked to SOP-01 §8 — HR verifies:
- 12 months service
- No active discipline case
- OBL capacity check (max ₦5M outstanding)
- BM commercial endorsement
- Payroll deduction schedule agreed before disbursement

---

## G.7 ATTENDANCE AND TIME MANAGEMENT

### G.7.1 Working Hours

| Category | Hours | Days |
|----------|-------|------|
| Head office | 8:00–17:00 | Mon–Sat (branch policy) |
| Factory | Shift rotation | Mon–Sat |
| Sales | 8:00–18:00 | Mon–Sat |

### G.7.2 Attendance Recording

- Daily roll: Team HR or HR Admin marks at `/team-hr/time-absence` or `/hr/time-absence`
- Upload: bulk biometric export via `hr_attendance_uploads`
- Late arrival: flagged after grace period (15 minutes)
- Absent without leave: triggers discipline workflow

### G.7.3 Payroll Impact

| Attendance Event | Payroll Effect |
|------------------|----------------|
| Unauthorised absence | No pay for day |
| Late (3+ in month) | Warning + possible deduction |
| Approved leave | No deduction (paid leave) |
| Unpaid leave | Pro-rata deduction |

---

## G.8 DISCIPLINE POLICY (DETAILED)

### G.8.1 Principles

- Progressive discipline except gross misconduct
- Right to respond in writing at written warning stage
- HR present at all formal disciplinary meetings
- All cases recorded in ERP — no informal "off record" warnings for serious matters

### G.8.2 Gross Misconduct (Summary Dismissal)

| Offence | Examples |
|---------|----------|
| Theft/fraud | Stealing coil, falsifying receipts, expense fraud |
| Violence | Physical assault on staff or customer |
| Gross insubordination | Refusing lawful MD instruction |
| File tampering | Altering HR records, backdating documents |
| Serious negligence | Deliberate bypass of safety protocols causing harm |
| Conflict of interest | Undisclosed supplier kickback |
| Intoxication at work | Alcohol or drugs on duty |

**Process:** Suspension pending investigation → hearing → MD decision → exit clearance

### G.8.3 Investigation Procedure

1. GM HR appoints investigator (not the direct supervisor if conflicted).
2. Case status: `under_investigation`.
3. Witness statements recorded in `hr_discipline_cases` evidence.
4. Employee given opportunity to respond.
5. Investigation report to MD.
6. Decision: no action, warning, suspension, dismissal.

### G.8.4 Appeal

Employee may appeal within 7 days of `action_issued`:
- Appeal to MD (if BM decided) or Board (if MD decided)
- Status: `appealed`
- Outcome: uphold, reduce, or overturn

---

## G.9 GRIEVANCE PROCEDURE

1. Employee submits grievance via My HR → Feedback/Grievance.
2. HR acknowledges within 48 hours.
3. Informal resolution attempted with line manager.
4. If unresolved: formal hearing with HR + neutral manager.
5. GM HR decision within 10 working days.
6. Escalation to MD if policy matter.
7. All records confidential — `workspaceConfidentialAccess`.

---

## G.10 PERFORMANCE MANAGEMENT

### G.10.1 Appraisal Cycle

- Annual appraisal for all permanent staff
- Probation review at 6 months
- Recorded in `hr_performance_reviews`

### G.10.2 Appraisal Process

| Step | Actor |
|------|-------|
| Self-assessment | Employee |
| Manager rating | Line manager |
| Calibration | GM HR + department heads |
| Final rating | MD for L6+ |
| Development plan | HR + employee |

### G.10.3 Performance-Linked Actions

| Rating | Typical Outcome |
|--------|-----------------|
| Outstanding | Promotion consideration, bonus |
| Meets expectations | Standard increment |
| Needs improvement | Performance improvement plan (PIP) |
| Unsatisfactory | No increment; discipline if no improvement |

---

## G.11 TRANSFER AND SECONDMENT

### G.11.1 Policy (from transferTenurePolicy.js)

| Type | Min Service | Approver |
|------|-------------|----------|
| Inter-branch | 3 years | MD (exception memo) |
| Internal rotation | 2 years | GM HR or MD |
| BM transfer | Case by case | MD |

### G.11.2 Transfer Procedure

1. Employee or manager initiates transfer request.
2. Receiving branch BM agrees to receive.
3. GM HR reviews manpower impact.
4. MD approves inter-branch.
5. HR updates branch assignment and ERP workspace branch.
6. Asset custody transferred.
7. Salary matrix unchanged unless promotion attached.

---

## G.12 SEPARATION AND EXIT (DETAILED)

### G.12.1 Types of Separation

| Type | Initiator | Notice Period |
|------|-----------|---------------|
| Resignation | Employee | 1 month (L1–L4); 2 months (L5+) |
| Termination (performance) | Employer | Per contract |
| Dismissal (gross misconduct) | Employer | Immediate |
| Redundancy | Employer | Statutory + company |
| End of contract | System | Per contract date |
| Retirement | Employee/employer | Per policy |

### G.12.2 Exit Clearance Detail

**Stage 1 — Initiate (HR Admin)**
- Reason code, last working day, notice waiver if applicable

**Stage 2 — HR Clearance**
- ID card returned
- Outstanding loans documented
- Documents collected (handbook, keys)
- Exit interview scheduled

**Stage 3 — Finance Clearance**
- OBL balance settled or deduction agreement
- Final payroll calculated (pro-rata + leave encashment)
- Company property fines if applicable

**Stage 4 — Admin Clearance**
- IT access revocation request to Admin
- Asset custody returned (laptop, phone, uniform)
- Handover document filed

**Stage 5 — Final Clearance (GM HR / MD)**
- All stages green
- Separation letter generated
- ERP account deactivated
- Certificate of service issued

### G.12.3 Final Payroll

Includes:
- Pro-rata salary to last day
- Accrued leave encashment (if eligible)
- Less: outstanding loan balance
- Less: asset recovery
- PAYE and pension on final amounts

---

## G.13 EXECUTIVE AND BOARD MEMBER COMPENSATION

### G.13.1 Director Emoluments

- `director_emolument` compensation type
- Board-approved packages
- Processed via executive payroll track
- MD and Chairman view via Executive HR → Compensation

### G.13.2 Chairman Family Benefits

- School fees: `hr_chairman_school_fees`
- Family expenses: `hr_chairman_expenses`
- Managed by Chairman/CEO with `hr.chairman.manage`
- Separate from branch payroll
- Finance review + MD approval on payment workflow

---

## G.14 HR REPORTING

| Report | Location | Audience |
|--------|----------|----------|
| Headcount by branch | HR Analytics | MD, GM HR |
| Leave balances | Time & Absence | HR Admin |
| Loan outstanding | Payroll hub | Finance, GM HR |
| Discipline summary | Cases & exit | MD, GM HR |
| Probation tracker | HR Dashboard | HR Admin |
| Document expiry | HR Dashboard | HR Admin |
| Attendance register | Time & Absence | BM, HR |
| Payroll summary | Executive HR | MD |
| Branch HR contribution | Executive HR | MD |

---

## G.15 HR DATA PROTECTION

- Access to staff profiles: HR permissions only
- Bank details encrypted (`hrBankCrypto.js`)
- Salary data: `payroll.view_sensitive` for executive roles
- Discipline cases: confidential work items
- Exit records: retained 7 years minimum
- Right of access: employee may request copy of HR file via HR Admin

---

*End of Annex G — HR Policies Manual*


---

<!-- SOURCE: ANNEX-H-INVENTORY-PRODUCTION-STANDARDS.md (780 words) -->

# ANNEX H: INVENTORY, COIL SCIENCE & PRODUCTION STANDARDS

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Audience:** Operations, production, procurement, finance

---

## H.1 COIL MATERIAL SCIENCE

### H.1.1 Material Types

| Type | Description | Typical Gauges |
|------|-------------|----------------|
| Aluzinc (PPGI) | Pre-painted galvalume steel | 0.18–0.55 mm |
| Aluminium | Plain or coated aluminium | 0.30–0.50 mm |
| Stone-coated substrate | Base steel for stone tiles | 0.40–0.50 mm |

### H.1.2 Gauge Selection Guide

| Gauge (mm) | Application | Structural Span |
|------------|-------------|-----------------|
| 0.18 | Economy residential | Short span |
| 0.22 | Standard residential | Medium span |
| 0.30 | Commercial / heavy residential | Long span |
| 0.45 | Industrial / premium | Extra long span |
| 0.50 | High-load commercial | Maximum span |

Sales must quote gauge per customer structural requirement — never down-gauge without written customer acknowledgement.

### H.1.3 Standard Conversion Factors (kg/m)

Maintained in Procurement → Conversion tab. Example reference values (verify live system):

| Gauge (mm) | Approx kg/m (aluzinc long-span) |
|------------|--------------------------------|
| 0.18 | 1.42 |
| 0.22 | 1.73 |
| 0.30 | 2.36 |
| 0.45 | 3.54 |
| 0.50 | 3.93 |

**Theoretical metres = kg consumed ÷ kg/m factor**

---

## H.2 COIL RECEIPT INSPECTION

### H.2.1 On Arrival Checklist

- [ ] PO reference matches delivery note
- [ ] Coil numbers match supplier manifest
- [ ] Weighbridge weight within PO tolerance (typically ±2%)
- [ ] Gauge verified with micrometer (sample)
- [ ] Colour matches PO specification (visual)
- [ ] No edge damage, rust, or oil contamination
- [ ] Mill test certificate collected

### H.2.2 Rejection Criteria

Reject coil (do not GRN) if:
- Weight short > agreed tolerance
- Wrong gauge or colour
- Visible lamination defect
- Water damage

Notify Procurement and MD; photograph damage; supplier claim initiated.

---

## H.3 PRODUCTION STANDARDS

### H.3.1 Corrugation Profiles

| Profile | Use | Standard Width |
|---------|-----|----------------|
| Long-span | Standard roofing | 760 mm effective |
| Step-tile | Aesthetic residential | Profile-specific |
| Custom | Special orders | Per quotation |

### H.3.2 Quality Standards

| Parameter | Standard | Measurement |
|-----------|----------|-------------|
| Profile depth | ±0.5 mm | Template |
| Cover width | Per specification | Tape measure |
| Colour uniformity | No visible streaks | Visual |
| Edge condition | No burrs | Hand check |
| Metre count | Per cutting list ±5% | Counter / manual |

### H.3.3 Stone-Coated Production

1. Substrate coil → corrugation → stone application
2. Sheets counted; m² = sheets × area per sheet
3. `stoneFlatsheetSheetsToM2` conversion in system
4. Quality: stone adhesion test per batch (QCO)

---

## H.4 OFFCUT MANAGEMENT

### H.4.1 Normal Offcut

Production waste within 3% of theoretical — no material incident required.

### H.4.2 Abnormal Offcut

Waste >3% or identifiable defect:
1. Log material incident (production_offcut type)
2. BM approves
3. Metres added to offcut pool
4. Available for smaller orders or internal use

### H.4.3 Offcut Issuance

When production uses offcut pool metres:
1. Select incident on job completion
2. System decrements `meters_available` on incident
3. Completion record shows "supplied from offcut"
4. May affect costing (AP3) — lower material cost

---

## H.5 STOCK REGISTER PROCEDURE (DETAILED)

### H.5.1 Physical Count Scope

| Asset Class | Count Method |
|-------------|--------------|
| Coil lots | Weigh or verify coil tags + positions |
| Finished goods | Metre stack measurement or count |
| Accessories | Piece count |
| Stone stock | Sheet count |
| WIP | Jobs in Running status — metres in process |

### H.5.2 Variance Investigation

| Variance | Threshold | Action |
|----------|-----------|--------|
| Coil kg | >1% | Investigate control events |
| FG metres | >2% | Review deliveries and production |
| Accessories | >5% | Check theft, unrecorded issues |

### H.5.3 BM Adjustment Window

Between store_confirmed and bm_approved:
- BM may post adjustment entries with documented reason
- After bm_approved: adjustments require MD and new count cycle

---

## H.6 DELIVERY STANDARDS

### H.6.1 Loading

- Secure strapping per safety standard
- Gauge/colour labels visible on bundles
- Delivery note matches system DLV lines
- Vehicle capacity not exceeded

### H.6.2 Proof of Delivery

Required fields on POD:
- Customer name and signature
- Date and time
- Metres delivered per line
- Condition notes (damage at delivery)
- Driver name

POD scanned and attached to delivery record in system.

---

*End of Annex H — Inventory & Production Standards*
