import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

os.makedirs('screenshots', exist_ok=True)

options = Options()
options.add_argument('--headless')
options.add_argument('--window-size=1366,860')
options.add_argument('--force-device-scale-factor=1')

driver = webdriver.Chrome(options=options)

try:
    print("Navigating to auth page...")
    driver.get('https://capflow-rho.vercel.app/auth')
    time.sleep(3)
    driver.save_screenshot('screenshots/01_auth_page.png')
    print("1. Auth page captured")

    # Add auth cookie
    driver.add_cookie({
        'name': 'capflow_token',
        'value': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.demo',
        'path': '/',
        'domain': 'capflow-rho.vercel.app'
    })

    # Navigate to dashboard
    driver.get('https://capflow-rho.vercel.app/dashboard')
    time.sleep(2)

    # Setup LocalStorage & Seed Data
    driver.execute_script('''
        localStorage.setItem('capflow-auth', JSON.stringify({
            state: {
                user: { id: 'demo_user', email: 'dev.letwala@capflow.app', name: 'Dev Letwala' },
                isAuthenticated: true
            },
            version: 0
        }));
        localStorage.setItem('capflow-walkthrough-demo_user', JSON.stringify({
            state: {
                hasSeenWalkthrough: true,
                showOnSignIn: false
            },
            version: 0
        }));
        sessionStorage.setItem('capflow_session_walkthrough_shown', 'true');
        localStorage.setItem('capflow-settings_demo_user', JSON.stringify({
            state: {
                defaultCurrency: 'INR',
                theme: 'dark',
                selectedMonth: new Date().toISOString().slice(0, 7)
            },
            version: 0
        }));
    ''')

    seed_script = '''
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');

    function getDateStr(dayOffset) {
        const d = new Date(now.getTime() - dayOffset * 86400000);
        return d.toISOString().slice(0, 10);
    }

    const req = indexedDB.open('ExpenseTrackerDB', 2);
    req.onsuccess = function(e) {
        const db = e.target.result;
        const tx = db.transaction(['categories', 'transactions', 'budgets', 'goals', 'emis'], 'readwrite');
        
        const catStore = tx.objectStore('categories');
        const txStore = tx.objectStore('transactions');
        const bStore = tx.objectStore('budgets');
        const gStore = tx.objectStore('goals');
        const emiStore = tx.objectStore('emis');

        const categories = [
            { id: 1, userId: 'demo_user', name: 'Food & Dining', icon: 'utensils', color: '#F97316', type: 'expense', order: 1, isDefault: true, createdAt: now.toISOString() },
            { id: 2, userId: 'demo_user', name: 'Housing & Rent', icon: 'home', color: '#6366F1', type: 'expense', order: 2, isDefault: true, createdAt: now.toISOString() },
            { id: 3, userId: 'demo_user', name: 'Travel & Commute', icon: 'plane', color: '#0EA5E9', type: 'expense', order: 3, isDefault: true, createdAt: now.toISOString() },
            { id: 4, userId: 'demo_user', name: 'Utilities & Bills', icon: 'zap', color: '#F59E0B', type: 'expense', order: 4, isDefault: true, createdAt: now.toISOString() },
            { id: 5, userId: 'demo_user', name: 'Shopping & Clothes', icon: 'shopping-bag', color: '#8B5CF6', type: 'expense', order: 5, isDefault: true, createdAt: now.toISOString() },
            { id: 6, userId: 'demo_user', name: 'Salary & Income', icon: 'wallet', color: '#34D399', type: 'income', order: 6, isDefault: true, createdAt: now.toISOString() },
            { id: 7, userId: 'demo_user', name: 'EMI & Loans', icon: 'banknote', color: '#EF4444', type: 'expense', order: 7, isDefault: true, createdAt: now.toISOString() },
            { id: 8, userId: 'demo_user', name: 'Healthcare & Meds', icon: 'heart-pulse', color: '#10B981', type: 'expense', order: 8, isDefault: true, createdAt: now.toISOString() },
            { id: 9, userId: 'demo_user', name: 'Freelance & Bonus', icon: 'coins', color: '#38BDF8', type: 'income', order: 9, isDefault: true, createdAt: now.toISOString() }
        ];
        categories.forEach(c => catStore.put(c));

        const sampleTxs = [
            { id: 1, userId: 'demo_user', type: 'income', amount: 85000, currency: 'INR', categoryId: 6, title: 'Monthly Salary Credit', notes: 'Tech Corp Oct Salary', date: `${y}-${m}-01`, paymentMethod: 'bank_transfer', createdAt: now.toISOString(), updatedAt: now.toISOString() },
            { id: 2, userId: 'demo_user', type: 'income', amount: 15000, currency: 'INR', categoryId: 9, title: 'Web App Freelance Project', notes: 'Client milestone payout', date: getDateStr(5), paymentMethod: 'bank_transfer', createdAt: now.toISOString(), updatedAt: now.toISOString() },
            { id: 3, userId: 'demo_user', type: 'expense', amount: 22000, currency: 'INR', categoryId: 2, title: 'Apartment Monthly Rent', notes: '2BHK flat rent transfer', date: `${y}-${m}-02`, paymentMethod: 'bank_transfer', createdAt: now.toISOString(), updatedAt: now.toISOString() },
            { id: 4, userId: 'demo_user', type: 'expense', amount: 8500, currency: 'INR', categoryId: 7, title: 'Car Loan EMI', notes: 'HDFC auto debit', date: `${y}-${m}-05`, paymentMethod: 'bank_transfer', createdAt: now.toISOString(), updatedAt: now.toISOString() },
            { id: 5, userId: 'demo_user', type: 'expense', amount: 4850, currency: 'INR', categoryId: 1, title: 'Supermarket Grocery & Food', notes: 'Provisions, dairy, fruits', date: getDateStr(7), paymentMethod: 'upi', createdAt: now.toISOString(), updatedAt: now.toISOString() },
            { id: 6, userId: 'demo_user', type: 'expense', amount: 2200, currency: 'INR', categoryId: 4, title: 'Electricity & Broadband Bill', notes: 'Torrent Power + Airtel Fiber', date: getDateStr(6), paymentMethod: 'upi', createdAt: now.toISOString(), updatedAt: now.toISOString() },
            { id: 7, userId: 'demo_user', type: 'expense', amount: 1850, currency: 'INR', categoryId: 1, title: 'Weekend Family Dinner', notes: 'Barbeque Nation buffet', date: getDateStr(4), paymentMethod: 'credit_card', createdAt: now.toISOString(), updatedAt: now.toISOString() },
            { id: 8, userId: 'demo_user', type: 'expense', amount: 1400, currency: 'INR', categoryId: 3, title: 'Fuel / Petrol Refill', notes: 'Shell Petrol Station full tank', date: getDateStr(3), paymentMethod: 'upi', createdAt: now.toISOString(), updatedAt: now.toISOString() },
            { id: 9, userId: 'demo_user', type: 'expense', amount: 3200, currency: 'INR', categoryId: 5, title: 'Winter Jacket & Apparel', notes: 'Zara seasonal shopping', date: getDateStr(2), paymentMethod: 'credit_card', createdAt: now.toISOString(), updatedAt: now.toISOString() },
            { id: 10, userId: 'demo_user', type: 'expense', amount: 950, currency: 'INR', categoryId: 8, title: 'Pharmacy & Health Vitamins', notes: 'Apollo Pharmacy supplements', date: getDateStr(1), paymentMethod: 'upi', createdAt: now.toISOString(), updatedAt: now.toISOString() }
        ];
        sampleTxs.forEach(t => txStore.put(t));

        bStore.put({ id: 1, userId: 'demo_user', categoryId: 1, month: currentMonth, limit: 10000, alertThreshold: 80, createdAt: now.toISOString() });
        bStore.put({ id: 2, userId: 'demo_user', categoryId: 5, month: currentMonth, limit: 6000, alertThreshold: 80, createdAt: now.toISOString() });
        bStore.put({ id: 3, userId: 'demo_user', categoryId: 3, month: currentMonth, limit: 4000, alertThreshold: 80, createdAt: now.toISOString() });
        bStore.put({ id: 4, userId: 'demo_user', categoryId: 4, month: currentMonth, limit: 3500, alertThreshold: 80, createdAt: now.toISOString() });

        gStore.put({ id: 1, userId: 'demo_user', name: 'Emergency Safety Fund', targetAmount: 200000, savedAmount: 135000, targetDate: '2026-12-31', icon: 'shield-check', color: '#10B981', createdAt: now.toISOString(), updatedAt: now.toISOString() });
        gStore.put({ id: 2, userId: 'demo_user', name: 'MacBook Pro M-Series', targetAmount: 180000, savedAmount: 110000, targetDate: '2027-03-31', icon: 'laptop', color: '#6366F1', createdAt: now.toISOString(), updatedAt: now.toISOString() });
        gStore.put({ id: 3, userId: 'demo_user', name: 'Europe Vacation 2027', targetAmount: 350000, savedAmount: 80000, targetDate: '2027-08-15', icon: 'plane', color: '#0EA5E9', createdAt: now.toISOString(), updatedAt: now.toISOString() });

        emiStore.put({ id: 1, userId: 'demo_user', name: 'Car Loan (HDFC Bank)', totalCost: 450000, monthlyCost: 12500, startDate: '2025-01-05', endDate: '2027-12-05', dueDay: 5, totalInstallments: 36, paidInstallments: 14, reminderLeadDays: 3, emailSyncEnabled: true, createdAt: now.toISOString(), updatedAt: now.toISOString() });
        emiStore.put({ id: 2, userId: 'demo_user', name: 'Home Renovation Loan', totalCost: 300000, monthlyCost: 15000, startDate: '2026-02-10', endDate: '2027-09-10', dueDay: 10, totalInstallments: 20, paidInstallments: 8, reminderLeadDays: 3, emailSyncEnabled: true, createdAt: now.toISOString(), updatedAt: now.toISOString() });
    };
    '''
    driver.execute_script(seed_script)
    time.sleep(3)

    # Reload dashboard to pull fresh Dexie data into Zustand stores
    driver.get('https://capflow-rho.vercel.app/dashboard')
    time.sleep(3)
    driver.save_screenshot('screenshots/02_dashboard.png')
    print("2. Dashboard captured")

    # Try opening Add Transaction Modal
    try:
        btns = driver.find_elements(By.TAG_NAME, 'button')
        add_clicked = False
        for b in btns:
            if 'Add Expense' in b.text or 'Add Transaction' in b.text:
                b.click()
                add_clicked = True
                break
        if add_clicked:
            time.sleep(2)
            driver.save_screenshot('screenshots/03_add_transaction_modal.png')
            print("3. Add Transaction Modal captured")
            # Click close button if exists
            close_btns = driver.find_elements(By.TAG_NAME, 'button')
            for cb in close_btns:
                if 'Close' in cb.get_attribute('aria-label') or cb.text == '×':
                    cb.click()
                    break
            time.sleep(1)
    except Exception as e:
        print("Add modal error:", e)

    # 4. Transactions page
    driver.get('https://capflow-rho.vercel.app/transactions')
    time.sleep(3)
    driver.save_screenshot('screenshots/04_transactions_history.png')
    print("4. Transactions History captured")

    # 5. Budgets & Goals
    driver.get('https://capflow-rho.vercel.app/budgets')
    time.sleep(3)
    driver.save_screenshot('screenshots/05_budgets_goals.png')
    print("5. Budgets & Goals captured")

    # 6. Calendar
    driver.get('https://capflow-rho.vercel.app/calendar')
    time.sleep(3)
    driver.save_screenshot('screenshots/06_calendar_view.png')
    print("6. Calendar captured")

    # 7. Analytics
    driver.get('https://capflow-rho.vercel.app/analytics')
    time.sleep(3)
    driver.save_screenshot('screenshots/07_analytics_insights.png')
    print("7. Analytics captured")

    # 8. EMIs
    driver.get('https://capflow-rho.vercel.app/emis')
    time.sleep(3)
    driver.save_screenshot('screenshots/08_emis_tracker.png')
    print("8. EMIs captured")

    # 9. Settings
    driver.get('https://capflow-rho.vercel.app/settings')
    time.sleep(3)
    driver.save_screenshot('screenshots/09_settings_export.png')
    print("9. Settings captured")

finally:
    driver.quit()
    print("All browser tasks finished!")
