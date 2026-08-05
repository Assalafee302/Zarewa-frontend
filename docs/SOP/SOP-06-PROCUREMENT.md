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
| Pricing | Coil density standards, published price list, material pricing workbook |

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

## 8. PRICING & CONVERSION STANDARDS

**Procurement** → **Pricing** tab (also `/procurement/pricing`):

1. **Material pricing workbook** (primary) — Std (catalog/density) · Ref (purchase kg/m) · Hist (production kg/m) · Used → Floor → List
2. **Save drafts**, then **Publish to price list** so quotations enforce the published list ₦/m
3. **Standard conversion (density)** — secondary popup; saves catalog kg/m for production conversion checks
4. **Published selling prices** panel — view floors/lists; prefer Publish from workbook over manual entry

**Who may publish:** Pricing Manager (`pricing.manage`). Density catalog saves need Settings manager.

Changes to density/catalog affect production conversion checks — coordinate with Production Manager before updating.

**Vocabulary crosswalk:** Pricing **Ref** ≈ production **Sup** (supplier); Pricing **Hist** ≈ production gauge history; Pricing **Std** ≈ production standard.

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
