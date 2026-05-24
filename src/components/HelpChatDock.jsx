import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, LifeBuoy, Loader2, Send, Sparkles, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useAiAssistant } from '../context/AiAssistantContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
import {
  buildHelpSearchText,
  isComplexHelpQuery,
  matchHelpArticles,
  mergeHelpLinks,
  quickQuestionsForPath,
} from '../lib/helpKnowledge';
import { buildHelpCoachingHints, mergePersonalizedPrompts } from '../lib/helpRecommend';
import { detectHelpIntent, synthesizeHelpReply, synthesizeMetaReply } from '../lib/helpSynthesize';
import { classifyAgentRoute } from '../lib/helpAgentIntent';

const INTRO =
  'Hi — I’m your Zarewa workflow coach. Ask in plain language (e.g. “customer paid but receipt is wrong”). I’ll answer directly first, then only the steps you need — and I learn from your 👍/👎 ratings.';

function seedMessages() {
  return [{ role: 'assistant', content: INTRO, source: 'intro' }];
}

function sourceLabel(source) {
  if (source === 'ai') return 'AI answer';
  if (source === 'meta') return 'About this assistant';
  if (source === 'synth') return 'Smart guide';
  if (source === 'kb') return 'Built-in guide';
  if (source === 'api') return 'Server guide';
  return 'Help';
}

/** Render **bold** segments and numbered step lists in help replies. */
function HelpMessageBody({ content }) {
  const text = String(content || '');
  const blocks = text.split(/\n\n+/);

  return (
    <div className="space-y-2 text-[13px] leading-relaxed text-slate-800">
      {blocks.map((block, blockIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (/^\*\*Steps:\*\*$/i.test(trimmed)) return null;

        const stepLines = trimmed.split('\n').filter((line) => /^\d+\.\s/.test(line.trim()));
        if (stepLines.length >= 2 && stepLines.length === trimmed.split('\n').length) {
          return (
            <ol key={blockIdx} className="list-decimal space-y-1.5 pl-5 marker:font-bold marker:text-teal-800">
              {stepLines.map((line, i) => (
                <li key={i}>{line.replace(/^\d+\.\s*/, '')}</li>
              ))}
            </ol>
          );
        }

        const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={blockIdx} className="whitespace-pre-wrap">
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={i} className="font-bold text-[#134e4a]">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

export function HelpChatDock() {
  const ws = useWorkspace();
  const ai = useAiAssistant();
  const location = useLocation();
  const user = ws?.session?.user;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(seedMessages);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listEndRef = useRef(null);
  const messagesRef = useRef(messages);
  const textareaRef = useRef(null);
  const draftStartedAtRef = useRef(null);

  const sendHelpSignal = useCallback(async (logId, signal, readMs = 0) => {
    if (!logId) return;
    try {
      await apiFetch('/api/help/signal', {
        method: 'POST',
        body: JSON.stringify({ logId, signal, readMs }),
      });
    } catch {
      /* learning signal — non-blocking */
    }
  }, []);

  const signalPendingFollowUp = useCallback(() => {
    const msgs = messagesRef.current;
    for (let i = msgs.length - 1; i >= 0; i -= 1) {
      const m = msgs[i];
      if (m.role !== 'assistant' || !m.logId || m.feedback || m.source === 'intro') continue;
      const readMs = m.shownAt ? Date.now() - m.shownAt : 0;
      void sendHelpSignal(m.logId, 'follow_up', readMs);
      msgs[i] = { ...m, feedback: 'follow_up' };
      messagesRef.current = msgs;
      setMessages([...msgs]);
      break;
    }
  }, [sendHelpSignal]);

  const aiDockVisible = Boolean(user && user.roleKey !== 'ceo' && ai?.available === true);
  const snapshot = ws?.snapshot;
  const quickQuestions = useMemo(() => {
    const pathPrompts = quickQuestionsForPath(location.pathname);
    const bootPrompts = snapshot?.helpPersonalization?.prompts;
    if (Array.isArray(bootPrompts) && bootPrompts.length) {
      return mergePersonalizedPrompts(
        pathPrompts,
        bootPrompts,
        snapshot?.helpPersonalization?.learnedBoosts || {},
        location.pathname
      ).slice(0, 8);
    }
    return pathPrompts;
  }, [location.pathname, snapshot?.helpPersonalization]);
  const coachingHints = useMemo(
    () => buildHelpCoachingHints(snapshot, location.pathname),
    [snapshot, location.pathname]
  );
  const behaviorNotes = useMemo(
    () => (Array.isArray(snapshot?.helpPersonalization?.behaviorNotes) ? snapshot.helpPersonalization.behaviorNotes : []),
    [snapshot?.helpPersonalization?.behaviorNotes]
  );
  const transactionSummary = useMemo(
    () =>
      Array.isArray(snapshot?.helpPersonalization?.transactionProfile?.activitySummary)
        ? snapshot.helpPersonalization.transactionProfile.activitySummary
        : [],
    [snapshot?.helpPersonalization?.transactionProfile]
  );
  const learningEnabled = Boolean(snapshot?.helpPersonalization?.behaviorLearningEnabled);
  const transactionProfile = snapshot?.helpPersonalization?.transactionProfile;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!open) return undefined;
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, messages, busy]);

  useEffect(() => {
    if (open) {
      window.requestAnimationFrame(() => textareaRef.current?.focus?.());
    }
  }, [open]);

  const resetConversation = useCallback(() => {
    const next = seedMessages();
    messagesRef.current = next;
    setMessages(next);
    setError('');
  }, []);

  const tryLocalAnswer = useCallback(
    (text, history) => {
      const intent = detectHelpIntent(text, history);
      const agentRoute = classifyAgentRoute(text, history);

      if (agentRoute === 'meta' || intent === 'meta') {
        return {
          role: 'assistant',
          content: synthesizeMetaReply({
            userDisplay: user?.displayName,
            externalAiEnabled: snapshot?.helpPersonalization?.externalAi,
          }),
          links: [{ label: 'Settings & guides', to: '/settings' }],
          source: 'meta',
          matchedArticleIds: [],
          topScore: 0,
        };
      }

      if (intent === 'greeting' || intent === 'thanks') {
        return {
          role: 'assistant',
          content: synthesizeHelpReply({
            message: text,
            history,
            articles: [],
            pathname: location.pathname,
            userDisplay: user?.displayName,
            roleKey: user?.roleKey,
            pace: snapshot?.helpPersonalization?.behaviorProfile?.pace,
            intent,
            transactionProfile,
          }),
          links: [{ label: 'Settings & guides', to: '/settings' }],
          source: 'synth',
          matchedArticleIds: [],
          topScore: 0,
        };
      }

      const searchText = buildHelpSearchText(text, history);
      const matches = matchHelpArticles(searchText, {
        limit: 3,
        minScore: 4,
        pathname: location.pathname,
        learnedBoosts: snapshot?.helpPersonalization?.learnedBoosts || {},
      });
      if (!matches.length) return null;

      const complex = isComplexHelpQuery(text);
      const top = matches[0];
      const second = matches[1];
      let articles = [top.article];
      if (matches.length >= 2 && second && second.score >= top.score - 3 && (complex || top.score < 10)) {
        articles = matches.slice(0, 2).map((m) => m.article);
      }

      return {
        role: 'assistant',
        content: synthesizeHelpReply({
          message: text,
          history,
          articles,
          pathname: location.pathname,
          userDisplay: user?.displayName,
          roleKey: user?.roleKey,
          user: { permissions: user?.permissions, roleKey: user?.roleKey },
          pace: snapshot?.helpPersonalization?.behaviorProfile?.pace,
          intent,
          transactionProfile,
        }),
        links: mergeHelpLinks(articles),
        source: 'synth',
        matchedArticleIds: articles.map((a) => a.id),
        topScore: top.score,
      };
    },
    [
      location.pathname,
      snapshot?.helpPersonalization?.behaviorProfile?.pace,
      snapshot?.helpPersonalization?.learnedBoosts,
      snapshot?.helpPersonalization?.transactionProfile,
      user?.displayName,
      user?.roleKey,
    ]
  );

  const attachLocalHelpLog = useCallback(
    async (assistantMsg, userText, clientDraftMs) => {
      try {
        const { ok, data } = await apiFetch('/api/help/log-query', {
          method: 'POST',
          body: JSON.stringify({
            message: userText,
            pathname: location.pathname,
            matchedArticleIds: assistantMsg.matchedArticleIds || [],
            source: assistantMsg.source || 'kb',
            topScore: assistantMsg.topScore || 0,
            clientDraftMs,
            responseMs: 0,
          }),
        });
        if (ok && data?.logId) {
          return { ...assistantMsg, logId: data.logId, shownAt: Date.now() };
        }
      } catch {
        /* non-blocking */
      }
      return { ...assistantMsg, shownAt: Date.now() };
    },
    [location.pathname]
  );

  const submitFeedback = useCallback(
    async (index, helpful) => {
      const m = messagesRef.current[index];
      if (!m?.logId || m.feedback) return;
      const readMs = m.shownAt ? Date.now() - m.shownAt : 0;
      await sendHelpSignal(m.logId, helpful ? 'helpful' : 'not_helpful', readMs);
      const next = messagesRef.current.map((msg, i) =>
        i === index ? { ...msg, feedback: helpful ? 'helpful' : 'not_helpful' } : msg
      );
      messagesRef.current = next;
      setMessages(next);
    },
    [sendHelpSignal]
  );

  const sendText = useCallback(
    async (rawText) => {
      const text = String(rawText || '').trim();
      if (!text || busy) return;

      signalPendingFollowUp();

      const clientDraftMs = draftStartedAtRef.current
        ? Math.max(0, Date.now() - draftStartedAtRef.current)
        : 0;
      draftStartedAtRef.current = null;

      const userMsg = { role: 'user', content: text };
      const optimistic = [...messagesRef.current, userMsg];
      messagesRef.current = optimistic;
      setMessages(optimistic);
      setDraft('');
      setError('');
      setBusy(true);

      try {
        const history = [...messagesRef.current].filter(
          (m) => m.role === 'user' || m.role === 'assistant'
        );
        const local = tryLocalAnswer(text, history);
        const intent = detectHelpIntent(text, history);
        const complex = isComplexHelpQuery(text);
        const topScore =
          matchHelpArticles(buildHelpSearchText(text, history), {
            limit: 1,
            minScore: 4,
            pathname: location.pathname,
            learnedBoosts: snapshot?.helpPersonalization?.learnedBoosts || {},
          })[0]?.score ?? 0;

        if (local && (topScore >= 4 || intent === 'greeting' || intent === 'thanks')) {
          const logged = await attachLocalHelpLog(local, text, clientDraftMs);
          const nextMessages = [...messagesRef.current, logged];
          messagesRef.current = nextMessages;
          setMessages(nextMessages);
          return;
        }

        const historyForApi = history.map((m) => ({ role: m.role, content: m.content }));

        const { ok, data } = await apiFetch('/api/help/chat', {
          method: 'POST',
          body: JSON.stringify({
            message: text,
            messages: historyForApi,
            pathname: location.pathname,
            clientDraftMs,
          }),
        });

        if (!ok || !data?.ok) {
          if (local) {
            const logged = await attachLocalHelpLog(local, text, clientDraftMs);
            const nextMessages = [...messagesRef.current, logged];
            messagesRef.current = nextMessages;
            setMessages(nextMessages);
            return;
          }
          throw new Error(data?.error || 'Request failed');
        }

        const assistantMsg = {
          role: 'assistant',
          content: String(data.message || ''),
          links: Array.isArray(data.links) ? data.links : [],
          source: data.source || 'api',
          logId: data.logId || null,
          shownAt: Date.now(),
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
    [attachLocalHelpLog, busy, location.pathname, signalPendingFollowUp, snapshot?.helpPersonalization?.learnedBoosts, tryLocalAnswer]
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

  const launcherClass = aiDockVisible
    ? 'right-[calc(max(1.25rem,env(safe-area-inset-right))+4.25rem)]'
    : 'right-[max(1.25rem,env(safe-area-inset-right))]';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed z-[165] flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-teal-100 bg-white text-[#134e4a] shadow-lg ring-1 ring-teal-900/5 transition hover:border-teal-200 hover:bg-teal-50 hover:shadow-xl active:scale-[0.98] bottom-[max(1.25rem,env(safe-area-inset-bottom))] ${launcherClass}`}
        aria-label="Open help assistant"
        title="Help — workflows & how-to"
      >
        <LifeBuoy size={24} strokeWidth={2} aria-hidden />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[175] flex items-end justify-end bg-slate-900/45 p-3 sm:p-4 sm:items-center sm:justify-end backdrop-blur-[1px]"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="flex h-[min(36rem,88dvh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl"
            role="dialog"
            aria-label="Help assistant"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-teal-900/10 bg-gradient-to-r from-[#134e4a] to-[#0f766e] px-4 py-3.5 text-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <LifeBuoy size={20} className="text-teal-100" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider">Help assistant</p>
                  <p className="truncate text-[11px] font-medium text-teal-100/90">
                    Step-by-step workflows for Zarewa
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={resetConversation}
                  className="rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/90 transition hover:bg-white/10"
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

            <div className="flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-slate-50/80 to-white px-4 py-4 space-y-3">
              {showQuickQuestions && transactionSummary.length > 0 ? (
                <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/90 px-3.5 py-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-900">
                    Your recent work in Zarewa
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[11px] text-indigo-900/90">
                    {transactionSummary.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {showQuickQuestions && behaviorNotes.length > 0 ? (
                <div className="rounded-2xl border border-teal-200/80 bg-teal-50/90 px-3.5 py-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-teal-900">
                    {learningEnabled ? 'Personalized for you' : 'Help tips'}
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[11px] text-teal-900/90">
                    {behaviorNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {showQuickQuestions && coachingHints.length > 0 ? (
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3.5 py-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-900">
                    Suggested from your transactions & workspace
                  </p>
                  <ul className="mt-2 space-y-2">
                    {coachingHints.map((hint) => (
                      <li key={hint.id}>
                        <button
                          type="button"
                          onClick={() => void sendText(hint.query)}
                          className="w-full rounded-xl border border-amber-100 bg-white px-3 py-2 text-left transition hover:border-teal-200 hover:bg-teal-50/50"
                        >
                          <span className="block text-[11px] font-bold text-[#134e4a]">{hint.title}</span>
                          <span className="mt-0.5 block text-[10px] text-amber-900/80">{hint.reason}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {showQuickQuestions ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3.5 shadow-sm">
                  <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600">
                    <BookOpen size={12} aria-hidden />
                    Suggested for this page
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {quickQuestions.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => void sendText(item.query)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-800 transition hover:border-teal-200 hover:bg-teal-50 hover:text-[#134e4a]"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((m, i) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={`${m.role}-${i}`}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 ${
                        isUser
                          ? 'bg-[#134e4a] text-white shadow-md'
                          : 'border border-slate-200/90 bg-white text-slate-800 shadow-sm'
                      }`}
                    >
                      {!isUser && m.source && m.source !== 'intro' ? (
                        <p className="mb-1.5 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-teal-700/80">
                          {m.source === 'ai' || m.source === 'synth' ? <Sparkles size={10} /> : <BookOpen size={10} />}
                          {sourceLabel(m.source)}
                        </p>
                      ) : null}
                      {isUser ? (
                        <p className="text-[13px] leading-snug whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        <HelpMessageBody content={m.content} />
                      )}
                      {!isUser && Array.isArray(m.links) && m.links.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
                          {m.links.map((link) => (
                            <Link
                              key={`${link.to}-${link.label}`}
                              to={link.to}
                              state={link.state}
                              onClick={() => {
                                if (m.logId) {
                                  void sendHelpSignal(
                                    m.logId,
                                    'link_click',
                                    m.shownAt ? Date.now() - m.shownAt : 0
                                  );
                                }
                                setOpen(false);
                              }}
                              className="inline-flex rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-[#134e4a] transition hover:bg-teal-100"
                            >
                              {link.label} →
                            </Link>
                          ))}
                        </div>
                      ) : null}
                      {!isUser && m.logId && m.source !== 'intro' ? (
                        <div className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2">
                          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                            {m.feedback === 'helpful'
                              ? 'Thanks — noted'
                              : m.feedback === 'not_helpful'
                                ? 'We will improve this'
                                : 'Was this helpful?'}
                          </span>
                          {!m.feedback || m.feedback === 'follow_up' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void submitFeedback(i, true)}
                                className="rounded-lg border border-slate-200 p-1.5 text-teal-700 transition hover:bg-teal-50"
                                aria-label="Mark answer helpful"
                              >
                                <ThumbsUp size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => void submitFeedback(i, false)}
                                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50"
                                aria-label="Mark answer not helpful"
                              >
                                <ThumbsDown size={12} />
                              </button>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {busy ? (
                <div className="flex items-center gap-2 px-1 text-[11px] font-semibold text-slate-400">
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                  Building your answer…
                </div>
              ) : null}
              {error ? (
                <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-[12px] text-red-800">
                  {error}
                </p>
              ) : null}
              <div ref={listEndRef} />
            </div>

            <div className="border-t border-slate-100 bg-white p-3.5">
              <div className="flex gap-2">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onFocus={() => {
                    if (!draftStartedAtRef.current) draftStartedAtRef.current = Date.now();
                  }}
                  onChange={(e) => {
                    if (!draftStartedAtRef.current) draftStartedAtRef.current = Date.now();
                    setDraft(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  rows={2}
                  placeholder="Ask about a workflow… e.g. PO to GRN to payment"
                  className="min-h-[3rem] flex-1 resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-[13px] outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15"
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={busy || !draft.trim()}
                  className="flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-xl bg-[#134e4a] text-white shadow-md transition hover:brightness-110 disabled:opacity-40"
                  aria-label="Send help question"
                >
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
              <p className="mt-2.5 text-[10px] leading-snug text-slate-400">
                Guides work offline for common tasks. The assistant learns from your questions, reactions, and recent work in Zarewa.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
