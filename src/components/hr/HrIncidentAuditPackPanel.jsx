import { useCallback, useEffect, useState } from 'react';

import { downloadIncidentAuditPdf, fetchIncidentAuditFull } from '../../lib/hrIncidents';

import { HR_BTN_SECONDARY, HR_BTN_PRIMARY, HR_CARD, HR_MUTED, HR_SECTION_TITLE } from './hrPageUi';



export default function HrIncidentAuditPackPanel({ registryId, caseId }) {

  const [pack, setPack] = useState(null);

  const [busy, setBusy] = useState(false);

  const [err, setErr] = useState('');

  const [msg, setMsg] = useState('');



  const load = useCallback(async () => {

    if (!registryId) return;

    setBusy(true);

    setErr('');

    try {

      const { ok, data } = await fetchIncidentAuditFull(registryId);

      if (!ok || !data?.ok) {

        setErr(data?.error || 'Failed to load audit pack');

        setPack(null);

        return;

      }

      setPack(data.pack || data);

    } catch (e) {

      setErr(e?.message || 'Failed to load audit pack');

    } finally {

      setBusy(false);

    }

  }, [registryId]);



  useEffect(() => {

    load();

  }, [load]);



  const downloadJson = () => {

    if (!pack) return;

    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download = `incident-audit-${registryId || caseId || 'pack'}.json`;

    a.click();

    URL.revokeObjectURL(url);

  };



  const downloadPdf = async () => {

    setMsg('');

    setErr('');

    setBusy(true);

    const r = await downloadIncidentAuditPdf(registryId);

    setBusy(false);

    if (!r.ok) {

      setErr(r.error || 'PDF download failed.');

      return;

    }

    setMsg('Investigation PDF downloaded.');

  };



  if (!registryId) {

    return (

      <div className={HR_CARD}>

        <p className={HR_MUTED}>Link this case to an incident registry entry to view the investigation pack.</p>

      </div>

    );

  }



  return (

    <div className={HR_CARD}>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">

        <div>

          <h3 className={HR_SECTION_TITLE}>Investigation pack</h3>

          <p className={HR_MUTED}>Printable summary for management filing; JSON export for systems audit.</p>

        </div>

        <div className="flex flex-wrap gap-2">

          <button type="button" className={HR_BTN_SECONDARY} onClick={load} disabled={busy}>

            {busy ? 'Loading…' : 'Refresh'}

          </button>

          <button type="button" className={HR_BTN_PRIMARY} onClick={downloadPdf} disabled={busy || !pack}>

            Download PDF

          </button>

          <button type="button" className={HR_BTN_SECONDARY} onClick={downloadJson} disabled={!pack}>

            Download JSON

          </button>

        </div>

      </div>

      {msg ? <p className="text-sm text-emerald-800 mb-2">{msg}</p> : null}

      {err ? <p className="text-red-600 text-sm mb-2">{err}</p> : null}

      {pack ? (

        <pre className="text-xs overflow-auto max-h-96 bg-slate-50 p-3 rounded border border-slate-200">

          {JSON.stringify(pack, null, 2)}

        </pre>

      ) : (

        !busy && <p className={HR_MUTED}>No audit data yet.</p>

      )}

    </div>

  );

}


