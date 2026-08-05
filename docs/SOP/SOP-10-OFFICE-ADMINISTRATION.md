# SOP-10: OFFICE ADMINISTRATION

**Zarewa Aluminium and Plastics Ltd — System of Operations v3.0**  
**Department:** Office Administration  
**System modules:** `/` (Workspace), `/edit-approvals`, Office threads, Forum, Notices  
**Primary roles:** All staff with `office.use`  
**Senior roles:** `md`, `admin`, `hr_admin`, `gmhr` (notices.manage)

---

## 1. PURPOSE AND SCOPE

Office Administration is the digital workplace for internal communication, structured requests, document filing, and cross-department coordination. Every staff member with `office.use` accesses the **Workspace** (`/`) as their collaboration hub.

---

## 2. WORKSPACE DESK PROFILES

### 2.1 Legacy desk (VITE_OFFICE_DESK_V2)

Desk layout adapts by role (`workspaceDeskNav.js`):

| Profile | Sections |
|---------|----------|
| Staff | My Desk, Create Office Record, My Requests, Tasks, Official Notices, Forum, Search |
| Branch (BM) | Branch Desk, Today's Work, Endorsements, Team Requests, Expense Conversions, Incidents, Branch Forum, Filing, Monitoring, Search |
| Office (Finance/HR) | Office Desk, Review Queue, Approvals, Expense Conversions, Filing, Notices, Forum, Monitoring, Records, Search |
| Executive (MD) | Executive Desk, High-value Approvals, Branch Monitoring, Notices, Branch Contributions, Overdue Items, Expense Oversight, Records, Search |

### 2.2 Workspace V3 (VITE_WORKSPACE_V3=1) — Teams-style Online Office

When `VITE_WORKSPACE_V3=1`, home `/` mounts **WorkspaceShell** with five zones (not 10+ nav sections). Role profiles filter Action chips and Apps only (`workspaceZoneConfig.js`).

| Zone | Purpose |
|------|---------|
| Activity | Mentions, assignments, SLA alerts, priority banner |
| Rooms | Branch channels (`#general`, `#sales`, `#store`, `#production`, `#cashier`, `#approvals`) + DMs |
| Action | Needs action / Waiting / Done — split-pane inbox |
| Records | Official notices, filing, search |
| Apps | Role-scoped ERP deep links |

**Promote rule:** Casual room chat may be converted to formal memo, expense, material request, or work item. Formal memos and work items keep the audit trail; free chat cannot bypass dual-control approvals.

**Realtime:** SSE `/api/workspace/realtime` with revision-poll fallback when the stream drops.

**Mobile:** Bottom tabs Activity | Rooms | Action | Create.

**Cutover:** Enable V3 in staging first (`VITE_WORKSPACE_V3=1`). Legacy `VITE_OFFICE_DESK_V2` remains until production cutover. Forum remains readable; new discussion prefers Rooms.

---

## 3. CREATE OFFICE RECORD WIZARD

### 3.1 Record Types

| Type | Purpose | Approval Route |
|------|---------|----------------|
| Memo | Internal communication | Filing / thread conversation |
| Expense request | Authorise spending | BM/MD → Finance payout |
| Official notice | Company announcement | Senior staff publish |
| Forum post | Discussion topic | Moderation by senior roles |
| Material request | Stock transfer request | Operations fulfilment |

### 3.2 Expense Request Procedure

1. **Workspace** → **Create Office Record** → **Expense request**.
2. Select **expense category** (see GL mapping in SOP-03).
3. **"Others" category:** minimum 40-character justification required.
4. Add lines: payee, amount, description, supporting attachment.
5. Submit → routes to Branch Manager (≤₦200k) or MD (>₦200k).
6. On approval → appears in **Finance Desk** queue for payout.
7. Filing reference issued: `ZR/{branch}/{domain}/{year}/{seq}`.

### 3.3 Smart Memo Composer

Structured internal communications with:
- To/From/Cc routing
- Subject and body
- Attachment support
- AI polish optional (`/api/office/ai/polish-memo`)

---

## 4. WORK ITEMS AND SLA

### 4.1 Unified Inbox

Views: **Action Inbox**, **Work Tray**, **Filed**, **Unfiled**

### 4.2 SLA by Priority

| Priority | SLA Window |
|----------|------------|
| Critical | 4 hours |
| Urgent / High | 24 hours |
| Normal | 48 hours |

### 4.3 Routing by Role

| Role | Office Desk |
|------|-------------|
| sales_manager | branch_manager |
| sales_staff | sales |
| operations_officer | operations |
| finance_manager / cashier | finance |
| md | executive |
| admin | office_admin |

### 4.4 Work Item Lifecycle

1. Created (from office record, system event, or manual)
2. Assigned to desk/role
3. Decision recorded (`work_item_decisions`)
4. Filed with reference
5. Print snapshot at closure (`work_item_print_snapshots`)

---

## 5. EDIT APPROVALS

### 5.1 When Required

Sensitive edits to locked records:
- Confirmed quotations
- Received POs
- Cleared customer records
- Confirmed deliveries

### 5.2 Procedure

1. User attempts edit → system blocks with **Edit Approval Required**.
2. User submits edit approval request with description of change.
3. Approver (BM or MD) opens `/edit-approvals`.
4. Reviews change; issues **6-digit one-time code** to requester.
5. Requester enters code → **single save consumed**.
6. Logged in `approval_actions` and `audit_log`.

**Security:** Code expires; cannot reuse; approver cannot be requester.

---

## 6. OFFICIAL NOTICES

### 6.1 Authority

`notices.manage`: md, admin, hr_admin, gmhr, ceo, chairman

### 6.2 Publishing Procedure

1. **Workspace** → **Official Notices** → **New Notice**.
2. Set title, body, attachments.
3. Target: all staff, specific branch(es), role(s), or department(s).
4. Options:
   - **Require acknowledgement** — staff must click Acknowledge
   - **Pin to board** — stays at top
   - **Expiry date** — auto-archive
5. Publish → `official_notices` + read/acknowledgement tracking.

### 6.3 Staff Procedure

1. Check **Official Notices** on Workspace daily.
2. Read and **Acknowledge** where required.
3. Unacknowledged notices appear in dashboard alerts.

---

## 7. COMPANY FORUM

| Scope | Visibility | Create Permission |
|-------|------------|-------------------|
| Branch | Branch staff only | All with office.use |
| Company | All staff | Senior roles only |

**Rules:**
- Professional conduct — discipline policy applies
- No customer pricing or confidential financial data
- HR may remove posts; gross misconduct triggers discipline case

---

## 8. OFFICE DOSSIERS AND FILING

### 8.1 Dossiers

Document cabinet for filed office records:
- `office_dossiers` + `office_dossier_links`
- Version history in `office_record_versions`

### 8.2 Filing Completeness

Before work item closure:
- `filingCompleteness.js` checks required fields
- Documents without filing number cannot be archived
- AI-assisted filing: `/api/office/threads/:id/ai-file`

### 8.3 Inter-Branch Office Requests

Cross-branch coordination:
- Branch manager creates request
- Tracked as work item
- May convert to material request or payment request

---

## 9. CONFIDENTIAL ACCESS

Work items and threads may be marked **confidential**:
- Only participants (`userIsWorkItemParticipant`) or elevated access (`workspaceConfidentialAccess.js`) can view
- Used for sensitive HR, legal, and financial matters
- Do not screenshot or forward outside system

---

## 10. WORKSPACE SEARCH

`GET /api/workspace/search`:
- Authenticated; results filtered by entity permissions
- Search customers, quotations, coils, work items, staff
- CEO has empty search (no line-level access)

---

## 11. EXPENSE CATEGORY COACHING

System monitors **"Others"** expense category:
- >₦50,000: Finance review flag
- >15% of branch expenses: coaching alert to BM
- MD sees trend on Command Centre

Staff should use specific categories where possible; reserve Others for genuine exceptions.

---

## 12. DAILY OFFICE ADMINISTRATION CHECKLIST

**All staff:**
- [ ] Check Action Inbox on Workspace
- [ ] Read unacknowledged official notices
- [ ] File completed work items (move from Unfiled to Filed)

**Branch Manager:**
- [ ] Clear endorsement queue
- [ ] Approve expense requests within SLA
- [ ] Review branch forum for issues

**MD / Admin:**
- [ ] Review executive desk overdue items
- [ ] Publish company notices as needed

---

## 13. AI ASSISTANT (ZARE) IN OFFICE CONTEXT

- **Tour this page** on Workspace for navigation coaching
- Memo polish for formal communications
- Cannot approve, file, or post on user's behalf
- Queries logged for knowledge base improvement

---

*End of SOP-10. Cross-references: SOP-02 (Expense payout), SOP-08 (MD approvals), SOP-01 (Sales handoffs).*
