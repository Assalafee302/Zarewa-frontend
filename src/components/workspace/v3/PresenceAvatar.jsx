import React from 'react';

/**
 * Presence avatar with online/away/busy/offline dot.
 */
export default function PresenceAvatar({ displayName, status = 'offline', size = 32 }) {
  const initial = String(displayName || '?')
    .trim()
    .charAt(0)
    .toUpperCase();
  // Four-color palette: green online, amber away, red busy, slate offline.
  const dot =
    status === 'online'
      ? 'bg-green-500'
      : status === 'away'
        ? 'bg-amber-400'
        : status === 'busy'
          ? 'bg-red-500'
          : 'bg-slate-300';

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        className="flex h-full w-full items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-900"
        aria-hidden
      >
        {initial}
      </span>
      <span
        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${dot}`}
        title={status}
      />
      <span className="sr-only">{displayName} ({status})</span>
    </span>
  );
}
