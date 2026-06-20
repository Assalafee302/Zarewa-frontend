import React from 'react';

/**
 * @param {{ staff?: { avatarUrl?: string; displayName?: string; username?: string }; size?: 'sm' | 'md' }} props
 */
export function HrStaffAvatar({ staff, size = 'sm' }) {
  const url = staff?.avatarUrl;
  const safe = url && (url.startsWith('https://') || url.startsWith('data:image/'));
  const initials = (staff?.displayName || staff?.username || '?').slice(0, 1).toUpperCase();
  const dim = size === 'md' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs';

  if (safe) {
    return (
      <img
        src={url}
        alt=""
        className={`${dim} shrink-0 rounded-lg border border-slate-200 object-cover bg-slate-100`}
      />
    );
  }
  return (
    <span
      className={`${dim} inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 font-bold text-slate-500`}
      aria-hidden
    >
      {initials}
    </span>
  );
}
