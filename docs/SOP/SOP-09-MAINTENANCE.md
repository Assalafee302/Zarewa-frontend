# SOP-09: MAINTENANCE

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Department:** Maintenance  
**System modules:** Machines registry (Branch Manager Expenses → Machines), Maintenance plans and work orders  
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
| Branch Manager (`sales_manager`) | Register machines and contractors on **Expenses → Machines**. Assign, spend, back on line, and close finances on **Approvals → Issues**. |
| Store (`operations_officer`) | Report faults and **Request diesel** from Operations Desk. Does not register machines or vendors. |
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
3. System generates **Work Orders** when due — Branch Manager uses **Shift → Preventive maintenance due → Open job**, or **Open service job** on the machine file.
4. MM assigns technician; tracks completion. **Back on line** on a preventive job stamps last service and rolls the next due date.

### 3.2 Generator and forklift

Generator and forklift are plant-register machines (type `generator` / `forklift`), not a separate module.

| Need | Who | Where |
|------|-----|--------|
| Diesel top-up | Store | Operations Desk → **Request diesel** (litres + amount against that machine). Creates a Fuel & lubricant payment request. Cashier pays after BM approval. The litres stay on the machine file. |
| Service due | Branch Manager | **Shift → Preventive maintenance due**, or the machine file on **Expenses → Machines**. Open a preventive work order; spend hangs off that job as usual. |
| Register the plant file | Branch Manager | **Expenses → Machines** |

Do not use Request supplies for generator/forklift diesel — that path does not bind to the plant file.

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
