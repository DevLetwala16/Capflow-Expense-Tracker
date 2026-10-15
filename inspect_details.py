import sys
from PIL import Image

def analyze_image(path):
    img = Image.open(path)
    w, h = img.size
    print(f"\nImage: {path} ({w}x{h})")
    # We can detect where major horizontal dividing lines or content blocks are
    # by looking at horizontal edge profiles or luminance changes

for name in ['01_auth', '02_dashboard', '03_add_transaction', '04_transactions', '05_budgets_goals', '06_calendar', '07_analytics', '08_emis', '09_settings']:
    analyze_image(f'mobile_screenshots/{name}.png')
