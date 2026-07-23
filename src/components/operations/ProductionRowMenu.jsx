import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  MoreVertical,
  Eye,
  ClipboardList,
  RotateCcw,
  Link2,
  CheckCircle2,
} from 'lucide-react';

const MENU_Z = 5000;
const MENU_WIDTH_PX = 176;

function useMenuPosition(open, anchorRef) {
  const [pos, setPos] = useState(null);

  const update = React.useCallback(() => {
    const el = anchorRef.current;
    if (!el || !open) {
      setPos((prev) => (prev == null ? prev : null));
      return;
    }
    const r = el.getBoundingClientRect();
    let left = r.right - MENU_WIDTH_PX;
    left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH_PX - 8));
    const top = r.bottom + 4;
    setPos((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }));
  }, [open, anchorRef]);

  useLayoutEffect(() => {
    update();
  }, [open, update]);

  useEffect(() => {
    if (!open) return;
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, update]);

  return pos;
}

function MenuItem({ icon: Icon, label, onClick, tone = 'default' }) {
  const toneClass =
    tone === 'violet'
      ? 'text-violet-800 hover:bg-violet-50'
      : tone === 'emerald'
        ? 'text-emerald-800 hover:bg-emerald-50'
        : 'text-slate-700 hover:bg-slate-50';
  const iconTone =
    tone === 'violet'
      ? 'text-violet-500'
      : tone === 'emerald'
        ? 'text-emerald-500'
        : 'text-slate-400';

  return (
    <button
      type="button"
      role="menuitem"
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium ${toneClass}`}
      onClick={onClick}
    >
      <Icon size={14} className={`${iconTone} shrink-0`} />
      {label}
    </button>
  );
}

/**
 * Portal kebab menu for production queue rows — mirrors SalesRowMenu density.
 */
export function ProductionRowMenu({
  rowKey,
  openKey,
  setOpenKey,
  onView,
  onEditRegister,
  onRecall,
  onAssignCoil,
  onOpenRegister,
  onPrepareComplete,
}) {
  const open = openKey === rowKey;
  const anchorRef = useRef(null);
  const pos = useMenuPosition(open, anchorRef);

  const close = () => setOpenKey(null);
  const run = (fn) => {
    if (typeof fn === 'function') fn();
    close();
  };

  const menu =
    open && pos && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="menu"
            data-production-action-menu
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              zIndex: MENU_Z,
            }}
            className="w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            {onView ? (
              <MenuItem icon={Eye} label="View" onClick={() => run(onView)} />
            ) : null}
            {onEditRegister ? (
              <MenuItem icon={ClipboardList} label="Edit register" onClick={() => run(onEditRegister)} />
            ) : null}
            {onOpenRegister ? (
              <MenuItem icon={ClipboardList} label="Open register" onClick={() => run(onOpenRegister)} />
            ) : null}
            {onAssignCoil ? (
              <MenuItem icon={Link2} label="Assign coil" onClick={() => run(onAssignCoil)} />
            ) : null}
            {onRecall ? (
              <MenuItem icon={RotateCcw} label="Recall" tone="violet" onClick={() => run(onRecall)} />
            ) : null}
            {onPrepareComplete ? (
              <MenuItem
                icon={CheckCircle2}
                label="Prepare complete"
                tone="emerald"
                onClick={() => run(onPrepareComplete)}
              />
            ) : null}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={anchorRef} className="relative shrink-0" data-production-action-menu>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpenKey(open ? null : rowKey);
        }}
        className="text-slate-400 hover:text-zarewa-teal p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/20"
      >
        <MoreVertical size={18} strokeWidth={2} />
      </button>
      {menu}
    </div>
  );
}
