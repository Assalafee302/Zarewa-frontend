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
