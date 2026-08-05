# ANNEX D: COMPLIANCE, CONTROLS & AUDIT FRAMEWORK

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.1**  
**Audience:** Internal audit, finance, MD, external auditors  
**v3.1 changes:** corrected audit event names (§D.5.1), audit export control + tamper-evident log (§D.5.4–D.5.5), automated fraud indicators (§D.7), admin activity review (§D.5.3), log retention & integrity (§D.11), access recertification (§D.12), configuration control (§D.13), change management (§D.14)

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
**Control:** Coil control events immutable; stock register multi-stage sign-off (print → store → BM → procurement costing → MD → capture/lock).
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

Query `audit_log` for (event names match the system exactly):
- `session.login_failed` — failed sign-ins (brute force attempts)
- `session.account_locked` — accounts locked after repeated failures
- `user.update_permissions` / `user.update_role` — permission and role changes (see also `/api/admin/permission-overrides-audit`)
- `admin.data_reset` — must be empty in production
- `refund.dual_control.admin_trial` — admin bypass flags
- `audit.export` — every full audit log download (verify each one was authorised)
- `config.control_flags` — control-critical configuration changed at boot (§D.13)

The automated fraud indicator report (`GET /api/reports/fraud-indicators`, §D.7) should also be opened daily; a non-zero `flaggedCount` requires follow-up.

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
- **Admin activity review:** all `audit_log` rows where the actor holds the `admin` role. The admin account can do anything in the system, so it must itself be watched: admin accounts are not for day-to-day work, and every admin action in the period is reviewed and countersigned by the MD.

**Review evidence:** every daily/weekly/monthly review must leave evidence — the reviewer exports or prints the queried result, signs (or files it as a work item), and notes exceptions raised. An unrecorded review is treated as not performed. Escalation SLA: exceptions raised to the MD within 2 working days; suspected fraud immediately per §D.7.

### D.5.4 Audit Log Export

`GET /api/audit/export.ndjson` — requires the `audit.export` permission, which is granted to no standard role except Administrator (`*`). Every export is itself written to the audit log (`audit.export` with row count), so downloading the trail always leaves a trace.

### D.5.5 Tamper Evidence (Hash Chain)

Each audit row stores a SHA-256 hash of its contents chained to the previous row (`prev_hash` / `row_hash`). Editing or deleting any historic row breaks the chain. Verify with `GET /api/audit/verify-chain` (requires `audit.view`): response reports `chainOk`, rows `checked`, legacy `unhashed` rows, and `brokenAtId` if the chain is broken. Run the check as part of the weekly review and before every external audit; a broken chain is a reportable incident (§D.9).

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

**Automated detection:** `GET /api/reports/fraud-indicators` (management reports permission) computes the queryable indicators automatically: repeat refunds to the same customer within 30 days, payroll lines for non-active staff in recent runs, receipts stuck pending clearance beyond 7 days, and Others expense share above 15%. Parameters `days`, `staleReceiptDays`, `othersThresholdPct` are adjustable. The report is reviewed daily (§D.5.1); indicators that cannot be automated (metre inflation, simultaneous logins, CCTV matters) remain manual.

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

## D.11 AUDIT LOG RETENTION AND INTEGRITY

- **Retention:** the audit log is retained for a minimum of **7 years**, matching the longest financial/HR retention period in this SOP. It is never truncated or archived-and-deleted inside that window.
- **Backup:** the audit log is included in every database backup; backup restore tests (Annex C) must confirm the audit log restores intact and the hash chain (§D.5.5) still verifies.
- **Integrity:** rows are hash-chained (§D.5.5). Direct database edits to `audit_log` are prohibited; any detected break in the chain is escalated to the MD as a suspected tampering incident.
- **Exports** provided to external auditors are generated only via the audited export endpoint (§D.5.4), never by copying database files.

---

## D.12 QUARTERLY ACCESS RECERTIFICATION

Each quarter, IT Admin and the MD jointly:

1. Export the user list with roles and custom permission overrides (`/api/admin/permission-overrides-audit`).
2. Compare actual role permission bundles (`server/auth.js` `ROLE_DEFINITIONS`) against the segregation-of-duties matrix in §D.2; any role holding rights beyond its row in the matrix is documented and remediated or formally risk-accepted by the MD.
3. Confirm every account belongs to a current, active staff member; separated staff accounts are deactivated.
4. Confirm no non-admin role carries `audit.export`, `period.manage`, or `*`.
5. File the signed recertification as review evidence (§D.5.3).

**Known open item (tracked until closed):** the cashier role bundle retains legacy `finance.approve`, `finance.reverse` and `treasury.manage` permissions pending the Phase B3 cleanup. Until removed, cashier-desk activity under these permissions is included in the weekly finance review.

---

## D.13 CONFIGURATION CONTROL (CONTROL-CRITICAL FLAGS)

The following environment flags are part of the internal control system. Changing them is a control change, not an IT preference: it requires MD approval, and the system writes the effective values to the audit log at every boot where they changed (`config.control_flags`).

| Flag | Required production value | Control it enables |
|------|---------------------------|--------------------|
| `DELIVERY_PAYMENT_GATE` | `warn` or `enforce` (never off) | Blocks/flags dispatch of unpaid goods |
| `ENFORCE_DUAL_CONTROL_PAYMENTS` | `1` | Approver of a refund cannot also pay it |
| `DELIVERY_PAYMENT_GATE_STRICT_FINANCE` | Per MD decision, documented | Stricter finance handling of gated deliveries |

The IT Admin daily review (§D.5.1) checks for unexpected `config.control_flags` entries.

---

## D.14 CHANGE MANAGEMENT (DOCS FOLLOW CODE)

Any software release that adds, removes, or alters a control described in this SOP set must update the affected SOP/Annex **in the same release**. The release is not complete until the documentation matches the system. A quarterly doc-vs-system reconciliation (may be assisted by tooling) confirms that §D.2 role matrix, §D.5 event names, and workflow stage lists still match the code; drift found is fixed within the following month.

---

*End of Annex D — Compliance & Audit Framework (v3.1)*
