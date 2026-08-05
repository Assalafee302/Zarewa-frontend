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

Density / catalog standards are maintained under **Procurement → Pricing** (standard conversion popup) and feed workbook **Std** as well as production conversion checks. See SOP-06 §8.

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
