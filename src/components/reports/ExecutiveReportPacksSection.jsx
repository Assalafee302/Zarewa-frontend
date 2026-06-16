import React, { useCallback, useState } from 'react';
import { Calendar, FileText, Loader2, Printer } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';

function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterdayYmd() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return ymdLocal(d);
}

function printPackHtml(title, pack) {
  const rows = [];
  if (pack.attention) {
    rows.push(`<tr><td>Open attention items</td><td>${pack.attention.totalOpen ?? 0}</td></tr>`);
  }
  if (pack.sales) {
    rows.push(`<tr><td>New quotations</td><td>${pack.sales.newQuotationsCount ?? pack.sales.quotationsCount ?? 0}</td></tr>`);
    rows.push(`<tr><td>Receipts (count)</td><td>${pack.sales.receiptsCount ?? 0}</td></tr>`);
    rows.push(`<tr><td>Receipts total</td><td>${formatNgn(pack.sales.receiptsTotalNgn ?? 0)}</td></tr>`);
  }
  if (pack.operations) {
    rows.push(`<tr><td>Refunds requested</td><td>${pack.operations.refundsRequestedCount ?? 0}</td></tr>`);
    rows.push(`<tr><td>Production jobs completed</td><td>${pack.operations.productionJobsCompletedCount ?? 0}</td></tr>`);
  }
  const html = `<!DOCTYPE html><html><head><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px}h1{font-size:18px}table{border-collapse:collapse;width:100%;margin-top:16px}td,th{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f4f4f5}</style></head>
<body><h1>${title}</h1><p>Generated ${pack.generatedAtIso || ''}</p><table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>${rows.join('')}</tbody></table>
${(pack.notes || []).map((n) => `<p style="font-size:12px;color:#555">${n}</p>`).join('')}
</body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

export function ExecutiveReportPacksSection({ showToast }) {
  const [packKind, setPackKind] = useState('daily');
  const [packDate, setPackDate] = useState(yesterdayYmd());
  const [weekEnd, setWeekEnd] = useState(ymdLocal());
  const [loading, setLoading] = useState(false);
  const [pack, setPack] = useState(null);

  const loadPack = useCallback(async () => {
    setLoading(true);
    setPack(null);
    const path =
      packKind === 'daily'
        ? `/api/reports/daily-pack?date=${encodeURIComponent(packDate)}`
        : `/api/reports/weekly-pack?endDate=${encodeURIComponent(weekEnd)}`;
    const { ok, data } = await apiFetch(path);
    setLoading(false);
    if (!ok || !data?.ok) {
      showToast?.(data?.error || 'Could not load executive pack.', { variant: 'error' });
      return;
    }
    setPack(data);
  }, [packKind, packDate, weekEnd, showToast]);

  return (
    <section className="z-soft-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-black text-[#134e4a] tracking-tight flex items-center gap-2">
            <FileText size={18} />
            Executive daily &amp; weekly packs
          </h4>
          <p className="text-xs text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
            MD oversight summaries: attention counts, sales receipts, operations activity, and exception roll-ups.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-bold text-slate-600">
          Pack
          <select
            value={packKind}
            onChange={(e) => setPackKind(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
          >
            <option value="daily">Daily (prior day)</option>
            <option value="weekly">Weekly (7 days)</option>
          </select>
        </label>
        {packKind === 'daily' ? (
          <label className="text-xs font-bold text-slate-600">
            Date
            <input
              type="date"
              value={packDate}
              onChange={(e) => setPackDate(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        ) : (
          <label className="text-xs font-bold text-slate-600">
            Week ending
            <input
              type="date"
              value={weekEnd}
              onChange={(e) => setWeekEnd(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        )}
        <button
          type="button"
          onClick={() => void loadPack()}
          disabled={loading}
          className="z-btn-primary flex items-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
          Load pack
        </button>
        {pack ? (
          <button
            type="button"
            onClick={() =>
              printPackHtml(
                packKind === 'daily' ? `Daily executive pack — ${pack.date}` : `Weekly pack — ${pack.startDate} to ${pack.endDate}`,
                pack
              )
            }
            className="z-btn-secondary flex items-center gap-2"
          >
            <Printer size={16} />
            Print
          </button>
        ) : null}
      </div>

      {pack ? (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-black uppercase text-slate-500">Attention (open)</p>
            <p className="text-2xl font-black text-[#134e4a] tabular-nums">{pack.attention?.totalOpen ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-black uppercase text-slate-500">Receipts</p>
            <p className="text-lg font-black tabular-nums">{pack.sales?.receiptsCount ?? 0}</p>
            <p className="text-xs text-slate-600">{formatNgn(pack.sales?.receiptsTotalNgn ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-black uppercase text-slate-500">
              {packKind === 'daily' ? 'New quotes' : 'Quotes in week'}
            </p>
            <p className="text-2xl font-black tabular-nums">
              {pack.sales?.newQuotationsCount ?? pack.sales?.quotationsCount ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-black uppercase text-slate-500">Production completed</p>
            <p className="text-2xl font-black tabular-nums">
              {pack.operations?.productionJobsCompletedCount ?? pack.production?.jobsCompletedCount ?? 0}
            </p>
          </div>
        </div>
      ) : null}

      {pack?.attention?.topItems?.length ? (
        <div className="mt-4">
          <p className="text-xs font-black uppercase text-slate-500 mb-2">Top attention items</p>
          <ul className="space-y-1 text-xs text-slate-700">
            {pack.attention.topItems.slice(0, 8).map((it) => (
              <li key={it.id} className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
                <span className="font-bold">{it.title}</span> — {it.subtitle}
                {it.reasons?.[0] ? <span className="text-slate-500"> · {it.reasons[0]}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
