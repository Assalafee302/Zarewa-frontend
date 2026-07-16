# Workspace V3 Scenario Matrix

Cycle `n` focuses role `n % 4` and rotates an audit axis.

## Roles

### 0 — Staff

1. Create expense via Create flyout
2. Create memo with To/Cc
3. See personal Action inbox (needs action)
4. Open branch `#general` room and send message
5. DM line manager (`POST /api/workspace/rooms/dm`)

### 1 — Branch Manager

1. Action filter: Endorsements
2. Incidents filter / open incident work item
3. Open `#approvals` room
4. Priority banner on Activity (when urgent item exists)
5. Deep-link to monitoring
6. Context rail Approve / Reject on selected endorsement

### 2 — Office (Finance / HR)

1. Review queue / Approvals filter
2. Expense conversion path (promote → expense_support wizard)
3. Filing in Records zone / Context File
4. Publish / acknowledge official notice

### 3 — Executive

1. High-value approvals filter
2. Overdue filter
3. Branch monitoring from Apps / Activity
4. Company announcements (`#announcements` company room)

## Audit axes (rotate)

1. UI density
2. Hierarchy / copy
3. Keyboard / a11y
4. Mobile
5. Performance
6. RBAC / confidentiality
7. SLA colors
8. Convert / promote
9. Notifications
10. Search
11. Empty / error states
12. Realtime fallback
