import React, { useMemo, useState } from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { acceptHrPolicy, fetchHrPolicyRequirements } from '../../lib/hrExtended';
import { apiFetch, apiUrl } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';

function policyDocumentUrl(key) {
  return apiUrl(`/api/hr/policy-documents/${encodeURIComponent(key)}`);
}

export default function MyProfilePolicies() {
  const ws = useWorkspace();
  const [policies, setPolicies] = useState([]);
  const [missing, setMissing] = useState([]);
  const [allAccepted, setAllAccepted] = useState(false);
  const [signature, setSignature] = useState(ws?.session?.user?.displayName || '');
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [message, setMessage] = useState('');
  const [messageOk, setMessageOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { reload, loading, error } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrPolicyRequirements();
    if (ok && data?.ok) {
      setPolicies(data.required || []);
      setMissing(data.missing || []);
      setAllAccepted(Boolean(data.allAccepted));
      setLoaded(true);
      return { hasData: true };
    }
    setLoaded(true);
    return { error: data?.error || 'Could not load policies.', hasData: false };
  }, []);

  const combinedBody = useMemo(
    () =>
      policies
        .map(
          (p, i) =>
            `${i + 1}. ${p.label} (v${p.version})\n${p.summary ? p.summary + '\n' : ''}${p.body || ''}`
        )
        .join('\n\n—\n\n'),
    [policies]
  );

  const missingKeys = useMemo(() => new Set(missing.map((m) => `${m.key}:${m.version}`)), [missing]);

  const showMessage = (text, ok = true) => {
    setMessage(text);
    setMessageOk(ok);
  };

  const acceptAll = async () => {
    if (!signature.trim()) {
      showMessage('Enter your typed signature first.', false);
      return;
    }
    if (!scrolledToEnd && missing.length) {
      showMessage('Scroll through all policies before signing.', false);
      return;
    }
    setBusy(true);
    setMessage('');
    const toAccept = policies.filter((p) => missingKeys.has(`${p.key}:${p.version}`));
    const { ok, data } = await apiFetch('/api/hr/policy-acknowledgements/batch', {
      method: 'POST',
      body: JSON.stringify({
        signatureName: signature.trim(),
        policies: toAccept.map((p) => ({ policyKey: p.key, policyVersion: p.version })),
      }),
    });
    setBusy(false);
    if (ok && data?.ok) {
      showMessage(`All ${data.count || toAccept.length} policies acknowledged.`);
      setScrolledToEnd(false);
      await reload();
    } else {
      showMessage(data?.error || 'Could not record acknowledgements.', false);
    }
  };

  const acceptOne = async (policyKey, policyVersion) => {
    if (!signature.trim()) {
      showMessage('Enter your typed signature first.', false);
      return;
    }
    setBusy(true);
    const { ok, data } = await acceptHrPolicy({
      policyKey,
      policyVersion,
      signatureName: signature.trim(),
    });
    setBusy(false);
    if (ok && data?.ok) {
      showMessage('Policy acknowledgement recorded.');
      await reload();
    } else {
      showMessage(data?.error || 'Could not record acknowledgement.', false);
    }
  };

  return (
    <div className="space-y-5 pb-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-base font-black text-slate-900 sm:text-sm">Company policies — read & sign once</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600 sm:text-xs">
          All joining policies are combined below. Read the full text, then sign once to acknowledge every outstanding
          policy. HR stores your signature on file.
        </p>
        {allAccepted ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800">
            All required policies signed. Thank you.
          </p>
        ) : (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            {missing.length} policy/policies still need your signature.
          </p>
        )}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
        Your signature (typed full name)
        <input
          className="z-input mt-1.5"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          autoComplete="name"
          enterKeyHint="done"
        />
      </label>

      <div
        className="max-h-[min(50dvh,420px)] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap custom-scrollbar sm:p-5"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 32) setScrolledToEnd(true);
        }}
      >
        {loading && !loaded ? (
          <p className="text-slate-500">Loading policies…</p>
        ) : policies.length === 0 ? (
          <p className="text-slate-500">No policies required for your account.</p>
        ) : (
          combinedBody
        )}
      </div>
      {!scrolledToEnd && missing.length && policies.length ? (
        <p className="text-sm text-slate-500 sm:text-xs">Scroll to the end of the policy text to enable bulk sign.</p>
      ) : null}

      {missing.length ? (
        <button
          type="button"
          disabled={busy || !signature.trim() || (!scrolledToEnd && missing.length > 1)}
          onClick={acceptAll}
          className="z-btn-primary w-full min-h-12 disabled:opacity-50"
        >
          {busy ? 'Recording…' : `I have read and accept all policies (${missing.length})`}
        </button>
      ) : null}

      <details className="rounded-xl border border-slate-100 bg-white p-4">
        <summary className="cursor-pointer min-h-11 flex items-center text-xs font-bold uppercase tracking-wide text-slate-500">
          Individual policy status
        </summary>
        <ul className="mt-3 space-y-3">
          {policies.map((p) => {
            const isMissing = missingKeys.has(`${p.key}:${p.version}`);
            return (
              <li
                key={`${p.key}-${p.version}`}
                className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"
              >
                <p className="text-sm font-semibold text-slate-800">{p.label}</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <a
                    href={policyDocumentUrl(p.key)}
                    download={`${p.key}-policy.txt`}
                    className="z-btn-secondary min-h-10 w-full sm:w-auto text-center no-underline"
                  >
                    Download
                  </a>
                  {isMissing ? (
                    <button
                      type="button"
                      className="z-btn-primary min-h-10 w-full sm:w-auto"
                      disabled={busy}
                      onClick={() => acceptOne(p.key, p.version)}
                    >
                      Sign this policy
                    </button>
                  ) : (
                    <span className="inline-flex min-h-10 items-center text-sm font-bold text-emerald-700">
                      Signed {p.signedAtIso ? String(p.signedAtIso).slice(0, 10) : ''}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </details>

      {message ? (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            messageOk ? 'border border-emerald-100 bg-emerald-50 text-emerald-800' : 'border border-red-100 bg-red-50 text-red-800'
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
