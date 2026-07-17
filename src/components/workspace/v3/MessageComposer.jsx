import React, { useState, useRef, useEffect } from 'react';
import { FileText, Wallet, Package, ClipboardList, ChevronDown, Paperclip, X, Loader2 } from 'lucide-react';

const PROMOTE = [
  { id: 'memo', label: 'Create formal memo', icon: FileText, profiles: ['staff', 'branch', 'office', 'executive'] },
  { id: 'expense', label: 'Raise expense', icon: Wallet, profiles: ['staff', 'branch', 'office', 'executive'] },
  { id: 'material', label: 'Material request', icon: Package, profiles: ['staff', 'branch', 'office'] },
  { id: 'work_item', label: 'Create work item', icon: ClipboardList, profiles: ['staff', 'branch', 'office', 'executive'] },
];

export const MAX_MESSAGE_LEN = 8000;
const COUNTER_THRESHOLD = 7500;
const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 1_000_000; // post-compression ceiling (~1MB)
const IMAGE_MAX_DIMENSION = 1280;
const ACCEPTED_TYPES = 'image/png,image/jpeg,image/webp,image/gif,application/pdf';

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/** Downscale large images to keep messages under the server body limit. GIFs pass through (canvas kills animation). */
async function fileToAttachment(file) {
  const mime = String(file.type || '').toLowerCase();
  const isImage = mime.startsWith('image/');
  const dataUrl = await readFileAsDataUrl(file);

  if (isImage && mime !== 'image/gif') {
    const needsWork = file.size > MAX_ATTACHMENT_BYTES || true; // always normalize dimensions
    if (needsWork) {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Could not load image'));
        el.src = dataUrl;
      });
      const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not process image in this browser.');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const outMime = mime === 'image/png' && file.size <= MAX_ATTACHMENT_BYTES ? 'image/png' : 'image/jpeg';
      const compressed = canvas.toDataURL(outMime, 0.82);
      if (compressed.length < dataUrl.length || file.size > MAX_ATTACHMENT_BYTES) {
        return {
          name: file.name || 'image',
          mime: outMime,
          dataUrl: compressed,
          isImage: true,
        };
      }
    }
  }

  // Rough base64 → bytes check for non-image / pass-through files.
  const approxBytes = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
  if (approxBytes > MAX_ATTACHMENT_BYTES) {
    throw new Error(`"${file.name}" is too large (max 1MB).`);
  }
  return { name: file.name || 'file', mime, dataUrl, isImage };
}

/**
 * Teams-style composer: text + image/PDF attachments with previews.
 * Text/attachments are only cleared after onSend resolves successfully.
 */
export default function MessageComposer({
  onSend,
  sending,
  disabled,
  disabledReason,
  onPromote,
  showPromote = true,
  placeholder = 'Type a message…',
  deskProfile = 'staff',
  replyTo = null,
  onCancelReply,
  directory = [],
}) {
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const promoteOptions = PROMOTE.filter((p) => p.profiles.includes(deskProfile));
  const mentionMatch = body.match(/@([a-z0-9_.-]*)$/i);
  const mentionQuery = String(mentionMatch?.[1] || '').toLowerCase();
  const mentionSuggestions = mentionMatch
    ? (directory || [])
        .filter((user) =>
          `${user.username || ''} ${user.displayName || ''}`.toLowerCase().includes(mentionQuery)
        )
        .slice(0, 6)
    : [];

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

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setAttachError(null);
    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      setAttachError(`Max ${MAX_ATTACHMENTS} attachments per message.`);
      return;
    }
    setAttaching(true);
    try {
      const prepared = [];
      for (const file of files) {
        const mime = String(file.type || '').toLowerCase();
        if (!ACCEPTED_TYPES.includes(mime)) {
          throw new Error(`"${file.name}" is not a supported type (images or PDF).`);
        }
        prepared.push(await fileToAttachment(file));
      }
      setAttachments((prev) => [...prev, ...prepared].slice(0, MAX_ATTACHMENTS));
    } catch (err) {
      setAttachError(String(err?.message || 'Could not attach file.'));
    } finally {
      setAttaching(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const submit = async () => {
    const text = body.trim();
    if ((!text && attachments.length === 0) || sending || disabled || attaching) return;
    const result = await onSend?.({
      body: text,
      attachments,
      ...(replyTo?.id ? { parentMessageId: replyTo.id } : {}),
    });
    // onSend returns false on failure — keep the draft so nothing is lost.
    if (result !== false) {
      setBody('');
      setAttachments([]);
      setAttachError(null);
      onCancelReply?.();
    }
    textareaRef.current?.focus?.();
  };

  const remaining = MAX_MESSAGE_LEN - body.length;
  const showCounter = body.length >= COUNTER_THRESHOLD;
  const canSend = (body.trim() || attachments.length > 0) && !sending && !disabled && !attaching;

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      {replyTo ? (
        <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border-l-4 border-teal-600 bg-teal-50 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-teal-900">Replying to {replyTo.authorDisplayName || 'message'}</p>
            <p className="truncate text-xs text-slate-600">{replyTo.body || 'Attachment'}</p>
          </div>
          <button type="button" onClick={onCancelReply} aria-label="Cancel reply" className="text-slate-500">
            <X size={14} aria-hidden />
          </button>
        </div>
      ) : null}
      {disabled && disabledReason ? (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
          {disabledReason}
        </p>
      ) : null}
      {attachError ? (
        <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-800" role="alert">
          {attachError}
        </p>
      ) : null}
      {attachments.length ? (
        <ul className="mb-2 flex flex-wrap gap-2" aria-label="Attachments to send">
          {attachments.map((a, i) => (
            <li key={`${a.name}-${i}`} className="relative">
              {a.isImage ? (
                <img
                  src={a.dataUrl}
                  alt={a.name}
                  className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
                />
              ) : (
                <span className="flex h-16 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2">
                  <FileText size={18} className="text-slate-500" aria-hidden />
                  <span className="w-full truncate text-center text-[10px] text-slate-600">{a.name}</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label={`Remove attachment ${a.name}`}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-700 p-0.5 text-white shadow hover:bg-slate-900"
              >
                <X size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
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
          onPaste={(e) => {
            const files = Array.from(e.clipboardData?.files || []);
            if (files.length) {
              e.preventDefault();
              void addFiles(files);
            }
          }}
          rows={2}
          maxLength={MAX_MESSAGE_LEN}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Message"
          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200 disabled:bg-slate-50"
        />
        {mentionSuggestions.length ? (
          <ul className="rounded-lg border border-slate-200 bg-white py-1 shadow-lg" aria-label="Mention suggestions">
            {mentionSuggestions.map((user) => (
              <li key={user.id || user.username}>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-teal-50"
                  onClick={() => {
                    const username = user.username || String(user.displayName || '').replace(/\s+/g, '.').toLowerCase();
                    setBody((value) => value.replace(/@([a-z0-9_.-]*)$/i, `@${username} `));
                    textareaRef.current?.focus?.();
                  }}
                >
                  <span className="font-semibold">{user.displayName || user.username}</span>
                  {user.username ? <span className="ml-1 text-slate-400">@{user.username}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              className="hidden"
              onChange={(e) => void addFiles(e.target.files)}
              aria-hidden
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click?.()}
              disabled={disabled || sending || attaching || attachments.length >= MAX_ATTACHMENTS}
              aria-label="Attach image or file"
              title="Attach image or file"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            >
              {attaching ? (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              ) : (
                <Paperclip size={16} aria-hidden />
              )}
            </button>
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
                    {promoteOptions.map((p, i) => {
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
            ) : null}
          </div>
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
              disabled={!canSend}
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
