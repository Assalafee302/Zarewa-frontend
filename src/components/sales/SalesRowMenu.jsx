import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Eye, PencilLine, Receipt as ReceiptIcon, FileText, Trash2, Factory } from 'lucide-react';

const MENU_Z = 5000;
/** Tailwind `w-44` (11rem) — keep in sync with menu class */
const MENU_WIDTH_PX = 176;

function useMenuPosition(open, anchorRef) {
  const [pos, setPos] = useState(null);

  const update = React.useCallback(() => {
    const el = anchorRef.current;
    if (!el || !open) {
      setPos(null);
      return;
    }
    const r = el.getBoundingClientRect();
    let left = r.right - MENU_WIDTH_PX;
    left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH_PX - 8));
    setPos({
      top: r.bottom + 4,
      left,
    });
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

export function SalesRowMenu({
  rowKey,
  openKey,
  setOpenKey,
  onView,
  onEdit = () => {},
  editDisabled = false,
  editTitle = '',
  showEdit = true,
  onAddPayment,
  /** @deprecated use onAddPayment */
  onAddReceipt,
  onReviewAudit,
  onPush,
  onDelete,
  deleteLabel = 'Delete',
}) {
  const addPaymentHandler = onAddPayment ?? onAddReceipt;
  const open = openKey === rowKey;
  const anchorRef = useRef(null);
  const pos = useMenuPosition(open, anchorRef);

  const menu =
    open && pos && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="menu"
            data-sales-action-menu
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              zIndex: MENU_Z,
            }}
            className="w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => {
                onView();
                setOpenKey(null);
              }}
            >
              <Eye size={14} className="text-slate-400 shrink-0" />
              View
            </button>
            {addPaymentHandler && (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                onClick={() => {
                  addPaymentHandler();
                  setOpenKey(null);
                }}
              >
                <ReceiptIcon size={14} className="text-emerald-400 shrink-0" />
                Add payment
              </button>
            )}
            {onReviewAudit && (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[#134e4a] hover:bg-slate-50"
                onClick={() => {
                  onReviewAudit();
                  setOpenKey(null);
                }}
              >
                <FileText size={14} className="text-slate-400 shrink-0" />
                Review Audit
              </button>
            )}
            {onPush && (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[#134e4a] hover:bg-teal-50"
                onClick={() => {
                  onPush();
                  setOpenKey(null);
                }}
              >
                <Factory size={14} className="text-teal-500 shrink-0" />
                Push
              </button>
            )}
            {showEdit ? (
              <button
                type="button"
                role="menuitem"
                disabled={editDisabled}
                title={editDisabled ? editTitle : undefined}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                onClick={() => {
                  if (!editDisabled) {
                    onEdit();
                    setOpenKey(null);
                  }
                }}
              >
                <PencilLine size={14} className="text-slate-400 shrink-0" />
                Edit
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50"
                onClick={() => {
                  onDelete();
                  setOpenKey(null);
                }}
              >
                <Trash2 size={14} className="text-rose-500 shrink-0" />
                {deleteLabel}
              </button>
            ) : null}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={anchorRef} className="relative shrink-0" data-sales-action-menu>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpenKey(open ? null : rowKey)}
        className="text-slate-400 hover:text-[#134e4a] p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#134e4a]/20"
      >
        <MoreVertical size={18} strokeWidth={2} />
      </button>
      {menu}
    </div>
  );
}
