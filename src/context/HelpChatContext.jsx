/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { sanitizeTransactionContextForZare } from '../lib/workspaceSanitize.js';

const HelpChatContext = createContext(null);

export function HelpChatProvider({ children }) {
  const [request, setRequest] = useState(null);
  const [dockMounted, setDockMounted] = useState(false);

  const openZare = useCallback((opts = {}) => {
    setDockMounted(true);
    const transaction =
      opts.transactionContext && typeof opts.transactionContext === 'object'
        ? sanitizeTransactionContextForZare(opts.transactionContext)
        : null;
    setRequest({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mode: opts.mode || (transaction ? 'transaction_help' : 'default'),
      prompt: String(opts.prompt || ''),
      issueType: opts.issueType || null,
      autoSend: opts.autoSend !== false,
      resetConversation: Boolean(opts.resetConversation),
      pageContext: {
        ...(opts.pageContext && typeof opts.pageContext === 'object' ? opts.pageContext : {}),
        mode: opts.mode || (transaction ? 'transaction_help' : undefined),
        issueType: opts.issueType || undefined,
        transaction,
      },
    });
  }, []);

  const clearRequest = useCallback(() => {
    setRequest(null);
  }, []);

  const value = useMemo(
    () => ({
      request,
      dockMounted,
      openZare,
      clearRequest,
    }),
    [clearRequest, dockMounted, openZare, request]
  );

  return <HelpChatContext.Provider value={value}>{children}</HelpChatContext.Provider>;
}

export function useHelpChat() {
  return useContext(HelpChatContext);
}
