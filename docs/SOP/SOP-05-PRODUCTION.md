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
