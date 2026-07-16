import React, { useState, useRef, useEffect } from 'react';
import { FileText, Wallet, Package, ClipboardList, ChevronDown } from 'lucide-react';

const PROMOTE = [
  { id: 'memo', label: 'Create formal memo', icon: FileText },
  { id: 'expense', label: 'Raise expense', icon: Wallet },
  { id: 'material', label: 'Material request', icon: Package },
  { id: 'work_item', label: 'Create work item', icon: ClipboardList },
];

export const MAX_MESSAGE_LEN = 8000;
const COUNTER_THRESHOLD = 7500;

/**
 * Message composer with Convert-to menu.
 * Text is only cleared after onSend resolves successfully so a failed
 * send never loses the draft.
 */
export default function MessageComposer({
  onSend,
  sending,
  disabled,
  disabledReason,
  onPromote,
  showPromote = true,
  placeholder = 'Message this room…',
}) {
  const [body, setBody] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus?.();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const submit = async () => {
    const text = body.trim();
    if (!text || sending || disabled) return;
    const result = await onSend?.(text);
    // onSend returns false on failure — keep the draft so nothing is lost.
    if (result !== false) {
      setBody('');
    }
    textareaRef.current?.focus?.();
  };

  const remaining = MAX_MESSAGE_LEN - body.length;
  const showCounter = body.length >= COUNTER_THRESHOLD;

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      {disabled && disabledReason ? (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
          {disabledReason}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX_MESSAGE_LEN))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={2}
          maxLength={MAX_MESSAGE_LEN}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Room message"
          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200 disabled:bg-slate-50"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {showPromote && onPromote ? (
            <div className="relative" ref={menuRef}>
              <button
                ref={triggerRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Convert message to ERP record"
                onClick={() => setMenuOpen((o) => !o)}
                disabled={disabled || sending}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Convert to…
                <ChevronDown size={14} aria-hidden />
              </button>
              {menuOpen ? (
                <ul
                  role="menu"
                  aria-label="Convert message options"
                  className="absolute bottom-full left-0 z-20 mb-1 min-w-[12rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                >
                  {PROMOTE.map((p, i) => {
                    const Icon = p.icon;
                    return (
                      <li key={p.id} role="none">
                        <button
                          type="button"
                          role="menuitem"
                          autoFocus={i === 0}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-teal-50 focus-visible:bg-teal-50 focus-visible:outline-none"
                          onClick={() => {
                            setMenuOpen(false);
                            triggerRef.current?.focus?.();
                            onPromote?.(p.id, body.trim());
                          }}
                        >
                          <Icon size={14} aria-hidden />
                          {p.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {showCounter ? (
              <span
                className={`text-xs font-medium ${remaining < 100 ? 'text-red-600' : 'text-slate-500'}`}
                aria-live="polite"
              >
                {remaining} left
              </span>
            ) : null}
            <button
              type="button"
              disabled={!body.trim() || sending || disabled}
              onClick={() => void submit()}
              aria-label={sending ? 'Sending message' : 'Send message'}
              className="rounded-lg bg-teal-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
