# Workspace V3 Audit Checklist

Use each find→fix cycle. Failures become ISSUE_LOG entries.

## UI

- [x] Body copy ≥ 12px (`text-xs` minimum for metadata)
- [x] Only four status colors: green / amber / red / slate
- [x] Teal chrome for primary actions; Sequence tokens
- [x] No duplicate KPI / count shown twice on same screen
- [x] Command bar always visible on desktop

## UX

- [x] Five zones only in left rail (Activity, Rooms, Action, Records, Apps)
- [x] Role profile changes filters/chips, not top-level nav count
- [x] Action is split-pane on desktop (list + detail)
- [x] Create flyout: Memo / Expense / Material / Notice (role-gated)
- [x] Context rail shows people + SLA + linked work when item selected
- [x] Mobile: bottom tabs or collapsible rail; no horizontal overflow

## Function

- [x] Feature flag off → legacy desk still works
- [x] Feature flag on → WorkspaceShell mounts
- [x] Approve / reject / file work items via existing APIs
- [x] Room send/receive (Phase 1+)
- [x] Promote chat → expense / memo / work item (Phase 3+)
- [x] SSE or poll fallback when realtime drops (Phase 2+)

## Metric

- [x] Unread badges match server counts
- [x] SLA timer color matches priority / due window
- [ ] Scorecard updated every 10 cycles — living; update on each loop batch

## ERP-fit

- [x] Branch scope respected (no cross-branch leak)
- [x] Confidentiality / office.use gates respected
- [x] Formal memo + work-item audit trail preserved
- [x] Chat cannot bypass approval dual-control
