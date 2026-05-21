import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LifeBuoy, X, Send } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
import {
  HELP_QUICK_QUESTIONS,
  formatHelpArticleReply,
  helpArticleLinks,
  matchHelpArticle,
} from '../lib/helpKnowledge';

const INTRO =
  'Ask how to do something in Zarewa — for example recording a payment, fixing a mistake, quotations, or refunds. I answer from built-in guides and can use AI when your server has it configured.';

function seedMessages() {
  return [{ role: 'assistant', content: INTRO }];
}

/** Render simple **bold** segments in help replies. */
function HelpMessageBody({ content }) {
  const text = String(content || '');
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-bold text-gray-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export function HelpChatDock() {
  const ws = useWorkspace();
  const location = useLocation();
  const user = ws?.session?.user;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(seedMessages);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listEndRef = useRef(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, messages, busy]);

  const resetConversation = useCallback(() => {
    const next = seedMessages();
    messagesRef.current = next;
    setMessages(next);
    setError('');
  }, []);

  const sendText = useCallback(
    async (rawText) => {
      const text = String(rawText || '').trim();
      if (!text || busy) return;

      const userMsg = { role: 'user', content: text };
      const optimistic = [...messagesRef.current, userMsg];
      messagesRef.current = optimistic;
      setMessages(optimistic);
      setDraft('');
      setError('');
      setBusy(true);

      try {
        const localMatch = matchHelpArticle(text);
        if (localMatch && localMatch.score >= 4) {
          const assistantMsg = {
            role: 'assistant',
            content: formatHelpArticleReply(localMatch.article),
            links: helpArticleLinks(localMatch.article),
            source: 'kb',
          };
          const nextMessages = [...messagesRef.current, assistantMsg];
          messagesRef.current = nextMessages;
          setMessages(nextMessages);
          return;
        }

        const historyForApi = [...messagesRef.current]
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content }));

        const { ok, data } = await apiFetch('/api/help/chat', {
          method: 'POST',
          body: JSON.stringify({
            message: text,
            messages: historyForApi,
            pathname: location.pathname,
          }),
        });

        if (!ok || !data?.ok) {
          throw new Error(data?.error || 'Request failed');
        }

        const assistantMsg = {
          role: 'assistant',
          content: String(data.message || ''),
          links: Array.isArray(data.links) ? data.links : [],
          source: data.source || 'api',
        };
        const nextMessages = [...messagesRef.current, assistantMsg];
        messagesRef.current = nextMessages;
        setMessages(nextMessages);
      } catch (e) {
        setError(String(e?.message || e));
      } finally {
        setBusy(false);
      }
    },
    [busy, location.pathname]
  );

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || busy) return;
    await sendText(text);
  }, [busy, draft, sendText]);

  const showQuickQuestions = useMemo(
    () => messages.length <= 1 && !busy,
    [busy, messages.length]
  );

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed z-[165] flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#134e4a] shadow-lg transition hover:bg-teal-50 active:scale-[0.98] bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-[max(1.25rem,env(safe-area-inset-left))]"
        aria-label="Open help assistant"
        title="Help — how do I…?"
      >
        <LifeBuoy size={24} strokeWidth={2} aria-hidden />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[175] flex items-end justify-start bg-slate-900/40 p-3 sm:p-4 sm:items-center sm:justify-start"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="flex h-[min(32rem,85dvh)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
            role="dialog"
            aria-label="Help assistant"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 bg-slate-800 px-4 py-3 text-white">
              <div className="flex items-center gap-2 min-w-0">
                <LifeBuoy size={18} className="shrink-0 text-teal-200" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wider">Help assistant</p>
                  <p className="truncate text-[10px] font-medium text-slate-300">How-to guides for Zarewa</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={resetConversation}
                  className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/85 transition hover:bg-white/10"
                  aria-label="Reset help conversation"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-white/90 transition hover:bg-white/10"
                  aria-label="Close help"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-3">
              {showQuickQuestions ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Common questions
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {HELP_QUICK_QUESTIONS.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => void sendText(item.query)}
                        className="rounded-lg border border-white bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-800 shadow-sm transition hover:bg-teal-50"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={`rounded-xl px-3 py-2 text-[13px] leading-snug ${
                    m.role === 'user'
                      ? 'ml-6 bg-slate-100 text-slate-900 border border-slate-200'
                      : 'mr-2 bg-white text-gray-800 border border-gray-100 shadow-sm'
                  }`}
                >
                  <HelpMessageBody content={m.content} />
                  {m.role === 'assistant' && Array.isArray(m.links) && m.links.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.links.map((link) => (
                        <Link
                          key={`${link.to}-${link.label}`}
                          to={link.to}
                          state={link.state}
                          onClick={() => setOpen(false)}
                          className="inline-flex rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-[#134e4a] hover:bg-teal-100"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}

              {busy ? (
                <p className="text-[11px] font-semibold text-gray-400 px-1">Finding an answer…</p>
              ) : null}
              {error ? (
                <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-red-800">
                  {error}
                </p>
              ) : null}
              <div ref={listEndRef} />
            </div>

            <div className="border-t border-gray-100 p-3">
              <div className="flex gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  rows={2}
                  placeholder="e.g. How do I record a payment?"
                  className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-500/20"
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={busy || !draft.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-xl bg-slate-800 text-white shadow-sm transition hover:brightness-110 disabled:opacity-40"
                  aria-label="Send help question"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="mt-2 text-[10px] text-gray-400 leading-snug">
                Built-in guides work offline. Unmatched questions may use your server AI if configured.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
