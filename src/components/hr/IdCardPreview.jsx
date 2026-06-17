import React, { useEffect, useState } from 'react';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY } from './hrFormStyles';

export function IdCardPreview({ request, person, onClose, onPrint, temporary = false, showActions = true }) {
  const [issueDate, setIssueDate] = useState('');
  const [fallbackExpiryDate, setFallbackExpiryDate] = useState('');

  useEffect(() => {
    const now = Date.now();
    setIssueDate(new Date(now).toISOString().slice(0, 10));
    setFallbackExpiryDate(new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  }, []);

  const avatarUrl = person?.avatarUrl || request?.avatarUrl;
  const showPhoto =
    avatarUrl && (avatarUrl.startsWith('https://') || avatarUrl.startsWith('data:image/'));
  const displayIssueDate = request?.issueDateIso?.slice(0, 10) || issueDate || '—';
  const displayExpiryDate = request?.expiryDateIso?.slice(0, 10) || fallbackExpiryDate || '—';
  const verifyCode = request?.id?.slice(-8).toUpperCase() || 'VERIFY';

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body > *:not(#id-card-print-root) { display: none !important; }
          #id-card-print-root { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div id="id-card-print-root" className="flex flex-col items-center gap-4">
        <div className="relative w-80 rounded-2xl border-2 border-[#134e4a] bg-white p-6 shadow-xl overflow-hidden">
          {temporary ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.08]">
              <span className="-rotate-12 text-2xl font-black uppercase tracking-widest text-[#134e4a]">Temporary</span>
            </div>
          ) : null}
          <div className="relative text-center space-y-3">
            <div className="text-xs font-black uppercase tracking-widest text-[#134e4a]">Zarewa Aluminium & Plastics Ltd</div>
            {temporary ? (
              <div className="inline-block rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-900">
                Temporary Staff ID
              </div>
            ) : (
              <div className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
                Staff identification
              </div>
            )}
            {showPhoto ? (
              <img src={avatarUrl} alt="" className="mx-auto h-20 w-20 rounded-full border-2 border-slate-200 object-cover" />
            ) : (
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 text-xs text-slate-400">
                Photo
              </div>
            )}
            <div>
              <p className="font-black text-[#134e4a] text-base">{person?.displayName || request?.displayName || '—'}</p>
              <p className="text-xs text-slate-500">{person?.employeeNo || request?.employeeNo || '—'}</p>
              <p className="text-xs text-slate-600 mt-1">{person?.jobTitle || request?.jobTitle || '—'}</p>
              <p className="text-xs text-slate-600">{person?.department || request?.department || '—'}</p>
              <p className="text-xs text-slate-500">{person?.branchId || request?.branchId || '—'}</p>
            </div>
            {(request?.bloodGroup || request?.emergencyContact) && (
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-left text-[10px] text-slate-600 space-y-1">
                {request.bloodGroup ? (
                  <p>
                    <span className="font-bold">Blood group:</span> {request.bloodGroup}
                  </p>
                ) : null}
                {request.emergencyContact ? (
                  <p>
                    <span className="font-bold">Emergency:</span> {request.emergencyContact}
                  </p>
                ) : null}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="rounded-lg bg-slate-50 px-2 py-1">
                <p className="font-bold text-slate-400 uppercase">Issued</p>
                <p className="font-semibold text-slate-700">{displayIssueDate}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1">
                <p className="font-bold text-slate-400 uppercase">Expires</p>
                <p className="font-semibold text-slate-700">{displayExpiryDate}</p>
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 px-2 py-1 text-[9px] font-mono text-slate-500">
              Verification: {verifyCode}
            </div>
            <div className="border-t border-slate-100 pt-2 text-[9px] text-slate-400">
              Authorised signature: ___________________
            </div>
            <p className="text-[9px] text-slate-400">Property of Zarewa Group. If found, please return to HR.</p>
          </div>
        </div>
      </div>
      {showActions ? (
        <div className="flex gap-2 justify-end no-print">
          <button type="button" onClick={onClose} className={HR_BTN_SECONDARY}>
            Close
          </button>
          <button type="button" onClick={onPrint || (() => window.print())} className={HR_BTN_PRIMARY}>
            Print card
          </button>
        </div>
      ) : null}
    </div>
  );
}
