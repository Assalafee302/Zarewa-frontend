import React from 'react';
import { coilErpKgSafe } from '../../lib/coilExpectedLife';

function groupByLocation(lots) {
  const groups = new Map();
  const rows = [...(lots || [])]
    .filter((lot) => coilErpKgSafe(lot) > 0.05)
    .sort((a, b) => {
      const loc = String(a.location || '').localeCompare(String(b.location || ''), undefined, { numeric: true });
      if (loc !== 0) return loc;
      return String(a.coilNo || '').localeCompare(String(b.coilNo || ''), undefined, { numeric: true });
    });
  for (const lot of rows) {
    const loc = String(lot.location || 'Unassigned').trim() || 'Unassigned';
    if (!groups.has(loc)) groups.set(loc, []);
    groups.get(loc).push(lot);
  }
  return groups;
}

/**
 * Printable A4 count sheet. System kg stays off the page; the yard writes tag kg.
 */
export function CoilCountSheet({ lots = [], branchName = 'Branch', dateLabel = '' }) {
  const groups = groupByLocation(lots);
  return (
    <article className="report-print-root report-print-a4-portrait bg-white p-4 text-slate-900" data-screen="count-sheet">
      <header className="mb-4 border-b border-slate-300 pb-3">
        <p className="text-ui-xs font-bold uppercase tracking-widest text-slate-500">Physical coil count</p>
        <h1 className="text-lg font-bold text-zarewa-teal">{branchName}</h1>
        <p className="text-xs text-slate-600">{dateLabel || 'Count date _______________'}</p>
      </header>
      {[...groups.entries()].map(([location, rows]) => (
        <section key={location} className="mb-4 break-inside-avoid">
          <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-700">Location · {location}</h2>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-400 text-left">
                <th className="py-1 pr-2 font-semibold">Coil no.</th>
                <th className="py-1 pr-2 font-semibold">Material</th>
                <th className="py-1 pr-2 font-semibold">Gauge</th>
                <th className="py-1 pr-2 font-semibold">Colour</th>
                <th className="py-1 font-semibold w-24">Tag kg</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lot) => (
                <tr key={lot.coilNo} className="border-b border-slate-200">
                  <td className="py-1.5 pr-2 font-mono font-semibold whitespace-nowrap">{lot.coilNo}</td>
                  <td className="py-1.5 pr-2">{lot.materialTypeName || lot.productID || '—'}</td>
                  <td className="py-1.5 pr-2">{lot.gaugeLabel || lot.gauge || '—'}</td>
                  <td className="py-1.5 pr-2">{lot.colour || '—'}</td>
                  <td className="py-1.5">
                    <span className="inline-block h-5 w-full border-b border-slate-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <section className="mb-6">
        <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-700">Found in the yard, not on this list</h2>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-400 text-left">
              <th className="py-1 pr-2 font-semibold">Coil no. / description</th>
              <th className="py-1 font-semibold w-24">Tag kg</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((i) => (
              <tr key={i} className="border-b border-slate-200">
                <td className="py-3 pr-2">
                  <span className="inline-block h-4 w-full border-b border-slate-300" />
                </td>
                <td className="py-3">
                  <span className="inline-block h-4 w-full border-b border-slate-400" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <footer className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2">
        <p className="text-xs">
          Counter
          <span className="mt-6 block border-b border-slate-800" />
          <span className="mt-1 block text-slate-500">Name and signature</span>
        </p>
        <p className="text-xs">
          Checker
          <span className="mt-6 block border-b border-slate-800" />
          <span className="mt-1 block text-slate-500">Name and signature</span>
        </p>
      </footer>
    </article>
  );
}
