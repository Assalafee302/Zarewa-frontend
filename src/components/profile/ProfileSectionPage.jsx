/**
 * @param {{ title?: string; subtitle?: string; children: import('react').ReactNode }} props
 */
export function ProfileSectionPage({ title = 'Account & security', subtitle, children }) {
  return (
    <div className="space-y-6">
      <header className="border-b border-slate-100 pb-5">
        <h2 className="text-lg font-bold text-[#134e4a]">{title}</h2>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{subtitle}</p> : null}
      </header>
      {children}
    </div>
  );
}
