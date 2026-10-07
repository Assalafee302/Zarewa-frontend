import React, { useMemo, useState } from 'react';
import { Camera, Delete } from 'lucide-react';
import { buildCoilLife, coilErpKgSafe } from '../../lib/coilExpectedLife';
import { OPS_TOOL_BTN_PRIMARY } from './operationsDeskUi';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

function activeLots(lots) {
  return [...(lots || [])]
    .filter((lot) => coilErpKgSafe(lot) > 0.05)
    .sort((a, b) => {
      const loc = String(a.location || '').localeCompare(String(b.location || ''), undefined, { numeric: true });
      if (loc !== 0) return loc;
      return String(a.coilNo || '').localeCompare(String(b.coilNo || ''), undefined, { numeric: true });
    });
}

function suggestCoil(tagKg, lots) {
  const tag = Number(tagKg);
  if (!Number.isFinite(tag)) return null;
  for (const lot of lots || []) {
    const life = buildCoilLife(lot, []);
    const candidates = [life.erpKg, life.receivedKg, life.expectedKg].filter((n) => n != null);
    if (candidates.some((n) => Math.abs(n - tag) < 0.051)) return lot.coilNo;
  }
  return null;
}

/**
 * Yard count on a phone: one coil, large disposition buttons, keypad, tag photo.
 */
export function CoilCountYard({ lots = [], onSubmit }) {
  const queue = useMemo(() => activeLots(lots), [lots]);
  const [index, setIndex] = useState(0);
  const [counter, setCounter] = useState('');
  const [checker, setChecker] = useState('');
  const [lines, setLines] = useState([]);
  const [extras, setExtras] = useState([]);
  const [disposition, setDisposition] = useState('');
  const [tagKg, setTagKg] = useState('');
  const [note, setNote] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraKg, setExtraKg] = useState('');
  const [extraNote, setExtraNote] = useState('');
  const [extraPhoto, setExtraPhoto] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const current = queue[index] || null;
  const needsKg = disposition === 'seen' || disposition === 'scrap';

  const pushKey = (key) => {
    setTagKg((prev) => {
      if (key === '⌫') return prev.slice(0, -1);
      if (key === '.' && prev.includes('.')) return prev;
      if (prev.length >= 8) return prev;
      return `${prev}${key}`;
    });
  };

  const saveLine = () => {
    if (!current) return;
    if (!disposition) {
      setError('Choose Seen, Not found, or Scrap.');
      return;
    }
    if (needsKg && !(Number(tagKg) > 0)) {
      setError('Enter the tag kg.');
      return;
    }
    setError('');
    const line = {
      coilNo: current.coilNo,
      disposition,
      tagKg: needsKg ? Number(tagKg) : null,
      note: note.trim(),
      photoName,
      erpKg: coilErpKgSafe(current),
    };
    const next = [...lines.filter((l) => l.coilNo !== current.coilNo), line];
    setLines(next);
    setDisposition('');
    setTagKg('');
    setNote('');
    setPhotoName('');
    if (index < queue.length - 1) setIndex(index + 1);
  };

  const addExtra = () => {
    if (!(Number(extraKg) > 0)) {
      setError('Enter the tag kg for the coil that is not on the list.');
      return;
    }
    if (!extraPhoto) {
      setError('A tag photo is required for a coil that is not on the list.');
      return;
    }
    setError('');
    setExtras((prev) => [
      ...prev,
      {
        tagKg: Number(extraKg),
        note: extraNote.trim(),
        photoName: extraPhoto,
        suggestedCoilNo: suggestCoil(extraKg, lots),
      },
    ]);
    setExtraKg('');
    setExtraNote('');
    setExtraPhoto('');
    setExtraOpen(false);
  };

  const submit = () => {
    if (!counter.trim() || !checker.trim()) {
      setError('Enter the counter and the checker.');
      return;
    }
    if (!lines.length) {
      setError('Count at least one coil before submitting.');
      return;
    }
    const notFound = lines.filter((l) => l.disposition === 'not_found');
    const tagDiff = lines.filter(
      (l) => l.tagKg != null && l.erpKg != null && Math.abs(l.tagKg - l.erpKg) > 0.05
    );
    const offExpected = lines
      .map((l) => {
        const lot = queue.find((c) => c.coilNo === l.coilNo);
        const life = lot ? buildCoilLife(lot, []) : null;
        return life?.onWatchList ? { coilNo: l.coilNo, status: life.status } : null;
      })
      .filter(Boolean);
    const payload = {
      atISO: new Date().toISOString(),
      counter: counter.trim(),
      checker: checker.trim(),
      lines,
      extras,
      result: {
        notFound,
        foundNotInErp: extras,
        tagDiff,
        offExpected,
      },
    };
    setResult(payload.result);
    onSubmit?.(payload);
  };

  if (!queue.length) {
    return <p className="text-sm text-slate-500">No coils with stock on hand to count.</p>;
  }

  return (
    <div className="space-y-3" data-screen="coil-count">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-ui-xs font-semibold text-slate-600">
          Counter
          <input className="z-input mt-1 w-full" value={counter} onChange={(e) => setCounter(e.target.value)} />
        </label>
        <label className="text-ui-xs font-semibold text-slate-600">
          Checker
          <input className="z-input mt-1 w-full" value={checker} onChange={(e) => setChecker(e.target.value)} />
        </label>
      </div>

      {current ? (
        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-ui-xs font-semibold uppercase tracking-wide text-slate-500">
            {index + 1} of {queue.length} · {current.location || 'No location'}
          </p>
          <h2 className="mt-1 font-mono text-2xl font-bold text-zarewa-teal">{current.coilNo}</h2>
          <p className="text-sm text-slate-600">
            {current.materialTypeName || current.productID || '—'} · {current.gaugeLabel || current.gauge || '—'} ·{' '}
            {current.colour || '—'}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {[
              ['seen', 'Seen'],
              ['not_found', 'Not found'],
              ['scrap', 'Scrap'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setDisposition(id)}
                className={`min-h-14 rounded-xl border text-base font-bold ${
                  disposition === id
                    ? 'border-zarewa-teal bg-zarewa-teal text-white'
                    : 'border-slate-200 bg-white text-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {needsKg ? (
            <div className="mt-3">
              <p className="text-ui-xs font-semibold uppercase tracking-wide text-slate-500">Tag kg</p>
              <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-right font-mono text-3xl font-bold tabular-nums text-zarewa-teal">
                {tagKg || '0'}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pushKey(key)}
                    className="flex min-h-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-bold text-slate-800"
                  >
                    {key === '⌫' ? <Delete size={18} aria-label="Delete" /> : key}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <label className="mt-3 block text-ui-xs font-semibold text-slate-600">
            Note
            <input className="z-input mt-1 w-full" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-700">
            <Camera size={18} aria-hidden />
            {photoName || 'Tag photo'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => setPhotoName(e.target.files?.[0]?.name || '')}
            />
          </label>
          <button type="button" className={`${OPS_TOOL_BTN_PRIMARY} mt-3 w-full min-h-12 text-sm`} onClick={saveLine}>
            {index < queue.length - 1 ? 'Save and next coil' : 'Save this coil'}
          </button>
        </section>
      ) : null}

      <button type="button" className="text-sm font-semibold text-zarewa-teal underline" onClick={() => setExtraOpen((v) => !v)}>
        Found in the yard, not on the list
      </button>
      {extraOpen ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
          <label className="block text-ui-xs font-semibold text-amber-950">
            Tag kg
            <input className="z-input mt-1 w-full" inputMode="decimal" value={extraKg} onChange={(e) => setExtraKg(e.target.value)} />
          </label>
          <label className="block text-ui-xs font-semibold text-amber-950">
            Note
            <input className="z-input mt-1 w-full" value={extraNote} onChange={(e) => setExtraNote(e.target.value)} />
          </label>
          <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300 bg-white text-sm font-semibold">
            <Camera size={18} />
            {extraPhoto || 'Tag photo (required)'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => setExtraPhoto(e.target.files?.[0]?.name || '')}
            />
          </label>
          <button type="button" className={`${OPS_TOOL_BTN_PRIMARY} w-full min-h-12`} onClick={addExtra}>
            Add unknown coil
          </button>
        </section>
      ) : null}

      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
      <p className="text-ui-xs text-slate-500">{lines.length} counted · {extras.length} not on the list</p>
      <button type="button" className={`${OPS_TOOL_BTN_PRIMARY} w-full min-h-12 text-sm`} onClick={submit}>
        Submit count
      </button>

      {result ? (
        <section className="rounded-xl border border-slate-200 bg-white p-3 text-sm" data-screen="count-result">
          <h3 className="font-bold text-zarewa-teal">Count result</h3>
          <p className="mt-1 text-slate-600">Differences stay here until an operations manager approves an adjustment.</p>
          <ResultList title="Not found" rows={result.notFound.map((r) => r.coilNo)} />
          <ResultList
            title="Found, not in ERP"
            rows={result.foundNotInErp.map((r) => `${r.tagKg} kg${r.suggestedCoilNo ? ` · possible ${r.suggestedCoilNo}` : ''}`)}
          />
          <ResultList
            title="Tag kg ≠ ERP kg"
            rows={result.tagDiff.map((r) => `${r.coilNo}: tag ${r.tagKg} · ERP ${r.erpKg}`)}
          />
          <ResultList title="Expected-kg variance" rows={result.offExpected.map((r) => `${r.coilNo} ${r.status}`)} />
        </section>
      ) : null}
    </div>
  );
}

function ResultList({ title, rows }) {
  return (
    <div className="mt-3">
      <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      {rows.length ? (
        <ul className="mt-1 space-y-1">
          {rows.map((row) => (
            <li key={row} className="font-medium text-slate-800">
              {row}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-500">None</p>
      )}
    </div>
  );
}
