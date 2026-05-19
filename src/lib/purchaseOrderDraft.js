import { inferLineTypeFromProduct } from './poLineTypes.js';

function coilMaterialKindFromProductId(productID) {
  if (productID === 'PRD-102') return 'aluzinc';
  if (productID === 'COIL-ALU') return 'aluminium';
  return '';
}

function newRowUid() {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyPoLine(lineType = 'coil_kg') {
  return {
    rowUid: newRowUid(),
    existingLineKey: '',
    lineType,
    materialKind: '',
    color: '',
    gauge: '',
    kg: '',
    meters: '',
    pricePerKg: '',
    designLabel: '',
    colourLabel: '',
    gaugeLabel: '',
    metres: '',
    pricePerM: '',
    fsColour: '',
    fsLengthM: '2',
    sheets: '',
    pricePerSheet: '',
    productID: '',
    qty: '',
    unitPrice: '',
  };
}

/**
 * @param {object} po normalized purchase order
 * @param {object[]} products
 */
export function purchaseOrderToUnifiedDraft(po, products = []) {
  return {
    poID: po.poID,
    supplierID: po.supplierID,
    orderDateISO: po.orderDateISO,
    expectedDeliveryISO: po.expectedDeliveryISO || '',
    lines: (po.lines || []).map((l) => {
      const p = products.find((x) => x.productID === l.productID);
      const da = p?.dashboardAttrs || {};
      const lineType =
        String(l.lineType || '').trim() ||
        inferLineTypeFromProduct(l.productID, p, l);

      if (lineType === 'stone_meter') {
        return {
          ...emptyPoLine('stone_meter'),
          rowUid: l.lineKey,
          existingLineKey: l.lineKey,
          lineType: 'stone_meter',
          designLabel: da.stoneDesign || '',
          colourLabel: da.stoneColour || l.color || '',
          gaugeLabel: da.stoneGauge || l.gauge || '',
          metres: l.qtyOrdered,
          pricePerM: l.unitPriceNgn,
        };
      }
      if (lineType === 'stone_flatsheet') {
        return {
          ...emptyPoLine('stone_flatsheet'),
          rowUid: l.lineKey,
          existingLineKey: l.lineKey,
          lineType: 'stone_flatsheet',
          fsColour: da.stoneFlatsheetColour || l.color || '',
          fsLengthM: String(da.stoneFlatsheetLengthM ?? l.metersOffered ?? '2'),
          sheets: l.qtyOrdered,
          pricePerSheet: l.unitPriceNgn,
        };
      }
      if (lineType === 'accessory') {
        return {
          ...emptyPoLine('accessory'),
          rowUid: l.lineKey,
          existingLineKey: l.lineKey,
          lineType: 'accessory',
          productID: l.productID,
          qty: l.qtyOrdered,
          unitPrice: l.unitPriceNgn,
        };
      }
      const meterBasis =
        lineType === 'coil_meter' ||
        (Number(l.metersOffered) > 0 &&
          Math.abs(Number(l.qtyOrdered) - Number(l.metersOffered)) <= 0.001);
      return {
        ...emptyPoLine(meterBasis ? 'coil_meter' : 'coil_kg'),
        rowUid: l.lineKey,
        existingLineKey: l.lineKey,
        lineType: meterBasis ? 'coil_meter' : 'coil_kg',
        materialKind: coilMaterialKindFromProductId(l.productID),
        color: l.color || '',
        gauge: l.gauge || '',
        kg: meterBasis ? '' : l.qtyOrdered,
        meters: meterBasis ? l.qtyOrdered : l.metersOffered ?? '',
        pricePerKg: l.unitPricePerKgNgn ?? l.unitPriceNgn,
      };
    }),
  };
}
