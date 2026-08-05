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

## 8. MONTHLY STOCK REGISTER — MULTI-STAGE SIGN-OFF

Physical count and closing stock follow a **six-stage** workflow (plus draft). Do not skip stages.

| Stage | Owner | Action | Status after |
|-------|--------|--------|--------------|
| 0 | Operations | Open period (draft pack) | `draft` |
| 1 | Operations | **Print** count sheet (versioned) | `printed` |
| 2 | Operations / Store | Complete store checklist (coils, FG, stone, accessories, in-transit); confirm & forward | `store_confirmed` |
| 3 | Branch Manager | Line clearance / physical overrides; approve or return to store | `bm_approved` (or back to `printed`) |
| 4 | Procurement | Enter / confirm unit costs (₦/kg, ₦/m, accessory unit) | `procurement_costed` |
| 5 | MD | Review closing value; sign off | `md_approved` |
| 6 | Procurement / Finance | **Capture & lock** — writes snapshots; posts count **variance** journals (5055 ↔ 1300) when BM adjustments change valued qty | `locked` |

**Notes**
- Store and BM views are **quantity-only** (no purchase costs). Costs appear from Procurement onward.
- **Capture & lock** is separate from **accounting period lock** (Finance). Both are required for a full month-end close.
- Perpetual inventory: account 1300 already holds receipts less COGS. Lock does **not** re-capitalise full closing stock; it freezes snapshots and posts **count variance** only.
- Locked register: no further edits. MD/admin may **reopen** with a documented reason (returns to `md_approved` for re-capture).
- Entry points: Operations (store), Manager inbox, Procurement costing, Reports → Close the month / Stock.

**Variance investigation (ANNEX-H):** coil kg &gt;1%, FG metres &gt;2%, accessories &gt;5% — investigate before BM approve.

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
