import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AtSign, Mail, Shield } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { composeLegalDisplayName } from '../../lib/hrLegalDisplayName';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';

function MetaPill({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/95 ring-1 ring-white/20">
      {Icon ? <Icon size={12} className="shrink-0 opacity-80" aria-hidden /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function AccountSettingsHero() {
  const ws = useWorkspace();
  const { hr, user: hrUser } = useUserProfile();
  const sessionUser = ws?.session?.user;
  const user = hrUser || sessionUser;

  const legalName = useMemo(() => {
    const personal = hr?.profileExtra?.personal || {};
    return composeLegalDisplayName(personal) || user?.displayName || '—';
  }, [hr?.profileExtra?.personal, user?.displayName]);

  const avatarUrl = user?.avatarUrl;
  const showAvatar = avatarUrl && (avatarUrl.startsWith('https://') || avatarUrl.startsWith('data:image/'));
  const initials = legalName
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zarewa-teal via-[#0f5c55] to-zarewa-teal p-5 text-white shadow-lg shadow-teal-950/10 sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        {showAvatar ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-2xl border-2 border-white/30 object-cover shadow-md"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/10 text-lg font-black shadow-md">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-ui-xs font-bold uppercase tracking-[0.14em] text-teal-100/90">Account & security</p>
          <h2 className="mt-1 truncate text-xl font-black tracking-tight sm:text-2xl">{legalName}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {user?.username ? <MetaPill icon={AtSign}>@{user.username}</MetaPill> : null}
            {user?.email ? <MetaPill icon={Mail}>{user.email}</MetaPill> : null}
            {user?.roleLabel ? <MetaPill icon={Shield}>{user.roleLabel}</MetaPill> : null}
          </div>
        </div>
        {hr ? (
          <Link
            to={`${HR_SELF_SERVICE_PATH.employment}?form=1`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-white/15 px-4 py-2.5 text-xs font-bold text-white no-underline ring-1 ring-white/25 transition hover:bg-white/25"
          >
            HR employment record
          </Link>
        ) : null}
      </div>
    </div>
  );
}
