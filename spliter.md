Role & Goal:
You are an expert Senior Full-Stack Mobile & Web Engineer. Build and integrate a comprehensive, enterprise-grade "Splitter" module inside the "Budget and Goal" section of the personal finance application "CapFlow" (v1.0.0).The module must seamlessly adhere to CapFlow's existing local-first design system (clean, card-based dark/light UI/UX) while guaranteeing absolute financial data integrity, multi-user real-time synchronization, and transactional safety.

Please implement the full feature according to the following complete specification:

---

### 1. Group Session, Member Management & Unique Session ID Sharing

* Navigation & UI Hierarchy:
  * Entry Point: Add a dedicated "Splitter / Group Expenses" card inside the "Budgets & Goals" section.
  * Dedicated Sub-Page: Tapping the Splitter card opens a standalone "Splitter Sessions" view (keeping the main Budgets page clean and un-cluttered).
  * Sessions Hub: Displays a list of all existing sessions (Active & Settled) with filter tabs (`All`, `Active`, `Settled`), session balance summaries, and a prominent `+ Create New Session` button.
* Default Session Templates & Group Presets:
  * **Template 1: Single Person (Solo Expense Tracking):** For tracking individual spending on trips or projects without group splitting overhead.
  * **Template 2: Family / Primary Payer Mode (e.g., Household / Family Trip):** Allows one main head/payer (e.g., Parent/Papa) to cover expenses for multiple non-paying dependents (e.g., kids/family members). The system attributes the financial outlay solely to the primary payer while still tracking individual consumption across members for analytics.
* Session Creation & Real-Time Sync Setup:
  * Modal/Screen to create a new split session with: Custom Session Name, Description, Date Range, Default Currency, and Budget Cap (optional).
  * **Session ID & QR Sharing Engine:** Auto-generate a globally unique, collision-free Session ID (e.g., `CAP-SPLIT-9821-X`) and an accompanying QR Code.
  * **Joining via ID / QR:** Any member can enter the Session ID or scan the QR Code to join an active multi-day session (e.g., a 10-day trip).
* Real-Time Multi-User Collaboration:
  * Enable real-time, bi-directional database synchronization (using WebSockets, Firebase Realtime DB, or Supabase Realtime,Monangodb).
  * **Multi-Member Expense Logging:** Allow ALL connected group members to add, edit, or view expenses dynamically from their own devices at any point during an active session.
  * **Real-Time Live Feed:** Instantly update all group members' dashboards when any participant logs a new expense, accompanied by push notifications or in-app live toasts (e.g., *"Rahul added 'Lunch' for ₹1,200"*).
  * **Conflict Resolution & Offline Queue:** Support offline-first additions with an optimistic UI update. Sync local queue entries automatically when network connection returns.
* Member Directory & Session Dashboard:
  * Member Directory: Participants with Display Name, Phone Number, and unique Member Handle (`@handle` / Member ID). Automatically assign unique color-coded avatars/initials to each participant.
  * Dashboard Header Card: Display Total Group Spend, Active Member Count, Session Status (Active / Settled), Unique Session ID (with a "Copy ID" button), and individual live net position.
  * **Participant Types in Member Directory:**
    1. **Independent Member:** Pays and settles their own dues.
    2. **Dependent / Family Member (e.g., Kids, Spouse, Family):** Added under an Independent Member (Primary Payer). 
  * **Linked Debt Allocation:** When a dependent is selected in an expense split, their share is automatically calculated for analytics/consumption tracking but the financial liability/debt is routed directly to their designated Primary Payer (e.g., Parent/Papa).
  * **Member Details:** Add participants with Display Name, Phone Number, Primary Payer Link (if dependent), and unique Member Handle (`@handle` / Member ID). Automatically assign unique color-coded avatars/initials.
* Session Dashboard:
  * Dashboard Header Card: Display Total Group Spend, Active Member Count, Session Status (Active / Settled), Unique Session ID (with a "Copy ID" button), and individual live net positions (consolidating dependent shares under primary payers).

---

### 2. Multi-Day Expense Logging & Granular Splitting Engine
* Add/Edit Expense Interface:
  * Form fields: Expense Title, Total Amount, Payer selection (single payer OR multi-payer with custom amounts contributed per person), Date & Time, Category, and optional Receipt Image Attachment (compressed to WebP/Base64 and stored locally).
  * **Payer & Creator Attribution:** Prominently display *who logged/created the expense* alongside *who actually paid for it* in the expense feed for 100% auditing transparency.
* Granular Split Modalities:
  * Checkbox selector for included participants in the specific expense.
  * Split Modes:
    1. **Equal Split:** Automatically divide the expense equally among selected participants with exact 2-decimal rounding handlers.
    2. **Exact / Custom Split:** Manual amount inputs per participant with real-time dynamic validation ensuring the sum of individual shares matches the total expense amount.
* Activity Audit Trail:
  * Maintain an immutable, chronological local & remote audit log recording every mutation (`[Timestamp] [Member Name] added 'Dinner' for ₹2,400`).

---

### 3. Real-Time Net Capital Engine & Debt Simplification Algorithm
* Real-Time Net Balance Calculation:
  * Dynamically recalculate each member's capital standing as expenses are added:
    $$\text{Net Balance} = \text{Total Amount Paid} - \text{Total Amount Owed}$$
  * High-visibility status badges: Green for Creditors (`"Gets back ₹1,200"`) vs. Red for Debtors (`"Owes ₹850"`).
* Debt Simplification Engine (Min-Cash-Flow):
  * Implement a graph-matching / greedy min-cash-flow algorithm to simplify group liabilities into the **absolute minimum number of transactions** needed to settle the session.
  * Display an interactive Settlement Roadmap showing exactly *"Person A pays Person B: ₹X"* alongside a "Mark as Settled" action button.

---

### 4. Settlements, Partial Payments & ACID Data Safety
* Transaction Protocol & ACID Guarantees:
  * Wrap all local and remote database mutations (adding/editing expenses, split updates, settlement entries) inside atomic transaction blocks (using IndexedDB/SQLite transaction wrappers).
  * Ensure complete rollback capabilities on any network or execution failure to prevent half-written states, corrupted ledgers, or mismatched balances.
* Settlement Tracking:
  * Support full settlements and partial paybacks (e.g., logging a partial payment of ₹500 against a ₹1,500 due liability). Update real-time net positions immediately across all members' apps.

---

### 5. Professional PDF Reporting, Export & Sharing Suite
* Client-Side PDF Report Generator:
  * Build a PDF generator utility creating a styled report containing:
    1. Session Title, Session ID, Date Range, and Metadata
    2. Member Net Capital Summary Table (Gain/Loss per member)
    3. Complete Itemized Multi-Day Expense Ledger (with creator attribution, payer, participants, and category breakdown)
    4. Optimized Settlement Roadmap ("Who pays whom")
* Export & Instant Share Actions:
  * **Download PDF:** Store the generated PDF file directly in local device storage.
  * **WhatsApp & Email Dispatch:** Provide pre-formatted text summaries for quick messaging along with automated backend email sending capabilities to all session members.

---

Technical & Quality Requirements:
1. Responsive, mobile-first design with fluid transitions, responsive card components, and accessible touch targets.
2. High-precision financial handling (strict 2-decimal floating-point arithmetic, preventing off-by-one-cent rounding errors).
3. Robust form validation, loading spinners for async tasks, real-time sync indicators, and user-friendly toast alerts for success/failure feedback.