import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../Data/mockData';

function previousPeriod(startIso, endIso) {
  const s = new Date(`${startIso}T12:00:00`);
  const e = new Date(`${endIso}T12:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return null;
  const lenDays = Math.round((e - s) / (24 * 3600 * 1000));
  const pe = new Date(s);
  pe.setDate(pe.getDate() - 1);
  const ps = new Date(pe);
  ps.setDate(ps.getDate() - lenDays);
  const z = (d) => d.toISOString().slice(0, 10);
  return { startDate: z(ps), endDate: z(pe) };
}

function glBranchQuery(branchId) {
  const bid = String(branchId || '').trim();
  if (!bid) return '';
  return `&branchId=${encodeURIComponent(bid)}`;
}

/**
 * Pilot GL surface: cost-center-scoped trial balance, prior-period comparison, activity drill-down.
 */
export function ReportsGlPilotSection({ startDate, endDate, hasFinanceView, showToast, branchId = '' }) {
  const [costCenter, setCostCenter] = useState('');
  const [loading, setLoading] = useState(false);
  const [tbCur, setTbCur] = useState(null);
  const [tbPrev, setTbPrev] = useState(null);
  const [activity, setActivity] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('');

  const prevPeriod = useMemo(() => previousPeriod(startDate, endDate), [startDate, endDate]);

  const load = useCallback(async () => {
    if (!hasFinanceView) return;
    setLoading(true);
    try {
      const cc = costCenter.trim();
      const ccQ = cc ? `&costCenter=${encodeURIComponent(cc)}` : '';
      const bQ = glBranchQuery(branchId);
      const q = `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}${ccQ}${bQ}`;
      const curRes = await apiFetch(`/api/gl/trial-balance?${q}`);
      if (!curRes.ok || !curRes.data?.ok) {
        showToast(curRes.data?.error || 'Could not load trial balance.', { variant: 'error' });
        setTbCur(null);
        setTbPrev(null);
        setActivity(null);
        return;
      }
      setTbCur(curRes.data);
      let prevBody = null;
      if (prevPeriod) {
        const pq = `startDate=${encodeURIComponent(prevPeriod.startDate)}&endDate=${encodeURIComponent(prevPeriod.endDate)}${ccQ}`;
        const pRes = await apiFetch(`/api/gl/trial-balance?${pq}`);
        if (pRes.ok && pRes.data?.ok) prevBody = pRes.data;
      }
      setTbPrev(prevBody);
      const actQ = `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}${ccQ}`;
      const aRes = await apiFetch(`/api/gl/activity?${actQ}`);
      if (aRes.ok && aRes.data?.ok) {
        setActivity(aRes.data);
      } else {
        setActivity(null);
      }
      setSelectedAccount('');
    } finally {
      setLoading(false);
    }
  }, [branchId, costCenter, endDate, hasFinanceView, prevPeriod, showToast, startDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const prevByCode = useMemo(() => {
    const m = new Map();
    for (const r of tbPrev?.rows || []) {
      m.set(String(r.accountCode || '').trim(), Number(r.netNgn) || 0);
    }
    return m;
  }, [tbPrev]);

  const activityForAccount = useMemo(() => {
    const lines = activity?.lines || [];
    if (!selectedAccount) return [];
    return lines.filter((l) => String(l.accountCode || '').trim() === selectedAccount);
  }, [activity, selectedAccount]);

  if (!hasFinanceView) return null;

  return (
    <div id="reports-gl-pilot" className="z-panel-section border border-teal-100/80 bg-white/90 p-5 sm:p-6 rounded-2xl shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="z-section-title !mb-1">GL pilot — trial balance &amp; drill-down</h3>
          <p className="text-sm font-medium text-slate-600 max-w-2xl leading-relaxed">
            Uses the same period as above. Optional <span className="font-semibold">cost center</span> tag filters the
            trial balance and activity to manual journal lines carrying that tag (nullable dimension / Track F).
          </p>
        </div>
        <Link
          to="/accounts"
          state={{ accountsTab: 'audit' }}
          className="text-[11px] font-black uppercase tracking-wide text-teal-800 underline-offset-2 hover:underline shrink-0"
        >
          Post manual journal → Accounts / Audit
        </Link>
      </div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="min-w-[10rem]">
          <label className="z-field-label" htmlFor="gl-cc-filter">
            Cost center (optional)
          </label>
          <input
            id="gl-cc-filter"
            className="z-input"
            value={costCenter}
            onChange={(e) => setCostCenter(e.target.value)}
            placeholder="e.g. BRANCH-A"
            maxLength={64}
          />
        </div>
        <button type="button" className="z-btn-secondary !text-[11px]" onClick={() => void load()} disabled={loading}>
          {loading ? 'Loading…' : 'Reload GL pilot'}
        </button>
      </div>
      {prevPeriod ? (
        <p className="text-xs text-slate-500 mb-3">
          Compare column uses the immediately preceding window of equal length:{' '}
          <span className="font-mono">
            {prevPeriod.startDate} → {prevPeriod.endDate}
          </span>
          .
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2 text-right">Net (period)</th>
              {tbPrev ? <th className="px-3 py-2 text-right">Net (prior)</th> : null}
              {tbPrev ? <th className="px-3 py-2 text-right">Δ</th> : null}
              <th className="px-3 py-2 w-24">Drill</th>
            </tr>
          </thead>
          <tbody>
            {(tbCur?.rows || []).length === 0 ? (
              <tr>
                <td colSpan={tbPrev ? 5 : 3} className="px-3 py-6 text-center text-slate-500 font-medium">
                  No GL rows for this range{costCenter.trim() ? ' and cost center filter' : ''}.
                </td>
              </tr>
            ) : (
              (tbCur?.rows || []).map((r) => {
                const code = String(r.accountCode || '').trim();
                const prevNet = tbPrev ? prevByCode.get(code) ?? 0 : null;
                const curNet = Number(r.netNgn) || 0;
                const delta = tbPrev ? curNet - prevNet : null;
                const active = selectedAccount === code;
                return (
                  <tr key={code || r.accountName} className={active ? 'bg-teal-50/60' : 'hover:bg-slate-50/80'}>
                    <td className="px-3 py-2 font-semibold text-slate-800">
                      <span className="font-mono text-[11px]">{code}</span>
                      <span className="text-slate-500 font-normal"> — {r.accountName}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-[#134e4a]">
                      {formatNgn(curNet)}
                    </td>
                    {tbPrev ? (
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">{formatNgn(prevNet)}</td>
                    ) : null}
                    {tbPrev ? (
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatNgn(delta)}</td>
                    ) : null}
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-[10px] font-black uppercase tracking-wide text-teal-800 underline-offset-2 hover:underline"
                        onClick={() => setSelectedAccount(active ? '' : code)}
                      >
                        {active ? 'Clear' : 'Lines'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedAccount ? (
        <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <h4 className="text-[10px] font-black uppercase tracking-wide text-slate-500 mb-2">
            Activity — {selectedAccount}
          </h4>
          {activityForAccount.length === 0 ? (
            <p className="text-xs text-slate-500">No lines in range for this account.</p>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto text-[11px]">
              {activityForAccount.map((l, idx) => (
                <li
                  key={`${l.journalId}-${idx}`}
                  className="flex flex-wrap justify-between gap-2 rounded-lg border border-white bg-white/80 px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#134e4a] truncate">{l.journalId}</p>
                    <p className="text-[10px] text-slate-500">
                      {l.entryDateISO}
                      {l.costCenter ? ` · CC: ${l.costCenter}` : ''}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-2">{l.lineMemo || l.journalMemo || '—'}</p>
                  </div>
                  <div className="text-right tabular-nums shrink-0">
                    <p className="font-black text-slate-800">{formatNgn(Number(l.debitNgn) || 0)} DR</p>
                    <p className="font-black text-slate-600">{formatNgn(Number(l.creditNgn) || 0)} CR</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
