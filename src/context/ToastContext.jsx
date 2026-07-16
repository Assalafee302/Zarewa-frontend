/* eslint-disable react-refresh/only-export-components -- provider + hook */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, Info, AlertCircle, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

const VARIANT = {
  success: { icon: CheckCircle2, bar: 'bg-emerald-500', iconClass: 'text-emerald-600' },
  info: { icon: Info, bar: 'bg-zarewa-teal', iconClass: 'text-zarewa-teal' },
  warning: { icon: AlertTriangle, bar: 'bg-amber-500', iconClass: 'text-amber-600' },
  error: { icon: AlertCircle, bar: 'bg-rose-500', iconClass: 'text-rose-500' },
};

const TOAST_CAP = 6;
const MIN_DURATION_MS = 4200;
const MAX_DURATION_MS = 12_000;

function resolveVariant(opts) {
  const raw = opts.variant ?? opts.type ?? 'success';
  return raw in VARIANT ? raw : 'success';
}

function durationForMessage(message, opts) {
  if (typeof opts.duration === 'number') return opts.duration;
  const len = String(message || '').length;
  const base = Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, 3200 + len * 35));
  // Action toasts stay a bit longer so the CTA remains usable.
  if (opts.action?.label) return Math.min(MAX_DURATION_MS, Math.max(base, 7000));
  return base;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (message, opts = {}) => {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const variant = resolveVariant(opts);
      const action =
        opts.action && typeof opts.action.label === 'string' && opts.action.label.trim()
          ? {
              label: String(opts.action.label).trim(),
              onClick: typeof opts.action.onClick === 'function' ? opts.action.onClick : null,
            }
          : null;
      setToasts((t) => [...t, { id, message, variant, action }].slice(-TOAST_CAP));
      const ms = durationForMessage(message, opts);
      window.setTimeout(() => dismiss(id), ms);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  const hasError = toasts.some((t) => t.variant === 'error');
  const liveMode = hasError ? 'assertive' : 'polite';

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed z-[var(--z-layer-toast)] flex flex-col gap-2 w-[min(100vw-2rem,380px)] pointer-events-none bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]"
        aria-live={liveMode}
        aria-relevant="additions text"
      >
        {toasts.map((t) => {
          const cfg = VARIANT[t.variant] ?? VARIANT.success;
          const Icon = cfg.icon;
          const isError = t.variant === 'error';
          return (
            <div
              key={t.id}
              className="z-toast-item pointer-events-auto flex gap-3 rounded-2xl bg-white border border-gray-100/90 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.35)] overflow-hidden"
              role={isError ? 'alert' : 'status'}
            >
              <div className={`w-1 shrink-0 ${cfg.bar}`} aria-hidden />
              <div className="flex flex-1 items-start gap-3 py-3.5 pl-2 pr-1">
                <Icon className={`shrink-0 mt-0.5 ${cfg.iconClass}`} size={20} strokeWidth={2} />
                <div className="flex-1 min-w-0 pt-0.5 space-y-1.5">
                  <p className="text-[13px] font-medium text-gray-800 leading-snug">{t.message}</p>
                  {t.action?.label && t.action.onClick ? (
                    <button
                      type="button"
                      className="text-[12px] font-semibold text-zarewa-teal hover:underline"
                      onClick={() => {
                        t.action.onClick();
                        dismiss(t.id);
                      }}
                    >
                      {t.action.label}
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

/** Safe for unit tests / shells that may mount without ToastProvider. */
export function useOptionalToast() {
  const ctx = useContext(ToastContext);
  return ctx || { show: () => {}, toasts: [] };
}
