import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

options = Options()
options.add_argument('--headless')
options.add_argument('--window-size=1366,860')
driver = webdriver.Chrome(options=options)

try:
    driver.get('https://capflow-rho.vercel.app/dashboard')
    time.sleep(2)
    driver.add_cookie({
        'name': 'capflow_token',
        'value': 'mock_token',
        'path': '/',
        'domain': 'capflow-rho.vercel.app'
    })
    
    driver.execute_script('''
        localStorage.setItem('capflow-auth', JSON.stringify({
            state: { user: { id: 'local_user', email: 'dev.letwala@capflow.app', name: 'Dev Letwala' }, isAuthenticated: true },
            version: 0
        }));
        localStorage.setItem('capflow-walkthrough-local_user', JSON.stringify({
            state: { hasSeenWalkthrough: true, showOnSignIn: false },
            version: 0
        }));
        sessionStorage.setItem('capflow_session_walkthrough_shown', 'true');
    ''')

    driver.get('https://capflow-rho.vercel.app/dashboard')
    time.sleep(3)

    # Hide PWA Banner
    driver.execute_script('''
        const banners = document.querySelectorAll('*');
        banners.forEach(b => {
            if (b.innerText && b.innerText.includes('Install CapFlow')) {
                b.style.display = 'none';
            }
        });
    ''')

    # Click Add Expense button
    print("Clicking Add Expense...")
    add_btn = driver.find_element(By.XPATH, "//button[contains(., 'Add Expense')]")
    driver.execute_script("arguments[0].click();", add_btn)
    time.sleep(2)

    # Click +1k five times
    print("Adding amount...")
    plus_1k = driver.find_element(By.XPATH, "//button[contains(., '+₹1k')]")
    for _ in range(5):
        driver.execute_script("arguments[0].click();", plus_1k)
        time.sleep(0.2)

    # Select Food category
    print("Selecting Food category...")
    food_btn = driver.find_element(By.XPATH, "//button[contains(., 'Food')]")
    driver.execute_script("arguments[0].click();", food_btn)
    time.sleep(0.5)

    # Enter title
    print("Entering title...")
    inputs = driver.find_elements(By.TAG_NAME, "input")
    for inp in inputs:
        ph = inp.get_attribute("placeholder") or ""
        if "Lunch" in ph or "What was this for" in ph:
            inp.send_keys("Monthly Grocery & Provisions")
            break
    time.sleep(0.5)

    # Click Save Expense
    print("Saving transaction...")
    save_btn = driver.find_element(By.XPATH, "//button[contains(., 'Save Expense')]")
    driver.execute_script("arguments[0].click();", save_btn)
    time.sleep(4)

    # Hide PWA Banner again on dashboard
    driver.execute_script('''
        const banners = document.querySelectorAll('*');
        banners.forEach(b => {
            if (b.innerText && b.innerText.includes('Install CapFlow')) {
                b.style.display = 'none';
            }
        });
    ''')
    time.sleep(1)

    driver.save_screenshot('screenshots/dashboard_after_ui_add.png')
    print("Saved after UI add successfully!")
finally:
    driver.quit()
