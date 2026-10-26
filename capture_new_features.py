import os
import sys
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

os.makedirs('screenshots', exist_ok=True)
os.makedirs('mobile_screenshots', exist_ok=True)

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
    time.sleep(1.5)
    driver.add_cookie({
        'name': 'capflow_token',
        'value': 'mock_token',
        'path': '/',
        'domain': 'capflow-rho.vercel.app'
    })
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
            state: { defaultCurrency: 'INR', theme: 'dark', selectedMonth: curMonth, paymentUpiId: 'devletwala@okaxis' },
            version: 0
        }));

        // Seed a sample split session into splitter store
        const sampleSession = {
            id: 'goa-trip-2026',
            title: 'Goa Weekend Roadtrip 🏖️',
            currency: 'INR',
            status: 'active',
            creatorId: 'demo_user',
            creatorName: 'Dev Letwala',
            members: [
                { id: 'm1', name: 'Dev Letwala', email: 'dev@capflow.app', upiId: 'devletwala@okaxis', isCreator: true },
                { id: 'm2', name: 'Aarav Patel', email: 'aarav@gmail.com', upiId: 'aarav@okicici' },
                { id: 'm3', name: 'Priya Sharma', email: 'priya@gmail.com', upiId: 'priya@okhdfcbank' },
                { id: 'm4', name: 'Rohan Mehta', email: 'rohan@gmail.com', upiId: 'rohan@paytm' }
            ],
            expenses: [
                {
                    id: 'e1',
                    title: 'Beachside Villa Resort Booking',
                    amount: 24000,
                    currency: 'INR',
                    paidBy: 'm1',
                    payerName: 'Dev Letwala',
                    category: 'Stay',
                    date: '2026-10-24',
                    splitType: 'equal',
                    shares: { m1: 6000, m2: 6000, m3: 6000, m4: 6000 },
                    involvedMembers: ['m1', 'm2', 'm3', 'm4']
                },
                {
                    id: 'e2',
                    title: 'Seafood Shack Dinner & Drinks',
                    amount: 8400,
                    currency: 'INR',
                    paidBy: 'm2',
                    payerName: 'Aarav Patel',
                    category: 'Food',
                    date: '2026-10-25',
                    splitType: 'equal',
                    shares: { m1: 2100, m2: 2100, m3: 2100, m4: 2100 },
                    involvedMembers: ['m1', 'm2', 'm3', 'm4']
                },
                {
                    id: 'e3',
                    title: 'Self-Drive Car Rental & Fuel',
                    amount: 6000,
                    currency: 'INR',
                    paidBy: 'm3',
                    payerName: 'Priya Sharma',
                    category: 'Travel',
                    date: '2026-10-25',
                    splitType: 'equal',
                    shares: { m1: 1500, m2: 1500, m3: 1500, m4: 1500 },
                    involvedMembers: ['m1', 'm2', 'm3', 'm4']
                }
            ],
            settlements: [],
            createdAt: '2026-10-24T10:00:00.000Z',
            updatedAt: '2026-10-25T20:00:00.000Z'
        };

        const existingSplit = JSON.parse(localStorage.getItem('capflow-splitter_demo_user') || '{"state":{"sessions":[]},"version":0}');
        existingSplit.state.sessions = [sampleSession];
        localStorage.setItem('capflow-splitter_demo_user', JSON.stringify(existingSplit));
    ''')

def capture_suite():
    # ── 1. Desktop captures ───────────────────────────────────────────────────
    print("Capturing Desktop Suite...", flush=True)
    driver = setup_browser(mobile=False)
    try:
        inject_auth_and_data(driver)

        # Splitter Hub
        print("  -> Desktop Splitter Hub...", flush=True)
        driver.get('https://capflow-rho.vercel.app/budgets/splitter')
        time.sleep(3)
        driver.save_screenshot('screenshots/10_splitter_hub.png')

        # Splitter Session Detail
        print("  -> Desktop Splitter Session Detail...", flush=True)
        driver.get('https://capflow-rho.vercel.app/budgets/splitter/goa-trip-2026')
        time.sleep(3)
        driver.save_screenshot('screenshots/11_splitter_session.png')

        # Appearance Settings
        print("  -> Desktop Appearance Settings...", flush=True)
        driver.get('https://capflow-rho.vercel.app/settings/appearance')
        time.sleep(2.5)
        driver.save_screenshot('screenshots/12_appearance_settings.png')

        # Privacy Center
        print("  -> Desktop Privacy Center...", flush=True)
        driver.get('https://capflow-rho.vercel.app/settings/privacy')
        time.sleep(2.5)
        driver.save_screenshot('screenshots/13_privacy_center.png')

        # Device Transfer
        print("  -> Desktop Device Transfer...", flush=True)
        driver.get('https://capflow-rho.vercel.app/settings/transfer')
        time.sleep(2.5)
        driver.save_screenshot('screenshots/14_device_transfer.png')

    finally:
        driver.quit()

    # ── 2. Mobile captures ────────────────────────────────────────────────────
    print("Capturing Mobile Suite...", flush=True)
    m_driver = setup_browser(mobile=True)
    try:
        inject_auth_and_data(m_driver)

        # Mobile Splitter Hub
        print("  -> Mobile Splitter Hub...", flush=True)
        m_driver.get('https://capflow-rho.vercel.app/budgets/splitter')
        time.sleep(3)
        m_driver.save_screenshot('mobile_screenshots/10_splitter_hub.png')

        # Mobile Splitter Session Detail
        print("  -> Mobile Splitter Session Detail...", flush=True)
        m_driver.get('https://capflow-rho.vercel.app/budgets/splitter/goa-trip-2026')
        time.sleep(3)
        m_driver.save_screenshot('mobile_screenshots/11_splitter_session.png')

        # Mobile Appearance
        print("  -> Mobile Appearance...", flush=True)
        m_driver.get('https://capflow-rho.vercel.app/settings/appearance')
        time.sleep(2.5)
        m_driver.save_screenshot('mobile_screenshots/12_appearance.png')

        # Mobile Privacy
        print("  -> Mobile Privacy...", flush=True)
        m_driver.get('https://capflow-rho.vercel.app/settings/privacy')
        time.sleep(2.5)
        m_driver.save_screenshot('mobile_screenshots/13_privacy.png')

        # Mobile Device Transfer
        print("  -> Mobile Device Transfer...", flush=True)
        m_driver.get('https://capflow-rho.vercel.app/settings/transfer')
        time.sleep(2.5)
        m_driver.save_screenshot('mobile_screenshots/14_transfer.png')

    finally:
        m_driver.quit()

    print("ALL_NEW_FEATURES_CAPTURED_SUCCESSFULLY!", flush=True)

if __name__ == '__main__':
    capture_suite()
