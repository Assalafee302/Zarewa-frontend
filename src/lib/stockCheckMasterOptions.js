/**
 * Stock check sidebar on Sales — same master-data sources as QuotationModal
 * (Setup → material types, gauges, colours). Keep inventory model filter in sync
 * with QuotationModal QUOTATION_MATERIAL_INVENTORY_MODELS.
 */
const QUOTATION_MATERIAL_INVENTORY_MODELS = new Set(['coil_kg', 'stone_meter']);

function sortGaugeLabels(a, b) {
  const na = parseFloat(String(a).replace(/[^\d.]/g, '')) || 0;
  const nb = parseFloat(String(b).replace(/[^\d.]/g, '')) || 0;
  if (na !== nb) return na - nb;
  return String(a).localeCompare(String(b));
}

/**
 * @param {{ materialTypes?: object[]; gauges?: object[]; colours?: object[] } | null | undefined} masterData
 * @returns {{ types: { value: string; label: string }[]; gauges: { value: string; label: string }[]; colours: { value: string; label: string }[] }}
 */
export function stockCheckSelectOptionsFromMasterData(masterData) {
  const md = masterData || {};
  const types = (md.materialTypes || [])
    .filter((row) => row.active !== false)
    .filter((row) =>
      QUOTATION_MATERIAL_INVENTORY_MODELS.has(String(row.inventoryModel || 'coil_kg').trim())
    )
    .map((row) => ({ value: String(row.id || '').trim(), label: String(row.name || row.id || '').trim() || '—' }))
    .filter((o) => o.value)
    .sort((a, b) => a.label.localeCompare(b.label));

  const gaugeLabels = (md.gauges || [])
    .filter((row) => row.active !== false)
    .map((row) => String(row.label || '').trim())
    .filter(Boolean);
  const gauges = [...new Set(gaugeLabels)]
    .sort(sortGaugeLabels)
    .map((label) => ({ value: label, label }));

  const colours = (md.colours || [])
    .filter((row) => row.active !== false)
    .map((row) => {
      const name = String(row.name || '').trim();
      if (!name) return null;
      const label = row.abbreviation ? `${name} (${row.abbreviation})` : name;
      return { value: name, label };
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));

  return { types, gauges, colours };
}

/**
 * When Setup master rows are empty, derive options from live coil / yard rows (legacy behaviour).
 * @param {Array<{ materialType?: string; gaugeLabel?: string; colour?: string }>} coilRows
 */
export function stockCheckSelectOptionsFromCoilRows(coilRows) {
  const types = [
    ...new Set((coilRows || []).map((r) => String(r.materialType || '').trim()).filter(Boolean)),
  ]
    .sort((a, b) => a.localeCompare(b))
    .map((label) => ({ value: label, label }));
  const gauges = [
    ...new Set((coilRows || []).map((r) => String(r.gaugeLabel ?? '').trim()).filter((g) => g && g !== '—')),
  ]
    .sort(sortGaugeLabels)
    .map((label) => ({ value: label, label }));
  const colours = [
    ...new Set(
      (coilRows || [])
        .map((r) => String(r.colourRaw ?? r.colour ?? '').trim())
        .filter((c) => c && c !== '—')
    ),
  ]
    .sort((a, b) => a.localeCompare(b))
    .map((label) => ({ value: label, label }));
  return { types, gauges, colours };
}

/**
 * @param {{ materialTypes?: object[] } | null | undefined} masterData
 * @param {string} materialTypeId
 * @param {string} rowMaterialType free-text from coil / product
 */
export function stockRowMatchesMaterialTypeFilter(masterData, materialTypeId, rowMaterialType) {
  const id = String(materialTypeId || '').trim();
  if (!id) return true;
  const row = String(rowMaterialType || '').trim().toLowerCase();
  if (!row) return false;
  const mt = (masterData?.materialTypes || []).find((m) => String(m.id || '').trim() === id);
  const name = String(mt?.name || '').trim().toLowerCase();
  if (name && row === name) return true;
  if (name && (row.includes(name) || name.includes(row))) return true;
  if (!mt && row === id.toLowerCase()) return true;
  return false;
}

/**
 * @param {{ colours?: object[] } | null | undefined} masterData
 * @param {string} colourName master colour name (quotation materialColor)
 * @param {{ colour?: string; colourRaw?: string }} row
 */
export function stockRowMatchesColourFilter(masterData, colourName, row) {
  const f = String(colourName || '').trim().toLowerCase();
  if (!f) return true;
  const raw = String(row.colourRaw ?? row.colour ?? '').trim().toLowerCase();
  if (!raw) return false;
  if (raw === f) return true;
  if (raw.includes(f) || f.includes(raw)) return true;
  const abbr = (masterData?.colours || []).find((c) => String(c.name || '').trim().toLowerCase() === f)?.abbreviation;
  if (abbr) {
    const a = String(abbr).trim().toLowerCase();
    if (a && raw.includes(a)) return true;
  }
  const first = raw.split(/[·,]/)[0].trim();
  if (first === f) return true;
  if (f.length >= 3 && first && (first.includes(f) || f.includes(first))) return true;
  return false;
}
