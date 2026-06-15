import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { printOfficialNotice } from '../../lib/officialNoticePrint';
import { officeThreadIdFromWorkItem } from '../../lib/officeThreadFromWorkItem';
import { Link } from 'react-router-dom';

export function OfficialNoticesPanel() {
  const [notices, setNotices] = useState([]);
  const { show } = useToast();
  useEffect(() => {
    (async () => {
      const { ok, data } = await apiFetch('/api/official-notices');
      if (ok && data?.ok) setNotices(data.notices || []);
    })();
  }, []);
  const ack = async (id) => {
    const { ok, data } = await apiFetch(`/api/official-notices/${encodeURIComponent(id)}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (ok && data?.ok) show('Acknowledged.', { variant: 'success' });
  };
  return (
    <div className="space-y-3">
      {notices.length === 0 ? (
        <p className="text-sm text-slate-500">No official notices.</p>
      ) : (
        notices.map((n) => (
          <article key={n.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {n.pinned ? <span className="text-[10px] font-bold uppercase text-amber-700">Pinned</span> : null}
            <h3 className="font-semibold text-slate-900">{n.title}</h3>
            <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{n.content}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => printOfficialNotice(n)} className="text-xs font-semibold text-teal-800">
                Print
              </button>
              {n.requiresAcknowledgement ? (
                <button
                  type="button"
                  onClick={() => void ack(n.id)}
                  className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  I have read and understood
                </button>
              ) : null}
            </div>
          </article>
        ))
      )}
    </div>
  );
}

export function OfficeForumPanel({ scope = 'branch', onTurnIntoOfficeRecord }) {
  const ws = useWorkspace();
  const blocksCreate = Boolean(ws?.blocksBranchScopedCreate);
  const [topics, setTopics] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  useEffect(() => {
    (async () => {
      const { ok, data } = await apiFetch(`/api/forum/topics?scope=${scope}`);
      if (ok && data?.ok) setTopics(data.topics || []);
    })();
  }, [scope]);
  const create = async () => {
    const { ok, data } = await apiFetch('/api/forum/topics', {
      method: 'POST',
      body: JSON.stringify({ scope, title, body }),
    });
    if (ok && data?.ok) {
      setTitle('');
      setBody('');
      setTopics((t) => [data.topic, ...t]);
    }
  };
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs text-slate-600">Forum posts are not official records. For approvals use Create Office Record.</p>
        <input className="mt-2 w-full rounded-lg border p-2 text-sm" placeholder="Topic title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="mt-2 w-full rounded-lg border p-2 text-sm" rows={2} placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} />
        <button type="button" onClick={() => void create()} className="mt-2 rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white">
          Post to {scope === 'company' ? 'Company' : 'Branch'} Forum
        </button>
      </div>
      {topics.map((t) => (
        <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="font-semibold text-slate-900">{t.title}</p>
          <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{t.body || t.firstPostBody || ''}</p>
          <p className="text-xs text-slate-500">{t.createdAtIso}</p>
          {scope === 'branch' && onTurnIntoOfficeRecord ? (
            <button
              type="button"
              disabled={blocksCreate}
              title={blocksCreate ? ws?.branchScopedCreateMessage : undefined}
              onClick={() =>
                onTurnIntoOfficeRecord({
                  title: t.title,
                  body: t.body || t.firstPostBody || '',
                })
              }
              className={`mt-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900${
                blocksCreate ? ' cursor-not-allowed opacity-50' : ' hover:bg-teal-100'
              }`}
            >
              Turn into office record
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function FilingPanel({ items }) {
  const needsFiling = items.filter((i) => i.filingIncomplete);
  const filed = items.filter((i) => !i.filingIncomplete && String(i.status || '').toLowerCase() === 'filed');
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-bold text-slate-800">Needs filing</h3>
        <p className="text-xs text-slate-500">{needsFiling.length} record(s)</p>
      </section>
      <section>
        <h3 className="text-sm font-bold text-slate-800">Filed records</h3>
        <p className="text-xs text-slate-500">{filed.length} in view</p>
      </section>
    </div>
  );
}

export function ExpenseConversionsPanel({ items, onOpenItem }) {
  const candidates = items.filter((i) => {
    const tid = officeThreadIdFromWorkItem(i);
    return tid && (i.requiresApproval || String(i.status || '').includes('submitted'));
  });
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">Money-related office records eligible for expense conversion.</p>
      {candidates.length === 0 ? (
        <p className="text-sm text-slate-500">No conversions pending.</p>
      ) : (
        candidates.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenItem?.(item)}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-sm font-semibold hover:border-teal-200"
          >
            {item.title || item.referenceNo}
          </button>
        ))
      )}
    </div>
  );
}

export function DeskMonitoringPanel() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">Branch and workload monitoring.</p>
      <Link to="/workspace/monitoring" className="mt-2 inline-block text-sm font-semibold text-teal-800">
        Open monitoring dashboard
      </Link>
    </div>
  );
}

export function DeskSearchPanel() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">Use workspace search (Ctrl+K) for records, filing numbers, and tasks.</p>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('zarewa:open-command-palette'))}
        className="mt-3 rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white"
      >
        Open search
      </button>
    </div>
  );
}
