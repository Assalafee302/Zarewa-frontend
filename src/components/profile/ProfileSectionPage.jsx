/**
 * @param {{ title?: string; subtitle?: string; children: import('react').ReactNode }} props
 */
export function ProfileSectionPage({ title = 'Account & security', subtitle, children }) {
  return (
    <div className="space-y-6">
      {title || subtitle ? (
        <header className="border-b border-slate-100 pb-4">
          {title ? <h2 className="z-page-title text-[#134e4a]">{title}</h2> : null}
          {subtitle ? <p className="z-page-subtitle">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}
