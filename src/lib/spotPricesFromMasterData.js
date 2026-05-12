/**
 * Dashboard / Sales spot table from workspace master data (Setup → price list)
 * and published workbook list prices (`price_list_items` on the snapshot).
 */

function byId(list) {
  const m = {};
  (list || []).forEach((row) => {
    if (row?.id) m[row.id] = row;
  });
  return m;
}

/**
 * @param {{ priceList?: object[], gauges?: object[], materialTypes?: object[], colours?: object[], profiles?: object[] } | null | undefined} masterData
 */
export function spotPricesRowsFromMasterData(masterData) {
  const priceList = masterData?.priceList;
  if (!Array.isArray(priceList) || priceList.length === 0) return [];

  const gauges = byId(masterData?.gauges);
  const materials = byId(masterData?.materialTypes);
  const colours = byId(masterData?.colours);
  const profiles = byId(masterData?.profiles);

  const rows = priceList
    .filter((row) => row.active !== false && String(row.unit || '').toLowerCase() === 'm')
    .map((row) => {
      const g = row.gaugeId ? gauges[row.gaugeId] : null;
      const gaugeLabel = g?.label || (g?.gaugeMm != null && g.gaugeMm !== '' ? `${g.gaugeMm} mm` : '—');
      const mat = row.materialTypeId ? materials[row.materialTypeId] : null;
      const productType = row.itemName || mat?.name || '—';
      const col = row.colourId ? colours[row.colourId] : null;
      const colourBit =
        col?.abbreviation || col?.name ? `${col.abbreviation || col.name}` : '';
      const prof = row.profileId ? profiles[row.profileId] : null;
      const profileBit = prof?.name || '';
      const extra = [colourBit && `Colour ${colourBit}`, profileBit && profileBit].filter(Boolean);
      const note = [row.notes, ...extra].filter(Boolean).join(' · ') || '';

      return {
        id: row.id,
        gaugeLabel,
        productType,
        note,
        priceNgn: Number(row.unitPriceNgn) || 0,
        setupRow: { ...row },
      };
    });

  rows.sort((a, b) => {
    const sa = Number(a.setupRow.sortOrder) || 0;
    const sb = Number(b.setupRow.sortOrder) || 0;
    if (sa !== sb) return sa - sb;
    const ga = gauges[a.setupRow.gaugeId]?.gaugeMm ?? 0;
    const gb = gauges[b.setupRow.gaugeId]?.gaugeMm ?? 0;
    if (ga !== gb) return ga - gb;
    return String(a.gaugeLabel).localeCompare(String(b.gaugeLabel));
  });

  return rows;
}

/** First numeric gauge token from a label (e.g. "0.45mm" → "0.45") to match `price_list_items.gauge_key`. */
function gaugeMmTokenFromLabel(label) {
  const s = String(label ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const m = s.match(/^(\d+(?:\.\d+)?)/);
  return m ? m[1] : '';
}

function gaugeRowForPliKey(gauges, gaugeKey) {
  const k = String(gaugeKey || '').trim();
  if (!k || !Array.isArray(gauges)) return null;
  return (
    gauges.find((g) => {
      if (g?.gaugeMm != null && String(g.gaugeMm).trim() === k) return true;
      return gaugeMmTokenFromLabel(g?.label) === k;
    }) || null
  );
}

function materialLabelFromTypeKey(masterData, mtKey) {
  const k = String(mtKey || '').trim().toLowerCase();
  if (!k) return '';
  const types = masterData?.materialTypes || [];
  const hit =
    types.find((t) => {
      const id = String(t?.id || '');
      if (k === 'alu' && id === 'MAT-001') return true;
      if (k === 'aluzinc' && id === 'MAT-002') return true;
      if (k === 'stone-coated' && id === 'MAT-005') return true;
      const n = String(t?.name || '').toLowerCase();
      if (k === 'alu' && n.includes('alumin')) return true;
      if (k === 'aluzinc' && n.includes('aluzinc')) return true;
      if (k === 'stone-coated' && n.includes('stone')) return true;
      return false;
    }) || null;
  return hit?.name || k;
}

function designLabel(designKey) {
  const s = String(designKey || '').trim();
  if (!s) return '';
  return s
    .replace(/-/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function filterPriceListItemsForBranch(items, branchId, viewAllBranches) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const b = String(branchId || '').trim();
  if (viewAllBranches) {
    return items.filter((row) => Math.round(Number(row.unitPricePerMeterNgn) || 0) > 0);
  }
  return items.filter((row) => {
    const n = Math.round(Number(row.unitPricePerMeterNgn) || 0);
    if (n <= 0) return false;
    const rb = String(row.branchId ?? '').trim();
    if (rb && b && rb !== b) return false;
    return true;
  });
}

function rowsFromPriceListItems(masterData, items) {
  const gauges = masterData?.gauges || [];
  const rows = [];
  for (const pli of items) {
    const gk = String(pli.gaugeKey || '').trim();
    if (!gk) continue;
    const priceNgn = Math.round(Number(pli.unitPricePerMeterNgn) || 0);
    if (priceNgn <= 0) continue;
    const gRow = gaugeRowForPliKey(gauges, gk);
    const gaugeLabel = gRow?.label || (gRow?.gaugeMm != null && gRow.gaugeMm !== '' ? `${gRow.gaugeMm} mm` : `${gk} mm`);
    const mat = materialLabelFromTypeKey(masterData, pli.materialTypeKey);
    const des = designLabel(pli.designKey);
    const productType =
      mat && des ? `${mat} · ${des}` : mat || des || 'Published list (workbook)';
    const branchBit = pli.branchId ? `Branch ${pli.branchId}` : '';
    const note = [branchBit, pli.notes].filter(Boolean).join(' · ').trim();
    rows.push({
      id: `pli:${pli.id}`,
      gaugeLabel,
      productType,
      note,
      priceNgn,
      setupRow: { ...pli, _source: 'priceListItem' },
    });
  }
  return rows;
}

function isRoofingOrFlatSetupRow(row) {
  const item = String(row?.setupRow?.itemName || row?.productType || '')
    .trim()
    .toLowerCase();
  return item.includes('roofing sheet') || item.includes('flat sheet');
}

function setupGaugeTokenFromSpotRow(row, gaugeById) {
  const sid = row?.setupRow?.gaugeId;
  if (sid && gaugeById[sid]) {
    const g = gaugeById[sid];
    const mm = g?.gaugeMm;
    if (mm != null && String(mm).trim()) return String(mm).trim();
    return gaugeMmTokenFromLabel(g?.label);
  }
  return gaugeMmTokenFromLabel(row?.gaugeLabel);
}

function compareSpotRows(a, b, gaugeById) {
  const mmFromRow = (row) => {
    if (row?.setupRow?._source === 'priceListItem') {
      return parseFloat(String(row.setupRow.gaugeKey || '').trim()) || 0;
    }
    const gid = row?.setupRow?.gaugeId;
    if (gid && gaugeById[gid]?.gaugeMm != null) return Number(gaugeById[gid].gaugeMm) || 0;
    return parseFloat(gaugeMmTokenFromLabel(row.gaugeLabel)) || 0;
  };
  const fa = mmFromRow(a);
  const fb = mmFromRow(b);
  if (fa !== fb) return fa - fb;
  return String(a.productType || '').localeCompare(String(b.productType || ''));
}

/**
 * Sales sidebar spot table: uses `snapshot.priceListItems` (same published ₦/m as the
 * Material pricing workbook list column after sync) plus Setup price list rows that are not
 * superseded for roofing / flat sheet gauges.
 *
 * @param {{ priceList?: object[]; gauges?: object[]; materialTypes?: object[] } | null | undefined} masterData
 * @param {object[] | null | undefined} priceListItems
 * @param {{ currentBranchId?: string; viewAllBranches?: boolean } | null | undefined} session
 */
export function spotPricesForSalesSidebar(masterData, priceListItems, session) {
  const gaugeById = byId(masterData?.gauges);
  const viewAll = Boolean(session?.viewAllBranches);
  const branchId = String(session?.currentBranchId || '').trim();
  const pliFiltered = filterPriceListItemsForBranch(priceListItems, branchId, viewAll);
  const fromPli = rowsFromPriceListItems(masterData, pliFiltered);
  const pliGaugeTokens = new Set(
    fromPli.map((r) => String(r.setupRow?.gaugeKey || '').trim()).filter(Boolean)
  );

  const fromSetup = spotPricesRowsFromMasterData(masterData).filter((row) => {
    if (!isRoofingOrFlatSetupRow(row)) return true;
    const t = setupGaugeTokenFromSpotRow(row, gaugeById);
    if (!t) return true;
    return !pliGaugeTokens.has(t);
  });

  const merged = [...fromPli, ...fromSetup];
  merged.sort((a, b) => compareSpotRows(a, b, gaugeById));
  return merged;
}

/**
 * Full payload for PATCH /api/setup/price-list/:id (matches server normalizePayload).
 */
export function buildPriceListSaveBody(base, patch) {
  const row = { ...base, ...patch };
  return {
    id: row.id,
    quoteItemId: row.quoteItemId ?? '',
    itemName: row.itemName,
    unit: row.unit ?? 'm',
    unitPriceNgn: Number(row.unitPriceNgn) || 0,
    gaugeId: row.gaugeId ?? '',
    colourId: row.colourId ?? '',
    materialTypeId: row.materialTypeId ?? '',
    profileId: row.profileId ?? '',
    notes: row.notes ?? '',
    active: row.active !== false,
    sortOrder: Number(row.sortOrder) || 0,
    bookLabel: row.bookLabel ?? 'Standard',
    bookVersion: Math.max(1, Number(row.bookVersion) || 1),
    effectiveFromISO: String(row.effectiveFromISO || '2020-01-01').slice(0, 10),
  };
}
