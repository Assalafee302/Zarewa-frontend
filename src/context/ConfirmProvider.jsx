import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { registerAppConfirm, unregisterAppConfirm } from '../lib/appConfirm';

const ConfirmContext = createContext(null);

const EMPTY = {
  open: false,
  title: 'Confirm',
  description: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  variant: 'primary',
  busy: false,
};

export function ConfirmProvider({ children }) {
  const [config, setConfig] = useState(EMPTY);
  const resolverRef = React.useRef(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfig({
        open: true,
        title: opts.title ?? 'Confirm',
        description: opts.description ?? opts.message ?? '',
        confirmLabel: opts.confirmLabel ?? 'Confirm',
        cancelLabel: opts.cancelLabel ?? 'Cancel',
        variant: opts.variant ?? 'primary',
        busy: false,
      });
    });
  }, []);

  const close = useCallback((result) => {
    setConfig((c) => ({ ...c, open: false, busy: false }));
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(result);
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  useEffect(() => {
    registerAppConfirm(confirm);
    return () => unregisterAppConfirm();
  }, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        {...config}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirmDialog must be used within ConfirmProvider');
  return ctx;
}
