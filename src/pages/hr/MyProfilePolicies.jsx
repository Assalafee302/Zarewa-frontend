import React, { useState } from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { acceptHrPolicy, fetchHrPolicyRequirements } from '../../lib/hrExtended';
import { useWorkspace } from '../../context/WorkspaceContext';

export default function MyProfilePolicies() {
  const ws = useWorkspace();
  const [required, setRequired] = useState([]);
  const [missing, setMissing] = useState([]);
  const [signature, setSignature] = useState(ws?.session?.user?.displayName || '');
  const [message, setMessage] = useState('');

  const { reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrPolicyRequirements();
    if (ok && data?.ok) {
      setRequired(data.required || []);
      setMissing(data.missing || []);
    }
    return { hasData: true };
  }, []);

  const accept = async (policyKey, policyVersion) => {
    const { ok, data } = await acceptHrPolicy({
      policyKey,
      policyVersion,
      signatureName: signature.trim(),
    });
    if (ok && data?.ok) {
      setMessage('Policy acknowledgement recorded.');
      await reload();
    } else {
      setMessage(data?.error || 'Could not record acknowledgement.');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Employee handbook, confidentiality, IT security, data protection, code of conduct, and related policies.
        Signed acknowledgements are stored on your HR file.
      </p>
      <label className="text-xs font-semibold text-slate-600 block max-w-md">
        Signature (typed name)
        <input
          className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
        />
      </label>
      <ul className="space-y-3">
        {required.map((p) => {
          const missingEntry = missing.find((m) => m.key === p.key && m.version === p.version);
          const isMissing = Boolean(missingEntry);
          const ack = p.acknowledgement || p.signedAtIso;
          return (
            <li key={`${p.key}-${p.version}`} className="rounded-xl border border-slate-100 bg-white px-4 py-3 flex justify-between items-center gap-4">
              <div>
                <p className="font-semibold text-slate-900">{p.label || p.title || p.key}</p>
                <p className="text-xs text-slate-500">
                  {p.key} v{p.version}
                  {ack ? ` · Signed ${String(ack).slice(0, 10)}` : ''}
                  {p.expiresAtIso ? ` · Renews ${p.expiresAtIso.slice(0, 10)}` : ''}
                </p>
              </div>
              {isMissing ? (
                <button
                  type="button"
                  onClick={() => accept(p.key, p.version)}
                  className="rounded-lg bg-[#134e4a] px-3 py-1.5 text-xs font-bold text-white"
                >
                  I acknowledge
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-700">Accepted</span>
              )}
            </li>
          );
        })}
      </ul>
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
    </div>
  );
}
