import { readProdCoilDraftMap } from './productionRegisterDraftStorage.js';

export function isDraftAllocationRow(row) {
  return String(row?.id ?? '').startsWith('draft-');
}

/** Placeholder row at the bottom of the coil list — not part of the save payload. */
export function isEmptyCoilDraftRow(row) {
  if (!row) return true;
  if (!isDraftAllocationRow(row)) return false;
  return (
    !String(row.coilNo ?? '').trim() &&
    !String(row.openingWeightKg ?? '').trim() &&
    !String(row.closingWeightKg ?? '').trim() &&
    !String(row.metersProduced ?? '').trim() &&
    !String(row.note ?? '').trim()
  );
}

function parseCoilDraftNumber(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return NaN;
  return Number(raw.replace(/,/g, ''));
}

export function createDraftLine(row = {}) {
  const hasPersistedId = row.id != null && row.id !== '';
  return {
    id: hasPersistedId ? row.id : `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    coilNo: row.coilNo || '',
    openingWeightKg:
      row.openingWeightKg != null && row.openingWeightKg !== 0 ? String(row.openingWeightKg) : '',
    closingWeightKg:
      row.closingWeightKg != null && row.closingWeightKg !== 0 ? String(row.closingWeightKg) : '',
    metersProduced:
      row.metersProduced != null && row.metersProduced !== 0 ? String(row.metersProduced) : '',
    note: row.note || '',
    specMismatch: Boolean(row.specMismatch),
    finishCoil: Boolean(row.finishCoil),
  };
}

export function coilAllocationDraftStorageKey(row) {
  if (!isDraftAllocationRow(row) && row.id != null && row.id !== '') {
    return `id:${String(row.id)}`;
  }
  if (isDraftAllocationRow(row) && row.id != null && row.id !== '') {
    const hasData =
      String(row.coilNo ?? '').trim() ||
      String(row.openingWeightKg ?? '').trim() ||
      String(row.closingWeightKg ?? '').trim() ||
      String(row.metersProduced ?? '').trim() ||
      String(row.note ?? '').trim();
    if (hasData) return `draft:${String(row.id)}`;
  }
  const coil = String(row.coilNo ?? '').trim();
  if (!coil) return '';
  const op = Math.round(Number(String(row.openingWeightKg ?? '').replace(/,/g, '')) || 0);
  return `coil:${coil}:${op}`;
}

function serverAllocationHasRunLogField(serverRow, field) {
  if (field === 'note') return String(serverRow.note || '').trim() !== '';
  const v = Number(serverRow[field]);
  return Number.isFinite(v) && v !== 0;
}

function mergeAllocationDraftFromServer(serverRow, prevDraft, storedDraft) {
  const base = createDraftLine(serverRow);
  for (const src of [storedDraft, prevDraft].filter(Boolean)) {
    if (!serverAllocationHasRunLogField(serverRow, 'closingWeightKg') && src.closingWeightKg) {
      base.closingWeightKg = String(src.closingWeightKg);
    }
    if (!serverAllocationHasRunLogField(serverRow, 'metersProduced') && src.metersProduced) {
      base.metersProduced = String(src.metersProduced);
    }
    if (!serverAllocationHasRunLogField(serverRow, 'note') && src.note) {
      base.note = String(src.note);
    }
    if (src.finishCoil && !serverRow.finishCoil) {
      base.finishCoil = Boolean(src.finishCoil);
    }
    if ((!serverRow.openingWeightKg || serverRow.openingWeightKg === 0) && src.openingWeightKg) {
      base.openingWeightKg = String(src.openingWeightKg);
    }
    if (!String(serverRow.coilNo || '').trim() && src.coilNo) {
      base.coilNo = String(src.coilNo);
    }
  }
  return base;
}

export function seedDraftAllocationsFromServer(jobId, serverRows, prevDrafts, jobSwitch) {
  const storedMap = jobSwitch ? {} : readProdCoilDraftMap(jobId);
  const prevForMerge = jobSwitch ? [] : prevDrafts;

  if (!serverRows.length) {
    const planned = prevForMerge.filter(
      (r) =>
        String(r.coilNo ?? '').trim() ||
        Number(String(r.openingWeightKg ?? '').replace(/,/g, '')) > 0 ||
        String(r.closingWeightKg ?? '').trim() ||
        String(r.metersProduced ?? '').trim()
    );
    if (planned.length) {
      const hasBlank = planned.some((r) => isDraftAllocationRow(r) && !String(r.coilNo ?? '').trim());
      return hasBlank ? planned : [...planned, createDraftLine()];
    }
    return [createDraftLine()];
  }

  const mergedPersisted = serverRows.map((serverRow) => {
    const idKey = serverRow.id != null && serverRow.id !== '' ? `id:${serverRow.id}` : '';
    const coil = String(serverRow.coilNo ?? '').trim();
    const coilKey = coil ? `coil:${coil}:${Math.round(Number(serverRow.openingWeightKg) || 0)}` : '';
    const prevRow =
      prevForMerge.find((p) => String(p.id) === String(serverRow.id)) ||
      (coil
        ? prevForMerge.find(
            (p) =>
              String(p.coilNo ?? '').trim() === coil &&
              Math.round(Number(String(p.openingWeightKg ?? '').replace(/,/g, '')) || 0) ===
                Math.round(Number(serverRow.openingWeightKg) || 0)
          )
        : null);
    const storedDraft = (idKey && storedMap[idKey]) || (coilKey && storedMap[coilKey]) || null;
    return mergeAllocationDraftFromServer(serverRow, prevRow, storedDraft);
  });

  const supplementalDrafts = prevForMerge.filter((r) => {
    if (!isDraftAllocationRow(r)) return false;
    const coil = String(r.coilNo ?? '').trim();
    if (!coil && !r.openingWeightKg && !r.closingWeightKg && !r.metersProduced && !r.note) return false;
    return !mergedPersisted.some((m) => coil && String(m.coilNo ?? '').trim() === coil);
  });

  const storedOnlyDrafts = [];
  if (!jobSwitch && storedMap && typeof storedMap === 'object') {
    const mergedIds = new Set(mergedPersisted.map((m) => String(m.id ?? '')));
    const mergedCoils = new Set(
      mergedPersisted.map((m) => String(m.coilNo ?? '').trim()).filter(Boolean)
    );
    for (const [key, stored] of Object.entries(storedMap)) {
      if (!stored || typeof stored !== 'object') continue;
      const storedCoil = String(stored.coilNo ?? '').trim();
      const storedDraftId = key.startsWith('draft:') ? key.slice(6) : '';
      if (storedDraftId && mergedIds.has(storedDraftId)) continue;
      if (storedCoil && mergedCoils.has(storedCoil)) continue;
      if (
        !storedCoil &&
        !String(stored.openingWeightKg ?? '').trim() &&
        !String(stored.closingWeightKg ?? '').trim() &&
        !String(stored.metersProduced ?? '').trim() &&
        !String(stored.note ?? '').trim()
      ) {
        continue;
      }
      const fromStored = createDraftLine({
        id: storedDraftId || undefined,
        coilNo: storedCoil,
        openingWeightKg: stored.openingWeightKg,
        closingWeightKg: stored.closingWeightKg,
        metersProduced: stored.metersProduced,
        note: stored.note,
        finishCoil: stored.finishCoil,
      });
      const dup = [...mergedPersisted, ...supplementalDrafts, ...storedOnlyDrafts].some(
        (m) =>
          String(m.id) === String(fromStored.id) ||
          (storedCoil && String(m.coilNo ?? '').trim() === storedCoil)
      );
      if (!dup) storedOnlyDrafts.push(fromStored);
    }
  }

  const all = [...mergedPersisted, ...supplementalDrafts, ...storedOnlyDrafts];
  const needsBlank = !all.some((r) => isDraftAllocationRow(r) && !String(r.coilNo ?? '').trim());
  return needsBlank ? [...all, createDraftLine()] : all;
}

/** One coil line has enough data to include in live conversion preview. */
export function draftRowConversionPreviewReady(row) {
  const coil = row.coilNo?.trim();
  const op = parseCoilDraftNumber(row.openingWeightKg);
  const cl = parseCoilDraftNumber(row.closingWeightKg);
  const m = parseCoilDraftNumber(row.metersProduced);
  return (
    Boolean(coil) &&
    Number.isFinite(op) &&
    op > 0 &&
    Number.isFinite(cl) &&
    cl >= 0 &&
    cl <= op &&
    Number.isFinite(m) &&
    m > 0
  );
}

/** Rows that carry coil data — excludes empty “Add coil” placeholders. */
export function coilDraftRowsWithData(rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) => !isEmptyCoilDraftRow(row));
}

export function completionLineFromDraft(row) {
  const line = {
    coilNo: row.coilNo.trim(),
    closingWeightKg: Math.round(Number(row.closingWeightKg) || 0),
    metersProduced: Number(row.metersProduced),
    note: row.note.trim(),
  };
  const opening = Number(String(row.openingWeightKg ?? '').replace(/,/g, ''));
  if (Number.isFinite(opening) && opening > 0) {
    line.openingWeightKg = Math.round(opening);
  }
  if (row.finishCoil) {
    line.finishCoil = true;
  }
  if (!isDraftAllocationRow(row) && row.id != null && row.id !== '') {
    return { ...line, allocationId: row.id };
  }
  return line;
}
