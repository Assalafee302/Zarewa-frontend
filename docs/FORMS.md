# Zarewa forms catalog

Unified form primitives:

| Piece | Location |
|-------|----------|
| Inputs | `components/ui/Input.jsx` — `Input`, `Textarea`, `Select`, `FieldLabel` |
| Layout | `components/layout/FormLayout.jsx` — `FormField`, `FormSection`, `FormGrid` |
| Popup shell | `components/layout/FormModal.jsx` — `FormModal`, `FormModalFooter` |
| Scroll chrome | `ModalScrollShell` + `ModalActionFooter` |
| Tokens | `lib/designTokens.js` — `FIELD`, `FORM` |
| CSS | `index.css` — `.z-input`, `.z-field-label`, `.z-modal-panel` |

**New popups:** `FormModal` → `FormField` + `Input` → `FormModalFooter`.

---

## Popup modals (by domain)

### Sales & customers
- `sales/QuotationModal.jsx`
- `sales/CuttingListModal.jsx`
- `sales/ReceiptModal.jsx`
- `sales/RefundModal.jsx`
- `sales/AdvancePaymentModal.jsx`
- `sales/LinkAdvanceModal.jsx`
- `sales/SalesCustomerCreateModal.jsx` *(reference migration)*
- `sales/StaffPurchaseCreditRequestModal.jsx`
- Legacy roots: `QuotationModal.jsx`, `ReceiptModal.jsx`, `CuttingListModal.jsx`, `AdvancePaymentModal.jsx`, `RefundModal.jsx`

### Finance & accounting
- `finance/AccountingRegisterLineModal.jsx`
- `finance/AccountingRegisterDetailModal.jsx`
- `finance/AccountingRegisterClearModal.jsx`
- `finance/AccountingRegisterSettlementRequestModal.jsx`
- `finance/AccountingRegisterSettlementPayModal.jsx`
- `finance/AccountingRegisterSettlementDecisionModal.jsx`
- `finance/AccountingAssetDetailModal.jsx`
- `finance/Ap2ApRebuildModal.jsx`
- `finance/CashierBankChargeModal.jsx`
- `finance/CashierOtPayModal.jsx`
- `finance/CreditExceptionRequestModal.jsx`
- `finance/CreditExceptionDecisionModal.jsx`
- `finance/FinanceNoteRedirectModal.jsx`
- `finance/StaffObligationRepaymentModal.jsx`
- `finance/StaffRecoveryCashierModal.jsx`
- `finance/interBranch/InterBranchProposeModal.jsx`
- `finance/interBranch/InterBranchRepayModal.jsx`
- `finance/interBranch/InterBranchLoanDetailModal.jsx`

### Procurement
- `procurement/PurchaseOrderModal.jsx`
- `procurement/CoilPurchaseOrderModal.jsx`
- `procurement/StonePurchaseOrderModal.jsx`
- `procurement/AccessoryPurchaseOrderModal.jsx`
- `procurement/StoneAccessoryReceiptModal.jsx`
- `procurement/MaterialPricingWorkbookModal.jsx`

### Operations & production
- `operations/RegisterCoilModal.jsx`
- `operations/CoilEditMasterModal.jsx`
- `operations/CoilDamageRecordModal.jsx`
- `operations/ProductionRegisterEditModal.jsx`
- `operations/ProductionRegisterCorrectionModal.jsx`
- `operations/ProductionRegisterConfirmModal.jsx`
- `production/LiveProductionMonitorReturnCancelModals.jsx`
- `material/MaterialIncidentDetailModal.jsx`

### HR
- `hr/HrFormModal.jsx` *(wraps FormModal)*
- `hr/HrPayrollRunModals.jsx`
- `hr/HrBulkStaffImportModal.jsx`
- `hr/HrSensitiveUnlockModal.jsx`
- `hr/HrOrgRelationshipModal.jsx`
- `hr/HrIncidentRegistryDetailModal.jsx`
- `hr/HrIncidentMemoEscalateModal.jsx`
- `hr/MyAttendanceExceptionModal.jsx`
- `hr/HrPayslipPrintModal.jsx`, `HrLetterPrintModal.jsx`

### Branch manager & exec
- `branchManager/ManagementDecisionModal.jsx`
- `branchManager/OtApprovalDecisionModal.jsx`
- `branchManager/EditApprovalDetailModal.jsx`
- `branchManager/ManagementRemarkDialog.jsx`
- `exec/ExecutiveWorkItemReviewModal.jsx`

### Reports & stock register
- `reports/StockRegisterMonthEndModal.jsx`
- Print modals: `StockRegisterPrintModal`, `ReportPrintModal`, `CoilStatementPrintModal`, …
- `reports/stockRegister/StockRegisterLineDetailModal.jsx`
- `reports/stockRegister/StockRegisterCaptureConfirmModal.jsx`
- `reports/stockRegister/StockRegisterStoreConfirmModal.jsx`
- `reports/stockRegister/StockRegisterProcurementModal.jsx`
- `reports/stockRegister/StockRegisterBmReviewModal.jsx`
- `reports/stockRegister/StockRegisterMdApproveModal.jsx`

### Workspace, office, profile
- `workspace/OfficeRecordBmEditModal.jsx`
- `account/ExpenseBulkImportModal.jsx`
- `profile/ProfileOnboardingModal.jsx`
- `profile/WorkPayFormModal.jsx`
- `refund/RefundAdvanceModal.jsx`
- `auth/RoleTrainingGuideModal.jsx`

### Confirm / legacy
- `ui/ConfirmDialog.jsx`
- `ui/modal.jsx` (legacy — prefer `ModalFrame`)

---

## Slide-overs & drawers

- `layout/SlideOverPanel.jsx`
- `hr/HrRequestPreviewSlideOver.jsx`, `MyRequestDetailSlideOver.jsx`, `HrStaffQuickPreviewSlideOver.jsx`
- `hr/HrStaffDisciplineCaseDrawer.jsx`
- `exec/ExecCustomerSlideOver.jsx`, `ExecBranchSlideOver.jsx`
- `workspace/ManagementIntelSlideOver.jsx`
- `procurement/ProcurementPreviewSlideOvers.jsx`
- `office/OfficeRecordComposeDrawer.jsx`
- `office/OfficeThreadConversationDrawer.jsx`

---

## Shared field modules

- `customers/CustomerFormFields.jsx`
- `hr/HrStaffFormFields.jsx`, `HrStaffRegisterForm.jsx`, `HrLoanApplicationForm.jsx`
- `office/ExpenseRequestFormFields.jsx`
- `ot/OtRequestForm.jsx`
- `profile/profileFormUi.jsx`, `ProfileOnboardingForm.jsx`
- `procurement/ProcurementFormSection.jsx`

---

## Legacy aliases → replace with

| Old | New |
|-----|-----|
| `HR_FIELD_CLASS`, `HR_INPUT` | `Input` |
| `CUSTOMER_FIELD` | `Input` |
| `z-finance-field` | `Input size="compact"` |
| Custom modal chrome | `FormModal` |
| Inline full-width submit | `FormModalFooter` |
