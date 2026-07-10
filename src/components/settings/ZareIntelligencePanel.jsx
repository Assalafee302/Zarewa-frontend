import React, { useCallback, useEffect, useState } from 'react';
import { LifeBuoy, RefreshCw, ThumbsDown, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { HELP_BOT_NAME } from '../../lib/helpBotBrand';
import { useToast } from '../../context/ToastContext';

export function ZareIntelligencePanel() {
  const { show: showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [dashboard, setDashboard] = useState(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/help/admin/dashboard?days=30');
      if (!ok || !data?.ok) throw new Error(data?.error || 'Could not load Zare intelligence.');
      setDashboard(data.dashboard || null);
    } catch (e) {
      showToast(String(e?.message || e), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAnalytics = async () => {
    setBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/help/admin/run-analytics', { method: 'POST' });
      if (!ok || !data?.ok) throw new Error(data?.error || 'Analytics job failed.');
      showToast('Zare analytics refresh started.');
      await load();
    } catch (e) {
      showToast(String(e?.message || e), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const d = dashboard || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <LifeBuoy size={20} className="text-teal-700" aria-hidden />
            <h2 className="text-lg font-bold text-slate-900">{HELP_BOT_NAME} intelligence</h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Knowledge gaps, feedback trends, and suggested help articles. Drafts require admin review — nothing
            auto-publishes.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={busy ? 'animate-spin' : ''} aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runAnalytics()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
          >
            Run analytics
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Guide articles" value={d.articleCount ?? '—'} />
        <StatCard label="Queries (30d)" value={d.queryVolume ?? 0} />
        <StatCard
          label="Helpful rate"
          value={d.helpfulRate != null ? `${Math.round(d.helpfulRate * 100)}%` : '—'}
        />
        <StatCard label="Fallback / weak" value={d.fallbackCount ?? 0} />
      </div>

      {Array.isArray(d.knowledgeGaps) && d.knowledgeGaps.length > 0 ? (
        <section className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-950">
            <AlertTriangle size={16} aria-hidden />
            Knowledge gaps
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-amber-950">
            {d.knowledgeGaps.slice(0, 10).map((g, i) => (
              <li key={i} className="rounded-lg bg-white/80 px-3 py-2 border border-amber-100">
                <span className="font-medium">{g.queryText || g.query_text || 'Unknown query'}</span>
                {g.count != null ? (
                  <span className="ml-2 text-xs text-amber-800">×{g.count}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {Array.isArray(d.suggestedArticles) && d.suggestedArticles.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-900">Suggested article drafts (pending)</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {d.suggestedArticles.slice(0, 8).map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-100 px-3 py-2">
                {a.title || a.suggestedTitle || a.id}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {Array.isArray(d.lowHelpfulnessArticles) && d.lowHelpfulnessArticles.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ThumbsDown size={14} aria-hidden />
            Low helpfulness guides
          </h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
            {d.lowHelpfulnessArticles.slice(0, 6).map((a, i) => (
              <li key={i}>{a.articleId || a.id || JSON.stringify(a)}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}
