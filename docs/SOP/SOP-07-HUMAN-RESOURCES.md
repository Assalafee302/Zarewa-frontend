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
