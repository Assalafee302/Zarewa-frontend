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
| WV3-151 | P1 | metric | all | closed | Priority banner read intelligence.alerts/items — now uses suggestions + overdue deep-link |
| WV3-152 | P1 | function | all | closed | Activity fallback synthesized from wrong intelligence fields — fixed to suggestions + priorities.overdue |
| WV3-153 | P2 | ux | all | closed | Activity/rooms polling flashed loading spinner — silent refresh when data already present |
| WV3-154 | P1 | function | all | closed | Dual useOfficeRecordActions in shell + detail — shared recordActions prop |
| WV3-155 | P1 | function | all | closed | Room switch race showed stale messages — seq guard + AbortController |
| WV3-156 | P1 | function | all | closed | Promote work item opened before refresh — await refresh then resolve item |
| WV3-157 | P2 | function | all | closed | Deep-link taskTab not validated — isValidTaskQueueTab guard |
| WV3-158 | P2 | ux | all | closed | Profile change left stale action chip — cleared on profile switch |
| WV3-159 | P2 | metric | BM | closed | canMonitor omitted branch_manager/chairman/ceo — MONITOR_ROLES expanded |
| WV3-160 | P1 | ux | all | closed | Create allowed in read-only snapshot — blocksCreate includes readOnly |
| WV3-161 | P2 | a11y | all | closed | Zone hotkeys fired while create menu open — gated on createMenuOpen |
| WV3-162 | P2 | function | all | closed | Mark all read optimistically on API failure — checks markWorkspaceActivityRead result |
| WV3-163 | P2 | function | Office | closed | Context rail File had no busy state — filingBusy + fileBusy prop |
| WV3-164 | P2 | ui | all | closed | Main canvas missing min-h-0 — flex overflow fixed |
| WV3-165 | P2 | function | all | closed | Selected work item stale after refresh — sync effect from visibleWorkItems |
| WV3-166 | P2 | function | all | closed | DM directory fetch failure set empty array — retry-friendly null/undefined |
| WV3-167 | P2 | a11y | all | closed | Task queue selection not announced — aria-current on selected row |
| WV3-168 | P2 | a11y | all | closed | Records sub-tabs missing aria-controls — tabpanel wiring |
| WV3-169 | P2 | erp-fit | Exec | closed | Executive could promote material request — deskProfile-gated promote menu |
| WV3-170 | P2 | erp-fit | all | closed | Apps grid showed modules without permission — APP_MODULE_BY_ID filter |
| WV3-171 | P2 | function | all | closed | Unknown task queue tab showed full inbox — default case returns false |
| WV3-172 | P3 | ux | all | closed | Activity timestamps raw ISO — relative formatActivityWhen |
| WV3-173 | P2 | ui | all | closed | Context rail presence busy/away same color — four-color palette |
| WV3-174 | P2 | function | Office | closed | OfficeRecordDetail filed without read-only guard — reconnect warning |
| WV3-175 | P2 | function | all | closed | fetchRoomMessages lacked abort signal — passed through apiFetch |
| WV3-176 | P2 | function | all | closed | Room unread not cleared on view — markRoomRead on open + SSE |
| WV3-177 | P2 | function | all | closed | workspaceV3Api missing markRoomRead export — added POST /read client |
| WV3-178 | P3 | function | all | closed | zone config tests assumed apps without permissions — permissions in test |
| WV3-179 | P0 | erp-fit | all | closed | DM/channel office threads visible via admin/HQ rollup — conversation_mode gate |
| WV3-180 | P0 | erp-fit | Exec | closed | Leadership company room readable by all branch staff — exec role ACL |
| WV3-181 | P0 | erp-fit | all | closed | Mention activity visible to whole branch — target_user_id recipient filter |
| WV3-182 | P1 | erp-fit | all | closed | Announcements room writable by any member — userMayPostInRoom exec-only |
| WV3-183 | P1 | erp-fit | all | closed | Department rooms visible to whole branch — dept role + membership ACL |
| WV3-184 | P1 | erp-fit | all | closed | DM rooms listed without membership SQL filter — EXISTS member subquery |
| WV3-185 | P1 | function | all | closed | Duplicate default rooms on concurrent provision — unique index on scope/branch/slug |
| WV3-186 | P2 | function | all | closed | getRoomMessages marked read on every load — markRead default false + POST read |
| WV3-187 | P2 | function | all | closed | No message pagination cursor — beforeIso on getRoomMessages |
| WV3-188 | P2 | function | all | closed | SSE unbounded connections — per-user cap 3, total cap 500 |
| WV3-189 | P2 | function | all | closed | pinRoomWorkCard skipped work item visibility — confidential check |
| WV3-190 | P2 | function | all | closed | Mention resolution matched display_name ambiguously — username only |
| WV3-191 | P2 | function | all | closed | promoteFromRoom ignored messageId thread ownership — verified |
| WV3-192 | P2 | function | all | closed | postRoomMessage/createDmRoom/pin missing audit — appendAuditLog added |
| WV3-193 | P2 | function | all | closed | Muted room members still got unread — muted_until_iso respected |
| WV3-194 | P2 | function | all | closed | Presence desk_key not persisted — upsert/list deskKey |
| WV3-195 | P2 | function | all | closed | Mention inserts outside transaction — folded into message txn |
| WV3-196 | P2 | function | all | closed | schema/migrate missing activity target_user_id + room indexes |
| WV3-197 | P2 | function | all | closed | httpApi missing POST /rooms/:id/read — route added |
| WV3-198 | P2 | function | all | closed | Tests for leadership deny, announcement post deny, activity filter — added |
| WV3-199 | P3 | function | all | closed | DM create peer inactive / slug reuse hardened |
| WV3-200 | P2 | docs | all | closed | ISSUE_LOG + SCORECARD updated for 151–200 hardening pass |
| WV3-201 | P2 | erp-fit | all | closed | Apps ERP completeness: real route inventory and permission gates |
| WV3-202 | P2 | erp-fit | Staff | closed | Apps ERP completeness: Sales and HR links |
| WV3-203 | P2 | erp-fit | Staff | closed | Apps ERP completeness: Operations link |
| WV3-204 | P2 | erp-fit | Staff | closed | Apps ERP completeness: Production uses the real Operations route |
| WV3-205 | P2 | erp-fit | BM | closed | Apps ERP completeness: Cashier link |
| WV3-206 | P2 | erp-fit | BM | closed | Apps ERP completeness: Operations and monitoring links |
| WV3-207 | P2 | erp-fit | Office | closed | Apps ERP completeness: Accounts and Accounting links |
| WV3-208 | P2 | erp-fit | Office | closed | Apps ERP completeness: HR and Edit Approvals links |
| WV3-209 | P2 | erp-fit | Office | closed | Apps ERP completeness: Procurement link |
| WV3-210 | P2 | erp-fit | Exec | closed | Apps ERP completeness: Reports retained with executive tools |
| WV3-211 | P2 | ux | all | closed | ERP category chips added across profiles |
| WV3-212 | P2 | function | all | closed | Sales chip uses category registry matching |
| WV3-213 | P2 | function | all | closed | Finance chip uses category registry matching |
| WV3-214 | P2 | function | all | closed | Inventory chip uses category registry matching |
| WV3-215 | P2 | function | all | closed | Operations chip uses category registry matching |
| WV3-216 | P2 | function | all | closed | HR/Admin chip uses category registry matching |
| WV3-217 | P2 | function | all | closed | Memos chip uses category registry matching |
| WV3-218 | P2 | function | BM | closed | Endorsement heuristics retained |
| WV3-219 | P2 | function | Office | closed | Review and approval heuristics retained |
| WV3-220 | P2 | function | Exec | closed | High-value and branch-pulse filters narrowed |
| WV3-221 | P2 | ux | all | closed | Today work cards moved into Activity |
| WV3-222 | P2 | function | all | closed | Today cards deep-link to Action tabs |
| WV3-223 | P2 | ux | Staff | closed | My HR card restored in Activity |
| WV3-224 | P2 | ux | Office | closed | My HR card restored for office profiles |
| WV3-225 | P2 | ux | Staff | closed | Expense quick actions restored in Activity |
| WV3-226 | P2 | ux | Office | closed | Expense quick actions restored for office profiles |
| WV3-227 | P1 | function | all | closed | Zone deep-link state supported |
| WV3-228 | P1 | function | all | closed | Task-tab deep-link state supported |
| WV3-229 | P1 | function | all | closed | Room deep-link state supported |
| WV3-230 | P1 | function | all | closed | Work-item deep-link state supported |
| WV3-231 | P2 | function | all | closed | Compose deep-link preserved |
| WV3-232 | P2 | ux | all | closed | Last valid zone persisted per session |
| WV3-233 | P2 | function | all | closed | Invalid saved zones safely ignored |
| WV3-234 | P1 | function | all | closed | Room mute API client wired |
| WV3-235 | P1 | function | all | closed | Room archive API client wired |
| WV3-236 | P1 | function | all | closed | Message edit API client wired |
| WV3-237 | P1 | function | all | closed | Message delete API client wired |
| WV3-238 | P2 | function | all | closed | Message pagination cursor sent to API |
| WV3-239 | P2 | function | all | closed | Earlier messages prepend without replacing history |
| WV3-240 | P2 | ux | all | closed | Load-earlier progress and availability added |
| WV3-241 | P1 | function | all | closed | Selected work item can pin to active room |
| WV3-242 | P2 | ux | all | closed | Pin action exposed in context rail |
| WV3-243 | P2 | function | all | closed | Operations incident create type mapped |
| WV3-244 | P2 | function | all | closed | Fuel/diesel create type mapped |
| WV3-245 | P2 | function | all | closed | Leave creation links to HR self-service |
| WV3-246 | P2 | function | all | closed | Presence heartbeat sends active desk key |
| WV3-247 | P1 | function | all | closed | Failed offline messages queue per room |
| WV3-248 | P1 | function | all | closed | Queued messages retry on reconnect |
| WV3-249 | P2 | ux | all | closed | Queue status is reported without losing the draft |
| WV3-250 | P2 | function | all | closed | Workspace API additions degrade through structured errors |
| WV3-251 | P2 | ui | all | closed | Muted room indicator added |
| WV3-252 | P2 | ui | all | closed | Muted room opacity styling added |
| WV3-253 | P2 | ux | all | closed | Room overflow actions added |
| WV3-254 | P2 | function | all | closed | Mute for eight hours action added |
| WV3-255 | P2 | function | all | closed | Unmute action added |
| WV3-256 | P2 | function | all | closed | Archive limited to channels |
| WV3-257 | P2 | ux | all | closed | Room header mute control added |
| WV3-258 | P2 | ux | all | closed | Channel header archive control added |
| WV3-259 | P2 | ux | all | closed | Message hover and focus actions added |
| WV3-260 | P2 | function | all | closed | Reply action populates composer context |
| WV3-261 | P2 | function | all | closed | Reply sends parent message id |
| WV3-262 | P2 | function | all | closed | Copy message action added |
| WV3-263 | P1 | function | all | closed | Own-message edit action added |
| WV3-264 | P1 | function | all | closed | Own-message delete action added |
| WV3-265 | P2 | function | all | closed | Message promotion carries source message id |
| WV3-266 | P2 | ui | all | closed | Edited marker rendered |
| WV3-267 | P2 | ui | all | closed | Deleted message tombstone rendered |
| WV3-268 | P2 | ux | all | closed | Reply context rendered above composer |
| WV3-269 | P2 | ux | all | closed | Mention autocomplete detects active at-token |
| WV3-270 | P2 | function | all | closed | Directory mention suggestions insert usernames |
| WV3-271 | P2 | ux | all | closed | Records notices tab retained |
| WV3-272 | P2 | ux | all | closed | Records filing tab deepened |
| WV3-273 | P2 | ux | all | closed | Records search tab deepened |
| WV3-274 | P2 | ux | all | closed | Records drafts tab added |
| WV3-275 | P2 | ux | all | closed | Records filed tab added |
| WV3-276 | P2 | function | all | closed | Needs-filing records listed from live items |
| WV3-277 | P2 | function | all | closed | Filed records listed from live items |
| WV3-278 | P2 | function | all | closed | Record rows open Action detail |
| WV3-279 | P2 | function | all | closed | Local record title filtering added |
| WV3-280 | P2 | function | all | closed | Local filing-number filtering added |
| WV3-281 | P2 | function | Office | closed | Official notice creation uses existing API |
| WV3-282 | P2 | ux | all | closed | Action inbox accepts compact Today cards |
| WV3-283 | P2 | function | all | closed | Action item source-room link added |
| WV3-284 | P2 | function | all | closed | Context source-room link added |
| WV3-285 | P2 | ui | all | closed | Filing reference shown in context |
| WV3-286 | P2 | ux | all | closed | Apps support optional icons |
| WV3-287 | P2 | ux | all | closed | Apps support descriptions |
| WV3-288 | P2 | function | all | closed | Apps support optional badge maps |
| WV3-289 | P2 | ux | all | closed | Incident added to Create menu |
| WV3-290 | P2 | ux | all | closed | Fuel record added to Create menu |
| WV3-291 | P2 | ux | all | closed | Leave request added to Create menu |
| WV3-292 | P3 | ux | all | closed | Search keyboard hint added |
| WV3-293 | P2 | a11y | all | closed | Room action controls have accessible labels |
| WV3-294 | P2 | a11y | all | closed | Message actions expose focus states |
| WV3-295 | P2 | a11y | all | closed | Mention suggestions have an accessible label |
| WV3-296 | P2 | function | all | closed | Existing APIs verified before frontend wiring |
| WV3-297 | P2 | function | all | closed | Production avoids a nonexistent route |
| WV3-298 | P2 | function | all | closed | Category, zone, and flag tests pass |
| WV3-299 | P2 | docs | all | closed | Completion themes mapped in issue log |
| WV3-300 | P2 | docs | all | closed | SCORECARD advanced through Workspace V3 completion pass |

## Severity

- **P0:** Broken approve/file/create, data loss, branch leak, RBAC bypass
- **P1:** Cannot complete SOP path, missing unread, broken promote
- **P2:** UX friction (extra clicks, hierarchy, mobile overflow)
- **P3:** Visual polish, copy, spacing

## Areas

`ui` | `ux` | `function` | `metric` | `erp-fit` | `a11y` | `docs`
