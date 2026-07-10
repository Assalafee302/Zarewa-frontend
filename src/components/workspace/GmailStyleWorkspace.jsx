import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Layers,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { appConfirm } from '../../lib/appConfirm';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canApproveStaffPurchaseCredit } from '../../lib/hrAccess';
import { officeThreadIdFromWorkItem } from '../../lib/officeThreadFromWorkItem';
import { workItemShowsOnWorkspaceUnifiedInbox } from '../../lib/workItemPersonalInbox';
import {
  groupFileTrayItemsByCategory,
  workItemNeedsActionForUser,
  workItemShowsInFileTray,
  workItemShowsInUnfiledTray,
} from '../../lib/workspaceInboxBuckets';
import { workItemShowsOfficeDrawerTransactionIntel } from '../../lib/transactionIntelFromWorkItem';
import { WORKSPACE_CATEGORIES } from '../../lib/workspaceCategoryRegistry';
import { DEFAULT_INBOX_FILTERS, filterWorkItemsForInbox, itemsForWorkspaceView } from '../../lib/workspaceInboxFilters';
import { normalizeWorkItem, normalizeWorkItems } from '../../lib/workspaceWorkItemModel';
import { ComposeMemoButton } from '../office/OfficeRecordComposeDrawer';
import { OfficeThreadConversationDrawer } from '../office/OfficeThreadConversationDrawer';
import { ThreadDrawerTransactionIntel } from '../office/ThreadDrawerTransactionIntel';
import WorkspaceCoilMaterialPanel from './WorkspaceCoilMaterialPanel';
import WorkspaceEditApprovalPanel from './WorkspaceEditApprovalPanel';
import WorkspaceStaffPurchaseCreditPanel from './WorkspaceStaffPurchaseCreditPanel';
import WorkspaceWorkItemPreview from './WorkspaceWorkItemPreview';
import WorkItemRow from './WorkItemRow';
import { WorkspaceInboxEmptyState, WorkspaceInboxSkeleton } from './WorkspaceInboxEmptyState';
import { WorkspaceInboxToolbar } from './WorkspaceInboxToolbar';
import { WorkspaceReadingPaneHeader } from './WorkspaceReadingPaneHeader';
import { VirtualizedInboxList } from './WorkspaceCommandPalette';

const NAV_COLLAPSED_KEY = 'zarewa.workspace.navCollapsed';

/**
 * Zarewa Workspace Inbox — operational command center for work items and internal memos.
 * Internal component name kept as GmailStyleWorkspace for import stability.
 */
/** @deprecated Use OfficeDeskShell / WorkspaceDesk — kept for import stability */
export default function GmailStyleWorkspace({
  officeSummary = null,
  workItemsView,
  onWorkItemsViewChange,
  listMode: listModeProp = 'registry',
  onListModeChange,
  mailThreadId,
  onMailThreadIdChange,
  onCompose,
  onAiContextChange,
  categoryFilter: categoryFilterProp,
  onCategoryFilterChange,
}) {
  const ws = useWorkspace();
  const { show: showToast } = useToast();

  const [categoryFilter, setCategoryFilter] = useState(categoryFilterProp || 'all');
  const [listMode, setListMode] = useState(listModeProp);
  useEffect(() => {
    setListMode(listModeProp);
  }, [listModeProp]);

  const setListModeBoth = useCallback(
    (mode) => {
      setListMode(mode);
      onListModeChange?.(mode);
    },
    [onListModeChange]
  );
  const [selectedWorkItem, setSelectedWorkItem] = useState(null);
  const [inboxFilters, setInboxFilters] = useState(DEFAULT_INBOX_FILTERS);
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try {
      return sessionStorage.getItem(NAV_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileFolderOpen, setMobileFolderOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const userId = String(ws?.session?.user?.id || '').trim();
  const roleKey = ws?.session?.user?.roleKey;
  const unifiedWorkItems = ws?.snapshot?.unifiedWorkItems;
  const permissionsFromCtx = ws?.permissions;
  const canMonitor = Boolean(
    roleKey === 'admin' || roleKey === 'ceo' || roleKey === 'md' || roleKey === 'sales_manager'
  );
  const mayApproveStaffCredit = canApproveStaffPurchaseCredit(roleKey, permissionsFromCtx ?? []);
  const staffCreditCrossBranch = ws?.staffPurchaseCreditCrossBranch;

  const branchNames = useMemo(() => {
    const branches = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return Object.fromEntries(
      branches.map((b) => [String(b.id || '').trim(), String(b.name || b.code || b.id || '').trim()])
    );
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);

  const inboxCtx = useMemo(
    () => ({ userId, roleKey, permissions: permissionsFromCtx ?? [] }),
    [userId, roleKey, permissionsFromCtx]
  );

  const workspaceApprovalCtx = useMemo(
    () => ({
      permissions: permissionsFromCtx ?? [],
      roleKey,
      branchId: String(ws?.session?.workspaceBranchId || ws?.snapshot?.workspaceBranchId || '').trim(),
      viewAllBranches: Boolean(ws?.session?.viewAllBranches),
      canMutate: Boolean(ws?.canMutate),
      branchNames,
    }),
    [permissionsFromCtx, roleKey, ws?.session?.workspaceBranchId, ws?.snapshot?.workspaceBranchId, ws?.session?.viewAllBranches, ws?.canMutate, branchNames]
  );

  const allItems = useMemo(() => {
    const raw = Array.isArray(unifiedWorkItems) ? unifiedWorkItems : [];
    return raw.filter((item) => workItemShowsOnWorkspaceUnifiedInbox(item, inboxCtx));
  }, [unifiedWorkItems, inboxCtx]);

  const viewItems = useMemo(
    () =>
      itemsForWorkspaceView(workItemsView, allItems, inboxCtx, {
        workItemShowsInFileTray,
        workItemShowsInUnfiledTray,
      }),
    [allItems, inboxCtx, workItemsView]
  );

  const filteredItems = useMemo(() => {
    if (listMode !== 'registry') return [];
    const withFilters = filterWorkItemsForInbox(viewItems, inboxFilters, { userId, branchNames });
    const cat = categoryFilterProp ?? categoryFilter;
    if (cat === 'all') return withFilters;
    return withFilters.filter((item) => normalizeWorkItem(item, { userId, branchNames }).category === cat);
  }, [viewItems, inboxFilters, categoryFilter, categoryFilterProp, listMode, userId, branchNames]);

  const normalizedRows = useMemo(
    () => normalizeWorkItems(filteredItems.slice(0, 100), { userId, branchNames }),
    [filteredItems, userId, branchNames]
  );

  const fileSections = useMemo(() => {
    if (String(workItemsView) !== 'file' && String(workItemsView) !== 'unfiled') return [];
    return groupFileTrayItemsByCategory(normalizedRows.slice(0, 120));
  }, [workItemsView, normalizedRows]);

  const needsActionCount = useMemo(
    () => allItems.filter((item) => workItemNeedsActionForUser(item, userId)).length,
    [allItems, userId]
  );

  const unfiledCount = useMemo(
    () => allItems.filter((item) => workItemShowsInUnfiledTray(item, inboxCtx)).length,
    [allItems, inboxCtx]
  );

  const activeCategory = categoryFilterProp ?? categoryFilter;

  useEffect(() => {
    try {
      sessionStorage.setItem(NAV_COLLAPSED_KEY, navCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [navCollapsed]);

  useEffect(() => {
    if (categoryFilterProp != null) setCategoryFilter(categoryFilterProp);
  }, [categoryFilterProp]);

  useEffect(() => {
    onAiContextChange?.({
      folder: listMode === 'memos' ? 'memos' : workItemsView,
      category: activeCategory,
      selectedWorkItem: selectedWorkItem ? normalizeWorkItem(selectedWorkItem, { userId, branchNames }) : null,
      selectedThreadId: mailThreadId,
    });
  }, [listMode, workItemsView, activeCategory, selectedWorkItem, mailThreadId, onAiContextChange, userId, branchNames]);

  const loadThreads = useCallback(async () => {
    setThreadsLoading(true);
    const q = mineOnly ? '?mine=1' : '';
    const { ok, data } = await apiFetch(`/api/office/threads${q}`);
    setThreadsLoading(false);
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not load internal memos.', { variant: 'error' });
      setThreads([]);
      return;
    }
    setThreads(Array.isArray(data.threads) ? data.threads : []);
  }, [mineOnly, showToast]);

  useEffect(() => {
    if (listMode !== 'memos') return;
    void loadThreads();
  }, [listMode, loadThreads]);

  useEffect(() => {
    if (mailThreadId) setSelectedWorkItem(null);
  }, [mailThreadId]);

  const clearReadingPane = useCallback(() => {
    onMailThreadIdChange?.(null);
    setSelectedWorkItem(null);
  }, [onMailThreadIdChange]);

  const onRegistryRowActivate = useCallback(
    (item) => {
      const officeTid = officeThreadIdFromWorkItem(item);
      if (officeTid) {
        onMailThreadIdChange?.(officeTid);
        return;
      }
      onMailThreadIdChange?.(null);
      setSelectedWorkItem(item);
    },
    [onMailThreadIdChange]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await ws.refresh?.();
      await ws.refreshStaffPurchaseCreditPending?.();
      if (listMode === 'memos') await loadThreads();
    } finally {
      setRefreshing(false);
    }
  }, [ws, listMode, loadThreads]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [workItemsView, listMode, activeCategory]);

  const toggleSelectId = useCallback((id) => {
    const key = String(id || '').trim();
    if (!key) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleBulkRead = useCallback(async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/work-items/bulk/read', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
      if (ok && data?.ok) {
        const failed = data.failed ?? 0;
        if (failed > 0) {
          showToast(`Marked ${data.updated ?? data.succeeded ?? ids.length} read. ${failed} could not be updated.`, {
            variant: 'info',
          });
        } else {
          showToast(`Marked ${data.updated ?? data.succeeded ?? ids.length} item(s) as read.`);
        }
        setSelectedIds(new Set());
        await ws.refresh?.();
      } else {
        showToast(data?.error || 'Bulk read failed.', { variant: 'error' });
      }
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, showToast, ws]);

  const handleBulkArchive = useCallback(async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!(await appConfirm({ title: 'Archive', message: `Archive ${ids.length} selected item(s)?` }))) return;
    setBulkBusy(true);
    try {
      const { ok, data } = await apiFetch('/api/work-items/bulk/archive', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
      if (ok && data?.ok) {
        const failed = data.failed ?? 0;
        if (failed > 0) {
          showToast(`Archived ${data.updated ?? data.succeeded ?? ids.length}. ${failed} could not be archived.`, {
            variant: 'info',
          });
        } else {
          showToast(`Archived ${data.updated ?? data.succeeded ?? ids.length} item(s).`);
        }
        setSelectedIds(new Set());
        await ws.refresh?.();
      } else {
        showToast(data?.error || 'Bulk archive failed.', { variant: 'error' });
      }
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, showToast, ws]);

  const setCategory = useCallback(
    (cat) => {
      if (onCategoryFilterChange) onCategoryFilterChange(cat);
      else setCategoryFilter(cat);
    },
    [onCategoryFilterChange]
  );

  const navBtn = (active, onClick, icon, label, badge) => (
    <button
      type="button"
      onClick={() => {
        onClick();
        setMobileFolderOpen(false);
      }}
      aria-current={active ? 'page' : undefined}
      aria-label={navCollapsed ? label : undefined}
      title={label}
      className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
        active
          ? 'bg-white font-semibold text-teal-900 shadow-sm ring-1 ring-teal-200/80'
          : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
      } ${navCollapsed ? 'lg:justify-center lg:gap-0 lg:px-2' : ''}`}
    >
      <span className={`flex w-6 shrink-0 justify-center ${active ? 'text-teal-800' : 'text-slate-500'}`}>{icon}</span>
      {!navCollapsed ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
      {badge != null && badge > 0 ? (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
            active ? 'bg-white text-teal-900' : 'bg-slate-200/80 text-slate-700'
          } ${navCollapsed ? 'lg:absolute lg:right-0.5 lg:top-0.5 lg:min-h-[18px] lg:min-w-[18px] lg:px-0.5 lg:py-0 lg:text-ui-xs lg:leading-[18px]' : ''}`}
        >
          {navCollapsed && badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  );

  const detailOpen = Boolean(mailThreadId || selectedWorkItem);
  const normalizedSelected = selectedWorkItem
    ? normalizeWorkItem(selectedWorkItem, { userId, branchNames })
    : null;

  const detailTitle = useMemo(() => {
    if (normalizedSelected) return normalizedSelected.title;
    if (mailThreadId) {
      const t = threads.find((x) => x.id === mailThreadId);
      if (t?.subject) return String(t.subject);
      return 'Internal memo';
    }
    return '';
  }, [mailThreadId, normalizedSelected, threads]);

  const readingInner = mailThreadId ? (
    <OfficeThreadConversationDrawer variant="inline" threadId={mailThreadId} isOpen onDismiss={clearReadingPane} />
  ) : normalizedSelected ? (
    (() => {
      const dt = normalizedSelected.documentType;
      const onDone = () => void ws.refresh?.();
      if (dt === 'edit_approval') {
        return <WorkspaceEditApprovalPanel item={selectedWorkItem} onDone={onDone} />;
      }
      if (dt === 'staff_purchase_credit') {
        return <WorkspaceStaffPurchaseCreditPanel item={selectedWorkItem} onDone={onDone} />;
      }
      if (dt === 'material_request') {
        return <WorkspaceCoilMaterialPanel item={selectedWorkItem} onDone={onDone} />;
      }
      if (workItemShowsOfficeDrawerTransactionIntel(dt)) {
        return (
          <div className="flex h-full min-h-0 flex-col bg-white">
            <div className="min-h-0 flex-1 overflow-hidden">
              <ThreadDrawerTransactionIntel
                workItem={selectedWorkItem}
                variant="standalone"
                onManagementDecisionSuccess={() => void ws.refresh?.()}
              />
            </div>
          </div>
        );
      }
      return (
        <WorkspaceWorkItemPreview
          item={selectedWorkItem}
          onOpenThread={(tid) => {
            setSelectedWorkItem(null);
            onMailThreadIdChange?.(tid);
          }}
        />
      );
    })()
  ) : null;

  const folderNav = (
    <>
      {navBtn(
        workItemsView === 'needs_action' && listMode === 'registry',
        () => {
          clearReadingPane();
          setListModeBoth('registry');
          onWorkItemsViewChange?.('needs_action');
        },
        <Inbox size={18} />,
        'Action Inbox',
        needsActionCount
      )}
      {navBtn(
        workItemsView === 'all' && listMode === 'registry',
        () => {
          clearReadingPane();
          setListModeBoth('registry');
          onWorkItemsViewChange?.('all');
        },
        <Layers size={18} />,
        'Work Tray',
        null
      )}
      {navBtn(
        listMode === 'memos',
        () => {
          setListModeBoth('memos');
          clearReadingPane();
        },
        <MessageSquare size={18} />,
        'Internal Memos',
        officeSummary?.unreadApprox ?? null
      )}
      {navBtn(
        workItemsView === 'file' && listMode === 'registry',
        () => {
          clearReadingPane();
          setListModeBoth('registry');
          onWorkItemsViewChange?.('file');
        },
        <Archive size={18} />,
        'Filed',
        null
      )}
      {navBtn(
        workItemsView === 'unfiled' && listMode === 'registry',
        () => {
          clearReadingPane();
          setListModeBoth('registry');
          onWorkItemsViewChange?.('unfiled');
        },
        <AlertTriangle size={18} />,
        'Unfiled',
        unfiledCount
      )}
      {canMonitor
        ? navBtn(
            workItemsView === 'monitoring' && listMode === 'registry',
            () => {
              clearReadingPane();
              setListModeBoth('registry');
              onWorkItemsViewChange?.('monitoring');
            },
            <BarChart3 size={18} />,
            'Monitoring',
            null
          )
        : null}
    </>
  );

  const categoryEmptyMessage = WORKSPACE_CATEGORIES[activeCategory]?.emptyMessage || '';

  const renderRegistryRows = () => {
    if (!ws?.hasWorkspaceData) return <WorkspaceInboxSkeleton rows={8} />;

    if (String(workItemsView) === 'file' || String(workItemsView) === 'unfiled') {
      if (fileSections.length === 0) {
        return (
          <WorkspaceInboxEmptyState
            view={workItemsView}
            category={activeCategory}
            categoryEmptyMessage={categoryEmptyMessage}
          />
        );
      }
      return (
        <div className="divide-y divide-slate-100">
          {fileSections.map((section) => (
            <FileSectionGroup
              key={section.category}
              section={section}
              selectedWorkItemId={selectedWorkItem?.id}
              mailThreadId={mailThreadId}
              onActivate={onRegistryRowActivate}
            />
          ))}
        </div>
      );
    }

    if (normalizedRows.length === 0) {
      return (
        <WorkspaceInboxEmptyState
          view={workItemsView}
          category={activeCategory}
          categoryEmptyMessage={categoryEmptyMessage}
          canCompose={listMode === 'memos'}
          onCompose={onCompose}
        />
      );
    }

    return (
      <>
        {selectedIds.size > 0 ? (
          <BulkSelectionBar
            selectedCount={selectedIds.size}
            bulkBusy={bulkBusy}
            onMarkRead={() => void handleBulkRead()}
            onArchive={() => void handleBulkArchive()}
            onClear={() => setSelectedIds(new Set())}
          />
        ) : null}
        {normalizedRows.length > 40 ? (
          <VirtualizedInboxList
            items={normalizedRows}
            rowHeight={88}
            maxVisible={14}
            renderRow={(item) => {
              const tid = officeThreadIdFromWorkItem(item);
              const selected =
                selectedWorkItem?.id === item.id ||
                (Boolean(tid) && mailThreadId === tid) ||
                (selectedWorkItem?.id === item.id &&
                  workItemShowsOfficeDrawerTransactionIntel(item.documentType));
              return (
                <WorkItemRow
                  key={item.id}
                  item={item}
                  selected={selected}
                  onActivate={onRegistryRowActivate}
                  selectable
                  checked={selectedIds.has(item.id)}
                  onToggleSelect={() => toggleSelectId(item.id)}
                />
              );
            }}
            emptyState={
              <WorkspaceInboxEmptyState
                view={workItemsView}
                category={activeCategory}
                categoryEmptyMessage={categoryEmptyMessage}
              />
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {normalizedRows.map((item) => {
              const tid = officeThreadIdFromWorkItem(item);
              const selected =
                selectedWorkItem?.id === item.id ||
                (Boolean(tid) && mailThreadId === tid) ||
                (selectedWorkItem?.id === item.id &&
                  workItemShowsOfficeDrawerTransactionIntel(item.documentType));
              return (
                <WorkItemRow
                  key={item.id}
                  item={item}
                  selected={selected}
                  onActivate={onRegistryRowActivate}
                  selectable
                  checked={selectedIds.has(item.id)}
                  onToggleSelect={() => toggleSelectId(item.id)}
                />
              );
            })}
          </ul>
        )}
      </>
    );
  };

  const lastUpdatedLabel = ws?.snapshot?.generatedAtIso
    ? formatWorkItemDate(ws.snapshot.generatedAtIso)
    : '';

  return (
    <div
      className="max-w-full min-w-0 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04]"
      data-workspace-folder={listMode === 'memos' ? 'memos' : workItemsView}
      data-workspace-category={activeCategory}
    >
      <div className="flex h-[min(88vh,960px)] min-h-[min(520px,80vh)] w-full min-w-0 flex-col bg-white lg:flex-row">
        {/* Mobile folder selector */}
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileFolderOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
          >
            Workspace Inbox
            <ChevronRight size={16} className={mobileFolderOpen ? 'rotate-90' : ''} />
          </button>
          {mobileFolderOpen ? (
            <nav className="mt-2 flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2">{folderNav}</nav>
          ) : null}
          <div className="mt-2">
            <ComposeMemoButton onClick={() => onCompose?.()} className="w-full" />
          </div>
        </div>

        {/* Desktop folder rail */}
        <aside
          className={`hidden shrink-0 flex-col border-r border-slate-200 bg-slate-50/95 transition-[width] duration-200 ease-out lg:flex ${
            navCollapsed ? 'w-[3.25rem]' : 'w-56'
          }`}
          aria-label="Workspace inbox areas"
        >
          <div className="flex shrink-0 items-center justify-end border-b border-slate-200/80 px-2 py-1.5">
            <button
              type="button"
              onClick={() => setNavCollapsed((c) => !c)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-600 shadow-sm hover:border-teal-200 hover:bg-teal-50/80"
              aria-expanded={!navCollapsed}
              title={navCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              {navCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>
          <div className={`flex shrink-0 flex-col gap-2 px-2 pb-2 lg:px-3 ${navCollapsed ? 'lg:items-center' : ''}`}>
            <ComposeMemoButton
              onClick={() => onCompose?.()}
              aria-label={navCollapsed ? 'Compose Memo' : undefined}
              className={`shrink-0 lg:w-full ${
                navCollapsed ? 'lg:!w-11 lg:justify-center lg:[&>span:last-child]:hidden' : ''
              }`}
            />
          </div>
          <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1" aria-label="Inbox folders">
            {folderNav}
          </nav>
          {officeSummary && !navCollapsed ? (
            <div className="mt-auto px-3 pb-3 text-ui-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-700">{officeSummary.pendingActionApprox ?? 0}</span>{' '}
              pending ·{' '}
              <span className="font-mono font-semibold text-slate-700">{officeSummary.unreadApprox ?? 0}</span> unread
            </div>
          ) : null}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {!detailOpen && listMode === 'registry' ? (
            <>
              <WorkspaceInboxToolbar
                filters={inboxFilters}
                onFiltersChange={setInboxFilters}
                category={activeCategory}
                onCategoryChange={setCategory}
                onRefresh={() => void handleRefresh()}
                refreshing={refreshing}
                lastUpdatedLabel={lastUpdatedLabel}
                degraded={Boolean(ws?.usingCachedData)}
              />
              {mayApproveStaffCredit && Number(staffCreditCrossBranch?.otherBranchCount) > 0 ? (
                <div className="border-b border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950">
                  <strong>{staffCreditCrossBranch.otherBranchCount}</strong> staff purchase credit request
                  {staffCreditCrossBranch.otherBranchCount === 1 ? '' : 's'} pending in other branches.{' '}
                  <Link to="/manager?inbox=attention&attentionFilter=staff_credit" className="font-bold underline">
                    Open Manager → Staff credit
                  </Link>
                  {!ws?.viewAllBranches ? (
                    <>
                      {' '}
                      or switch workspace to <strong>All branches</strong>.
                    </>
                  ) : (
                    '.'
                  )}
                </div>
              ) : null}
            </>
          ) : null}

          {!detailOpen && listMode === 'memos' ? (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2.5">
              <p className="text-sm font-semibold text-slate-800">Internal Memos</p>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={mineOnly}
                    onChange={(e) => setMineOnly(e.target.checked)}
                    className="rounded border-slate-300 text-teal-800"
                  />
                  Mine only
                </label>
                <button
                  type="button"
                  disabled={threadsLoading}
                  onClick={() => void loadThreads()}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                  aria-label="Refresh memos"
                >
                  <RefreshCw size={16} className={threadsLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col">
            {!detailOpen ? (
              <div className="min-h-0 flex-1 overflow-y-auto bg-white">
                {listMode === 'memos' ? (
                  threadsLoading && threads.length === 0 ? (
                    <WorkspaceInboxSkeleton rows={5} />
                  ) : threads.length === 0 ? (
                    <WorkspaceInboxEmptyState view="memos" canCompose onCompose={onCompose} />
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {threads.slice(0, 60).map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedWorkItem(null);
                              onMailThreadIdChange?.(t.id);
                            }}
                            className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors ${
                              mailThreadId === t.id ? 'bg-teal-50 ring-1 ring-inset ring-teal-100' : 'hover:bg-slate-50'
                            }`}
                          >
                            <span className="line-clamp-1 text-[13px] font-semibold text-slate-900">{t.subject}</span>
                            <span className="line-clamp-1 text-xs text-slate-500">
                              {t.id} · {String(t.status || 'open').replace(/_/g, ' ')}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  renderRegistryRows()
                )}
              </div>
            ) : (
              <div className="fixed inset-0 z-40 flex min-h-0 min-w-0 flex-1 flex-col bg-white lg:static lg:inset-auto lg:z-auto">
                <WorkspaceReadingPaneHeader
                  onBack={clearReadingPane}
                  title={detailTitle}
                  item={normalizedSelected}
                  threadId={mailThreadId}
                  workspaceCtx={workspaceApprovalCtx}
                />
                <div className="min-h-0 flex-1 overflow-hidden pb-16 lg:pb-0">{readingInner}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FileSectionGroup({ section, selectedWorkItemId, mailThreadId, onActivate }) {
  return (
    <div className="px-1 py-3">
      <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{section.category}</p>
      {section.groups.map((g) => (
        <div key={`${section.category}-${g.subcategory}`} className="mb-3">
          <p className="px-3 pb-1 text-ui-xs font-semibold uppercase text-slate-400">{g.subcategory}</p>
          <ul>
            {g.items.map((raw) => {
              const item = normalizeWorkItem(raw);
              const tid = officeThreadIdFromWorkItem(item);
              const selected = selectedWorkItemId === item.id || (Boolean(tid) && mailThreadId === tid);
              return <WorkItemRow key={item.id} item={item} selected={selected} onActivate={onActivate} />;
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function formatWorkItemDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function BulkSelectionBar({ selectedCount, bulkBusy, onMarkRead, onArchive, onClear }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-teal-100 bg-teal-50/80 px-3 py-2">
      <span className="text-xs font-semibold text-teal-950">{selectedCount} selected</span>
      <button
        type="button"
        disabled={bulkBusy}
        onClick={onMarkRead}
        className="rounded-lg border border-teal-200 bg-white px-2.5 py-1 text-xs font-semibold text-teal-900 hover:bg-teal-50 disabled:opacity-50"
      >
        Mark read
      </button>
      <button
        type="button"
        disabled={bulkBusy}
        onClick={onArchive}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Archive
      </button>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        Clear
      </button>
    </div>
  );
}
