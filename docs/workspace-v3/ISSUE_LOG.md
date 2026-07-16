# Workspace V3 Issue Log

Format: `WV3-NNN | severity | area | role | status | note`

| ID | Sev | Area | Role | Status | Note |
|----|-----|------|------|--------|------|
| WV3-001 | P2 | metric | all | closed | Activity unread badge used fake fallback count |
| WV3-002 | P2 | ux | all | closed | Mobile bottom nav omitted Records and Apps zones |
| WV3-003 | P2 | ux | all | closed | Mobile Create tab replaced proper five-zone nav |
| WV3-004 | P2 | a11y | all | closed | Mobile tabs missing aria-current and focus ring |
| WV3-005 | P2 | metric | all | closed | Mobile tabs missing unread badges |
| WV3-006 | P2 | ux | all | closed | activeZone not reset when desk profile changes |
| WV3-007 | P1 | ux | all | closed | Room message view hidden on mobile |
| WV3-008 | P2 | ux | all | closed | Context rail double-mounted when panel closed |
| WV3-009 | P3 | function | all | closed | loadRooms re-fetched when activeRoomId changed |
| WV3-010 | P2 | function | all | closed | No poll fallback when SSE unavailable |
| WV3-011 | P3 | ux | all | closed | Refresh gave no toast feedback |
| WV3-012 | P2 | ui | all | closed | Main workspace column allowed horizontal overflow |
| WV3-013 | P2 | ui | all | closed | SLA badges used emerald/rose instead of green/red |
| WV3-014 | P2 | ui | all | closed | Presence dots used non-standard emerald/rose |
| WV3-015 | P2 | metric | all | closed | Context rail showed duplicate status chips |
| WV3-016 | P3 | ui | all | closed | Rail unread badges below 12px minimum |
| WV3-017 | P3 | ui | all | closed | Room list unread badges below 12px minimum |
| WV3-018 | P2 | function | all | closed | RoomList Row defined inline causing remounts |
| WV3-019 | P2 | a11y | all | closed | Command bar icon buttons missing aria-labels |
| WV3-020 | P2 | a11y | all | closed | Create flyout missing aria-expanded and Escape |
| WV3-021 | P2 | a11y | all | closed | Message composer textarea lacked accessible name |
| WV3-022 | P2 | a11y | all | closed | Promote menu missing keyboard dismiss and roles |
| WV3-023 | P2 | a11y | all | closed | Activity events lacked unread state and labels |
| WV3-024 | P3 | ux | all | closed | Apps zone empty state too minimal |
| WV3-025 | P2 | a11y | all | closed | Action filter chips missing aria-pressed |
| WV3-026 | P3 | function | all | closed | Room messages could render with unstable keys |
| WV3-027 | P3 | ux | all | closed | Room empty messages used plain text not empty state |
| WV3-028 | P2 | ui | all | closed | WorkCard status always amber regardless of state |
| WV3-029 | P2 | a11y | all | closed | WorkCard open buttons lacked descriptive label |
| WV3-030 | P2 | a11y | all | closed | Workspace rail zone buttons relied on title only |
| WV3-031 | P2 | a11y | all | closed | Records sub-tabs missing aria-labelledby wiring |
| WV3-032 | P2 | a11y | all | closed | App grid links missing navigation labels |
| WV3-033 | P2 | function | all | closed | SSE helper never signaled onopen connected state |
| WV3-034 | P2 | a11y | all | closed | Room list rows missing aria-current for selection |
| WV3-035 | P2 | a11y | all | closed | Context rail missing complementary landmark label |
| WV3-036 | P2 | ux | all | closed | Command bar not sticky on desktop scroll |
| WV3-037 | P3 | a11y | all | closed | Activity feed missing region and loading status |
| WV3-038 | P3 | ux | all | closed | Promote-to-record allowed empty message body |
| WV3-039 | P0 | erp-fit | all | closed | DM rooms listed to all branch users without membership check |
| WV3-040 | P0 | erp-fit | Staff | closed | Branch channels from other branches could leak when branch_id mismatched |
| WV3-041 | P0 | erp-fit | all | closed | viewAll could still list private DMs without membership |
| WV3-042 | P1 | function | all | closed | Archived rooms remained readable/writable |
| WV3-043 | P1 | function | Exec | closed | Company announcement rooms never provisioned |
| WV3-044 | P1 | function | Staff | closed | No createDmRoom API for line-manager DM scenario |
| WV3-045 | P1 | metric | all | closed | postRoomMessage did not emit activity.created events |
| WV3-046 | P1 | function | all | closed | Message body length unbounded (DoS / UI blow-up) |
| WV3-047 | P2 | function | all | closed | Mentions regex uncapped and unbounded length |
| WV3-048 | P1 | function | all | closed | office_thread_reads ON CONFLICT failed on MySQL-style wrappers |
| WV3-049 | P1 | function | all | closed | workspace_activity_reads ON CONFLICT lacked UPDATE/INSERT fallback |
| WV3-050 | P1 | function | all | closed | workspace_presence ON CONFLICT lacked UPDATE/INSERT fallback |
| WV3-051 | P2 | function | all | closed | Optional office_messages columns queried blindly per row |
| WV3-052 | P1 | function | all | closed | promoteFromRoom allowed empty excerpt on server |
| WV3-053 | P2 | function | all | closed | Unknown promote kinds silently created work items |
| WV3-054 | P2 | function | all | closed | Pin endpoint returned 400 for Forbidden/Not found |
| WV3-055 | P2 | function | all | closed | Promote endpoint returned 400 for Forbidden/Not found |
| WV3-056 | P2 | function | all | closed | SSE missing X-Accel-Buffering: no for reverse proxies |
| WV3-057 | P2 | function | all | closed | EventSource credential requirement undocumented on API |
| WV3-058 | P2 | metric | all | closed | Unread counted blank bodies and uncapped counts |
| WV3-059 | P2 | function | all | closed | primaryThreadId threw when room_threads table incomplete |
| WV3-060 | P2 | function | all | closed | postRoomMessage swallowed insert errors as success path |
| WV3-061 | P2 | erp-fit | Exec | closed | viewAll activity could include empty-branch orphan events |
| WV3-062 | P2 | function | all | closed | INSERT OR IGNORE membership failed without plain INSERT fallback |
| WV3-063 | P1 | ux | Office | closed | Promote expense/material used raw kind instead of CREATE_KIND_MAP |
| WV3-064 | P1 | function | BM | closed | ContextRail Approve/Reject/File never wired to actions |
| WV3-065 | P1 | ux | all | closed | useToast threw when WorkspaceShell mounted outside ToastProvider |
| WV3-066 | P2 | ux | all | closed | No room search filter in Rooms zone |
| WV3-067 | P2 | a11y | all | closed | No keyboard shortcuts for zone switching (1–5) / Escape |
| WV3-068 | P2 | function | all | closed | Poll interval stayed 60s even while viewing active room |
| WV3-069 | P2 | ui | all | closed | wsPriorityBadge/wsStatusBadge still emitted rose/emerald classes |
| WV3-070 | P2 | ux | all | closed | Reloading rooms reset activeRoomId even when still valid |
| WV3-071 | P2 | function | all | closed | SSE message.created did not refresh room unread list |
| WV3-072 | P2 | metric | BM | closed | Priority banner ignored urgent above high |
| WV3-073 | P2 | ux | Staff | closed | Create flyout Notice not role-gated (staff saw Official notice) |
| WV3-074 | P2 | a11y | all | closed | ContextRail action buttons lacked aria-labels |
| WV3-075 | P2 | a11y | all | closed | Activity priority Open lacked descriptive aria-label |
| WV3-076 | P3 | ux | all | closed | Mark-all-read enabled with empty activity list |
| WV3-077 | P3 | ui | all | closed | Room message timestamps showed raw ISO not locale string |
| WV3-078 | P3 | a11y | all | closed | Room message loading lacked role=status |
| WV3-079 | P3 | ui | all | closed | Context presence treated busy as offline slate |
| WV3-080 | P3 | ux | all | closed | No Live/Polling indicator in command bar |
| WV3-081 | P2 | function | all | closed | workspaceV3Api allowed empty roomId fetches |
| WV3-082 | P2 | function | all | closed | sendRoomMessage client accepted blank whitespace body |
| WV3-083 | P2 | function | all | closed | promoteRoomMessage client omitted excerpt validation |
| WV3-084 | P2 | function | Staff | closed | No client helper for POST /api/workspace/rooms/dm |
| WV3-085 | P2 | function | all | closed | openWorkspaceRealtime crashed when EventSource undefined |
| WV3-086 | P2 | function | all | closed | Activity/presence fetch helpers did not normalize non-array payloads |
| WV3-087 | P3 | function | all | closed | Activity/message limit query params not clamped client-side |
| WV3-088 | P2 | function | all | closed | Missing unit tests for VITE_WORKSPACE_V3 feature flag |
| WV3-089 | P2 | function | all | closed | Missing Dashboard V3>V2>legacy priority contract coverage |
| WV3-090 | P2 | function | all | closed | workspaceZoneConfig missing office/exec/label tests |
| WV3-091 | P2 | ui | all | closed | Missing SLA palette regression test for green/red tokens |
| WV3-092 | P2 | function | all | closed | workspaceV3Api helpers lacked unit coverage |
| WV3-093 | P2 | function | all | closed | workspaceRoomsOps tests lacked DM/branch-leak/oversized cases |
| WV3-094 | P3 | erp-fit | Staff | closed | AppsGrid navigated even when app.path empty |
| WV3-095 | P3 | a11y | Office | closed | Action empty detail pane missing role=status |
| WV3-096 | P3 | ux | all | closed | Convert menu stayed enabled while composer disabled/sending |
| WV3-097 | P2 | docs | all | closed | CUTOVER omitted EventSource credentials and DM endpoint |
| WV3-098 | P2 | docs | all | closed | AUDIT_CHECKLIST stale unchecked after Phase 0–2 fixes |
| WV3-099 | P2 | docs | all | closed | Feature flag module lacked priority-order documentation |
| WV3-100 | P2 | function | all | closed | File action missing from ContextRail (only in detail toolbar) |
| WV3-101 | P1 | function | all | closed | ACTION_TABS ('done') diverged from TASK_QUEUE_TABS — unified to one source |
| WV3-102 | P1 | function | Exec | closed | Overdue chip mapped to needs_action instead of the real overdue tab |
| WV3-103 | P1 | function | BM/Office/Exec | closed | Action chips only switched tabs — added workItemMatchesActionChip content filters |
| WV3-104 | P1 | ux | all | closed | Composer cleared draft before send confirmed — text lost on failure |
| WV3-105 | P1 | erp-fit | all | closed | SSE broadcast sent all events to all clients — now scoped by branch/viewAll |
| WV3-106 | P1 | erp-fit | all | closed | DM message SSE events now delivered to DM members only (targetUserIds) |
| WV3-107 | P2 | function | all | closed | SSE torn down/reconnected on every room switch — activeRoomId via ref |
| WV3-108 | P2 | function | all | closed | loadActivity depended on intelligence — full refetch on every item change |
| WV3-109 | P2 | ux | all | closed | Activity-unavailable toast fired every poll cycle — now warns once |
| WV3-110 | P1 | function | all | closed | Backend emitted message.created activity for every channel post — feed noise |
| WV3-111 | P2 | metric | all | closed | Own actions counted as unread activity for the actor (server + client) |
| WV3-112 | P2 | function | Office/Exec | closed | Create > Official notice opened memo wizard — now routes to Records > Notices |
| WV3-113 | P2 | metric | all | closed | Action badge counted pending/open/review — now matches needs_action tab count |
| WV3-114 | P2 | function | all | closed | Composer not disabled in read-only cached-snapshot mode |
| WV3-115 | P2 | function | all | closed | fileSelectedRecord not guarded when offline/read-only |
| WV3-116 | P2 | function | BM | closed | Approve/Reject could double-fire — busy state now disables buttons |
| WV3-117 | P1 | function | Staff | closed | DM API existed but no UI — New DM picker with office directory added |
| WV3-118 | P2 | ux | all | closed | No client-side max-length on composer — maxLength + live counter at 7.5k |
| WV3-119 | P2 | function | all | closed | getRoomMessages ran N+1 extra SELECTs per message — single query now |
| WV3-120 | P2 | function | all | closed | getRoomMessages resolved author name per message — cached per author |
| WV3-121 | P2 | function | all | closed | Zone id from location.state not validated — isValidWorkspaceZone gate |
| WV3-122 | P2 | ux | all | closed | Zone hotkeys fired while create dialog open |
| WV3-123 | P2 | ux | all | closed | scrollIntoView scrolled whole page — container scrollTo only |
| WV3-124 | P2 | ux | all | closed | Autoscroll yanked reader down mid-history — now only when near bottom |
| WV3-125 | P2 | ux | all | closed | No jump-to-latest affordance when new messages arrive while scrolled up |
| WV3-126 | P3 | ux | all | closed | Verbose full timestamps — compact time for today, date+time otherwise |
| WV3-127 | P2 | ux | Exec | closed | Priority banner didn't open the named work item when resolvable |
| WV3-128 | P3 | ux | all | closed | Composer focus not restored to textarea after send |
| WV3-129 | P3 | ux | BM | closed | Chip hint text row removed — pressed chip state is the indicator |
| WV3-130 | P3 | ux | all | closed | Chips couldn't be toggled off by re-click — second click clears |
| WV3-131 | P2 | ux | all | closed | Empty room list on API failure was silent — retry button added |
| WV3-132 | P3 | ui | all | closed | Mobile context sheet lacked elevation — rounded top + shadow |
| WV3-133 | P2 | a11y | all | closed | aria-current="true" invalid on room rows — now "location" |
| WV3-134 | P2 | a11y | all | closed | Message list missing role=log + aria-live for incoming messages |
| WV3-135 | P3 | ui | all | closed | Presence busy dot was amber (same as away) — now red per palette |
| WV3-136 | P3 | a11y | all | closed | Convert menu first item not focused on open; focus returns to trigger |
| WV3-137 | P3 | a11y | all | closed | Live/Polling chip had title only — role=status + aria-label added |
| WV3-138 | P3 | a11y | all | closed | Promote menu Escape didn't return focus to trigger |
| WV3-139 | P2 | function | all | closed | Mention regex captured trailing punctuation ("@ali." → "ali.") |
| WV3-140 | P2 | function | all | closed | Default rooms provisioning wrote on every GET — per-db memo added |
| WV3-141 | P3 | function | all | closed | promoteFromRoom dead fallback title branch removed |
| WV3-142 | P2 | function | all | closed | SSE stream missing retry hint for EventSource reconnection |
| WV3-143 | P2 | function | all | closed | Presence heartbeat kept firing in hidden tabs — pauses + reports away |
| WV3-144 | P2 | function | all | closed | Polling loop kept fetching while tab hidden — visibility guard |
| WV3-145 | P3 | ux | all | closed | TaskQueue empty state generic under chip filter — chip-aware message |
| WV3-146 | P2 | function | all | closed | Tests updated: plain posts stay out of activity feed (contract change) |
| WV3-147 | P2 | function | all | closed | New tests: mention activity + handle punctuation + own-events-read |
| WV3-148 | P2 | function | all | closed | New tests: chip filters, chip→tab validity, zone validation |
| WV3-149 | P3 | ui | all | closed | Stray blank line / disabled textarea styling in command bar & composer |
| WV3-150 | P2 | docs | all | closed | ISSUE_LOG + SCORECARD updated for the 101–150 hardening pass |

## Severity

- **P0:** Broken approve/file/create, data loss, branch leak, RBAC bypass
- **P1:** Cannot complete SOP path, missing unread, broken promote
- **P2:** UX friction (extra clicks, hierarchy, mobile overflow)
- **P3:** Visual polish, copy, spacing

## Areas

`ui` | `ux` | `function` | `metric` | `erp-fit` | `a11y` | `docs`
