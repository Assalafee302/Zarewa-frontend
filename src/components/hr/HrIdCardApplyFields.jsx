import React from 'react';
import { Link } from 'react-router-dom';
import { HR_FIELD_CLASS } from './hrFormStyles';
import { HR_BLOOD_GROUPS } from '../../lib/hrStaffFormMeta';
import {
  ID_CARD_REPLACEMENT_REASONS,
  ID_CARD_REQUEST_TYPES,
  isLostCardReason,
  isLostDamagedReason,
  requiresLostCardAck,
} from '../../lib/hrIdCardForm';

/**
 * @param {object} props
 * @param {object} props.form
 * @param {(fn: (prev: object) => object) => void} props.setForm
 * @param {string} [props.fieldClass]
 * @param {{ message: string; to: string; linkLabel: string }[]} [props.profileWarnings]
 * @param {boolean} [props.showProfileBanner]
 * @param {boolean} [props.showStaffSelect]
 * @param {{ userId: string; displayName?: string }[]} [props.staffOptions]
 * @param {string} [props.targetUserId]
 * @param {(userId: string) => void} [props.onTargetUserIdChange]
 */
export function HrIdCardApplyFields({
  form,
  setForm,
  fieldClass = HR_FIELD_CLASS,
  profileWarnings = [],
  showProfileBanner = false,
  showStaffSelect = false,
  staffOptions = [],
  targetUserId = '',
  onTargetUserIdChange,
}) {
  return (
    <>
      {showStaffSelect ? (
        <label className="text-xs font-semibold text-slate-600 block">
          Employee
          <select
            className={fieldClass}
            value={targetUserId}
            onChange={(e) => onTargetUserIdChange?.(e.target.value)}
            required
          >
            <option value="">Select employee…</option>
            {staffOptions.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.displayName || s.userId}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {showProfileBanner ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600 space-y-2">
          <p>
            Name, job title, employee number, and photo are taken from the staff profile. Resolve any items below before
            submitting.
          </p>
          {profileWarnings.length > 0 ? (
            <ul className="space-y-1.5">
              {profileWarnings.map((w) => (
                <li key={w.message} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-amber-900">
                  <span>{w.message}</span>
                  <Link to={w.to} className="font-semibold text-zarewa-teal hover:underline">
                    {w.linkLabel}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-semibold text-emerald-800">Profile looks ready for ID card printing.</p>
          )}
        </div>
      ) : null}

      <label className="text-xs font-semibold text-slate-600 block">
        Request type
        <select
          value={form.requestType}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              requestType: e.target.value,
              reason: e.target.value === 'replacement' ? f.reason : '',
              lostDamaged: e.target.value === 'replacement' ? f.lostDamaged : false,
              lostCardAcknowledged: false,
            }))
          }
          className={fieldClass}
          required
        >
          {ID_CARD_REQUEST_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      {form.requestType === 'replacement' ? (
        <label className="text-xs font-semibold text-slate-600 block">
          Reason for replacement
          <select
            value={form.reason}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                reason: e.target.value,
                lostDamaged: isLostDamagedReason(e.target.value),
                lostCardAcknowledged: isLostCardReason(e.target.value) ? f.lostCardAcknowledged : false,
              }))
            }
            className={fieldClass}
            required
          >
            {ID_CARD_REPLACEMENT_REASONS.map((r) => (
              <option key={r.value || 'none'} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {requiresLostCardAck(form) ? (
        <label className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-xs text-amber-950">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={Boolean(form.lostCardAcknowledged)}
            onChange={(e) => setForm((f) => ({ ...f, lostCardAcknowledged: e.target.checked }))}
            required
          />
          <span>
            I confirm the previous ID card is lost or stolen. I understand a replacement fee may apply per company
            policy and that misuse of a lost card remains my responsibility until HR deactivates it.
          </span>
        </label>
      ) : null}

      <label className="text-xs font-semibold text-slate-600 block">
        Blood group (optional)
        <select
          value={form.bloodGroup}
          onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))}
          className={fieldClass}
        >
          {HR_BLOOD_GROUPS.map((b) => (
            <option key={b.value || 'none'} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-semibold text-slate-600 block">
        Emergency contact (optional)
        <input
          value={form.emergencyContact}
          onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))}
          className={fieldClass}
          placeholder="Name and phone"
        />
      </label>

      <label className="text-xs font-semibold text-slate-600 block">
        Additional notes (optional)
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className={`${fieldClass} min-h-[72px]`}
          placeholder="Any extra details HR should know…"
        />
      </label>
    </>
  );
}
