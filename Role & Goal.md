Role & Goal:
You are an expert Senior Full-Stack Mobile & Web Engineer. Build/refactor the comprehensive "Settings" module for the personal finance application "CapFlow" (v1.0.0). The UI/UX must follow a clean, card-based dark/light layout, optimized for high usability, security, and seamless data sync.

Please implement the Settings page containing all the following functional modules and settings controls:
---
### 1. Data Management, Sync & Device Transfer
* Device-to-Device Migration Flow (MongoDB Transfer Mechanism):
  * Action "Push Backup":
    1. Upload encrypted local state to MongoDB tied to a temporary transfer Token ID.
    2. Generate a secure QR Code containing the Token ID on screen.
  * Action "Scan QR Code" (Scanner Interface):
    1. Built-in camera scanner option added inside Settings ("Scan QR Code to Restore Data").
    2. Reads the Token ID, retrieves data from MongoDB, and restores it locally on the second device.
    3. Display a live progress bar showing import status (`"Loading... 45%"`).
    4. Upon successful validation and local write on the target device, auto-delete the payload from MongoDB and invalidate the original QR code on the source device.
* Export & Data Wipe:
  * Export Formats: Support exporting raw transactions into PDF, CSV, and Excel (`.xlsx`).
  * Double-Confirmed Reset: Secure "Clear All Local Data" modal with explicit confirmation input (e.g., typing "DELETE") to wipe local storage completely.
---

### 2. Profile & Account Management
* Profile Details & Photo Storage:
  * Enable profile photo uploading (accepting any image size). Compress and convert to webp/base64, saving the output locally in client storage (IndexedDB / LocalStorage / SQLite).
  * Editable input fields for Display Name and Phone Number.
  * Profile Completion Bar: Dynamic percentage indicator (e.g., "Profile 80% Complete") updated live based on filled attributes (Name, Photo, Phone, Primary Currency).
* Unique Member ID:
  * Auto-generate a unique system-wide handle/ID (e.g., `@letwala_dev`) using a robust collision-free logic.
  * Must be unique across all users and displayed prominently with a "Copy ID" button.
* Security & Authentication:
  * Biometric / App Lock Toggle: Support Fingerprint, Face ID, or 4-digit PIN protection on app open.
  * Session Management: List active user sessions with device metadata and a "Sign Out from All Other Devices" button.

---

### 3. Appearance & Accessibility
* Font Controls:
  * Font Size Adjuster: Interactive slider with discrete steps (`Small`, `Medium`, `Default`, `Large`, `Extra Large`) accompanied by a live preview text block. Update root CSS variables or application font tokens dynamically.
  * Density Toggle: Switch between "Standard" and "Compact" table/list layout to adjust spacing across transaction views.
* Themes & Personalization:
  * Accent Theme Presets: Choice of preset color palettes (e.g., Emerald Green, Cyberpunk Purple, Classic Blue, Sunset Orange).
  * Custom Theme Builder: Color pickers allowing users to specify custom background, surface, and primary accent colors.
  * System/Auto Theme: Options to follow device system settings, manual light/dark toggle, or time-based automatic switching.

---

### 4. Financial & Regional Preferences
* Defaults & Formats:
  * Default Payment Method: Dropdown selector (e.g., HDFC Bank, Cash, UPI) applied to new transaction entries automatically.
  * Fiscal Year Configuration: Option to select financial start month (e.g., April to March vs. January to December).
  * Numbering System Toggle: Option to switch balance representations between Western (`1,000,000.00`) and Indian (`10,00,000.00`) formats.

---

### 5. Notifications & Reminders
* Granular Alert Settings:
  * Channel Toggles: Separate independent switches for Email Alerts vs. Local Device Push Notifications for EMI dues.
  * Daily Expense Reminder: Configurable time picker to schedule daily notifications (e.g., "Did you log today's expenses?").
  * Budget Limit Alerts: Warning thresholds at 80% and 100% of defined monthly category limits.

---

### 6. Privacy, Automation & Performance (Advanced)
* Stealth & Privacy:
  * Balance Masking Toggle: Global setting to mask financial numbers across dashboards with asterisks (`••••••`).
  * Auto-Lock Timeout: Lock the application on idle after a user-selected duration (Immediate, 1 min, 5 mins).
* Automation:
  * Smart Auto-Categorization: Rule manager mapping merchant keywords to default categories.
* Storage Diagnostics:
  * Cache Manager: Display local data footprint (e.g., `"Storage Used: 14.2 MB"`) with a safe "Clear Cache" button.

---

### 7. About, Support & Direct Company Feedback Form
* Support & Versioning:
  * Links to Help/FAQ and interactive Changelog modal for v1.0.0.
* In-App Feedback Form:
  * Form containing: Category (`Bug Report`, `Feature Request`, `General Feedback`), Subject, Message body, and contact consent toggle.
  * Automation Engine: On form submit, trigger an automated API/backend mailer (e.g., via SendGrid/Nodemailer) that formats the message and dispatches an email directly to the support address, accompanied by an instant auto-responder email to the user.
  * Fallback: Provide a direct "Contact via WhatsApp" button pre-filling the user's feedback draft.

---

Technical & Quality Requirements:
1. Maintain strict state persistence using local storage / database handlers.
2. Form fields must include complete front-end validation, clear feedback toasts, and loading spinners during asynchronous network calls (syncing, email dispatch).
3. The layout must be fully responsive, mobile-first, clean, accessible, and structured with intuitive card views and intuitive headings.