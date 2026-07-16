# Staging / production cutover — Workspace V3

## Staging

1. Set `VITE_WORKSPACE_V3=1` in the frontend env.
2. Keep `VITE_OFFICE_DESK_V2=1` unused (V3 takes priority in `Dashboard.jsx`).
3. Restart API so `migrateWorkspaceV3Rooms` runs (rooms, activity, presence tables).
4. Smoke: Staff / BM / Office / Exec — Action approve, Rooms send, Activity load, Create expense.
5. Confirm EventSource uses cookie credentials (`withCredentials: true`); if SSE fails, shell falls back to 30–60s polling.

## Production

1. Enable after staging sign-off and scorecard role scenarios 4/4 green.
2. Default env to `VITE_WORKSPACE_V3=1`.
3. Monitor SSE clients and unread badge accuracy for one week.
4. Then remove reliance on flat `workspaceDeskNav` sections for the home route (file kept for legacy/profile helpers).
5. Company rooms (`#announcements`, `#leadership`) and DM create (`POST /api/workspace/rooms/dm`) must be live before cutover sign-off.
