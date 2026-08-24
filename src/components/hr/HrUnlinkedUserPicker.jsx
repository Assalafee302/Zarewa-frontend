import React, { useEffect, useMemo, useState } from 'react';
import { fetchHrUnlinkedUsers } from '../../lib/hrStaff';
import { HR_FIELD_CLASS } from './hrFormStyles';

/**
 * Pick an ERP login that does not yet have an HR staff profile.
 * @param {{
 *   value: string;
 *   onSelect: (user: { userId: string; username: string; displayName: string; roleKey: string; branchId?: string } | null) => void;
 * }} props
 */
export function HrUnlinkedUserPicker({ value, onSelect }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [chosen, setChosen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      const { ok, data } = await fetchHrUnlinkedUsers(query);
      if (cancelled) return;
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load logins without HR profiles.');
        setUsers([]);
      } else {
        setError('');
        setUsers(Array.isArray(data.users) ? data.users : []);
      }
      setLoading(false);
    }, query ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  const options = useMemo(() => {
    const list = [...users];
    if (chosen?.userId && !list.some((u) => u.userId === chosen.userId)) list.unshift(chosen);
    return list;
  }, [users, chosen]);

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-600">
        Existing login
        <input
          className={HR_FIELD_CLASS}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or username"
          autoComplete="off"
        />
      </label>
      <select
        className={HR_FIELD_CLASS}
        value={value}
        required
        onChange={(e) => {
          const id = e.target.value;
          const next = options.find((u) => u.userId === id) || null;
          setChosen(next);
          onSelect(next);
        }}
      >
        <option value="">{loading ? 'Loading logins…' : 'Select a login'}</option>
        {options.map((u) => (
          <option key={u.userId} value={u.userId}>
            {u.displayName || u.username} · {u.username}
            {u.roleLabel ? ` · ${u.roleLabel}` : ''}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {!loading && !error && options.length === 0 ? (
        <p className="text-xs text-slate-500">No active logins are missing an HR profile.</p>
      ) : null}
      <p className="text-xs font-normal text-slate-400">
        Their username and password stay the same. This only opens the employment file on that account.
      </p>
    </div>
  );
}
