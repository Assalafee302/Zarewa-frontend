import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Bot,
  ChevronRight,
  Compass,
  LifeBuoy,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
  Zap,
} from 'lucide-react';
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
import { classifyAgentRoute, routeLabel } from '../lib/helpAgentIntent';
import { HELP_BOT_NAME, HELP_BOT_TAGLINE } from '../lib/helpBotBrand';
import { useHelpChat } from '../context/HelpChatContext';
import { TRANSACTION_ISSUE_CHIPS } from '../lib/helpTransactionHelp';
import { sanitizeZarePageContext } from '../lib/workspaceSanitize';
import { HELP_BOT_ALT_TAGLINE } from '../lib/helpBotBrand';
import { getPageTourForPath } from '../lib/pageTourGuide';

const LOCAL_REPLY_DELAY_MS = 240;

function pageLabel(pathname) {
  const p = String(pathname || '');
  if (p.startsWith('/cashier')) return 'Finance';
  if (p.startsWith('/accounting')) return 'Accounting desk';
  if (p.startsWith('/exec')) return 'Command Centre';
  if (p.startsWith('/analytics')) return 'Command Centre — Intelligence';
  if (p.startsWith('/sales')) return 'Sales';
  if (p.startsWith('/accounts')) return 'Finance';
  if (p.startsWith('/operations')) return 'Operations';
  if (p.startsWith('/procurement')) return 'Procurement';
  if (p.startsWith('/manager')) return 'Manager';
  if (p.startsWith('/team-hr')) return 'Team HR';
  if (p.startsWith('/executive-hr')) return 'Executive HR';
  if (p.startsWith('/hr')) return 'Human Resources';
  if (p.startsWith('/settings')) return 'Settings';
  return 'Zarewa';
}

function buildIntro(user, pathname, mode) {
  const name = String(user?.displayName || '').trim().split(/\s+/)[0];
  const page = pageLabel(pathname);
  if (mode === 'transaction_help') {
    return name
      ? `Hi ${name} — I'm **${HELP_BOT_NAME}**, your how-to guide. Tell me what went wrong and I'll walk you through the **correct Zarewa steps** (I won't post or approve for you).`
      : `Hi — I'm **${HELP_BOT_NAME}**. Tell me what went wrong and I'll guide you through the right steps in Zarewa — you stay in control of every save.`;
  }
  return name
    ? `Hi ${name} — I'm **${HELP_BOT_NAME}**, your friendly **${page}** guide. Ask *how do I…* for SOPs, or *why can't I…* when something is blocked.`
    : `Hi — I'm **${HELP_BOT_NAME}**, your **${page}** how-to guide. Ask for steps, guidelines, or what to do next — I explain; you perform the actions in Zarewa.`;
}

function seedMessages(user, pathname, mode) {
  return [{ role: 'assistant', content: buildIntro(user, pathname, mode), source: 'intro' }];
}

function userInitials(user) {
  const parts = String(user?.displayName || user?.username || 'U')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.[0] || 'U').toUpperCase();
}

function sourceMeta(source, agentRoute) {
  if (agentRoute === 'erp_data' || agentRoute === 'hybrid') {
    return { label: routeLabel(agentRoute), icon: Zap, tone: 'data' };
  }
  if (agentRoute === 'meta' || source === 'meta') {
    return { label: `About ${HELP_BOT_NAME}`, icon: Bot, tone: 'meta' };
  }
  if (source === 'ai' || agentRoute === 'chitchat') {
    return { label: source === 'ai' ? 'AI answer' : routeLabel(agentRoute), icon: Sparkles, tone: 'ai' };
  }
  return null;
}

function renderInlineMarkdown(text) {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-[#0f766e]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return (
        <em key={i} className="text-slate-600 not-italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** Render **bold**, _italic_, numbered lists, and bullet lines in help replies. */
function HelpMessageBody({ content }) {
  const text = String(content || '');
  const blocks = text.split(/\n\n+/);

  return (
    <div className="space-y-2.5 text-[13.5px] leading-[1.55] text-slate-800">
      {blocks.map((block, blockIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (/^\*\*Steps:\*\*$/i.test(trimmed)) return null;

        const lines = trimmed.split('\n');
        const stepLines = lines.filter((line) => /^\d+\.\s/.test(line.trim()));
        if (stepLines.length >= 1 && stepLines.length === lines.length) {
          return (
            <ol
              key={blockIdx}
              className="ml-0.5 space-y-2 border-l-2 border-teal-200/80 pl-4 marker:font-bold marker:text-teal-700"
              style={{ listStyle: 'decimal', listStylePosition: 'outside' }}
            >
              {stepLines.map((line, i) => (
                <li key={i} className="pl-1">
                  {renderInlineMarkdown(line.replace(/^\d+\.\s*/, ''))}
                </li>
              ))}
            </ol>
          );
        }

        const bulletLines = lines.filter((line) => /^[-•]\s/.test(line.trim()));
        if (bulletLines.length >= 1 && bulletLines.length === lines.length) {
          return (
            <ul key={blockIdx} className="space-y-1.5 pl-1">
              {bulletLines.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" aria-hidden />
                  <span>{renderInlineMarkdown(line.replace(/^[-•]\s*/, ''))}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={blockIdx} className="whitespace-pre-wrap">
            {renderInlineMarkdown(trimmed)}
          </p>
        );
      })}
    </div>
  );
}


function HelpAvatar({ role, user }) {
  if (role === 'user') {
    return (
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#134e4a] to-[#0f766e] text-[11px] font-black text-white shadow-md ring-2 ring-white"
        aria-hidden
      >
        {userInitials(user)}
      </div>
    );
  }
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-100 to-emerald-50 text-[#134e4a] shadow-sm ring-2 ring-white"
      aria-hidden
    >
      <LifeBuoy size={16} strokeWidth={2.2} />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="z-help-msg flex items-end gap-2.5">
      <HelpAvatar role="assistant" />
      <div className="rounded-2xl rounded-bl-md border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5" aria-label="Assistant is typing">
          <span className="z-help-typing-dot h-2 w-2 rounded-full bg-teal-500/70" />
          <span className="z-help-typing-dot h-2 w-2 rounded-full bg-teal-500/70" />
          <span className="z-help-typing-dot h-2 w-2 rounded-full bg-teal-500/70" />
        </div>
      </div>
    </div>
  );
}

function InsightSection({ icon, title, tone, children, defaultOpen = true }) {
  const Icon = icon;
  const [open, setOpen] = useState(defaultOpen);
  const tones = {
    indigo: 'border-indigo-200/70 bg-gradient-to-br from-indigo-50/95 to-white',
    teal: 'border-teal-200/70 bg-gradient-to-br from-teal-50/95 to-white',
    amber: 'border-amber-200/70 bg-gradient-to-br from-amber-50/95 to-white',
    slate: 'border-slate-200/80 bg-gradient-to-br from-slate-50/90 to-white',
  };
  const iconTones = {
    indigo: 'bg-indigo-100 text-indigo-700',
    teal: 'bg-teal-100 text-teal-800',
    amber: 'bg-amber-100 text-amber-800',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <section className={`overflow-hidden rounded-2xl border shadow-sm ${tones[tone] || tones.slate}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition hover:bg-white/40"
      >
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconTones[tone] || iconTones.slate}`}>
          <Icon size={14} strokeWidth={2.2} aria-hidden />
        </span>
        <span className="flex-1 text-[11px] font-black uppercase tracking-wider text-slate-800">{title}</span>
        <ChevronRight size={14} className={`text-slate-400 transition ${open ? 'rotate-90' : ''}`} aria-hidden />
      </button>
      {open ? <div className="border-t border-white/60 px-3.5 pb-3.5 pt-2.5">{children}</div> : null}
    </section>
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function HelpChatDock() {
  const ws = useWorkspace();
  const ai = useAiAssistant();
  const helpChat = useHelpChat();
  const location = useLocation();
  const user = ws?.session?.user;
  const [helpMode, setHelpMode] = useState('default');
  const [pendingPageContext, setPendingPageContext] = useState(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => seedMessages(user, location.pathname, 'default'));
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

  const [livePersonalization, setLivePersonalization] = useState(null);
  const [helpAiStatus, setHelpAiStatus] = useState(null);

  const aiDockVisible = Boolean(user && user.roleKey !== 'ceo' && ai?.available === true);
  const snapshot = ws?.snapshot;
  const helpPersonalization = livePersonalization || snapshot?.helpPersonalization;
  const pageName = pageLabel(location.pathname);
  const externalAi = Boolean(
    helpPersonalization?.externalAi ?? helpAiStatus?.externalAi ?? ai?.available
  );

  const quickQuestions = useMemo(() => {
    const pathPrompts = quickQuestionsForPath(location.pathname);
    const bootPrompts = helpPersonalization?.prompts;
    if (Array.isArray(bootPrompts) && bootPrompts.length) {
      return mergePersonalizedPrompts(
        pathPrompts,
        bootPrompts,
        helpPersonalization?.learnedBoosts || {},
        location.pathname
      ).slice(0, 8);
    }
    return pathPrompts;
  }, [location.pathname, helpPersonalization]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const [persRes, statusRes] = await Promise.all([
          apiFetch(`/api/help/personalization?pathname=${encodeURIComponent(location.pathname)}`),
          apiFetch('/api/help/status'),
        ]);
        if (!cancelled && persRes.ok && persRes.data?.ok !== false) {
          setLivePersonalization(persRes.data);
        }
        if (!cancelled && statusRes.ok && statusRes.data?.ok !== false) {
          setHelpAiStatus(statusRes.data);
        }
      } catch {
        /* bootstrap fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, user]);

  const coachingHints = useMemo(() => {
    if (Array.isArray(helpPersonalization?.recommendations) && helpPersonalization.recommendations.length) {
      return helpPersonalization.recommendations.slice(0, 5);
    }
    if (Array.isArray(helpPersonalization?.coachingHints) && helpPersonalization.coachingHints.length) {
      return helpPersonalization.coachingHints.slice(0, 5);
    }
    return buildHelpCoachingHints(snapshot, location.pathname).slice(0, 3);
  }, [helpPersonalization, snapshot, location.pathname]);

  const dockSuggestions = useMemo(() => {
    if (Array.isArray(helpPersonalization?.recommendations) && helpPersonalization.recommendations.length) {
      const recs = helpPersonalization.recommendations;
      return {
        hints: recs.filter((r) => r.score >= 9).slice(0, 3),
        prompts: recs.filter((r) => r.score < 9).slice(0, 5).map((r) => ({ label: r.title, query: r.query })),
      };
    }
    const hints = coachingHints;
    const hintKeys = new Set(hints.map((h) => String(h.title || '').toLowerCase()));
    const prompts = quickQuestions
      .filter((q) => !hintKeys.has(String(q.label || '').toLowerCase()))
      .slice(0, 5);
    return { hints, prompts };
  }, [coachingHints, quickQuestions, helpPersonalization?.recommendations]);

  const transactionProfile = helpPersonalization?.transactionProfile;
  const dailyBriefing = helpPersonalization?.dailyBriefing;

  const briefingSnapshot = useMemo(() => {
    if (!snapshot) return null;
    const items = Array.isArray(snapshot.unifiedWorkItems) ? snapshot.unifiedWorkItems : [];
    return {
      operationsInventoryAttention: snapshot.operationsInventoryAttention,
      productionMetrics: snapshot.productionMetrics,
      officeSummary: snapshot.officeSummary
        ? { unreadApprox: Number(snapshot.officeSummary.unreadApprox) || 0 }
        : null,
      unifiedWorkItems: items.map((i) => ({
        requiresApproval: Boolean(i?.requiresApproval),
        requiresResponse: Boolean(i?.requiresResponse),
        status: i?.status,
        slaState: i?.slaState,
        isOverdue: Boolean(i?.isOverdue),
        filingStatus: i?.filingStatus,
        unfiled: Boolean(i?.unfiled),
        documentType: i?.documentType,
        category: i?.category,
      })),
    };
  }, [snapshot]);

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

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [draft, open]);

  const resetConversation = useCallback(() => {
    const next = seedMessages(user, location.pathname, helpMode);
    messagesRef.current = next;
    setMessages(next);
    setError('');
    setDraft('');
  }, [helpMode, location.pathname, user]);

  const tryLocalAnswer = useCallback(
    (text, history) => {
      const intent = detectHelpIntent(text, history);
      const agentRoute = classifyAgentRoute(text, history);

      if (agentRoute === 'meta' || intent === 'meta') {
        return {
          role: 'assistant',
          content: synthesizeMetaReply({
            userDisplay: user?.displayName,
            externalAiEnabled: externalAi,
          }),
          links: [],
          source: 'meta',
          agentRoute: 'meta',
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
            pace: helpPersonalization?.behaviorProfile?.pace,
            intent,
            transactionProfile,
          }),
          links: [],
          source: 'synth',
          agentRoute: 'chitchat',
          matchedArticleIds: [],
          topScore: 0,
        };
      }

      const searchText = buildHelpSearchText(text, history);
      const matches = matchHelpArticles(searchText, {
        limit: 3,
        minScore: 4,
        pathname: location.pathname,
        learnedBoosts: helpPersonalization?.learnedBoosts || {},
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
          pace: helpPersonalization?.behaviorProfile?.pace,
          intent,
          transactionProfile,
        }),
        links: mergeHelpLinks(articles),
        source: 'synth',
        agentRoute: classifyAgentRoute(text, history),
        matchedArticleIds: articles.map((a) => a.id),
        topScore: top.score,
      };
    },
    [
      externalAi,
      location.pathname,
      helpPersonalization?.behaviorProfile?.pace,
      helpPersonalization?.learnedBoosts,
      transactionProfile,
      user?.displayName,
      user?.permissions,
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

      const chatStarted = Date.now();

      try {
        const history = [...messagesRef.current].filter(
          (m) => m.role === 'user' || m.role === 'assistant'
        );
        const priorHistory = history.slice(0, -1);
        const intent = detectHelpIntent(text, priorHistory);
        const agentRoute = classifyAgentRoute(text, history);
        const complex = isComplexHelpQuery(text);
        const topMatch =
          matchHelpArticles(buildHelpSearchText(text, history), {
            limit: 1,
            minScore: 4,
            pathname: location.pathname,
            learnedBoosts: helpPersonalization?.learnedBoosts || {},
          })[0] ?? null;
        const topScore = topMatch?.score ?? 0;

        const preferServer =
          agentRoute === 'erp_data' ||
          agentRoute === 'hybrid' ||
          (intent === 'follow_up' && history.length > 2) ||
          (externalAi &&
            intent !== 'greeting' &&
            intent !== 'thanks' &&
            intent !== 'meta' &&
            (complex || topScore < 10 || intent === 'workflow' || intent === 'clarify'));

        const local = preferServer ? null : tryLocalAnswer(text, priorHistory);

        if (local && (topScore >= 4 || intent === 'greeting' || intent === 'thanks' || intent === 'meta')) {
          await delay(Math.max(0, LOCAL_REPLY_DELAY_MS - (Date.now() - chatStarted)));
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
            pageContext: sanitizeZarePageContext(
              (() => {
                try {
                  const raw = sessionStorage.getItem('zarewa.workspace.pageContext');
                  const base = raw ? JSON.parse(raw) : {};
                  return {
                    ...base,
                    ...(pendingPageContext || {}),
                    pathname: location.pathname,
                    mode: helpMode,
                    briefingSnapshot,
                    dailyBriefing,
                  };
                } catch {
                  return { ...(pendingPageContext || {}), pathname: location.pathname, mode: helpMode };
                }
              })()
            ),
            clientDraftMs,
          }),
        });

        if (!ok || !data?.ok) {
          const fallbackLocal = tryLocalAnswer(text, history);
          if (fallbackLocal) {
            await delay(Math.max(0, LOCAL_REPLY_DELAY_MS - (Date.now() - chatStarted)));
            const logged = await attachLocalHelpLog(fallbackLocal, text, clientDraftMs);
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
          agentRoute: data.agentRoute || null,
          sources: Array.isArray(data.sources) ? data.sources : [],
          coaching: data.coaching || null,
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
    [
      attachLocalHelpLog,
      busy,
      externalAi,
      location.pathname,
      signalPendingFollowUp,
      helpPersonalization?.learnedBoosts,
      tryLocalAnswer,
      helpMode,
      pendingPageContext,
      briefingSnapshot,
      dailyBriefing,
    ]
  );

  const pageTour = useMemo(() => getPageTourForPath(location.pathname), [location.pathname]);

  const startPageTour = useCallback(() => {
    setOpen(true);
    const next = seedMessages(user, location.pathname, helpMode);
    messagesRef.current = next;
    setMessages(next);
    setError('');
    void sendText(pageTour.query);
  }, [helpMode, location.pathname, pageTour, sendText, user]);

  useEffect(() => {
    const req = helpChat?.request;
    if (!req) return;
    const mode = req.mode || 'default';
    setHelpMode(mode);
    setPendingPageContext(req.pageContext || null);
    if (req.resetConversation) {
      const next = seedMessages(user, location.pathname, mode);
      messagesRef.current = next;
      setMessages(next);
    }
    setOpen(true);
    const prompt = req.prompt;
    helpChat.clearRequest?.();
    if (req.autoSend && prompt) {
      window.setTimeout(() => void sendText(prompt), 120);
    }
  }, [helpChat?.request, helpChat, location.pathname, sendText, user]);

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
        className={`z-help-launcher fixed z-[165] flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-2xl border border-teal-200/60 bg-gradient-to-br from-[#134e4a] via-[#0f766e] to-[#115e59] text-teal-50 transition hover:scale-[1.03] active:scale-[0.98] bottom-[max(1.25rem,env(safe-area-inset-bottom))] ${launcherClass}`}
        aria-label={`Open ${HELP_BOT_NAME}`}
        title={`${HELP_BOT_NAME} — ${HELP_BOT_TAGLINE}`}
      >
        <LifeBuoy size={26} strokeWidth={2} aria-hidden />
        {coachingHints.length > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-amber-950 ring-2 ring-white">
            !
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[175] flex items-end justify-end bg-slate-900/50 p-2 sm:p-4 sm:items-stretch sm:justify-end backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="z-help-panel flex h-[min(40rem,92dvh)] w-full max-w-[26rem] flex-col overflow-hidden rounded-[1.35rem] border border-white/20 bg-white shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)] sm:my-auto sm:mr-[max(0.5rem,env(safe-area-inset-right))]"
            role="dialog"
            aria-label={HELP_BOT_NAME}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <header className="relative overflow-hidden border-b border-teal-900/10 px-4 py-4 text-white">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#134e4a] via-[#0f766e] to-[#115e59]" aria-hidden />
              <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-teal-300/20 blur-2xl" aria-hidden />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
                    <LifeBuoy size={22} className="text-teal-100" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black tracking-tight">{HELP_BOT_NAME}</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-teal-50/95 ring-1 ring-white/15">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.9)]" />
                        {HELP_BOT_TAGLINE}
                      </span>
                      <span className="hidden text-[9px] text-teal-100/80 sm:inline">{HELP_BOT_ALT_TAGLINE}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-teal-100/90">{pageName}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={resetConversation}
                    className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide text-white/90 transition hover:bg-white/10"
                    aria-label="Reset conversation"
                  >
                    <RotateCcw size={12} aria-hidden />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl p-2 text-white/90 transition hover:bg-white/10"
                    aria-label="Close coach"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            </header>

            {/* Messages */}
            <div className="z-help-scroll flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-slate-50 via-white to-slate-50/80 px-3.5 py-4 sm:px-4">
              <div className="space-y-4">
                {showQuickQuestions && Array.isArray(dailyBriefing) && dailyBriefing.length > 0 ? (
                  <InsightSection icon={Sparkles} title="Today's briefing" tone="indigo" defaultOpen>
                    <ul className="space-y-1.5 text-[12px] text-slate-700">
                      {dailyBriefing.map((line, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="font-bold text-teal-700">{i + 1}.</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => void sendText('What should I do next based on my briefing?')}
                      className="mt-2 text-[11px] font-bold text-teal-800 hover:underline"
                    >
                      Ask Zare what to do next
                    </button>
                  </InsightSection>
                ) : null}

                {showQuickQuestions && helpMode !== 'transaction_help' ? (
                  <InsightSection icon={Compass} title="Tour this page" tone="teal" defaultOpen>
                    <p className="mb-3 text-[12px] leading-relaxed text-slate-600">
                      New to <span className="font-bold text-[#134e4a]">{pageTour.label}</span>? Zare coaches you{' '}
                      <strong>one step at a time</strong>. After each step in the app, return here and say{' '}
                      <strong>next</strong>.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void startPageTour()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#134e4a] px-3 py-2 text-[11px] font-black text-white hover:bg-teal-900 disabled:opacity-50"
                      >
                        <Compass size={14} aria-hidden />
                        Start page tour
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => ws?.openRoleTrainingReplay?.()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-white px-3 py-2 text-[11px] font-bold text-[#134e4a] hover:bg-teal-50 disabled:opacity-50"
                      >
                        <BookOpen size={14} aria-hidden />
                        My role tour
                      </button>
                    </div>
                  </InsightSection>
                ) : null}

                {showQuickQuestions && helpMode === 'transaction_help' ? (
                  <InsightSection icon={Zap} title="Report an issue" tone="amber" defaultOpen>
                    <div className="flex flex-wrap gap-2">
                      {TRANSACTION_ISSUE_CHIPS.map((chip) => (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => void sendText(`Help me with: ${chip.label}`)}
                          className="rounded-xl border border-amber-200/90 bg-white px-3 py-2 text-[11px] font-bold text-slate-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </InsightSection>
                ) : null}

                {showQuickQuestions && (dockSuggestions.hints.length > 0 || dockSuggestions.prompts.length > 0) ? (
                  <InsightSection icon={BookOpen} title="Try asking" tone="slate" defaultOpen>
                    {dockSuggestions.hints.length > 0 ? (
                      <ul className="mb-2.5 space-y-2">
                        {dockSuggestions.hints.map((hint) => (
                          <li key={hint.id}>
                            <button
                              type="button"
                              onClick={() => void sendText(hint.query)}
                              className="group w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-left shadow-sm transition hover:border-teal-200 hover:bg-teal-50/60"
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="text-[12px] font-bold text-[#134e4a]">{hint.title}</span>
                                <ArrowRight size={14} className="shrink-0 text-teal-600 opacity-0 transition group-hover:opacity-100" />
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {dockSuggestions.prompts.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {dockSuggestions.prompts.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => void sendText(item.query)}
                            className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-[11px] font-bold text-slate-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-[#134e4a]"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </InsightSection>
                ) : null}

                {messages.map((m, i) => {
                  const isUser = m.role === 'user';
                  const meta = !isUser && m.source && m.source !== 'intro' ? sourceMeta(m.source, m.agentRoute) : null;
                  const MetaIcon = meta?.icon || BookOpen;
                  const badgeClass =
                    meta?.tone === 'data'
                      ? 'bg-violet-50 text-violet-800 ring-violet-200/80'
                      : meta?.tone === 'ai'
                        ? 'bg-indigo-50 text-indigo-800 ring-indigo-200/80'
                        : meta?.tone === 'meta'
                          ? 'bg-slate-100 text-slate-700 ring-slate-200/80'
                          : 'bg-teal-50 text-teal-800 ring-teal-200/80';

                  return (
                    <div
                      key={`${m.role}-${i}-${m.shownAt || i}`}
                      className={`z-help-msg flex items-end gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
                      style={{ animationDelay: `${Math.min(i * 40, 200)}ms` }}
                    >
                      <HelpAvatar role={m.role} user={user} />
                      <div className={`max-w-[88%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div
                          className={`rounded-2xl px-3.5 py-3 shadow-sm ${
                            isUser
                              ? 'rounded-br-md bg-gradient-to-br from-[#134e4a] to-[#0f766e] text-white'
                              : 'rounded-bl-md border border-slate-200/80 bg-white text-slate-800'
                          }`}
                        >
                          {meta ? (
                            <p
                              className={`mb-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ring-1 ${badgeClass}`}
                            >
                              <MetaIcon size={10} aria-hidden />
                              {meta.label}
                            </p>
                          ) : null}
                          {isUser ? (
                            <p className="text-[13.5px] leading-snug whitespace-pre-wrap">{m.content}</p>
                          ) : (
                            <HelpMessageBody content={m.content} />
                          )}

                          {!isUser && Array.isArray(m.sources) && m.sources.length > 0 ? (
                            <p className="mt-2 text-[9px] text-slate-400">
                              Sources: {m.sources.map((s) => s.title).join(' · ')}
                            </p>
                          ) : null}
                          {!isUser && m.coaching?.active ? (
                            <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-teal-700">
                              Coaching · step {(m.coaching.stepIndex || 0) + 1}/{m.coaching.totalSteps || '?'}
                            </p>
                          ) : null}
                          {!isUser && Array.isArray(m.links) && m.links.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100/90 pt-2.5">
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
                                  className="inline-flex items-center gap-1 rounded-lg border border-teal-200/80 bg-gradient-to-r from-teal-50 to-emerald-50/80 px-2.5 py-1.5 text-[10px] font-bold text-[#134e4a] transition hover:border-teal-300 hover:from-teal-100"
                                >
                                  {link.label}
                                  <ArrowRight size={10} aria-hidden />
                                </Link>
                              ))}
                            </div>
                          ) : null}

                          {!isUser && m.logId && m.source !== 'intro' ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100/90 pt-2.5">
                              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                {m.feedback === 'helpful'
                                  ? 'Thanks — noted ✓'
                                  : m.feedback === 'not_helpful'
                                    ? 'We will improve this'
                                    : 'Helpful?'}
                              </span>
                              {!m.feedback || m.feedback === 'follow_up' ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => void submitFeedback(i, true)}
                                    className="rounded-lg border border-teal-200/80 bg-teal-50/80 p-1.5 text-teal-700 transition hover:bg-teal-100"
                                    aria-label="Mark answer helpful"
                                  >
                                    <ThumbsUp size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void submitFeedback(i, false)}
                                    className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500 transition hover:bg-slate-100"
                                    aria-label="Mark answer not helpful"
                                  >
                                    <ThumbsDown size={13} />
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {busy ? <TypingIndicator /> : null}

                {error ? (
                  <div className="rounded-2xl border border-red-200/80 bg-red-50 px-3.5 py-3 text-[12px] text-red-800 shadow-sm">
                    <p className="font-semibold">Could not reach the coach</p>
                    <p className="mt-1 text-red-700/90">{error}</p>
                    <button
                      type="button"
                      onClick={() => setError('')}
                      className="mt-2 text-[11px] font-bold text-red-900 underline underline-offset-2"
                    >
                      Dismiss
                    </button>
                  </div>
                ) : null}
              </div>
              <div ref={listEndRef} className="h-1" />
            </div>

            {/* Composer */}
            <footer className="border-t border-slate-100 bg-white/95 px-3.5 py-3.5 backdrop-blur-sm sm:px-4">
              <div className="flex items-end gap-2 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-2 shadow-inner">
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
                  rows={1}
                  placeholder="Ask anything… typos are OK"
                  className="max-h-32 min-h-[2.75rem] flex-1 resize-none bg-transparent px-2 py-2 text-[13.5px] text-slate-800 outline-none placeholder:text-slate-400"
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={busy || !draft.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#134e4a] to-[#0f766e] text-white shadow-md transition hover:brightness-110 disabled:opacity-35"
                  aria-label="Send message"
                >
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
