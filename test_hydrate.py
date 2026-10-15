import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

options = Options()
options.add_argument('--headless')
options.add_argument('--window-size=1366,860')
driver = webdriver.Chrome(options=options)

try:
    # First navigate to dashboard
    driver.get('https://capflow-rho.vercel.app/dashboard')
    time.sleep(2)

    # Set cookie
    driver.add_cookie({
        'name': 'capflow_token',
        'value': 'mock_token',
        'path': '/',
        'domain': 'capflow-rho.vercel.app'
    })

    # Set localStorage BEFORE loading app data
    driver.execute_script('''
        const userObj = { id: 'local_user', email: 'dev.letwala@capflow.app', name: 'Dev Letwala' };
        localStorage.setItem('capflow-auth', JSON.stringify({
            state: { user: userObj, isAuthenticated: true },
            version: 0
        }));
        localStorage.setItem('capflow-walkthrough-local_user', JSON.stringify({
            state: { hasSeenWalkthrough: true, showOnSignIn: false },
            version: 0
        }));
        sessionStorage.setItem('capflow_session_walkthrough_shown', 'true');
        
        const now = new Date();
        const curMonth = now.toISOString().slice(0, 7);
        localStorage.setItem('capflow-settings_local_user', JSON.stringify({
            state: { defaultCurrency: 'INR', theme: 'dark', selectedMonth: curMonth },
            version: 0
        }));
    ''')

    # Seed Dexie with local_user
    driver.execute_script('''
        const now = new Date();
        const curMonth = now.toISOString().slice(0, 7);
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');

        function offsetDate(days) {
            const d = new Date(now.getTime() - days * 86400000);
            return d.toISOString().slice(0, 10);
        }

        const request = indexedDB.open('ExpenseTrackerDB', 2);
        request.onsuccess = function(e) {
            const db = e.target.result;
            const tx = db.transaction(['categories', 'transactions', 'budgets', 'goals', 'emis'], 'readwrite');
            
            const catStore = tx.objectStore('categories');
            const txStore = tx.objectStore('transactions');
            const bStore = tx.objectStore('budgets');
            const gStore = tx.objectStore('goals');
            const emiStore = tx.objectStore('emis');

            const categories = [
                { id: 1, userId: 'local_user', name: 'Food & Dining', icon: 'utensils', color: '#F97316', type: 'expense', order: 1, isDefault: true, createdAt: now.toISOString() },
                { id: 2, userId: 'local_user', name: 'Housing & Rent', icon: 'home', color: '#6366F1', type: 'expense', order: 2, isDefault: true, createdAt: now.toISOString() },
                { id: 3, userId: 'local_user', name: 'Travel & Commute', icon: 'plane', color: '#0EA5E9', type: 'expense', order: 3, isDefault: true, createdAt: now.toISOString() },
                { id: 4, userId: 'local_user', name: 'Utilities & Bills', icon: 'zap', color: '#F59E0B', type: 'expense', order: 4, isDefault: true, createdAt: now.toISOString() },
                { id: 5, userId: 'local_user', name: 'Shopping & Clothes', icon: 'shopping-bag', color: '#8B5CF6', type: 'expense', order: 5, isDefault: true, createdAt: now.toISOString() },
                { id: 6, userId: 'local_user', name: 'Salary & Income', icon: 'wallet', color: '#34D399', type: 'income', order: 6, isDefault: true, createdAt: now.toISOString() },
                { id: 7, userId: 'local_user', name: 'EMI & Loans', icon: 'banknote', color: '#EF4444', type: 'expense', order: 7, isDefault: true, createdAt: now.toISOString() },
                { id: 8, userId: 'local_user', name: 'Healthcare', icon: 'heart-pulse', color: '#10B981', type: 'expense', order: 8, isDefault: true, createdAt: now.toISOString() },
                { id: 9, userId: 'local_user', name: 'Freelance & Bonus', icon: 'coins', color: '#38BDF8', type: 'income', order: 9, isDefault: true, createdAt: now.toISOString() }
            ];
            categories.forEach(c => catStore.put(c));

            const sampleTxs = [
                { id: 1, userId: 'local_user', type: 'income', amount: 85000, currency: 'INR', categoryId: 6, title: 'Monthly Salary Credit', notes: 'Tech Corp Oct Salary', date: `${y}-${m}-01`, paymentMethod: 'bank_transfer', createdAt: now.toISOString(), updatedAt: now.toISOString() },
                { id: 2, userId: 'local_user', type: 'income', amount: 15000, currency: 'INR', categoryId: 9, title: 'Freelance Design Milestone', notes: 'Client payment', date: offsetDate(4), paymentMethod: 'bank_transfer', createdAt: now.toISOString(), updatedAt: now.toISOString() },
                { id: 3, userId: 'local_user', type: 'expense', amount: 22000, currency: 'INR', categoryId: 2, title: 'Apartment Monthly Rent', notes: '2BHK Rent', date: `${y}-${m}-02`, paymentMethod: 'bank_transfer', createdAt: now.toISOString(), updatedAt: now.toISOString() },
                { id: 4, userId: 'local_user', type: 'expense', amount: 8500, currency: 'INR', categoryId: 7, title: 'Car Loan EMI', notes: 'HDFC auto debit', date: `${y}-${m}-05`, paymentMethod: 'bank_transfer', createdAt: now.toISOString(), updatedAt: now.toISOString() },
                { id: 5, userId: 'local_user', type: 'expense', amount: 4850, currency: 'INR', categoryId: 1, title: 'Supermarket Grocery & Food', notes: 'Provisions, dairy', date: offsetDate(7), paymentMethod: 'upi', createdAt: now.toISOString(), updatedAt: now.toISOString() },
                { id: 6, userId: 'local_user', type: 'expense', amount: 2200, currency: 'INR', categoryId: 4, title: 'Electricity & Broadband Bill', notes: 'Torrent Power + Airtel', date: offsetDate(6), paymentMethod: 'upi', createdAt: now.toISOString(), updatedAt: now.toISOString() },
                { id: 7, userId: 'local_user', type: 'expense', amount: 1850, currency: 'INR', categoryId: 1, title: 'Family Weekend Dinner', notes: 'Buffet', date: offsetDate(3), paymentMethod: 'credit_card', createdAt: now.toISOString(), updatedAt: now.toISOString() },
                { id: 8, userId: 'local_user', type: 'expense', amount: 1400, currency: 'INR', categoryId: 3, title: 'Fuel / Petrol Refill', notes: 'Shell Station', date: offsetDate(2), paymentMethod: 'upi', createdAt: now.toISOString(), updatedAt: now.toISOString() },
                { id: 9, userId: 'local_user', type: 'expense', amount: 3200, currency: 'INR', categoryId: 5, title: 'Winter Jacket & Apparel', notes: 'Zara shopping', date: offsetDate(1), paymentMethod: 'credit_card', createdAt: now.toISOString(), updatedAt: now.toISOString() }
            ];
            sampleTxs.forEach(t => txStore.put(t));

            bStore.put({ id: 1, userId: 'local_user', categoryId: 1, month: curMonth, limit: 10000, alertThreshold: 80, createdAt: now.toISOString() });
            bStore.put({ id: 2, userId: 'local_user', categoryId: 5, month: curMonth, limit: 6000, alertThreshold: 80, createdAt: now.toISOString() });
            bStore.put({ id: 3, userId: 'local_user', categoryId: 3, month: curMonth, limit: 4000, alertThreshold: 80, createdAt: now.toISOString() });
            bStore.put({ id: 4, userId: 'local_user', categoryId: 4, month: curMonth, limit: 3500, alertThreshold: 80, createdAt: now.toISOString() });

            gStore.put({ id: 1, userId: 'local_user', name: 'Emergency Safety Fund', targetAmount: 200000, savedAmount: 135000, targetDate: '2026-12-31', icon: 'shield-check', color: '#10B981', createdAt: now.toISOString(), updatedAt: now.toISOString() });
            gStore.put({ id: 2, userId: 'local_user', name: 'MacBook Pro M-Series', targetAmount: 180000, savedAmount: 110000, targetDate: '2027-03-31', icon: 'laptop', color: '#6366F1', createdAt: now.toISOString(), updatedAt: now.toISOString() });

            emiStore.put({ id: 1, userId: 'local_user', name: 'Car Loan (HDFC Bank)', totalCost: 450000, monthlyCost: 12500, startDate: '2025-01-05', endDate: '2027-12-05', dueDay: 5, totalInstallments: 36, paidInstallments: 14, reminderLeadDays: 3, emailSyncEnabled: true, createdAt: now.toISOString(), updatedAt: now.toISOString() });
            emiStore.put({ id: 2, userId: 'local_user', name: 'Home Renovation Loan', totalCost: 300000, monthlyCost: 15000, startDate: '2026-02-10', endDate: '2027-09-10', dueDay: 10, totalInstallments: 20, paidInstallments: 8, reminderLeadDays: 3, emailSyncEnabled: true, createdAt: now.toISOString(), updatedAt: now.toISOString() });
        };
    ''')

    time.sleep(3)
    # Refresh dashboard to let Zustand hydrate from Dexie
    driver.get('https://capflow-rho.vercel.app/dashboard')
    time.sleep(4)
    driver.save_screenshot('screenshots/hydrated_dashboard.png')
    print("Hydrated dashboard saved!")
finally:
    driver.quit()
