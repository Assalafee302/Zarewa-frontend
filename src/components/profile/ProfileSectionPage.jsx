/**
 * @param {{ title?: string; subtitle?: string; children: import('react').ReactNode }} props
 */
export function ProfileSectionPage({ title, subtitle, children }) {
  return (
    <div className="space-y-5">
      {title ? (
        <header>
          <h2 className="text-lg font-black text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}
