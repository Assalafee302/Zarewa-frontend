/**
 * Mirror of Zarewa-backend-main/shared/lib/stoneCoatedQuotationPolicy.js — keep in sync when rules change.
 */

export const STONE_METER_INVENTORY_MODEL = 'stone_meter';

export const STONE_PROFILE_FALLBACK = ['Bond', 'Classic', 'Milano', 'Single', 'Roman'];

export const STONE_PRODUCT_BASE_KEYS = new Set([
  'roofing sheet',
  'stone flatsheet',
  'ridge',
  'ridge cap',
  'gutter',
  'flat sheet',
]);

const COIL_KEY = 'coil';

export function normQuoteItemKey(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function productLineKey(name) {
  const k = normQuoteItemKey(name);
  if (k === 'flatsheet') return 'flat sheet';
  return k;
}

/** @returns {1.4 | 2 | null} */
export function normalizeStoneFlatsheetLengthM(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (Math.abs(n - 1.4) < 1e-6) return 1.4;
  if (Math.abs(n - 2) < 1e-6 || Math.abs(n - 2.0) < 1e-6) return 2;
  return null;
}

export function quotationHasFlatSheetLine(products) {
  if (!Array.isArray(products)) return false;
  return products.some((row) => {
    const key = productLineKey(row?.name);
    return key === 'flat sheet';
  });
}

export function quotationHasCoilLine(products) {
  if (!Array.isArray(products)) return false;
  return products.some((row) => productLineKey(row?.name) === COIL_KEY);
}

export const STONE_ACCESSORY_KEYS = new Set([normQuoteItemKey('Stone nail'), normQuoteItemKey('Repair Kit')]);

export function accessoryLineAllowedForStone(name) {
  const k = normQuoteItemKey(name);
  if (STONE_ACCESSORY_KEYS.has(k)) return true;
  if (k.includes('stone nail')) return true;
  if (k.includes('repair kit')) return true;
  return false;
}

export function productLineAllowedForStone(name, hasFlatSheet) {
  const key = productLineKey(name);
  if (key === COIL_KEY) return hasFlatSheet;
  return STONE_PRODUCT_BASE_KEYS.has(key);
}

export function allowedStoneProfileKeysFromDb(db, materialTypeId) {
  const mid = String(materialTypeId || '').trim();
  if (!mid || !db) return new Set(STONE_PROFILE_FALLBACK.map(normQuoteItemKey));
  try {
    const rows = db
      .prepare(`SELECT name FROM setup_profiles WHERE active = 1 AND material_type_id = ?`)
      .all(mid);
    if (rows.length) {
      return new Set(rows.map((r) => normQuoteItemKey(r.name)));
    }
  } catch {
    /* ignore */
  }
  return new Set(STONE_PROFILE_FALLBACK.map(normQuoteItemKey));
}

export function gaugeLabelActiveInMaster(db, gaugeLabel) {
  const g = String(gaugeLabel || '').trim();
  if (!g || !db) return true;
  try {
    const row = db
      .prepare(`SELECT 1 AS ok FROM setup_gauges WHERE active = 1 AND label = ? LIMIT 1`)
      .get(g);
    return Boolean(row?.ok);
  } catch {
    return true;
  }
}

export function stoneColourAllowedByPriceList(db, materialTypeId, colourName) {
  const mid = String(materialTypeId || '').trim();
  const cname = String(colourName || '').trim();
  if (!mid || !cname || !db) return true;
  try {
    const priceRows = db
      .prepare(
        `SELECT DISTINCT colour_id FROM setup_price_lists WHERE active = 1 AND material_type_id = ? AND colour_id IS NOT NULL AND trim(colour_id) != ''`
      )
      .all(mid);
    if (!priceRows.length) return true;
    const allowedIds = new Set(priceRows.map((r) => String(r.colour_id || '').trim()).filter(Boolean));
    const col = db.prepare(`SELECT colour_id FROM setup_colours WHERE active = 1 AND name = ?`).get(cname);
    const cid = col?.colour_id != null ? String(col.colour_id).trim() : '';
    if (!cid) return false;
    return allowedIds.has(cid);
  } catch {
    return true;
  }
}

export const QUOTATION_MATERIAL_RULES_CODE = 'QUOTATION_MATERIAL_RULES';

export function validateQuotationMaterialRules(db, linesJson) {
  const j = linesJson && typeof linesJson === 'object' ? linesJson : {};
  const mid = String(j.materialTypeId || '').trim();
  if (!mid || !db) return { ok: true };

  let inventoryModel = 'coil_kg';
  try {
    const row = db
      .prepare(`SELECT inventory_model FROM setup_material_types WHERE material_type_id = ? AND active = 1`)
      .get(mid);
    inventoryModel = String(row?.inventory_model || 'coil_kg').trim() || 'coil_kg';
  } catch {
    inventoryModel = 'coil_kg';
  }

  if (inventoryModel !== STONE_METER_INVENTORY_MODEL) {
    return { ok: true };
  }

  const products = Array.isArray(j.products) ? j.products : [];
  const accessories = Array.isArray(j.accessories) ? j.accessories : [];
  const hasFlat = quotationHasFlatSheetLine(products);

  const invalidProductNames = [];
  for (const row of products) {
    const n = String(row?.name ?? '').trim();
    if (!n) continue;
    if (!productLineAllowedForStone(n, hasFlat)) {
      invalidProductNames.push(n);
    }
  }

  const invalidAccessoryNames = [];
  for (const row of accessories) {
    const n = String(row?.name ?? '').trim();
    if (!n) continue;
    if (!accessoryLineAllowedForStone(n)) {
      invalidAccessoryNames.push(n);
    }
  }

  const design = String(j.materialDesign || '').trim();
  const profileKeys = allowedStoneProfileKeysFromDb(db, mid);
  const invalidProfile = design.length > 0 && !profileKeys.has(normQuoteItemKey(design));

  const gauge = String(j.materialGauge || '').trim();
  const invalidGauge = gauge.length > 0 && !gaugeLabelActiveInMaster(db, gauge);

  const colour = String(j.materialColor || '').trim();
  const invalidColour = colour.length > 0 && !stoneColourAllowedByPriceList(db, mid, colour);

  const invalidHeader = {
    profile: invalidProfile,
    gauge: invalidGauge,
    colour: invalidColour,
  };

  const stoneFlatsheetLengthMissing = [];
  for (const row of products) {
    const n = String(row?.name ?? '').trim();
    if (!n || productLineKey(n) !== 'stone flatsheet') continue;
    const qty = Number(String(row?.qty ?? '').replace(/,/g, '')) || 0;
    if (qty <= 0) continue;
    const lm = normalizeStoneFlatsheetLengthM(row?.stoneFlatsheetLengthM ?? row?.lengthM);
    if (lm == null) stoneFlatsheetLengthMissing.push(n);
  }

  if (
    invalidProductNames.length === 0 &&
    invalidAccessoryNames.length === 0 &&
    stoneFlatsheetLengthMissing.length === 0 &&
    !invalidProfile &&
    !invalidGauge &&
    !invalidColour
  ) {
    return { ok: true };
  }

  const parts = [];
  if (invalidProductNames.length) {
    parts.push(`Invalid product line(s) for stone coated: ${invalidProductNames.join(', ')}.`);
  }
  if (invalidAccessoryNames.length) {
    parts.push(`Invalid accessory line(s) for stone coated: ${invalidAccessoryNames.join(', ')}.`);
  }
  if (stoneFlatsheetLengthMissing.length) {
    parts.push(
      'Stone flatsheet lines with quantity must select length 1.4 m or 2 m (per line on the quote).'
    );
  }
  if (invalidProfile) parts.push('Profile is not valid for this material type.');
  if (invalidGauge) parts.push('Gauge is not valid for this material type.');
  if (invalidColour) parts.push('Colour is not valid for this material type (price list).');

  return {
    ok: false,
    error: parts.join(' ') || 'Quotation does not meet material rules.',
    code: QUOTATION_MATERIAL_RULES_CODE,
    details: {
      invalidProductNames,
      invalidAccessoryNames,
      invalidHeader,
      stoneFlatsheetLengthMissing,
    },
  };
}

export function assertQuotationMaterialRules(db, linesJson) {
  const r = validateQuotationMaterialRules(db, linesJson);
  if (r.ok) return;
  const err = new Error(r.error);
  err.code = r.code;
  err.details = r.details;
  err.statusCode = 422;
  throw err;
}

export function applyStoneMeterMaterialChangeCleanup({
  toStoneMeter,
  products,
  accessories,
  materialGauge,
  materialColor,
  materialDesign,
  allowedProfileKeys,
}) {
  if (!toStoneMeter) {
    return {
      products,
      accessories,
      materialGauge,
      materialColor,
      materialDesign,
      removedProducts: [],
      removedAccessories: [],
      clearedHeader: { gauge: false, colour: false, profile: false },
    };
  }
  const hasFlat = quotationHasFlatSheetLine(products);
  const nextProducts = [];
  const removedProducts = [];
  for (const row of products) {
    const n = String(row?.name ?? '').trim();
    if (!n) {
      nextProducts.push(row);
      continue;
    }
    if (productLineAllowedForStone(n, hasFlat)) {
      nextProducts.push(row);
    } else {
      removedProducts.push(n);
    }
  }
  const hasFlatAfter = quotationHasFlatSheetLine(nextProducts);
  const finalProducts = [];
  for (const row of nextProducts) {
    const n = String(row?.name ?? '').trim();
    if (productLineKey(n) === COIL_KEY && !hasFlatAfter) {
      removedProducts.push(n);
      continue;
    }
    finalProducts.push(row);
  }

  const nextAccessories = [];
  const removedAccessories = [];
  for (const row of accessories) {
    const n = String(row?.name ?? '').trim();
    if (!n) {
      nextAccessories.push(row);
      continue;
    }
    if (accessoryLineAllowedForStone(n)) {
      nextAccessories.push(row);
    } else {
      removedAccessories.push(n);
    }
  }

  const profKeys =
    allowedProfileKeys && allowedProfileKeys.size
      ? allowedProfileKeys
      : new Set(STONE_PROFILE_FALLBACK.map(normQuoteItemKey));
  let mg = materialGauge;
  let mc = materialColor;
  let md = materialDesign;
  const clearedHeader = { gauge: false, colour: false, profile: false };
  if (md && !profKeys.has(normQuoteItemKey(md))) {
    md = '';
    clearedHeader.profile = true;
  }

  return {
    products: finalProducts,
    accessories: nextAccessories,
    materialGauge: mg,
    materialColor: mc,
    materialDesign: md,
    removedProducts,
    removedAccessories,
    clearedHeader,
  };
}
