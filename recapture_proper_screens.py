import os
import sys
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

backup_file = os.path.abspath('demo_backup.json')
print(f"Using backup file: {backup_file}")

options = Options()
options.add_argument('--headless')
options.add_argument('--window-size=412,880')
options.add_argument('--user-agent=Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36')
options.add_argument('--force-device-scale-factor=1')

driver = webdriver.Chrome(options=options)

try:
    print("Navigating to auth and setting cookies...", flush=True)
    driver.get('https://capflow-rho.vercel.app/auth')
    time.sleep(2)
    driver.add_cookie({
        'name': 'capflow_token',
        'value': 'mock_token',
        'path': '/',
        'domain': 'capflow-rho.vercel.app'
    })

    driver.execute_script('''
        localStorage.setItem('capflow-auth', JSON.stringify({
            state: { user: { id: 'demo_user', email: 'dev.letwala@capflow.app', name: 'Dev Letwala' }, isAuthenticated: true },
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
            state: { defaultCurrency: 'INR', theme: 'dark', selectedMonth: curMonth },
            version: 0
        }));
    ''')

    # Navigate to settings/export
    print("Navigating to settings/export for JSON restore...", flush=True)
    driver.get('https://capflow-rho.vercel.app/settings/export')
    time.sleep(3)

    # Locate hidden file input and send file path
    file_input = driver.find_element(By.CSS_SELECTOR, 'input[type="file"][accept=".json"]')
    file_input.send_keys(backup_file)
    print("File sent to restore input, waiting for import completion...", flush=True)
    time.sleep(4)

    # 1. Capture 05_budgets_goals
    print("Capturing 05_budgets_goals with populated data...", flush=True)
    driver.get('https://capflow-rho.vercel.app/budgets')
    time.sleep(4)
    # Check text
    budgets_text = driver.find_element(By.TAG_NAME, 'main').text
    print("Budgets Page snippet:\n", budgets_text[:200])
    driver.save_screenshot('mobile_screenshots/05_budgets_goals.png')

    # 2. Capture 08_emis
    print("Capturing 08_emis with populated loan cards...", flush=True)
    driver.get('https://capflow-rho.vercel.app/emis')
    time.sleep(4)
    emis_text = driver.find_element(By.TAG_NAME, 'main').text
    print("EMIs Page snippet:\n", emis_text[:200])
    driver.save_screenshot('mobile_screenshots/08_emis.png')

    # 3. Capture 03_add_transaction with realistic inputs
    print("Capturing 03_add_transaction...", flush=True)
    driver.get('https://capflow-rho.vercel.app/dashboard')
    time.sleep(3)

    # Click Add Expense
    add_btn = driver.find_element(By.XPATH, "//button[contains(., 'Add Expense')]")
    driver.execute_script("arguments[0].click();", add_btn)
    time.sleep(2)

    # Type amount or click presets
    driver.execute_script('''
        // Click +1k preset three times and +500 once or type
        const p1k = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('+₹1k') || b.innerText.includes('+1k'));
        const p500 = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('+₹500') || b.innerText.includes('+500'));
        if (p1k) { p1k.click(); p1k.click(); p1k.click(); p1k.click(); }
        if (p500) { p500.click(); }
        
        // Fill title
        const titleInput = document.querySelector('input[placeholder*="Lunch"], input[placeholder*="What was this for"]');
        if (titleInput) {
            titleInput.value = 'Supermarket Grocery & Food';
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Select Food category
        const foodBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Food'));
        if (foodBtn) {
            foodBtn.click();
        }
    ''')
    time.sleep(2)
    driver.save_screenshot('mobile_screenshots/03_add_transaction.png')
    print("Saved 03_add_transaction.png with filled fields!")

    print("ALL 3 MOBILE SCREENSHOTS RE-CAPTURED SUCCESSFULLY!")

finally:
    driver.quit()
