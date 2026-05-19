import React from 'react';

export function IntelPanel({ title, hint, children, className = '' }) {
  return (
    <section
      className={`flex min-h-[min(42vh,360px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <header className="shrink-0 border-b border-slate-100 bg-slate-50/90 px-3 py-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#134e4a]">{title}</h4>
        {hint ? <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{hint}</p> : null}
      </header>
      <div className="custom-scrollbar flex-1 overflow-y-auto p-3 text-[11px] text-slate-800">{children}</div>
    </section>
  );
}

export function IntelStat({ label, value, accent }) {
  return (
    <div
      className={`rounded-lg border px-2 py-1.5 ${accent ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-slate-50/80'}`}
    >
      <p className="text-[8px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

export function IntelDetailRow({ label, value, mono }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 border-b border-slate-100 py-1.5 last:border-0">
      <span className="shrink-0 text-[10px] font-semibold text-slate-500">{label}</span>
      <span className={`min-w-0 text-right text-[11px] font-medium text-slate-900 ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}
