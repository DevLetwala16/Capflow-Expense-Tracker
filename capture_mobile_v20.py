import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

options = Options()
options.add_argument('--headless')
options.add_argument('--window-size=412,880')
options.add_argument('--user-agent=Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36')
options.add_argument('--force-device-scale-factor=1')

driver = webdriver.Chrome(options=options)
driver.set_script_timeout(30)

try:
    driver.get('https://capflow-rho.vercel.app/dashboard')
    time.sleep(2)
    driver.add_cookie({'name': 'capflow_token', 'value': 'mock_token', 'path': '/', 'domain': 'capflow-rho.vercel.app'})
    
    driver.execute_script('''
        localStorage.setItem('capflow-auth', JSON.stringify({ state: { user: { id: 'demo_user', email: 'dev.letwala@capflow.app', name: 'Dev Letwala' }, isAuthenticated: true }, version: 0 }));
        localStorage.setItem('capflow-walkthrough-demo_user', JSON.stringify({ state: { hasSeenWalkthrough: true, showOnSignIn: false }, version: 0 }));
        sessionStorage.setItem('capflow_session_walkthrough_shown', 'true');
        const now = new Date();
        const curMonth = now.toISOString().slice(0, 7);
        localStorage.setItem('capflow-settings_demo_user', JSON.stringify({ state: { defaultCurrency: 'INR', theme: 'dark', selectedMonth: curMonth }, version: 0 }));
    ''')

    # Seed with async callback
    driver.execute_async_script('''
        const done = arguments[arguments.length - 1];
        const req = indexedDB.open('ExpenseTrackerDB', 20);
        req.onerror = (e) => done({ error: e.target.error.message });
        req.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction(['categories', 'transactions', 'budgets', 'goals', 'emis'], 'readwrite');
            
            const catStore = tx.objectStore('categories');
            const txStore = tx.objectStore('transactions');
            const bStore = tx.objectStore('budgets');
            const gStore = tx.objectStore('goals');
            const emiStore = tx.objectStore('emis');

            const now = new Date();
            const curMonth = now.toISOString().slice(0, 7);
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');

            function getDay(daysAgo) {
                const d = new Date(now.getTime() - daysAgo * 86400000);
                return d.toISOString().slice(0, 10);
            }

            const categories = [
                { id: 1, userId: 'demo_user', name: 'Food & Dining', icon: 'utensils', color: '#F97316', type: 'expense', order: 1, isDefault: true, createdAt: now.toISOString() },
                { id: 2, userId: 'demo_user', name: 'Housing & Rent', icon: 'home', color: '#6366F1', type: 'expense', order: 2, isDefault: true, createdAt: now.toISOString() },
                { id: 3, userId: 'demo_user', name: 'Travel & Commute', icon: 'plane', color: '#0EA5E9', type: 'expense', order: 3, isDefault: true, createdAt: now.toISOString() },
                { id: 4, userId: 'demo_user', name: 'Utilities & Bills', icon: 'zap', color: '#F59E0B', type: 'expense', order: 4, isDefault: true, createdAt: now.toISOString() },
                { id: 5, userId: 'demo_user', name: 'Shopping & Clothes', icon: 'shopping-bag', color: '#8B5CF6', type: 'expense', order: 5, isDefault: true, createdAt: now.toISOString() },
                { id: 6, userId: 'demo_user', name: 'Salary & Income', icon: 'wallet', color: '#34D399', type: 'income', order: 6, isDefault: true, createdAt: now.toISOString() },
                { id: 7, userId: 'demo_user', name: 'EMI & Loans', icon: 'banknote', color: '#EF4444', type: 'expense', order: 7, isDefault: true, createdAt: now.toISOString() },
                { id: 8, userId: 'demo_user', name: 'Healthcare', icon: 'heart-pulse', color: '#10B981', type: 'expense', order: 8, isDefault: true, createdAt: now.toISOString() },
                { id: 9, userId: 'demo_user', name: 'Freelance & Bonus', icon: 'coins', color: '#38BDF8', type: 'income', order: 9, isDefault: true, createdAt: now.toISOString() }
            ];
            categories.forEach(c => catStore.put(c));

            const sampleTxs = [
                { id: 1, userId: 'demo_user', type: 'income', amount: 85000, currency: 'INR', categoryId: 6, title: 'Monthly Salary Credit', notes: 'Tech Corp Oct Salary', date: `${y}-${m}-01`, paymentMethod: 'bank_transfer', createdAt: now.toISOString(), updatedAt: now.toISOString() },
                { id: 2, userId: 'demo_user', type: 'income', amount: 15000, currency: 'INR', categoryId: 9, title: 'Freelance UI Project', notes: 'Client milestone payout', date: getDay(5), paymentMethod: 'bank_transfer', createdAt: now.toISOString(), updatedAt: now.toISOString() },
                { id: 3, userId: 'demo_user', type: 'expense', amount: 22000, currency: 'INR', categoryId: 2, title: 'Apartment Monthly Rent', notes: '2BHK flat rent transfer', date: `${y}-${m}-02`, paymentMethod: 'bank_transfer', createdAt: now.toISOString(), updatedAt: now.toISOString() },
                { id: 4, userId: 'demo_user', type: 'expense', amount: 8500, currency: 'INR', categoryId: 7, title: 'Car Loan EMI', notes: 'HDFC auto debit', date: `${y}-${m}-05`, paymentMethod: 'bank_transfer', createdAt: now.toISOString(), updatedAt: now.toISOString() },
                { id: 5, userId: 'demo_user', type: 'expense', amount: 4850, currency: 'INR', categoryId: 1, title: 'Supermarket Grocery & Food', notes: 'Provisions, dairy, fruits', date: getDay(7), paymentMethod: 'upi', createdAt: now.toISOString(), updatedAt: now.toISOString() },
                { id: 6, userId: 'demo_user', type: 'expense', amount: 2200, currency: 'INR', categoryId: 4, title: 'Electricity & Broadband Bill', notes: 'Torrent Power + Airtel Fiber', date: getDay(6), paymentMethod: 'upi', createdAt: now.toISOString(), updatedAt: now.toISOString() },
                { id: 7, userId: 'demo_user', type: 'expense', amount: 1850, currency: 'INR', categoryId: 1, title: 'Family Weekend Dinner', notes: 'Barbeque Nation buffet', date: getDay(4), paymentMethod: 'credit_card', createdAt: now.toISOString(), updatedAt: now.toISOString() },
                { id: 8, userId: 'demo_user', type: 'expense', amount: 1400, currency: 'INR', categoryId: 3, title: 'Fuel / Petrol Refill', notes: 'Shell Petrol Station full tank', date: getDay(3), paymentMethod: 'upi', createdAt: now.toISOString(), updatedAt: now.toISOString() },
                { id: 9, userId: 'demo_user', type: 'expense', amount: 3200, currency: 'INR', categoryId: 5, title: 'Winter Jacket & Apparel', notes: 'Zara seasonal shopping', date: getDay(2), paymentMethod: 'credit_card', createdAt: now.toISOString(), updatedAt: now.toISOString() },
                { id: 10, userId: 'demo_user', type: 'expense', amount: 950, currency: 'INR', categoryId: 8, title: 'Pharmacy & Health Vitamins', notes: 'Apollo Pharmacy supplements', date: getDay(1), paymentMethod: 'upi', createdAt: now.toISOString(), updatedAt: now.toISOString() }
            ];
            sampleTxs.forEach(t => txStore.put(t));

            bStore.put({ id: 1, userId: 'demo_user', categoryId: 1, month: curMonth, limit: 10000, alertThreshold: 80, createdAt: now.toISOString() });
            bStore.put({ id: 2, userId: 'demo_user', categoryId: 5, month: curMonth, limit: 6000, alertThreshold: 80, createdAt: now.toISOString() });
            bStore.put({ id: 3, userId: 'demo_user', categoryId: 3, month: curMonth, limit: 4000, alertThreshold: 80, createdAt: now.toISOString() });
            bStore.put({ id: 4, userId: 'demo_user', categoryId: 4, month: curMonth, limit: 3500, alertThreshold: 80, createdAt: now.toISOString() });

            gStore.put({ id: 1, userId: 'demo_user', name: 'Emergency Safety Fund', targetAmount: 200000, savedAmount: 135000, targetDate: '2026-12-31', icon: 'shield-check', color: '#10B981', createdAt: now.toISOString(), updatedAt: now.toISOString() });
            gStore.put({ id: 2, userId: 'demo_user', name: 'MacBook Pro M-Series', targetAmount: 180000, savedAmount: 110000, targetDate: '2027-03-31', icon: 'laptop', color: '#6366F1', createdAt: now.toISOString(), updatedAt: now.toISOString() });

            emiStore.put({ id: 1, userId: 'demo_user', name: 'Car Loan (HDFC Bank)', totalCost: 450000, monthlyCost: 12500, startDate: '2025-01-05', endDate: '2027-12-05', dueDay: 5, totalInstallments: 36, paidInstallments: 14, reminderLeadDays: 3, emailSyncEnabled: true, createdAt: now.toISOString(), updatedAt: now.toISOString() });
            emiStore.put({ id: 2, userId: 'demo_user', name: 'Home Renovation Loan', totalCost: 300000, monthlyCost: 15000, startDate: '2026-02-10', endDate: '2027-09-10', dueDay: 10, totalInstallments: 20, paidInstallments: 8, reminderLeadDays: 3, emailSyncEnabled: true, createdAt: now.toISOString(), updatedAt: now.toISOString() });

            tx.oncomplete = () => done({ success: true });
        };
    ''')
    time.sleep(2)

    # Reload dashboard
    driver.get('https://capflow-rho.vercel.app/dashboard')
    time.sleep(3)
    driver.save_screenshot('mobile_screenshots/02_dashboard.png')
    print("Mobile dashboard with populated data captured!")

    # Capture mobile settings
    driver.get('https://capflow-rho.vercel.app/settings')
    time.sleep(3)
    driver.save_screenshot('mobile_screenshots/09_settings.png')
    print("Mobile settings captured!")

finally:
    driver.quit()
