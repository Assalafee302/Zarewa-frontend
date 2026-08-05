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
