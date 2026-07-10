import React, { useEffect, useState } from 'react';
import { HrFormModal } from './HrFormModal';
import { HrButton } from './hrPageUi';
import { HR_FIELD_CLASS } from './hrFormStyles';
import { ORG_RELATIONSHIP_TYPES } from '../../lib/hrOrgChartUi';

/**
 * @param {{
 *   open: boolean;
 *   source: { userId: string; displayName?: string; jobTitle?: string } | null;
 *   target: { userId: string; displayName?: string; jobTitle?: string } | null;
 *   initialType?: string;
 *   busy?: boolean;
 *   error?: string;
 *   onClose: () => void;
 *   onConfirm: (type: string) => void;
 * }} props
 */
export function HrOrgRelationshipModal({
  open,
  source,
  target,
  initialType = 'reports_to',
  busy = false,
  error = '',
  onClose,
  onConfirm,
}) {
  const [relType, setRelType] = useState(initialType);

  useEffect(() => {
    if (open) setRelType(initialType);
  }, [open, initialType]);

  const sourceName = source?.displayName || source?.userId || 'Staff';
  const targetName = target?.displayName || target?.userId || 'Manager';
  const typeMeta = ORG_RELATIONSHIP_TYPES.find((t) => t.id === relType) || ORG_RELATIONSHIP_TYPES[0];

  return (
    <HrFormModal
      isOpen={open}
      onClose={onClose}
      title="Set reporting relationship"
      description="The organogram will update automatically after you save."
      size="md"
      closeDisabled={busy}
      trackUnsaved={false}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {relType === 'remove' ? (
            <p>
              <span className="font-bold text-zarewa-teal">{sourceName}</span> will have no line manager in the
              organogram.
            </p>
          ) : (
            <p>
              <span className="font-bold text-zarewa-teal">{sourceName}</span>
              <span className="text-slate-500"> reports to </span>
              <span className="font-bold text-zarewa-teal">{targetName}</span>
            </p>
          )}
        </div>

        <label className="block text-xs font-semibold text-slate-600">
          Relationship type
          <select
            className={`${HR_FIELD_CLASS} mt-1 w-full`}
            value={relType}
            onChange={(e) => setRelType(e.target.value)}
            disabled={busy}
          >
            {ORG_RELATIONSHIP_TYPES.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === 'reports_to' && !target}>
                {t.label}
              </option>
            ))}
          </select>
          {typeMeta.hint ? <p className="mt-1 text-xs text-slate-500">{typeMeta.hint}</p> : null}
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <HrButton type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </HrButton>
          <HrButton
            type="button"
            disabled={busy || (relType === 'reports_to' && !target)}
            onClick={() => onConfirm(relType)}
          >
            {busy ? 'Saving…' : 'Save relationship'}
          </HrButton>
        </div>
      </div>
    </HrFormModal>
  );
}
