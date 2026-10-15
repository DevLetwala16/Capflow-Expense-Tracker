from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

options = Options()
options.add_argument('--headless')
options.add_argument('--window-size=412,880')
options.add_argument('--user-agent=Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36')
options.add_argument('--force-device-scale-factor=1')

driver = webdriver.Chrome(options=options)
try:
    driver.get('https://capflow-rho.vercel.app/dashboard')
    driver.add_cookie({'name': 'capflow_token', 'value': 'mock_token', 'path': '/', 'domain': 'capflow-rho.vercel.app'})
    driver.execute_script('''
        localStorage.setItem('capflow-auth', JSON.stringify({ state: { user: { id: 'demo_user', email: 'dev.letwala@capflow.app', name: 'Dev Letwala' }, isAuthenticated: true }, version: 0 }));
        localStorage.setItem('capflow-walkthrough-demo_user', JSON.stringify({ state: { hasSeenWalkthrough: true, showOnSignIn: false }, version: 0 }));
        sessionStorage.setItem('capflow_session_walkthrough_shown', 'true');
    ''')
    driver.get('https://capflow-rho.vercel.app/dashboard')
    time.sleep(2)

    btn = driver.find_element(By.XPATH, "//button[contains(., 'Add Expense')]")
    driver.execute_script("arguments[0].click();", btn)
    time.sleep(1.5)

    boxes = driver.execute_script('''
        const res = [];
        const seen = new Set();
        document.querySelectorAll('div, button, input, h2, h3, span').forEach(el => {
            const rect = el.getBoundingClientRect();
            const text = (el.innerText || el.getAttribute('placeholder') || '').trim().replace(/\\n/g, ' ').slice(0, 35);
            const key = `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)},${Math.round(rect.height)}`;
            if (rect.width > 20 && rect.height > 15 && text && !seen.has(key)) {
                seen.add(key);
                res.push({tag: el.tagName, text: text, x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height)});
            }
        });
        return res;
    ''')
    for b in boxes:
        if b['y'] > 50 and b['h'] < 300:
            print(f"{b['tag']:<6} | {b['text']:<30} | ({b['x']}, {b['y']}, {b['x']+b['w']}, {b['y']+b['h']})")

finally:
    driver.quit()
