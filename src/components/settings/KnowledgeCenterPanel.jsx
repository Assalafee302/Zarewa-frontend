import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BookOpen,
  History,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  X,
} from 'lucide-react';
import { ModalFrame } from '../layout';
import { apiFetch } from '../../lib/apiBase';
import { appConfirm } from '../../lib/appConfirm';
import { useToast } from '../../context/ToastContext';
import {
  KNOWLEDGE_MODULE_VALUES,
  KNOWLEDGE_TYPE_REGISTRY,
  listKnowledgeTypeIds,
} from '../../lib/aiKnowledgeCenter/knowledgeTypes';

const STAT_CARDS = [
  { key: 'totalKnowledge', label: 'Total knowledge' },
  { key: 'sopArticles', label: 'SOP articles' },
  { key: 'intentExamples', label: 'Intent examples' },
  { key: 'glossaryTerms', label: 'Glossary terms' },
  { key: 'sqlExamples', label: 'SQL examples' },
  { key: 'conversationExamples', label: 'Conversation examples' },
  { key: 'pendingReview', label: 'Pending review' },
  { key: 'archived', label: 'Archived' },
];

const EMPTY_FORM = {
  knowledgeType: 'sop_article',
  title: '',
  category: 'general',
  module: 'general',
  status: 'active',
  tags: '',
  keywords: '',
  bodyText: '',
  contentJson: '{\n  "answer": ""\n}',
  changeNote: '',
};

function splitCsv(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatTypeLabel(type) {
  return KNOWLEDGE_TYPE_REGISTRY[type]?.label || type;
}

function StatusBadge({ status }) {
  const tones = {
    active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    pending_review: 'bg-amber-50 text-amber-900 border-amber-200',
    archived: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-ui-xs font-bold uppercase tracking-wide ${tones[status] || tones.active}`}
    >
      {String(status || 'active').replace(/_/g, ' ')}
    </span>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value ?? '—'}</p>
    </div>
  );
}

function recordToForm(record) {
  if (!record) return { ...EMPTY_FORM };
  return {
    knowledgeType: record.knowledgeType || 'sop_article',
    title: record.title || '',
    category: record.category || 'general',
    module: record.module || 'general',
    status: record.status || 'active',
    tags: (record.tags || []).join(', '),
    keywords: (record.keywords || []).join(', '),
    bodyText: record.bodyText || '',
    contentJson: JSON.stringify(record.content || {}, null, 2),
    changeNote: '',
  };
}

export function KnowledgeCenterPanel() {
  const { show: showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);
  const [extensions, setExtensions] = useState(null);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [historyRecord, setHistoryRecord] = useState(null);

  const loadStats = useCallback(async () => {
    const { ok, data } = await apiFetch('/api/ai-knowledge-center/stats');
    if (ok && data?.stats) {
      setStats(data.stats);
      setExtensions(data.extensions || null);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterType) params.set('knowledgeType', filterType);
    if (filterCategory) params.set('category', filterCategory);
    if (filterModule) params.set('module', filterModule);
    if (filterStatus) params.set('status', filterStatus);
    if (searchQ.trim()) params.set('q', searchQ.trim());
    if (filterStatus === 'archived') params.set('includeArchived', '1');
    params.set('limit', '100');

    const { ok, data } = await apiFetch(`/api/ai-knowledge-center/records?${params}`);
    if (!ok) throw new Error(data?.error || 'Could not load knowledge records.');
    setRecords(Array.isArray(data.records) ? data.records : []);
    setTotal(Number(data.total) || 0);
  }, [filterCategory, filterModule, filterStatus, filterType, searchQ]);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      await Promise.all([loadStats(), loadRecords()]);
    } catch (e) {
      showToast(String(e?.message || e), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [loadRecords, loadStats, showToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const categories = useMemo(() => {
    const set = new Set(['general']);
    for (const r of records) {
      if (r.category) set.add(r.category);
    }
    return [...set].sort();
  }, [records]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setEditorOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setForm(recordToForm(record));
    setEditorOpen(true);
  };

  const openHistory = async (record) => {
    setHistoryRecord(record);
    setHistoryOpen(true);
    setVersions([]);
    try {
      const { ok, data } = await apiFetch(`/api/ai-knowledge-center/records/${record.id}/versions`);
      if (!ok) throw new Error(data?.error || 'Could not load versions.');
      setVersions(Array.isArray(data.versions) ? data.versions : []);
    } catch (e) {
      showToast(String(e?.message || e), { variant: 'error' });
    }
  };

  const runSearch = async () => {
    if (!searchQ.trim()) {
      await refresh();
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/ai-knowledge-center/search', {
        method: 'POST',
        body: JSON.stringify({ query: searchQ.trim(), mode: 'hybrid', limit: 50 }),
      });
      if (!ok) throw new Error(data?.error || 'Search failed.');
      setRecords(Array.isArray(data.records) ? data.records : []);
      setTotal(Number(data.total) || 0);
      if (data.notice) showToast(data.notice, { variant: 'info' });
    } catch (e) {
      showToast(String(e?.message || e), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const saveRecord = async () => {
    let content;
    try {
      content = JSON.parse(form.contentJson || '{}');
    } catch {
      showToast('Content must be valid JSON.', { variant: 'error' });
      return;
    }

    const payload = {
      knowledgeType: form.knowledgeType,
      title: form.title.trim(),
      category: form.category.trim() || 'general',
      module: form.module,
      status: form.status,
      tags: splitCsv(form.tags),
      keywords: splitCsv(form.keywords),
      bodyText: form.bodyText,
      content,
      changeNote: form.changeNote,
    };

    setBusy(true);
    try {
      if (editing?.id) {
        const { ok, data } = await apiFetch(`/api/ai-knowledge-center/records/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        if (!ok) throw new Error(data?.error || 'Update failed.');
        showToast('Knowledge record updated.');
      } else {
        const { ok, data } = await apiFetch('/api/ai-knowledge-center/records', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (!ok) throw new Error(data?.error || 'Create failed.');
        showToast('Knowledge record created.');
      }
      setEditorOpen(false);
      await refresh();
    } catch (e) {
      showToast(String(e?.message || e), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const archiveRecord = async (record) => {
    if (!(await appConfirm({ title: 'Archive', message: `Archive "${record.title}"?` }))) return;
    setBusy(true);
    try {
      const { ok, data } = await apiFetch(`/api/ai-knowledge-center/records/${record.id}/archive`, {
        method: 'POST',
      });
      if (!ok) throw new Error(data?.error || 'Archive failed.');
      showToast('Record archived.');
      await refresh();
    } catch (e) {
      showToast(String(e?.message || e), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const runReindex = async () => {
    setBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/ai-knowledge-center/reindex', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!ok || !data?.ok) throw new Error(data?.error || 'Reindex failed.');
      showToast(`Reindex complete: ${data.result?.ok ?? 0} indexed.`);
      await refresh();
    } catch (e) {
      showToast(String(e?.message || e), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-teal-700" aria-hidden />
            <h2 className="text-lg font-bold text-slate-900">AI Knowledge Center</h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Centralized knowledge store for Zare AI — SOPs, FAQs, intents, prompts, and evaluation data.
            This does not replace the live Zare help system; it is the foundation for future AI improvements.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={busy ? 'animate-spin' : ''} aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runReindex()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900 hover:bg-teal-100 disabled:opacity-50"
          >
            Reindex embeddings
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-900"
          >
            <Plus size={14} aria-hidden />
            New knowledge
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <StatCard key={card.key} label={card.label} value={stats?.[card.key]} />
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[140px] flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Search</span>
            <div className="mt-1 flex gap-2">
              <input
                className="z-input w-full"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Hybrid search (keyword + semantic)…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void runSearch();
                }}
              />
              <button
                type="button"
                onClick={() => void runSearch()}
                className="z-btn-secondary shrink-0 px-3"
                disabled={busy}
              >
                <Search size={14} aria-hidden />
              </button>
            </div>
          </label>
          <label>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Type</span>
            <select
              className="z-input mt-1 block min-w-[160px]"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All types</option>
              {listKnowledgeTypeIds().map((id) => (
                <option key={id} value={id}>
                  {formatTypeLabel(id)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</span>
            <select
              className="z-input mt-1 block min-w-[140px]"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Module</span>
            <select
              className="z-input mt-1 block min-w-[140px]"
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
            >
              <option value="">All</option>
              {KNOWLEDGE_MODULE_VALUES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</span>
            <select
              className="z-input mt-1 block min-w-[140px]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Active + pending</option>
              <option value="active">Active</option>
              <option value="pending_review">Pending review</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <button type="button" className="z-btn-secondary" disabled={busy} onClick={() => void refresh()}>
            Apply filters
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Showing {records.length} of {total} records · Search: hybrid (40% keyword + 60% semantic) ·
          Embeddings: {extensions?.semanticSearch ? `active (${extensions.embeddingProvider})` : 'pending — reindex or save records'}
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-2 py-2">Title</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Module</th>
                <th className="px-2 py-2">Version</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-8 text-center text-slate-500">
                    {busy ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" /> Loading…
                      </span>
                    ) : (
                      'No knowledge records yet. Create one to get started.'
                    )}
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="px-2 py-2.5">
                      <p className="font-semibold text-slate-900">{r.title}</p>
                      <p className="text-xs text-slate-500">{r.category}</p>
                    </td>
                    <td className="px-2 py-2.5 text-xs text-slate-700">{formatTypeLabel(r.knowledgeType)}</td>
                    <td className="px-2 py-2.5 text-xs text-slate-700">{r.module}</td>
                    <td className="px-2 py-2.5 text-xs text-slate-700">v{r.version}</td>
                    <td className="px-2 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEdit(r)}
                          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                        >
                          <Pencil size={14} aria-hidden />
                        </button>
                        <button
                          type="button"
                          title="Version history"
                          onClick={() => void openHistory(r)}
                          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                        >
                          <History size={14} aria-hidden />
                        </button>
                        {r.status !== 'archived' ? (
                          <button
                            type="button"
                            title="Archive"
                            onClick={() => void archiveRecord(r)}
                            className="rounded-lg p-2 text-rose-700 hover:bg-rose-50"
                          >
                            <Archive size={14} aria-hidden />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ModalFrame isOpen={editorOpen} onClose={() => setEditorOpen(false)} title={editing ? 'Edit knowledge' : 'New knowledge'}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">Title</span>
              <input
                className="z-input mt-1 w-full"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </label>
            <label>
              <span className="text-xs font-semibold text-slate-700">Type</span>
              <select
                className="z-input mt-1 w-full"
                value={form.knowledgeType}
                onChange={(e) => setForm((f) => ({ ...f, knowledgeType: e.target.value }))}
              >
                {listKnowledgeTypeIds().map((id) => (
                  <option key={id} value={id}>
                    {formatTypeLabel(id)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-xs font-semibold text-slate-700">Status</span>
              <select
                className="z-input mt-1 w-full"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="pending_review">Pending review</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-semibold text-slate-700">Category</span>
              <input
                className="z-input mt-1 w-full"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
            </label>
            <label>
              <span className="text-xs font-semibold text-slate-700">Module</span>
              <select
                className="z-input mt-1 w-full"
                value={form.module}
                onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))}
              >
                {KNOWLEDGE_MODULE_VALUES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">Tags (comma-separated)</span>
              <input
                className="z-input mt-1 w-full"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">Keywords (comma-separated)</span>
              <input
                className="z-input mt-1 w-full"
                value={form.keywords}
                onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">Searchable body text</span>
              <textarea
                className="z-input mt-1 w-full min-h-[80px]"
                value={form.bodyText}
                onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">Content (JSON)</span>
              <textarea
                className="z-input mt-1 w-full min-h-[160px] font-mono text-xs"
                value={form.contentJson}
                onChange={(e) => setForm((f) => ({ ...f, contentJson: e.target.value }))}
              />
            </label>
            {editing ? (
              <label className="sm:col-span-2">
                <span className="text-xs font-semibold text-slate-700">Change note</span>
                <input
                  className="z-input mt-1 w-full"
                  value={form.changeNote}
                  onChange={(e) => setForm((f) => ({ ...f, changeNote: e.target.value }))}
                  placeholder="What changed in this version?"
                />
              </label>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" className="z-btn-secondary" onClick={() => setEditorOpen(false)}>
              <X size={14} className="mr-1 inline" aria-hidden />
              Cancel
            </button>
            <button type="button" className="z-btn-primary" disabled={busy} onClick={() => void saveRecord()}>
              <Save size={14} className="mr-1 inline" aria-hidden />
              Save
            </button>
          </div>
        </div>
      </ModalFrame>

      <ModalFrame
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={historyRecord ? `Version history — ${historyRecord.title}` : 'Version history'}
      >
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {versions.length === 0 ? (
            <p className="text-sm text-slate-500">No version history loaded.</p>
          ) : (
            versions.map((v) => (
              <div key={v.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">Version {v.version}</span>
                  <span className="text-xs text-slate-500">{v.changedAt}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {v.changedByName || v.changedBy || 'System'}
                  {v.changeNote ? ` — ${v.changeNote}` : ''}
                </p>
                <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-white p-2 text-xs text-slate-700">
                  {JSON.stringify(v.snapshot, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </ModalFrame>
    </div>
  );
}
