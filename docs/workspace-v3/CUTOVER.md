# Staging / production cutover — Workspace V3

## Staging / Production

1. V3 is **on by default** (unset env). Set `VITE_WORKSPACE_V3=0` only to roll back to Desk V2 / legacy.
2. Restart API so `migrateWorkspaceV3Rooms` runs (rooms, activity, presence tables).
3. Smoke: Staff / BM / Office / Exec — Action approve, Chat/DM send + attach image, Activity load, Create expense.
4. Confirm EventSource uses cookie credentials (`withCredentials: true`); if SSE fails, shell falls back to 30–60s polling.
5. Monitor SSE clients and unread badge accuracy; company rooms (`#announcements`, `#leadership`) and DM create must be live.
6. `workspaceDeskNav` remains for legacy/profile helpers only.
