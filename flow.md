# TripSplit — Full Application Flow

TripSplit is a **group expense-splitting app** for trips, dinners, temple visits, movies, and other shared outings. Users sign in, add friends, create outings, log expenses, and the app calculates who owes whom — then helps settle up.

This document explains **what you enter**, **what happens behind the scenes**, and **what you see** — from app launch to every major feature.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [App Startup Flow](#2-app-startup-flow)
3. [Authentication Flows](#3-authentication-flows)
4. [Data Layer & Real-Time Sync](#4-data-layer--real-time-sync)
5. [Navigation & Layout](#5-navigation--layout)
6. [Dashboard Flow](#6-dashboard-flow)
7. [Friends Flow](#7-friends-flow)
8. [Outings Flow](#8-outings-flow)
9. [Transaction (Expense) Flow](#9-transaction-expense-flow)
10. [Balance & Settlement Logic](#10-balance--settlement-logic)
11. [Settle Up Flow](#11-settle-up-flow)
12. [Reports Flow](#12-reports-flow)
13. [Settings Flow](#13-settings-flow)
14. [Search Flow](#14-search-flow)
15. [Backup & Restore Flow](#15-backup--restore-flow)
16. [Firebase Data Model](#16-firebase-data-model)
17. [Permissions & Security](#17-permissions--security)
18. [End-to-End Example Scenario](#18-end-to-end-example-scenario)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (PWA)                           │
│  React 19 + Vite + React Router + Tailwind + Radix UI           │
├─────────────────────────────────────────────────────────────────┤
│  ThemeProvider → AuthProvider → DataProvider → Router           │
├─────────────────────────────────────────────────────────────────┤
│  Pages: Dashboard, Outings, Friends, Settle, Reports, Settings  │
├─────────────────────────────────────────────────────────────────┤
│  Context: AuthContext (Firebase Auth)                           │
│           DataContext (Firestore real-time + business logic)    │
├─────────────────────────────────────────────────────────────────┤
│  Firebase: Authentication + Cloud Firestore                     │
└─────────────────────────────────────────────────────────────────┘
```

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | React + TypeScript + Vite | UI, routing, state |
| Auth | Firebase Authentication | Email/password login |
| Database | Cloud Firestore | Real-time data storage |
| Styling | Tailwind CSS + Framer Motion | UI design & animations |
| PWA | vite-plugin-pwa | Installable app, service worker |

---

## 2. App Startup Flow

### What happens when you open the app

```
User opens URL
      │
      ▼
main.tsx loads
  • Registers PWA service worker
  • Wraps app in ThemeProvider (light/dark/system)
  • Renders <App />
      │
      ▼
App.tsx mounts providers:
  AuthProvider → DataProvider → Router
      │
      ▼
Route "/" → redirects to "/dashboard"
      │
      ▼
ProtectedRoute checks auth
  • loading? → show spinner
  • no user? → redirect to /login
  • user? → render GlobalLayout + page
```

### Step-by-step

1. **PWA service worker** registers immediately (`registerSW({ immediate: true })`).
2. **Theme** loads from `localStorage` key `tripsplit-theme` (system / light / dark).
3. **AuthProvider** listens to Firebase `onAuthStateChanged`.
4. **DataProvider** waits for auth; if logged in, subscribes to Firestore data.
5. **Router** sends `/` → `/dashboard`. Unauthenticated users land on `/login`.

---

## 3. Authentication Flows

### 3.1 Sign Up (`/signup`)

| What you enter | Validation | What happens |
|----------------|------------|--------------|
| Full Name | Required | Saved as Firebase `displayName` |
| Email | Required, valid email | Firebase Auth account created |
| Password | Min 6 characters | Stored by Firebase (hashed) |
| Confirm Password | Must match password | Client-side check only |
| Agree to Terms | Must be checked | Client-side gate |

**Flow:**

```
Submit form
    │
    ▼
createUserWithEmailAndPassword(auth, email, password)
    │
    ▼
updateProfile(user, { displayName: name })
    │
    ▼
createUserProfile(uid, { name, email })  →  Firestore /users/{uid}
    │
    ▼
Success screen → toast → navigate("/dashboard") after 1.6s
```

**Firestore document created:**

```json
/users/{uid}
{
  "name": "Karthi",
  "email": "karthi@example.com",
  "createdAt": "2026-07-12T10:00:00.000Z"
}
```

**Errors handled:** email already in use, weak password, invalid email, network failure.

---

### 3.2 Login (`/login`)

| What you enter | What happens |
|----------------|--------------|
| Email | `signInWithEmailAndPassword(auth, email, password)` |
| Password | Firebase validates credentials |
| Remember me (optional) | Email saved to `localStorage` key `tripsplit-remember-email` |

**On success:** toast "Welcome back!" → navigate to `/dashboard`.

**On failure:** friendly error message (wrong password, user not found, too many attempts).

---

### 3.3 Forgot Password (`/forgot-password`)

| What you enter | What happens |
|----------------|--------------|
| Email | `sendPasswordResetEmail(auth, email)` |

Firebase sends a reset link to the email. App shows success screen with confirmation.

---

### 3.4 Session & Auto Logout

- On first login, `localStorage` stores `session_start_{uid}` with timestamp.
- If session is older than **90 days**, user is automatically signed out.
- Manual logout clears session key, calls `firebaseSignOut`, redirects to `/login`.

---

## 4. Data Layer & Real-Time Sync

Once authenticated, **DataProvider** connects everything.

### 4.1 Profile bootstrap

```
ensureUserProfile(uid, { name, email })
  → creates /users/{uid} if missing (e.g. older accounts)
```

### 4.2 Real-time Firestore subscriptions

`subscribeToUserData(uid)` listens to **four** query streams in parallel:

| Collection | Query | Data received |
|------------|-------|---------------|
| `friendships` | `user1 == uid` OR `user2 == uid` | Resolved into `Friend[]` via user profiles |
| `outings` | `memberIds array-contains uid` | All outings you belong to |
| `transactions` | `memberIds array-contains uid` | All transactions in your outings |
| `settlementRecords` | `memberIds array-contains uid` | All settlement payments recorded |

When **all four** streams are ready, `loading` becomes `false` and the UI renders data.

### 4.3 Computed values (not stored in DB)

DataContext recalculates on every data change:

| Computed value | Source |
|----------------|--------|
| `dashboardStats` | Ongoing outings + your balances |
| `globalSettlements` | Simplified debts across all outings |
| `friendBalances` | Net amount owed per friend |
| `myOutings` | Filtered + auto-derived status from dates |

### 4.4 Undo stack

Every mutation (create/update/delete) pushes the previous state onto an undo stack (max 5 entries). **Undo** calls `replaceAllUserData()` to restore Firestore to the previous snapshot.

### 4.5 Auto cloud backup

After any data change, `scheduleAutoBackupOuting()` debounces (1.5s) and saves a snapshot to `/backups/{uid}_{outingId}`.

---

## 5. Navigation & Layout

### Routes

| Path | Access | Page |
|------|--------|------|
| `/` | Public | Redirects to `/dashboard` |
| `/login` | Public | Login |
| `/signup` | Public | Sign up |
| `/forgot-password` | Public | Password reset |
| `/dashboard` | Protected | Home dashboard |
| `/outings` | Protected | Outings list |
| `/outings/:id` | Protected | Outing detail |
| `/friends` | Protected | Friends list |
| `/friends/details/:id` | Protected | Friend detail |
| `/settle` | Protected | Settle up |
| `/reports` | Protected | Reports & analytics |
| `/settings` | Protected | Settings |
| `*` | Any | Redirect to `/` |

### GlobalLayout (authenticated shell)

- **Header:** Logo, desktop nav, search (⌘K), notifications, profile menu
- **Mobile:** Bottom tab bar (Home, Trips, Friends, Reports, Settings)
- **FAB (+):** Quick actions → Create Outing, Add Friend, Settle Up
- **Extras:** Onboarding tour, PWA install prompt, global search dialog

---

## 6. Dashboard Flow

**Route:** `/dashboard`

### What you see

| Section | Data source |
|---------|-------------|
| Greeting + name | `user.displayName` or email prefix |
| Balance cards | `dashboardStats` (you owe / you are owed / net) |
| Spending trend chart | Transactions over time |
| Category pie chart | Selected outing's expense breakdown |
| Active outings chips | Outings with status `ongoing` |
| Activity feed | Recent transactions & settlements |
| Quick actions | Navigate to Outings, Friends, Settle |

### What you can do

| Action | Result |
|--------|--------|
| Click outing chip | Selects outing for charts |
| Click "Create Outing" | Navigate to `/outings` (open create modal there) |
| Click "Add Friend" | Navigate to `/friends` |
| Click "Settle Up" | Navigate to `/settle` |
| Click activity item | Navigate to outing or transaction detail |

### Balance stats logic

Only **ongoing** outings count toward dashboard balances. Settled/planned outings are excluded from "you owe / you are owed" totals.

---

## 7. Friends Flow

### 7.1 Friends List (`/friends`)

**What you see:**
- Search bar to filter friends by name/email
- Summary bar: total friends, how much you owe collectively, how much you're owed
- Friend cards sorted by balance (highest debt first)

**Each card shows:** name, email, net balance (owe them / they owe you / settled).

---

### 7.2 Add Friend

| What you enter | What happens |
|----------------|--------------|
| Email (search) | Debounced search against Firestore `/users` collection |
| Empty search | Shows up to 10 discoverable users as suggestions |
| Click "Add" on a user | `createFriendship(currentUserId, friendUid)` |

**Firestore document created:**

```json
/friendships/{id}
{
  "user1": "abc123",        // lexicographically smaller UID
  "user2": "def456",        // lexicographically larger UID
  "addedBy": "abc123",
  "status": "accepted",
  "createdAt": "2026-07-12T..."
}
```

**Guards:**
- Cannot add yourself
- Cannot add duplicate (same ID or email)
- Throws "Already friends" if friendship exists

**Real-time effect:** Both users see each other in their Friends list via Firestore snapshot listeners.

---

### 7.3 Friend Detail (`/friends/details/:id`)

**What you see:**
- Friend profile (name, email, join date)
- Net balance with this friend across all outings
- Per-outing breakdown (what you owe / they owe per trip)
- List of shared outings
- KPIs: active outings count, last outing date

**Actions:**

| Action | What happens |
|--------|--------------|
| Record settlement | Opens amount dialog → `recordSettlement()` |
| Click outing | Navigate to `/outings/:id` |
| Remove friend | `deleteFriendship()` → removes friendship doc |

---

## 8. Outings Flow

### 8.1 Outings List (`/outings`)

**Filters:** All | Active (ongoing) | Completed (settled) | Planned

**Search:** Filters by outing name

**Each card shows:** name, category, dates, status, total spent, your share, member count, transaction count.

---

### 8.2 Create Outing

| Field | Required | What happens |
|-------|----------|--------------|
| Name | Yes | Outing title |
| Category | Yes | Trip / Temple / Restaurant / Movies / Other (or custom) |
| Location | No | Stored on outing |
| Budget | No | Enables budget tracking & alerts |
| Start date | No | Used to derive status (`planned` / `ongoing`) |
| End date | No | Used to derive status |
| Friends to invite | No | Added as outing members |

**On submit:**

```
createOuting(input)
    │
    ▼
Build members = [you] + selected friends
    │
    ▼
Derive status from dates (planned / ongoing / settled)
    │
    ▼
Generate UUID for outing.id
    │
    ▼
saveOuting(draft)  →  Firestore /outings/{id}
    │
    ▼
forceBackupOuting() for each member
    │
    ▼
Navigate to /outings/{id}
```

**Firestore document:**

```json
/outings/{id}
{
  "name": "Goa Trip",
  "category": "Trip",
  "status": "ongoing",
  "members": [
    { "id": "uid1", "name": "Karthi" },
    { "id": "uid2", "name": "Arun" }
  ],
  "memberIds": ["uid1", "uid2"],
  "createdById": "uid1",
  "createdByName": "Karthi",
  "budget": 50000,
  "startDate": "2026-08-01",
  "endDate": "2026-08-05",
  "createdAt": "..."
}
```

**Notification:** Friends added to the outing receive a browser push notification (if enabled): *"Karthi added you to 'Goa Trip'"*.

---

### 8.3 Outing Detail (`/outings/:id`)

**Tabs:**

| Tab | Content |
|-----|---------|
| Overview | Stats, net balance, budget card, member balances, debt edges |
| Transactions | List of all expenses, add/edit/delete |
| Analysis | Charts: category breakdown, member spending, personal stats |
| Members | Add/remove members, member panel |
| Settlements | Settlement history for this outing |

**Header actions:**
- Edit outing (name, dates, budget, location, members)
- Export backup (JSON file download)
- Cloud backup (manual)
- Toggle status (ongoing ↔ settled)
- Delete outing (creator) or Leave outing (member)

---

### 8.4 Edit Outing

Updates Firestore via `updateOutingDoc()`. If dates change, status is re-derived automatically.

---

### 8.5 Delete vs Leave Outing

| Who | Action | What happens |
|-----|--------|--------------|
| Creator | Delete | Deletes outing doc + all transactions + all settlements for that outing |
| Member | Leave | Removes your UID from `members` and `memberIds` arrays |

---

### 8.6 Member Changes

When a member is **removed** from an outing:
- All transactions are recalculated with equal splits among remaining members
- Transactions where removed member was sole payer are flagged for review
- `updateOutingMembers()` handles recalculation; `updateOuting()` persists member list

---

### 8.7 Outing Status

| Status | Meaning | How set |
|--------|---------|---------|
| `planned` | Future outing | `startDate` is in the future |
| `ongoing` | Active trip | Today is between start/end, or no dates |
| `settled` | Completed & closed | Manually toggled by user |

Status affects dashboard balance calculations (only `ongoing` counts).

---

## 9. Transaction (Expense) Flow

### 9.1 Add Transaction (inside Outing Detail)

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| Title | Yes | — | e.g. "Dinner at beach shack" |
| Amount (₹) | Yes | — | Total expense amount |
| Category | Yes | Food | Food, Transport, Accommodation, etc. (+ custom per outing) |
| Date | Yes | Today | Expense date |
| Paid by | Yes | You | Single payer or multiple payers |
| Split mode | Yes | Equally | Amount ÷ number of members |

**Payer modes:**

| Mode | Behavior |
|------|----------|
| Alone | One member paid the full amount |
| Multiple | Several members paid portions (amounts must sum to total) |

**On submit:**

```
addTransaction(data)
    │
    ▼
computeSplits(amount, members, splitMode)
  → equally: amount / memberCount per person
    │
    ▼
Build Transaction object with UUID
    │
    ▼
saveTransaction(tx, memberIds)  →  Firestore /transactions/{id}
    │
    ▼
scheduleAutoBackup(outingId)
    │
    ▼
Show success animation → toast with Undo option
```

**Firestore document:**

```json
/transactions/{id}
{
  "outingId": "outing-uuid",
  "title": "Beach dinner",
  "amount": 2400,
  "paidById": "uid1",
  "paidByName": "Karthi",
  "splitMode": "equally",
  "splits": [
    { "memberId": "uid1", "amount": 800 },
    { "memberId": "uid2", "amount": 800 },
    { "memberId": "uid3", "amount": 800 }
  ],
  "category": "Food",
  "date": "12 Jul 2026",
  "memberIds": ["uid1", "uid2", "uid3"],
  "createdById": "uid1",
  "createdByName": "Karthi",
  "createdAt": "..."
}
```

---

### 9.2 Budget Alerts

If outing has a budget:
- When total spent exceeds budget → modal warns user
- Session flag prevents repeat alerts for same outing
- User can still add transactions after acknowledging

---

### 9.3 Edit Transaction

**Who can edit:** Transaction creator OR outing creator.

Updates Firestore via `updateTransactionDoc()`. Splits can be recalculated if amount or split mode changes.

---

### 9.4 Delete Transaction

**Who can delete:** Transaction creator OR outing creator.

Deletes document from `/transactions/{id}`. Balances recalculate automatically on next snapshot.

---

### 9.5 View Transaction Detail

Click any transaction → side panel / bottom sheet shows:
- Full details (title, amount, payer, splits, category, date, receipt)
- Edit / Delete buttons (if permitted)
- Deep link: `/outings/:id?tx={transactionId}` opens detail directly

---

## 10. Balance & Settlement Logic

### How balances are calculated

Balances are **computed on read** from transactions — never stored separately.

```
For each transaction:
  Payer(s) get  +amount  (credit)
  Each split member gets  -their share  (debit)

Member balance = total paid − total owed
  Positive balance → others owe this person
  Negative balance → this person owes others
```

### Settlement records adjust balances

```
recordSettlement({ type: "settle", amount: 500 })
  → fromId: you, toId: friend
  → your balance +500, friend's balance −500

recordSettlement({ type: "return", amount: 300 })
  → fromId: friend, toId: you
  → friend paid you back
```

### Debt simplification

`simplifyDebts()` uses a **greedy min-cash-flow algorithm**:
- Collect all creditors (positive balance) and debtors (negative balance)
- Match largest creditor with largest debtor
- Produce minimum number of payment edges

**Example:**

| Person | Balance |
|--------|---------|
| Karthi | +600 |
| Arun | −400 |
| Priya | −200 |

Simplified: Arun pays Karthi ₹400, Priya pays Karthi ₹200.

---

## 11. Settle Up Flow

**Route:** `/settle`

### What you see

- Net position across all ongoing outings
- "You owe" and "You are owed" totals
- Suggested settlements (simplified debt edges involving you)

### Recording a settlement

**From Outing Detail or Friend Detail:**

| What you enter | What happens |
|----------------|--------------|
| Settlement type | `settle` (you paid friend) or `return` (friend paid you) |
| Amount | Full debt or custom partial amount |
| Confirm | `recordSettlement()` → Firestore `/settlementRecords/{id}` |

**From Settle Up page:**

"Mark as Settled" button shows confirmation dialog. *(Note: the global Settle Up page currently shows a toast on confirm; per-outing and per-friend settlement recording is fully wired via `recordSettlement()`.)*

---

## 12. Reports Flow

**Route:** `/reports`

### Period filter

3 Months | 6 Months | 12 Months | All Time

### What you see

| Section | Content |
|---------|---------|
| Summary stats | Total spent, transaction count, outing count |
| Spending trend | Area chart over selected period |
| Category breakdown | Pie chart by expense category |
| Outing rankings | Outings sorted by total spend |
| Friend balances | Net balance per friend |
| Recent activity | Latest transactions |
| Export CSV | Download filtered transaction data |

### Export

`buildReportCsv()` → `downloadCsv()` saves a `.csv` file with transaction details for the selected period.

---

## 13. Settings Flow

**Route:** `/settings`

### Tabs

| Tab | Features |
|-----|----------|
| Account | Edit display name, phone; change password (email reset link) |
| Notifications | Push notification preferences, browser permission |
| Appearance | Light / Dark / System theme |
| Data & Backup | Cloud backup list, restore, backup all outings |
| Privacy | Data management options |
| About | App info |

### Profile update flow

```
Edit name → updateProfile(auth, { displayName })
         → updateUserProfile(uid, { name }) in Firestore
```

### Theme change

Saved to `localStorage` key `tripsplit-theme`. Applied via CSS class on `<html>`.

---

## 14. Search Flow

**Trigger:** Click search bar or press **⌘K** (Mac) / **Ctrl+K**

| What you type | Results |
|---------------|---------|
| Outing name/category/location | → `/outings/:id` |
| Friend name/email/phone | → `/friends/details/:id` |
| Transaction title/category/payer | → `/outings/:id?tx=:txId` |

Results grouped by type: Outings, Friends, Transactions.

---

## 15. Backup & Restore Flow

### Auto backup (background)

After every mutation, debounced backup saves to:

```
/backups/{userId}_{outingId}
{
  "userId": "uid",
  "outingId": "...",
  "outingName": "Goa Trip",
  "lastBackedUp": "...",
  "transactionCount": 12,
  "data": { outing, transactions[], settlements[] }
}
```

### Manual backup

From Outing Detail → "Backup to Cloud" button → immediate `forceBackupOuting()`.

### Export (local file)

From Outing Detail → "Export" → downloads JSON backup file.

### Restore

From Settings → Data & Backup:
1. Lists all cloud backups with last backup time
2. Click Restore → checks for conflicts (local data newer than backup?)
3. If conflict → confirm overwrite
4. `restoreOutingFromBackupRecord()` replaces outing + transactions + settlements in Firestore

---

## 16. Firebase Data Model

```
Firestore
├── users/{uid}
│     name, email, phone?, createdAt
│
├── friendships/{id}
│     user1, user2, addedBy, status, createdAt
│
├── outings/{id}
│     name, category, status, members[], memberIds[],
│     createdById, createdByName, budget?, dates, location?
│
├── transactions/{id}
│     outingId, title, amount, paidById, paidByName,
│     payments?, splitMode, splits[], category, date,
│     memberIds[], createdById, createdByName, createdAt
│
├── settlementRecords/{id}
│     outingId, fromId, fromName, toId, toName,
│     amount, type (settle|return), memberIds[],
│     recordedById, recordedByName, createdAt
│
└── backups/{userId}_{outingId}
      userId, outingId, outingName, lastBackedUp,
      transactionCount, data (full snapshot)
```

### Key indexing pattern

`memberIds` array on outings, transactions, and settlements enables efficient queries:

```
where("memberIds", "array-contains", currentUserId)
```

This ensures each user only receives data for outings they belong to.

---

## 17. Permissions & Security

### Firestore security rules

| Collection | Read | Write |
|------------|------|-------|
| `users` | Any authenticated user | Own profile only |
| `friendships` | Participants only | Participants only |
| `outings` | Members only (`memberIds`) | Members only |
| `transactions` | Members only | Members only |
| `settlementRecords` | Members only | Members only |
| `backups` | Owner only (`userId`) | Owner only |

### App-level permissions

| Action | Who can do it |
|--------|---------------|
| Edit/delete transaction | Transaction creator OR outing creator |
| Delete outing | Outing creator only |
| Leave outing | Any member (non-creator) |
| Edit outing details | Creator or any member |
| Record settlement | Any member of the outing |

---

## 18. End-to-End Example Scenario

### Scenario: 3 friends split a restaurant bill

**Characters:** Karthi (you), Arun, Priya

```
Step 1: Sign up
  Karthi → /signup → name, email, password → account created

Step 2: Add friends
  Arun & Priya also have TripSplit accounts
  Karthi → /friends → Add Friend → search "arun@..." → Add
  Karthi → Add Friend → search "priya@..." → Add

Step 3: Create outing
  Karthi → /outings → Create Outing
    Name: "Saturday Dinner"
    Category: Restaurant
    Friends: Arun, Priya
  → Outing created, all 3 are members
  → Arun & Priya get push notification

Step 4: Add expense
  Karthi → /outings/{id} → Add Transaction
    Title: "Dinner at Sangeetha"
    Amount: ₹1,500
    Paid by: Karthi
    Split: Equally (₹500 each)
  → Firestore saves transaction
  → Balances: Karthi +₹1,000, Arun −₹500, Priya −₹500

Step 5: Another expense
  Arun → opens same outing → Add Transaction
    Title: "Auto fare"
    Amount: ₹300
    Paid by: Arun
    Split: Equally (₹100 each)
  → Balances update:
      Karthi: +1000 −500 −100 = +₹400
      Arun:   −500 +300 −100 = −₹300
      Priya:  −500 −100 = −₹600

Step 6: Simplified debts
  simplifyDebts() produces:
    Priya → Karthi: ₹400
    Priya → Arun: ₹200

Step 7: Settle up
  Priya → Friend Detail (Karthi) → Record Settlement
    Type: settle (Priya paid Karthi)
    Amount: ₹400
  → Settlement record saved
  → Priya's balance with Karthi: now only owes Arun ₹200

Step 8: Mark outing complete
  Karthi → Outing Detail → Toggle status to "settled"
  → No longer counts in dashboard "you owe" stats

Step 9: View reports
  Karthi → /reports → see spending trend, category breakdown
  → Export CSV for tax/records
```

---

## Quick Reference: Input → Action → Result

| You enter / click | System action | You see |
|-------------------|---------------|---------|
| Email + password (login) | Firebase Auth sign-in | Dashboard |
| Name + email + password (signup) | Create auth + user profile | Dashboard |
| Friend email (search) | Query `/users` | Matching users list |
| "Add" on friend | Create friendship doc | Friend in list |
| Outing name + friends | Create outing doc | Outing detail page |
| Expense title + amount | Create transaction doc | Updated balances |
| "Settle" + amount | Create settlement record | Reduced debt |
| "Delete" transaction | Delete transaction doc | Recalculated balances |
| ⌘K + search query | Filter local data | Navigate to result |
| "Backup to Cloud" | Save snapshot to `/backups` | Last backup timestamp |
| "Restore" backup | Replace Firestore docs | Restored outing data |
| "Log out" | Firebase sign-out | Login page |

---

*This document reflects the TripSplit codebase as of July 2026. For environment setup, copy `.env.example` to `.env` and fill in Firebase credentials (`VITE_FIREBASE_*` variables).*