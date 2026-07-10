import React, { useMemo, useState } from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { acceptHrPolicy, fetchHrPolicyRequirements } from '../../lib/hrExtended';
import { apiFetch, apiUrl } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ProfilePageBody, ProfilePageIntro } from '../../components/profile/profilePageUi';
import { ProfileFormField } from '../../components/profile/profileFormUi';
import { ProfileInlineAlert, ProfileOverviewSection } from '../../components/profile/profileOverviewUi';
import { ProfileListRow, ProfileStatusChip } from '../../components/profile/profileDesign';

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
    <ProfilePageBody>
      <ProfilePageIntro
        description="Read and sign required policies once. HR stores your typed signature on file."
        actions={
          missing.length ? (
            <ProfileStatusChip variant="pending">{missing.length} to sign</ProfileStatusChip>
          ) : allAccepted ? (
            <ProfileStatusChip variant="approved">All signed</ProfileStatusChip>
          ) : null
        }
      />

      {allAccepted ? (
        <ProfileInlineAlert variant="success">All required policies signed. Thank you.</ProfileInlineAlert>
      ) : missing.length ? (
        <ProfileInlineAlert variant="warning">
          {missing.length} policy/policies still need your signature.
        </ProfileInlineAlert>
      ) : null}

      {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}

      <ProfileOverviewSection title="Read & sign" subtitle="Scroll through all policies, then sign below">
        <ProfileFormField label="Your signature (typed full name)" htmlFor="policy-signature">
          <input
            id="policy-signature"
            className="z-input"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            autoComplete="name"
            enterKeyHint="done"
          />
        </ProfileFormField>

        <div
          className="mt-4 max-h-[min(50dvh,420px)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap custom-scrollbar sm:p-5"
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
          <p className="mt-3 z-meta-text">Scroll to the end of the policy text to enable bulk sign.</p>
        ) : null}

        {missing.length ? (
          <button
            type="button"
            disabled={busy || !signature.trim() || (!scrolledToEnd && missing.length > 1)}
            onClick={acceptAll}
            className="z-btn-primary mt-4 w-full min-h-12 disabled:opacity-50"
          >
            {busy ? 'Recording…' : `I have read and accept all policies (${missing.length})`}
          </button>
        ) : null}
      </ProfileOverviewSection>

      <ProfileOverviewSection title="Individual policy status" subtitle="Download or sign policies one at a time">
        <ul className="space-y-2">
          {policies.map((p) => {
            const isMissing = missingKeys.has(`${p.key}:${p.version}`);
            return (
              <li key={`${p.key}-${p.version}`}>
                <ProfileListRow>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{p.label}</span>
                    <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-400">v{p.version}</span>
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <a
                      href={policyDocumentUrl(p.key)}
                      download={`${p.key}-policy.txt`}
                      className="z-btn-secondary !px-3 !py-1.5 !text-ui-xs uppercase tracking-wide no-underline"
                    >
                      Download
                    </a>
                    {isMissing ? (
                      <button
                        type="button"
                        className="z-btn-primary !px-3 !py-1.5 !text-ui-xs uppercase tracking-wide"
                        disabled={busy}
                        onClick={() => acceptOne(p.key, p.version)}
                      >
                        Sign
                      </button>
                    ) : (
                      <ProfileStatusChip variant="approved">
                        Signed {p.signedAtIso ? String(p.signedAtIso).slice(0, 10) : ''}
                      </ProfileStatusChip>
                    )}
                  </span>
                </ProfileListRow>
              </li>
            );
          })}
        </ul>
      </ProfileOverviewSection>

      {message ? (
        <ProfileInlineAlert variant={messageOk ? 'success' : 'error'}>{message}</ProfileInlineAlert>
      ) : null}
    </ProfilePageBody>
  );
}
