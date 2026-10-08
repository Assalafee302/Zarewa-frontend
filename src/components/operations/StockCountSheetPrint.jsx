import React from 'react';

const STORE_FOOTER = 'Counted by ____  Checked by ____  Date/time ____';
const MANAGER_FOOTER = 'Do not give this sheet to the store';

function asAtLabel(asAtIso) {
  if (!asAtIso) return '';
  try {
    return new Date(asAtIso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(asAtIso).slice(0, 16).replace('T', ' ');
  }
}

function SignatureFooter({ text }) {
  return (
    <footer className="mt-6 border-t border-slate-400 pt-3 text-[12px] leading-relaxed text-slate-800">
      <p className="font-medium">{text}</p>
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <p>
          Counter
          <span className="mt-6 block border-b border-slate-800" />
          <span className="mt-1 block text-[11px] text-slate-500">Name and signature</span>
        </p>
        <p>
          Checker
          <span className="mt-6 block border-b border-slate-800" />
          <span className="mt-1 block text-[11px] text-slate-500">Name and signature</span>
        </p>
      </div>
    </footer>
  );
}

/**
 * Large A4 physical count sheet. Store copy omits ERP quantities; manager copy includes them.
 */
export function StockCountSheetPrint({ pack, variant = 'store' }) {
  if (!pack) return null;
  const isManager = variant === 'manager';
  const branch = `${pack.branchName || pack.branchId} (${pack.branchId})`;
  const when = asAtLabel(pack.asAtIso);

  return (
    <article
      className="report-print-root report-print-a4-portrait bg-white p-4 text-slate-900"
      data-screen="stock-count-sheet"
      data-variant={variant}
      style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '12pt' }}
    >
      <header className="mb-4 border-b border-slate-400 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {isManager ? 'Manager copy — ERP vs count' : 'Physical stock count — store copy'}
        </p>
        <h1 className="text-lg font-bold text-zarewa-teal">{branch}</h1>
        <p className="text-[12px] text-slate-600">As at {when || '_______________'}</p>
        {isManager ? (
          <p className="mt-1 text-[11px] font-semibold text-red-700">{MANAGER_FOOTER}</p>
        ) : (
          <p className="mt-1 text-[11px] text-slate-500">ERP quantities are hidden on this sheet.</p>
        )}
      </header>

      {isManager ? (
        <section className="mb-6">
          <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-700">
            All lines (coils + accessories & stone)
          </h2>
          <table className="w-full border-collapse" style={{ fontSize: '12pt' }}>
            <thead>
              <tr className="border-b-2 border-slate-500 text-left">
                <th className="py-1.5 pr-2 font-semibold">Section</th>
                <th className="py-1.5 pr-2 font-semibold">No</th>
                <th className="py-1.5 pr-2 font-semibold">Coil no. / Item</th>
                <th className="py-1.5 pr-2 font-semibold">Colour</th>
                <th className="py-1.5 pr-2 font-semibold">Gauge / Count unit</th>
                <th className="py-1.5 pr-2 font-semibold w-16">Present?</th>
                <th className="py-1.5 pr-2 font-semibold w-20">Counted</th>
                <th className="py-1.5 pr-2 font-semibold w-16">ERP</th>
                <th className="py-1.5 font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {(pack.managerRows || []).map((row) => (
                <tr key={`${row.section}-${row.no}-${row.item}`} className="border-b border-slate-300" style={{ height: '22px' }}>
                  <td className="py-1.5 pr-2 whitespace-nowrap">{row.section}</td>
                  <td className="py-1.5 pr-2 text-center">{row.no}</td>
                  <td className="py-1.5 pr-2 font-semibold">{row.item}</td>
                  <td className="py-1.5 pr-2">{row.colour || '—'}</td>
                  <td className="py-1.5 pr-2">{row.unit || '—'}</td>
                  <td className="py-1.5 pr-2">
                    <span className="inline-block h-5 w-full border-b border-slate-400" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <span className="inline-block h-5 w-full border-b border-slate-400" />
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums font-mono">{row.erp ?? '—'}</td>
                  <td className="py-1.5 text-[11px] text-slate-600">{row.remarks || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <SignatureFooter text={pack.managerFooter || MANAGER_FOOTER} />
        </section>
      ) : (
        <>
          <section className="mb-6 break-inside-avoid">
            <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-700">
              Count – Coils ({(pack.coils || []).length})
            </h2>
            <table className="w-full border-collapse" style={{ fontSize: '12pt' }}>
              <thead>
                <tr className="border-b-2 border-slate-500 text-left">
                  <th className="py-1.5 pr-2 font-semibold w-10">No</th>
                  <th className="py-1.5 pr-2 font-semibold">Coil no.</th>
                  <th className="py-1.5 pr-2 font-semibold">Colour</th>
                  <th className="py-1.5 pr-2 font-semibold">Gauge</th>
                  <th className="py-1.5 pr-2 font-semibold w-20">Present? (✓/✗)</th>
                  <th className="py-1.5 pr-2 font-semibold w-20">Kg on tag</th>
                  <th className="py-1.5 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {(pack.coils || []).map((row) => (
                  <tr key={row.coilNo} className="border-b border-slate-300" style={{ height: '22px' }}>
                    <td className="py-1.5 pr-2 text-center">{row.no}</td>
                    <td className="py-1.5 pr-2 font-mono font-semibold whitespace-nowrap">{row.coilNo}</td>
                    <td className="py-1.5 pr-2">{row.colour || '—'}</td>
                    <td className="py-1.5 pr-2">{row.gaugeLabel || '—'}</td>
                    <td className="py-1.5 pr-2">
                      <span className="inline-block h-5 w-full border-b border-slate-400" />
                    </td>
                    <td className="py-1.5 pr-2">
                      <span className="inline-block h-5 w-full border-b border-slate-400" />
                    </td>
                    <td className="py-1.5">
                      <span className="inline-block h-5 w-full border-b border-slate-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-700">
              Count – Accessories & Stone ({(pack.accessoriesStone || []).length})
            </h2>
            <table className="w-full border-collapse" style={{ fontSize: '12pt' }}>
              <thead>
                <tr className="border-b-2 border-slate-500 text-left">
                  <th className="py-1.5 pr-2 font-semibold w-10">No</th>
                  <th className="py-1.5 pr-2 font-semibold">Item</th>
                  <th className="py-1.5 pr-2 font-semibold">Count unit</th>
                  <th className="py-1.5 pr-2 font-semibold w-24">Counted qty</th>
                  <th className="py-1.5 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {(pack.accessoriesStone || []).map((row) => (
                  <tr key={row.productId} className="border-b border-slate-300" style={{ height: '22px' }}>
                    <td className="py-1.5 pr-2 text-center">{row.no}</td>
                    <td className="py-1.5 pr-2 font-semibold">{row.item}</td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{row.countUnit}</td>
                    <td className="py-1.5 pr-2">
                      <span className="inline-block h-5 w-full border-b border-slate-400" />
                    </td>
                    <td className="py-1.5">
                      <span className="inline-block h-5 w-full border-b border-slate-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <SignatureFooter text={pack.footer || STORE_FOOTER} />
          </section>
        </>
      )}
    </article>
  );
}
