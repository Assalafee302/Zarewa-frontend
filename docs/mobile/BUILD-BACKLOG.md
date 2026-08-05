# Zarewa Mobile Companion — Build Backlog

**Goal:** Staff Android app (Expo / React Native) that connects to the existing Express + MySQL backend.  
**Not in scope for v1:** Full POS, offline payments/orders, customer consumer app, rewriting the web ERP.

**Important sequencing rule:**  
**PC login OTP is LAST.** During testing, staff will not all have the app yet. Turning on OTP too early would lock people out of the web ERP. Ship and pilot the app first; enable OTP only after enough devices are registered.

---

## What we already have

| Asset | Notes |
|---|---|
| Web ERP (React) | Full desk workflows |
| Express API | Cookie session + CSRF today |
| MySQL | Keep as source of truth |
| Roles / permissions | Reuse on mobile |
| Quotations APIs | Ready to reuse |
| Approvals / work-items | Ready to reuse |
| HR APIs | Ready for Phase 2 |
| Customers / sales dashboard | Partial reuse |

## What we must build

| Gap | Notes |
|---|---|
| Mobile app project | Expo + TypeScript |
| Mobile token auth | Bearer access/refresh (native-friendly) |
| Push (Firebase FCM) | Alerts when app is closed |
| Approvals inbox UI | Reuse existing decision APIs |
| Quotes + transfer to site | Online first |
| Offline quote drafts only | SQLite + idempotent sync |
| Requests module | Unified leave / expense / payment / stock / general |
| Chat MVP | DMs + request-linked threads |
| Home dashboard | Role-based KPIs + pending counts |
| Hosting | Hostinger VPS for API + MySQL |
| APK / Play pilot | Sideload first, store later |
| **PC OTP (LAST)** | Only after staff have the app |

---

## Phase 0 — Prep (before coding features)

| ID | Task | Done when |
|---|---|---|
| P0-1 | Confirm Hostinger VPS (or staging) for API + MySQL | Staging URL works (`api…`) |
| P0-2 | Create Expo React Native TypeScript project | App runs on Android emulator/device |
| P0-3 | Create Firebase project for FCM (Android) | Can send a test push to one device |
| P0-4 | Define env config (`API_BASE_URL`, FCM keys) | Dev / staging / prod separated |
| P0-5 | Agree pilot users list (managers + sales first) | Names + roles written down |

---

## Phase 1 — Foundation (login + shell)

| ID | Task | Depends on | Done when |
|---|---|---|---|
| P1-1 | Backend: `/api/mobile/auth/login` + refresh + logout | P0 | Phone gets access/refresh tokens |
| P1-2 | Backend: device register endpoint (device id, later FCM token) | P1-1 | Device row stored in MySQL |
| P1-3 | App: login screen + secure token storage | P1-1 | Staff can log in with existing MySQL users |
| P1-4 | App: session restore, logout, basic error handling | P1-3 | Kill/reopen app stays logged in |
| P1-5 | App: bottom tabs shell (Home, Approvals, Quotes, Requests, Chat, More) | P1-3 | Empty screens navigable by role |
| P1-6 | App: permission-aware menu (hide tabs user cannot use) | P1-5 | Sales vs manager see different tabs |

**Exit criteria:** Pilot user can install APK, log in, see shell, log out.

---

## Phase 2 — Home + Approvals + Push

| ID | Task | Depends on | Done when |
|---|---|---|---|
| P2-1 | Backend: `GET /api/mobile/home` (counts + key KPIs) | P1-1 | Lightweight JSON for dashboard ✅ |
| P2-2 | App: Home dashboard | P2-1 | Today’s summary + pending badges ✅ |
| P2-3 | App: Approvals inbox (list + detail) | P1 | Shows pending work-items / decisions ✅ |
| P2-4 | App: Approve / Reject + comment | P2-3 | Decision hits existing backend APIs ✅ |
| P2-5 | Backend: push dispatcher + `device_push_tokens` | P0-3, P1-2 | Server can send FCM message |
| P2-6 | App: receive push + deep link to screen | P2-5 | Tap notification opens correct screen |
| P2-7 | Wire pushes for: approval.pending, approval.decided | P2-5 | Manager/requester get alerts |

**Exit criteria:** Manager gets push → opens app → approves from phone.

---

## Phase 3 — Quotes (online + offline drafts)

| ID | Task | Depends on | Done when |
|---|---|---|---|
| P3-1 | App: quote list + quote detail | P1 | Uses `/api/mobile/quotes` ✅ |
| P3-2 | App: create/edit quote (customer, lines, notes) | P3-1 | Quote saved on server ✅ |
| P3-3 | App: price / stock check helpers | P3-2 | Before save, user can verify |
| P3-4 | App: **Transfer to site** action | P3-2 | Site/web can pick up quote ✅ |
| P3-5 | Push: `quote.transferred` | P2-5, P3-4 | Site staff notified |
| P3-6 | Offline: local draft store (SQLite) | P3-2 | Create quote with no internet |
| P3-7 | Offline sync with `client_uuid` idempotency | P3-6 | No duplicate quotes on reconnect |
| P3-8 | Rule enforced: no offline payments/orders/approvals | P3-7 | Documented + coded |

**Exit criteria:** Sales creates quote offline, syncs, transfers to site; no duplicate entries.

---

## Phase 4 — Requests

| ID | Task | Depends on | Done when |
|---|---|---|---|
| P4-1 | Backend: unified mobile requests list API | P1 | Normalizes HR + payment + general types |
| P4-2 | App: Requests list (my requests / to review) | P4-1 | Status visible |
| P4-3 | App: create request (leave, expense, payment, stock, general) | P4-2 | Optional photo/attachment |
| P4-4 | App: request detail + status timeline | P4-2 | Clear Submitted → Approved → Done |
| P4-5 | Manager decide from Approvals or Request detail | P4-3, P2-3 | One decision path |
| P4-6 | Push: request.submitted / request.updated | P2-5, P4-3 | Both sides notified |

**Exit criteria:** Staff raise request on phone; manager acts; both get pushes.

---

## Phase 5 — Chat MVP

| ID | Task | Depends on | Done when |
|---|---|---|---|
| P5-1 | Backend: channels, memberships, messages tables + APIs | P1 | Create DM, send/list messages |
| P5-2 | App: Chat list + thread screen | P5-1 | Send/receive text |
| P5-3 | Auto-thread when Request created | P5-1, P4-3 | Request has “Open chat” |
| P5-4 | Optional: link thread from Approval detail | P5-1, P2-3 | Discuss without leaving context |
| P5-5 | Push: chat.dm + chat.mention | P2-5, P5-2 | Alert when app backgrounded |
| P5-6 | Desk/branch channels (limited set) | P5-2 | Sales / Ops / HR / Finance channels |

**Exit criteria:** Two staff can DM; a request opens a work thread; push works.

**Keep scoped:** No full Slack. No customer chat. Media caps. Chat links out to ERP objects.

---

## Phase 6 — Pilot hardening

| ID | Task | Depends on | Done when |
|---|---|---|---|
| P6-1 | Internal APK build for pilot group | Phases 1–5 | Installable signed APK |
| P6-2 | Staging test script (login, approve, quote, request, chat) | P6-1 | Checklist passed |
| P6-3 | Fix crash / auth / sync bugs from pilot | P6-2 | Critical issues closed |
| P6-4 | Train pilot users (1-page how-to) | P6-1 | Users know tabs + transfer quote |
| P6-5 | Confirm Hostinger backups + HTTPS | P0-1 | Backup restore tested |
| P6-6 | Play Store internal testing track (optional) | P6-3 | Update path easier than APK |

**Exit criteria:** Pilot staff use app daily for approvals / quotes / requests without blockers.

---

## Phase 7 — HR + polish (after pilot is stable)

| ID | Task | Depends on | Done when |
|---|---|---|---|
| P7-1 | HR: leave status, notices, payslip view | Phase 6 | Self-service works |
| P7-2 | Attendance clock-in (optional GPS) | P7-1 | If business wants it |
| P7-3 | Customer balance + share statement | Phase 6 | Sales can share from phone |
| P7-4 | Biometric app unlock | Phase 6 | Fingerprint / Face unlock |
| P7-5 | iOS build + TestFlight (optional) | Phase 6 | If iPhones required |

---

## Phase 8 — LAST: PC login OTP

> Do **not** start this until most web users who must log in have the mobile app installed and device registered.

| ID | Task | Depends on | Done when |
|---|---|---|---|
| P8-1 | Backend: `otp_challenges` + create/verify APIs | Phase 6+ | Challenge expires in 60–90s |
| P8-2 | Web: after password OK → wait for OTP confirm | P8-1 | Session cookie only after success |
| P8-3 | App: OTP prompt screen + push `otp.challenge` | P8-1, P2-5 | User can Approve login on phone |
| P8-4 | Admin escape hatch | P8-2 | Admin can temporarily disable OTP per user/role |
| P8-5 | Grace period rollout | P8-4 | OTP optional → enforced by role/branch |
| P8-6 | SMS fallback only if no device registered | P8-5 | Documented policy |
| P8-7 | Enable for managers first, then all staff | P8-5 | No mass lockout |

**Exit criteria:** Web login requires phone confirm for enrolled users; unenrolled users are not blocked during rollout.

---

## Explicitly out of order / do not do early

| Do not do early | Why |
|---|---|
| **PC OTP** | Users without app cannot complete web login |
| Full offline sales/payments | Duplicate entry risk in shared office |
| Public Play Store launch | Wait until pilot stable |
| Customer-facing app | Separate product |
| Replacing WhatsApp for customers | External channel stays WhatsApp |

---

## Suggested ownership split

| Track | Owner focus |
|---|---|
| Backend APIs + MySQL migrations | API engineer |
| Mobile UI (Expo) | Mobile engineer |
| Firebase + Hostinger | DevOps / lead |
| Pilot users + training | Operations / admin |
| OTP rollout policy | Admin + security |

---

## Definition of “v1 shipped”

- Android APK (or Play internal) in use by pilot staff  
- Login with existing MySQL users  
- Push for approvals / requests / chat  
- Approvals from phone  
- Quotes online + offline drafts + transfer to site  
- Requests + Chat MVP  
- **OTP still off or invite-only** until Phase 8  

---

## Next action

**Done:** Quote create/edit + transfer to site (P3-2, P3-4) — 2026-07-23.

**Next:** Phase 4 Requests, or Firebase push (P2-5+), or price/stock helpers (P3-3) / offline drafts.
