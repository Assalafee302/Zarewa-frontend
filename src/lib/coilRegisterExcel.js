/**
 * Excel sheets for the coil register v2 (material register; see shared/lib/coilRegisterCore.js on the backend).
 */
const familyLabel = (f) => (f === 'aluminium' ? 'Aluminium' : f === 'aluzinc' ? 'Aluzinc' : 'Coil');

/** Flat Excel sheets for the coil register v2. */
export function coilRegisterExcelSheets(coilRegister, gapLines = []) {
  if (!coilRegister) return [];
  const stockRows = (s) =>
    (s?.rows || []).map((r) => ({
      coilNo: r.coilNo,
      material: familyLabel(r.family),
      gauge: r.gaugeLabel,
      colour: r.colour,
      poID: r.poID,
      receivedISO: r.receivedISO,
      grossKg: r.kgGross,
      spoolKg: r.spoolKg,
      netKg: r.kgNet,
      unitCostNgnPerKg: r.unitCostNgnPerKg,
      costSource: r.costSource,
      grossValueNgn: r.valueGrossNgn,
      spoolValueNgn: r.spoolValueNgn,
      netValueNgn: r.valueNetNgn,
      receivedDateNote: r.receivedDateNote,
    }));
  const { stock, purchaseOrders = [], consumption, exceptions = {} } = coilRegister;
  return [
    { name: 'Coil_stock_start', rows: stockRows(stock.opening) },
    { name: 'Coil_stock_end', rows: stockRows(stock.closing) },
    ...(stock.closingWithCorrections ? [{ name: 'Coil_stock_end_corrected', rows: stockRows(stock.closingWithCorrections) }] : []),
    {
      name: 'PO_kg_ordered_received',
      rows: purchaseOrders.flatMap((p) =>
        p.lines.map((l) => ({
          poID: p.poID,
          supplier: p.supplierName,
          orderDateISO: p.orderDateISO,
          gauge: l.gauge,
          colour: l.colour,
          kgOrdered: l.kgOrdered,
          kgReceived: l.kgReceived,
          differenceKg: l.diffKg,
          unitPricePerKgNgn: l.unitPricePerKgNgn,
          coils: l.coils.map((c) => c.coilNo).join(', '),
        }))
      ),
    },
    {
      name: 'Coil_consumption',
      rows: consumption.lines.map((l) => ({ dateISO: l.dateISO, coilNo: l.coilNo, material: familyLabel(l.family), jobID: l.jobID, kg: l.kg, detail: l.detail })),
    },
    { name: 'Jobs_no_coil_consumption', rows: consumption.jobsWithoutCoilConsumption },
    {
      name: 'Coil_exceptions',
      rows: [
        ...(exceptions.priceVsPo || []).map((e) => ({ exception: 'Coil price differs from PO', ...e })),
        ...(exceptions.bookedLate || []).map((e) => ({ exception: 'Received but booked late', ...e })),
        ...(exceptions.grnDateMismatch || []).map((e) => ({ exception: 'Received date ≠ GRN movement date', ...e })),
        ...(exceptions.coilSpecDiffersFromPoLine || []).map((e) => ({ exception: 'Coil spec differs from PO line', ...e })),
        ...(exceptions.noUnitCost || []).map((e) => ({ exception: 'Coil has no unit cost', ...e })),
      ],
    },
    { name: 'Balance_gaps', rows: gapLines },
  ];
}
