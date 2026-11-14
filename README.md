# SplitSync — Smart Expense Splitter & Budget Tracker 💸

A sophisticated, modern, responsive financial web application designed for student flatmates, group trips, and project teams. SplitSync combines clean financial utility with a sleek SaaS aesthetic (inspired by **Linear**, **Stripe**, and **Splitwise**), focusing on zero-friction UX, exact financial arithmetic in integer cents, and an algorithmic debt-simplification engine.

---

## 🌟 Key Highlights & Architecture

- **Algorithmic Debt Simplification (Core DSA Feature):** Implements a **Greedy Net-Balance Minimization Algorithm** ($O(N \log N)$) that condenses complex, cyclic pairwise debts into the minimal number of direct transfers ($\le N - 1$).
- **Evaluator Mode Toggle:** An interactive UI toggle lets you switch between **"Simplified Debts (Minimum Transfers)"** and **"Raw Pairwise Debts"** in real time, visually demonstrating transaction reduction (typically **50%–70% fewer transactions**).
- **Exact Financial Math (Zero Floating-Point Drift):** All monetary values are calculated and stored in integer cents/paise (`amount * 100`). Decimal conversion happens exclusively at the display layer.
- **Budget Tracker & Dynamic Visual Analytics:** Monthly budget progress bar with automatic status color-shifting (<75% Emerald, 75–90% Amber, >90% Rose), plus interactive Recharts Donut & Contribution-vs-Consumption Bar charts.
- **Lightweight Auth & Instant Demo Mode:** JWT-based authentication with a 1-click **"⚡ Quick Login as Alex Rivera"** button pre-populated with 4 student flatmates, 2 groups, and 12 realistic expenses.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide React Icons, Recharts, Canvas Confetti |
| **Backend** | Node.js, Express.js (RESTful API), JSON Web Tokens (JWT), Bcrypt.js |
| **Database** | SQLite with ACID compliance, WAL mode, foreign key cascades (`node:sqlite` / `better-sqlite3`) |
| **State & Flow** | React Context API, custom asynchronous API service layer, dynamic dark/light theme |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ or v20+ / v22+ / v26+ (LTS recommended)
- **npm** v9+

### 2. Single-Command Installation
From the root directory:
```bash
npm run install:all
```
*(Or install packages in root, `/server`, and `/client` via `npm install`)*

### 3. Start Both Backend & Frontend Concurrently
```bash
npm run dev
```

- **Frontend Client:** [http://localhost:3000](http://localhost:3000)
- **Backend REST API:** [http://localhost:5000](http://localhost:5000)

---

## ⚡ Instant Evaluator Demo Access

When opening the app at [http://localhost:3000](http://localhost:3000):
1. Click the purple button **"1-Click Quick Login as Alex Rivera"**.
2. The database will automatically seed with:
   - **4 Roommates:** Alex Rivera, Priya Sharma, Maya Patel, Jordan Lee
   - **2 Workspaces:** *"Flat 302 Expenses"* (Monthly flat lease, groceries, WiFi, utilities) and *"Goa Beach Getaway"* (Villa rental, fuel, dining, scuba diving)
   - **12 Varied Expenses:** Spanning Equal, Exact, and Percentage splits.
3. Test the **Simplified Debts vs. Raw Pairwise** toggle to observe the Greedy algorithm reducing 6 pairwise transfers down to just 3 direct payments.
4. Click **"Settle"** on any transfer to record an instant settlement with celebratory confetti!

---

## 🧮 Algorithmic Debt Simplification Engine ($O(N \log N)$)

### The Problem
When group members pay for various shared expenses, an unsimplified ledger generates dense, cyclic pairwise debts ($O(N^2)$ transfers). For example:
- Alice owes Bob ₹500
- Bob owes Charlie ₹500
- Charlie owes Alice ₹500

### The Greedy Net-Balance Solution (`server/src/algorithms/debtSimplifier.js`)
1. **Net Balance Invariant:** In any closed expense system, the sum of all members' net balances must equal zero:
   $$\sum_{i=1}^N \left(\text{Total Paid}_i - \text{Total Consumed}_i\right) = 0$$
2. **Partitioning:** Members are divided into two disjoint sets:
   - **Debtors ($D$):** Members with net balance $< 0$ (they owe money)
   - **Creditors ($C$):** Members with net balance $> 0$ (they are owed money)
3. **Greedy Matching:** Sort debtors descending by $|Net_D|$ and creditors descending by $Net_C$. In each iteration:
   $$\text{transfer} = \min(|Net_D|, Net_C)$$
   Record transfer from $D \to C$. At least one party's balance is guaranteed to hit zero in every step!
4. **Upper Bound:** The algorithm terminates in at most $N - 1$ transactions.
5. **Time Complexity:** $O(M + N \log N)$ where $M$ is the number of expense splits and $N$ is the number of group members.

---

## 📊 Flexible Split Modes

1. **Equal Split:** Cost divided evenly among selected members with remainder cents allocated cleanly (e.g. ₹1,000 / 3 $\to$ [₹334, ₹333, ₹333]).
2. **Exact Amounts (Unequal):** Specify individual currency amounts for each roommate with live balance validation checking that $\sum \text{Shares} = \text{Total}$.
3. **Percentage Split:** Assign percentages per roommate with live 100% sum verification and automatic cent rounding.

---

## 🗄 Database Schema (SQLite)

```sql
users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT '₹',
  monthly_budget INTEGER DEFAULT 0,  -- stored in cents
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

group_members (
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

expenses (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  paid_by TEXT NOT NULL,
  title TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  category TEXT NOT NULL,
  split_type TEXT NOT NULL DEFAULT 'EQUAL',
  expense_date TEXT NOT NULL,
  notes TEXT,
  is_settlement INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE CASCADE
);

expense_splits (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  owed_cents INTEGER NOT NULL,
  percentage REAL,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 📁 Project Structure

```
splitsync/
├── package.json                   # Root scripts & concurrently runner
├── README.md                      # Complete architecture & usage documentation
├── server/                        # Express.js REST API + SQLite backend
│   ├── package.json
│   ├── splitsync.sqlite           # Local SQLite database
│   └── src/
│       ├── index.js               # Server entry point & static dist router
│       ├── db.js                  # Database setup & schema initialization
│       ├── seed.js                # Auto-seeder with 4 roommates & 12 expenses
│       ├── algorithms/
│       │   └── debtSimplifier.js  # Greedy Debt Minimization ($O(N \log N)$)
│       ├── controllers/           # Auth, Groups, Expenses, Analytics
│       ├── middleware/            # JWT authentication middleware
│       └── routes/                # Express API endpoints
└── client/                        # React + Vite + Tailwind CSS frontend
    ├── package.json
    ├── tailwind.config.js
    ├── vite.config.js
    └── src/
        ├── App.jsx                # Main application orchestrator
        ├── index.css              # Custom scrollbars & Tailwind directives
        ├── context/               # AuthContext, ToastContext
        ├── services/              # API fetch service layer
        ├── utils/                 # Currency arithmetic & category config
        └── components/
            ├── common/            # Header, Sidebar, Theme Toggle
            ├── dashboard/         # 4 Summary Cards (Spend, Owed, Owe, Budget)
            ├── expenses/          # ExpenseList feed, 3-mode ExpenseModal
            ├── settle/            # DebtSimplifierCard (Raw vs Simplified), SettleModal
            ├── analytics/         # Budget Tracker Progress, Donut & Bar Charts
            ├── groups/            # NewGroupModal, AddMemberModal
            └── auth/              # AuthModal (Login, Register, 1-Click Demo)
```

---

## 🎨 UI/UX Features

- **Fintech SaaS Aesthetic:** Soft off-white backgrounds (`#F8FAFC`), crisp white cards with 1px border lines (`#E2E8F0`), deep slate typography (`#0F172A`), and vibrant Indigo/Emerald accents.
- **Dark Mode Support:** Full dark mode with seamless persistence in `localStorage`.
- **Keyboard Shortcuts:** Press `N` anywhere to instantly trigger the Add Expense modal.
- **Toast Notifications & Confetti:** Instant responsive feedback for all CRUD operations and debt settlement celebrations.

