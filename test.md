# TripSplit — Premium Group Expense & Settlement Manager

TripSplit is a modern, high-performance, and responsive Web Application designed to solve the social complexities of splitting costs during group activities. Whether you are traveling with friends, sharing restaurant bills, organizing temple trips, or keeping track of household utility splits, TripSplit provides a seamless platform for managing outings, tracking group budgets, and settling debts optimized to minimize transaction volume.

---

## 🚀 Technology Stack

TripSplit is built using a modern, scalable developer stack focused on high performance, type safety, and polished micro-animations:

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Core Architecture** | **React 19 + TypeScript + Vite** | Provides swift builds, Hot Module Replacement (HMR), and a strongly typed codebase. |
| **Styling & Theme** | **Tailwind CSS + Tailwindcss Animate** | Elegant, customized UI stylesheets with responsive designs and light/dark theme support. |
| **Animations** | **Framer Motion** | Powers smooth page transitions, modal fade-ins, list reordering, and tactile interactive elements. |
| **Data Flow & UI** | **Radix UI Primitives** | Accessible, unstyled primitives (Dialog, Dropdown Menu, Popover, Progress, Scroll Area) configured with custom styling. |
| **Charts & Reports** | **Recharts** | Renders beautiful, interactive financial reports (Area charts for spending trends, Pie charts for category breakdown). |
| **Database & Auth** | **Firebase 12 (Auth & Firestore)** | Real-time database synchronizations, email-based authentication, and secure document queries. |
| **Toasts / Alerts** | **Sonner** | Clean, non-intrusive notifications for user actions and system status updates. |
| **Testing Engine** | **Vitest + React Testing Library** | Unit and component testing environment for code reliability. |
| **PWA Support** | **Vite Plugin PWA** | Out-of-the-box support for offline access, service worker caching, and installation as a native-like mobile/desktop application. |

---

## 📂 Project Architecture & Directory Structure

```
TripSplit/
├── firestore.rules          # Secure server-side access control for Firestore collections
├── tailwind.config.js       # Custom design system tokens (colors, animations, border radius)
└── src/
    ├── main.tsx             # App mount point & service worker registration
    ├── App.tsx              # Routing, layout orchestration, and authentication gates
    ├── index.css            # Base Tailwind imports & custom variables (HSL palette variables)
    ├── types/
    │   └── index.ts         # Types and interfaces (User, Friend, Outing, Transaction, Settlement)
    ├── context/
    │   ├── AuthContext.tsx  # Coordinates Firebase Auth status and current user state
    │   └── DataContext.tsx  # Exposes real-time Firestore listeners for data sync
    ├── lib/
    │   ├── firestore.ts     # Firestore CRUD operations & real-time subscriber wrappers
    │   ├── balances.ts      # Algorithms for resolving friend balances and optimized debt edges
    │   ├── members.ts       # Utility functions for managing members in outings
    │   └── displayNames.ts  # String formatting functions for displaying user details
    ├── pages/
    │   ├── Landing.tsx      # Interactive home page showcasing benefits & features
    │   ├── Dashboard.tsx    # Net balance cards, quick actions, spending trend area charts
    │   ├── Outings.tsx      # Outing listing (ongoing, settled, planned)
    │   ├── OutingDetail.tsx # Outing statistics, member lists, and full transaction feed
    │   ├── Friends.tsx      # Directory of connected friends and add-friend modals
    │   ├── FriendDetail.tsx # Transaction history and Outings shared with a specific friend
    │   ├── Reports.tsx      # Advanced visualizations, metrics, and CSV exports
    │   ├── SettleUp.tsx     # Settlement path picker to pay off debts
    │   └── auth/            # Sign-in, sign-up, and password recovery pages
    └── components/
        ├── ui/              # Reusable low-level UI elements (Buttons, Dialogs, Cards, Badges)
        ├── layout/          # Navbar, sidebar, and layout frameworks
        ├── fintech/         # StatCard, FilterChips, FloatingInput, and HorizontalOutingCard
        └── outings/         # Outing members panel, transaction creation form, budget cards
```

---

## 💡 Why Use TripSplit?

When managing expenses with a group, traditional spreadsheets quickly become unmanageable, while standard split applications lack flexibility. TripSplit answers these challenges by offering:

1. **Zero-Stress Bill Splitting**: No need to manually compute who owes what. Enter an expense, designate the payer, select the split style, and the system handles the math.
2. **Real-time Collaboration**: As soon as a transaction is added, every member of that Outing receives the update instantly on their screens.
3. **Advanced Budget Control**: Allows you to limit total expenditures per outing, preventing unexpected budget overruns.
4. **Optimized Settlement Paths**: Our settlement algorithm resolves overlapping debts, meaning you only pay the minimum required transactions to clear all obligations.
5. **Installable (PWA)**: Works offline and installs directly on your device, making it perfect for remote trips with spotty cell reception.

---

## 🎯 How to Control Money (Money Control Guide)

TripSplit is built around standard financial workflows, categorized into the following areas:

### 1. Tracking Net Balances (Dashboard)
Upon signing in, you are greeted by three main KPIs that instantly tell you your financial position:
* **Total Balance**: Your overall net position (You are owed minus You owe). If green, you have money coming your way; if red, you are currently in debt.
* **You Owe**: The sum of all splits you have not yet repaid to others.
* **You Are Owed**: The sum of all splits others need to reimburse you.

### 2. Group Budgets & Outings
Every activity starts with an **Outing**.
* **Create an Outing**: Choose a category (Trip, Temple, Restaurant, Movies, Other) and set an optional **Budget**.
* **Adding Members**: Add any registered friends to the Outing. They are instantly synced to all transactions within that outing.
* **Budget Progress**: Inside the `OutingDetail` page, the **Budget Card** shows real-time progress. It calculates the percentage of the budget used. If expenses exceed the limit, the application triggers a **BudgetExceededModal** to notify the owner.

### 3. Adding and Splitting Expenses
Inside an outing, you can add transactions using three custom split methodologies:
* **Equally**: Divides the total cost equally among all or selected members.
* **Exact Amounts**: Allocates specific monetary figures to each individual (useful when people order different items at a restaurant).
* **Percentages**: Splits the expense by defined percentages (must sum up to 100%).

Additionally, you can upload receipt images directly to transactions for record verification.

### 4. Advanced Settlement Engine (Settle Up)
TripSplit calculates the net balances for all members of an outing. Instead of every member paying each other back individually, the system resolves debts into a simple list of peer-to-peer transfers (e.g., if A owes B $10 and B owes C $10, B is bypassed, and A is directed to pay C $10 directly).
* Navigate to **Settle Up** from an Outing or Friend detail screen.
* Choose the amount and path of payment.
* Once submitted, a `SettlementRecord` is saved to Firestore, which immediately adjusts the ledger balances of all members.

### 5. Detailed Reports and Analytics
The **Reports Page** allows you to view historical data over 3 months, 6 months, 12 months, or all-time:
* **Spending Trend Area Chart**: Displays your day-to-day spending trajectory for the selected period.
* **Category Breakdown Pie Chart**: Shows where your money goes (e.g., Food, Transport, Accommodation).
* **CSV Export**: Click the Export button to export a CSV format of all transactions for external analysis.

### 6. Data Integrity & Backups
To prevent data loss and support user autonomy, TripSplit includes two backup modes under **Settings**:
* **Local Backup**: Exports all user data (outings, friends, transactions, settlements) into a structured JSON file downloaded directly to the local storage.
* **Cloud Backup**: Saves snapshots of outing data directly into Firestore under the `backups` collection, allowing you to restore your outings on any device.
