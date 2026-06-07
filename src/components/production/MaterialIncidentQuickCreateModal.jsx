import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { useToast } from '../../context/ToastContext';

const INCIDENT_TYPES = [
  { id: 'production_error', label: 'Production error / coil scrap' },
  { id: 'supplier_defect', label: 'Supplier defect' },
  { id: 'coil_stain', label: 'Coil stain' },
  { id: 'yard_offcut', label: 'Yard offcut' },
];

/**
 * Phase 11C — quick material incident draft from production monitor.
 */
export function MaterialIncidentQuickCreateModal({ open, onClose, job, onCreated }) {
  const { show: showToast } = useToast();
  const [incidentType, setIncidentType] = useState('production_error');
  const [lengthM, setLengthM] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open || !job) return null;

  const handleSave = async () => {
    const meters = Number(lengthM);
    if (!Number.isFinite(meters) || meters <= 0) {
      showToast('Enter affected metres.', { variant: 'error' });
      return;
    }
    if (!String(reasonText || '').trim()) {
      showToast('Enter a short reason.', { variant: 'error' });
      return;
    }
    setSaving(true);
    const payload = {
      incidentType,
      productionJobId: job.jobID || job.job_id,
      quotationRef: job.quotationRef || job.quotation_ref || '',
      cuttingListRef: job.cuttingListRef || job.cutting_list_ref || '',
      gaugeLabel: job.gaugeLabel || job.gauge_label || job.gauge || '',
      colour: job.colour || job.color || '',
      productId: job.productID || job.product_id || '',
      reasonText: reasonText.trim(),
      dateISO: new Date().toISOString().slice(0, 10),
      lines: [{ lengthM: meters, quantity: 1, conditionNote: reasonText.trim() }],
    };
    const { ok, data } = await apiFetch('/api/material-incidents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not create incident.', { variant: 'error' });
      return;
    }
    const id = data.id || data.incident?.id;
    showToast(`Material incident ${id || ''} saved as draft.`);
    onCreated?.(id);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <h3 className="text-sm font-black text-[#134e4a]">Report material issue</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3 p-4 text-xs">
          <p className="text-slate-600">
            Job <span className="font-mono font-bold">{job.jobID}</span>
            {job.quotationRef ? (
              <>
                {' '}
                · Quote <span className="font-mono">{job.quotationRef}</span>
              </>
            ) : null}
          </p>
          <label className="block">
            <span className="text-[10px] font-bold uppercase text-slate-500">Type</span>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-semibold text-[#134e4a]"
            >
              {INCIDENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase text-slate-500">Affected metres</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={lengthM}
              onChange={(e) => setLengthM(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-semibold text-[#134e4a]"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase text-slate-500">Reason</span>
            <textarea
              rows={3}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="What happened on the line?"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 resize-none"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-[10px] font-bold uppercase text-slate-500">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-lg bg-[#134e4a] px-4 py-2 text-[10px] font-bold uppercase text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save draft'}
          </button>
        </div>
      </div>
    </div>
  );
}
