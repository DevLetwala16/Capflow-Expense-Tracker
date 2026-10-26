# capture_new_commits.py
import os
import sys
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

CHROMEDRIVER_PATH = r'C:\Users\Dev Letwala\.cache\selenium\chromedriver\win64\155.0.8059.79\chromedriver.exe'

def setup_browser(mobile=False):
    service = Service(CHROMEDRIVER_PATH)
    options = Options()
    options.add_argument('--headless')
    if mobile:
        options.add_argument('--window-size=412,880')
        options.add_argument('--user-agent=Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36')
    else:
        options.add_argument('--window-size=1400,900')
    options.add_argument('--force-device-scale-factor=1')
    return webdriver.Chrome(service=service, options=options)

def inject_auth_and_data(driver):
    driver.get('https://capflow-rho.vercel.app/auth')
    time.sleep(1)
    driver.add_cookie({'name': 'capflow_token', 'value': 'mock_token', 'path': '/', 'domain': 'capflow-rho.vercel.app'})
    driver.execute_script('''
        localStorage.setItem('capflow-auth', JSON.stringify({
            state: { user: { id: 'demo_user', email: 'dev.letwala@capflow.app', name: 'Dev Letwala', upiId: 'devletwala@okaxis' }, isAuthenticated: true },
            version: 0
        }));
        localStorage.setItem('capflow-walkthrough-demo_user', JSON.stringify({
            state: { hasSeenWalkthrough: true, showOnSignIn: false },
            version: 0
        }));
        sessionStorage.setItem('capflow_session_walkthrough_shown', 'true');
        const now = new Date();
        const curMonth = now.toISOString().slice(0, 7);
        localStorage.setItem('capflow-settings_demo_user', JSON.stringify({
            state: { defaultCurrency: 'INR', theme: 'dark', selectedMonth: curMonth, paymentUpiId: 'devletwala@okaxis', emailNotifications: true },
            version: 0
        }));

        const sampleSession = {
            id: 'goa-trip-2026',
            title: 'Goa Weekend Roadtrip 🏖️',
            currency: 'INR',
            status: 'active',
            creatorId: 'demo_user',
            creatorName: 'Dev Letwala',
            budgetCap: 50000,
            template: 'group',
            members: [
                { id: 'm1', name: 'Dev Letwala', email: 'dev@capflow.app', upiId: 'devletwala@okaxis', isCreator: true, familyCount: 1 },
                { id: 'm2', name: 'Aarav Patel', email: 'aarav@gmail.com', upiId: 'aarav@okicici', familyCount: 2 },
                { id: 'm3', name: 'Priya Sharma', email: 'priya@gmail.com', upiId: 'priya@okhdfcbank', familyCount: 1 }
            ],
            expenses: [
                { id: 'e1', title: 'Beach Villa Stay', amount: 18000, paidById: 'm1', date: '2026-10-24', category: 'General', splitType: 'equal', participants: ['m1', 'm2', 'm3'] }
            ],
            settlements: [],
            createdAt: '2026-10-24T10:00:00.000Z',
            updatedAt: '2026-10-25T20:00:00.000Z'
        };
        const existingSplit = JSON.parse(localStorage.getItem('capflow-splitter_demo_user') || '{"state":{"sessions":[]},"version":0}');
        existingSplit.state.sessions = [sampleSession];
        localStorage.setItem('capflow-splitter_demo_user', JSON.stringify(existingSplit));
    ''')

def run_captures():
    print("Running new feature captures...")
    
    # 1. Desktop captures
    d = setup_browser(mobile=False)
    try:
        inject_auth_and_data(d)
        
        # 1.1 Create Session with Family / Household Mode
        d.get('https://capflow-rho.vercel.app/budgets/splitter')
        time.sleep(2)
        # click + Create Session
        d.execute_script('''
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Create Session'));
            if (btn) btn.click();
        ''')
        time.sleep(1.5)
        # click Family / Primary Payer template card
        d.execute_script('''
            const cards = Array.from(document.querySelectorAll('button, div')).filter(el => el.innerText && el.innerText.includes('Family / Primary Payer'));
            if (cards.length > 0) cards[cards.length - 1].click();
        ''')
        time.sleep(1)
        d.save_screenshot('screenshots/17_splitter_create_family.png')
        print("Captured screenshots/17_splitter_create_family.png")

        # 1.2 Open Splitter Session & Launch Dynamic Settlement QR modal
        d.get('https://capflow-rho.vercel.app/budgets/splitter/goa-trip-2026')
        time.sleep(2)
        # click on Settlements tab
        d.execute_script('''
            const tabs = Array.from(document.querySelectorAll('button')).filter(b => b.innerText && (b.innerText.includes('Settlement') || b.innerText.includes('Balances')));
            if (tabs.length > 0) tabs[tabs.length - 1].click();
        ''')
        time.sleep(1.5)
        # click Pay or Record Payment
        d.execute_script('''
            const payBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && (b.innerText.includes('Pay') || b.innerText.includes('Settle')));
            if (payBtn) payBtn.click();
        ''')
        time.sleep(1.5)
        d.save_screenshot('screenshots/18_splitter_settlement_qr.png')
        print("Captured screenshots/18_splitter_settlement_qr.png")

        # 1.3 Notifications & Background Reminders
        d.get('https://capflow-rho.vercel.app/settings')
        time.sleep(2)
        # scroll to Notifications section
        d.execute_script('''
            const notifHeading = Array.from(document.querySelectorAll('h2, h3, div')).find(el => el.innerText && el.innerText.includes('Notification'));
            if (notifHeading) notifHeading.scrollIntoView({ behavior: 'instant', block: 'center' });
        ''')
        time.sleep(1)
        d.save_screenshot('screenshots/19_notifications_auto_dispatch.png')
        print("Captured screenshots/19_notifications_auto_dispatch.png")

    finally:
        d.quit()

    # 2. Mobile captures
    dm = setup_browser(mobile=True)
    try:
        inject_auth_and_data(dm)
        
        # 2.1 Mobile Create Session with Family Mode
        dm.get('https://capflow-rho.vercel.app/budgets/splitter')
        time.sleep(2)
        dm.execute_script('''
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && (b.innerText.includes('Create') || b.innerText.includes('+')));
            if (btn) btn.click();
        ''')
        time.sleep(1.5)
        dm.execute_script('''
            const cards = Array.from(document.querySelectorAll('button, div')).filter(el => el.innerText && el.innerText.includes('Family'));
            if (cards.length > 0) cards[cards.length - 1].click();
        ''')
        time.sleep(1)
        dm.save_screenshot('mobile_screenshots/17_splitter_create_family.png')
        print("Captured mobile_screenshots/17_splitter_create_family.png")

        # 2.2 Mobile Settlement QR
        dm.get('https://capflow-rho.vercel.app/budgets/splitter/goa-trip-2026')
        time.sleep(2)
        dm.execute_script('''
            const tabs = Array.from(document.querySelectorAll('button')).filter(b => b.innerText && (b.innerText.includes('Settlement') || b.innerText.includes('Balances')));
            if (tabs.length > 0) tabs[tabs.length - 1].click();
        ''')
        time.sleep(1.5)
        dm.execute_script('''
            const payBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && (b.innerText.includes('Pay') || b.innerText.includes('Settle')));
            if (payBtn) payBtn.click();
        ''')
        time.sleep(1.5)
        dm.save_screenshot('mobile_screenshots/18_splitter_settlement_qr.png')
        print("Captured mobile_screenshots/18_splitter_settlement_qr.png")

    finally:
        dm.quit()

    print("All additional captures completed successfully!")

if __name__ == '__main__':
    run_captures()
