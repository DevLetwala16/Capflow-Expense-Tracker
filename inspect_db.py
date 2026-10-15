import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

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
            state: { user: { id: 'demo_user', email: 'dev.letwala@capflow.app', name: 'Dev Letwala' }, isAuthenticated: true },
            version: 0
        }));
        localStorage.setItem('capflow-walkthrough-demo_user', JSON.stringify({
            state: { hasSeenWalkthrough: true, showOnSignIn: false },
            version: 0
        }));
        sessionStorage.setItem('capflow_session_walkthrough_shown', 'true');
    ''')

    driver.get('https://capflow-rho.vercel.app/dashboard')
    time.sleep(3)

    # Let's inspect Dexie tables and schema from the live page
    info = driver.execute_async_script('''
        const done = arguments[arguments.length - 1];
        const req = indexedDB.open('ExpenseTrackerDB');
        req.onsuccess = (e) => {
            const db = e.target.result;
            const names = Array.from(db.objectStoreNames);
            const version = db.version;
            done({ names, version });
        };
        req.onerror = (e) => done({ error: e.target.error.message });
    ''')
    print("IndexedDB Info:", info)

finally:
    driver.quit()
