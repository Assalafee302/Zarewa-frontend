# Workspace V3 Scorecard

Living metrics for Workspace 2.0. Update every 10 find→fix cycles.

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Time to first Action from login | < 10s | — | Measure after shell mounts |
| Clicks to approve expense from Activity | ≤ 3 | ≤ 3 | Activity → item → Context Approve (when endorseable) |
| Room message → visible (SSE) | < 2s | — | Phase 2+ with credentials |
| Room message → visible (poll) | < 60s | 30s active / 60s idle | Rooms zone uses 30s poll |
| SLA color compliance (green/amber/red/slate only) | 100% | 100% | wsBadge aliases remapped; busy dot now red |
| Role scenarios pass (Staff/BM/Office/Exec) | 4/4 | 4/4 | Zone config + shell paths covered; live staging smoke in CUTOVER |
| Feature-flag dual path P0 regressions | 0 | 0 | Legacy desk must stay green |
| Unread badge accuracy | matches server | matches | Action badge = needs_action tab count; own events excluded |
| SSE event confidentiality | branch/member scoped | scoped | Clients registered with scope; DM events member-only |
| getRoomMessages query count | O(1) queries | 1 + reads upsert | N+1 per-message SELECTs removed |
| Mention activity confidentiality | recipient-only | recipient-only | target_user_id filter on listActivityEvents |
| Leadership/announcement room ACL | exec-only write | enforced | userMayPostInRoom + userMayAccessRoom |
| DM office-thread API leak | blocked | blocked | conversation_mode dm/channel participant gate |
| Apps zone permission gating | module ACL | enforced | APP_MODULE_BY_ID filter in zone config |
| Room read cursor | explicit mark-read | explicit | GET messages no longer marks read by default |

## Loop progress

| Field | Value |
|-------|-------|
| closed_count | 300 |
| open_p0 | 0 |
| open_p1 | 0 |
| open_p2 | 0 |
| open_p3 | 0 |
| last_cycle | 300 |
| consecutive_p3_only | 0 |
| last_wv3_id | WV3-300 |

## Phase status

| Phase | Status |
|-------|--------|
| 0 Shell | complete |
| 1 Rooms | complete |
| 2 Activity/Presence/SSE | complete |
| 3 ERP Cards | complete |
| 4 Cutover | complete (flag opt-in; see CUTOVER.md) |
