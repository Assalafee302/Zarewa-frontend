import React from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { fetchHrLetters } from '../../lib/hrExtended';

export default function MyProfileDocuments() {
  const [letters, setLetters] = React.useState([]);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrLetters();
    if (!ok || !data?.ok) {
      setLetters([]);
      return { error: data?.error || 'Could not load documents.', hasData: false };
    }
    setLetters(data.letters || []);
    return { hasData: true };
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Employment letters issued to you by HQ HR.</p>
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {letters.map((l) => (
        <article key={l.id} className="rounded-xl border border-slate-100 bg-white p-4">
          <p className="text-[10px] font-black uppercase text-slate-400">
            {l.letterKind} · {l.issuedAtIso?.slice(0, 10)}
          </p>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{l.contentText}</pre>
        </article>
      ))}
      {!loading && !letters.length ? <p className="text-sm text-slate-500">No letters on file.</p> : null}
    </div>
  );
}
