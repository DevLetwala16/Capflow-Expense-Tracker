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

def inject_auth(driver):
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
            state: { defaultCurrency: 'INR', theme: 'dark', selectedMonth: curMonth, paymentUpiId: 'devletwala@okaxis' },
            version: 0
        }));

        const sampleSession = {
            id: 'goa-trip-2026',
            title: 'Goa Weekend Roadtrip 🏖️',
            currency: 'INR',
            status: 'active',
            creatorId: 'demo_user',
            creatorName: 'Dev Letwala',
            members: [
                { id: 'm1', name: 'Dev Letwala', email: 'dev@capflow.app', upiId: 'devletwala@okaxis', isCreator: true },
                { id: 'm2', name: 'Aarav Patel', email: 'aarav@gmail.com', upiId: 'aarav@okicici' }
            ],
            expenses: [],
            settlements: [],
            createdAt: '2026-10-24T10:00:00.000Z',
            updatedAt: '2026-10-25T20:00:00.000Z'
        };
        const existingSplit = JSON.parse(localStorage.getItem('capflow-splitter_demo_user') || '{"state":{"sessions":[]},"version":0}');
        existingSplit.state.sessions = [sampleSession];
        localStorage.setItem('capflow-splitter_demo_user', JSON.stringify(existingSplit));
    ''')

# Desktop capture
d = setup_browser(mobile=False)
try:
    inject_auth(d)
    
    # 1. Payment QR in Settings
    d.get('https://capflow-rho.vercel.app/settings')
    time.sleep(2.5)
    # click QR Code option if exists
    d.execute_script('''
        const qrBtn = Array.from(document.querySelectorAll('button, div')).find(el => el.innerText && el.innerText.includes('Payment QR Code'));
        if (qrBtn) qrBtn.click();
    ''')
    time.sleep(2)
    d.save_screenshot('screenshots/15_payment_qr.png')

    # 2. Floating Calculator in Split Session
    d.get('https://capflow-rho.vercel.app/budgets/splitter/goa-trip-2026')
    time.sleep(2.5)
    d.execute_script('''
        // Click Add Expense
        const addExpBtn = Array.from(document.querySelectorAll('button')).find(el => el.innerText && el.innerText.includes('Add Expense'));
        if (addExpBtn) addExpBtn.click();
    ''')
    time.sleep(1.5)
    d.execute_script('''
        // Click Calculator button
        const calcBtn = Array.from(document.querySelectorAll('button')).find(el => el.getAttribute('aria-label')?.includes('calculator') || el.innerHTML.includes('lucide-calculator'));
        if (calcBtn) calcBtn.click();
    ''')
    time.sleep(1.5)
    d.save_screenshot('screenshots/16_floating_calculator.png')

finally:
    d.quit()

# Mobile capture
m = setup_browser(mobile=True)
try:
    inject_auth(m)
    
    # 1. Mobile Payment QR
    m.get('https://capflow-rho.vercel.app/settings')
    time.sleep(2.5)
    m.execute_script('''
        const qrBtn = Array.from(document.querySelectorAll('button, div')).find(el => el.innerText && el.innerText.includes('Payment QR Code'));
        if (qrBtn) qrBtn.click();
    ''')
    time.sleep(2)
    m.save_screenshot('mobile_screenshots/15_payment_qr.png')

    # 2. Mobile Floating Calculator in Split Session
    m.get('https://capflow-rho.vercel.app/budgets/splitter/goa-trip-2026')
    time.sleep(2.5)
    m.execute_script('''
        const addExpBtn = Array.from(document.querySelectorAll('button')).find(el => el.innerText && el.innerText.includes('Add Expense'));
        if (addExpBtn) addExpBtn.click();
    ''')
    time.sleep(1.5)
    m.execute_script('''
        const calcBtn = Array.from(document.querySelectorAll('button')).find(el => el.getAttribute('aria-label')?.includes('calculator') || el.innerHTML.includes('lucide-calculator'));
        if (calcBtn) calcBtn.click();
    ''')
    time.sleep(1.5)
    m.save_screenshot('mobile_screenshots/16_floating_calculator.png')

finally:
    m.quit()

print("EXTRAS_CAPTURED_SUCCESSFULLY")
