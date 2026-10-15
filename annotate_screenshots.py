import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('annotated_screenshots', exist_ok=True)

def draw_callout(draw, x1, y1, x2, y2, number, radius=12, outline_color="#EF4444", fill_badge="#EF4444", text_color="#FFFFFF", font=None):
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, outline=outline_color, width=4)
    badge_radius = 16
    cx = x1 + 6
    cy = y1 + 6
    draw.ellipse([cx - badge_radius, cy - badge_radius, cx + badge_radius, cy + badge_radius], fill=fill_badge, outline="#FFFFFF", width=2)
    num_str = str(number)
    if font:
        bbox = font.getbbox(num_str)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        draw.text((cx - w / 2, cy - h / 2 - 2), num_str, fill=text_color, font=font)
    else:
        draw.text((cx - 5, cy - 8), num_str, fill=text_color)

font = None
try:
    font = ImageFont.truetype("arialbd.ttf", 18)
except:
    try:
        font = ImageFont.truetype("arial.ttf", 18)
    except:
        font = ImageFont.load_default()

# 1. 01_auth_page.png
if os.path.exists('screenshots/01_auth_page.png'):
    img = Image.open('screenshots/01_auth_page.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 580, 70, 800, 230, 1, font=font)       # Logo & Welcome
    draw_callout(draw, 490, 275, 890, 335, 2, font=font)      # Google OAuth
    draw_callout(draw, 490, 350, 890, 465, 3, font=font)      # Facebook & Apple
    draw_callout(draw, 490, 495, 890, 565, 4, font=font)      # Continue with Email (OTP)
    draw_callout(draw, 470, 625, 910, 680, 5, font=font)      # Local Data Security Note
    img.save('annotated_screenshots/01_auth_page.png')

# 2. 02_dashboard.png
if os.path.exists('screenshots/02_dashboard.png'):
    img = Image.open('screenshots/02_dashboard.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 10, 15, 240, 690, 1, font=font)        # Left Navigation Sidebar
    draw_callout(draw, 690, 55, 915, 95, 2, font=font)        # Month Navigator
    draw_callout(draw, 270, 120, 870, 275, 3, font=font)      # Balance & Net Card
    draw_callout(draw, 270, 285, 870, 335, 4, font=font)      # Quick Add Buttons (Expense/Income)
    draw_callout(draw, 270, 345, 870, 505, 5, font=font)      # Weekly Spending Chart
    draw_callout(draw, 890, 120, 1330, 690, 6, font=font)     # Recent Transactions Feed
    draw_callout(draw, 1250, 620, 1325, 690, 7, font=font)    # Quick FAB (+)
    img.save('annotated_screenshots/02_dashboard.png')

# 3. 03_add_transaction_modal.png
if os.path.exists('screenshots/03_add_transaction_modal.png'):
    img = Image.open('screenshots/03_add_transaction_modal.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 505, 135, 875, 185, 1, font=font)      # Expense / Income Toggle
    draw_callout(draw, 505, 195, 875, 280, 2, font=font)      # Currency & Amount Display
    draw_callout(draw, 520, 290, 860, 330, 3, font=font)      # Quick Add Amount Presets
    draw_callout(draw, 505, 340, 875, 390, 4, font=font)      # Description / Title Input
    draw_callout(draw, 505, 400, 875, 550, 5, font=font)      # Category Grid
    draw_callout(draw, 505, 560, 875, 615, 6, font=font)      # Save Transaction Button
    img.save('annotated_screenshots/03_add_transaction_modal.png')

# 4. 04_transactions_history.png
if os.path.exists('screenshots/04_transactions_history.png'):
    img = Image.open('screenshots/04_transactions_history.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 270, 55, 1330, 105, 1, font=font)      # Search Transactions
    draw_callout(draw, 270, 110, 480, 155, 2, font=font)      # Type Filter (All / Expense / Income)
    draw_callout(draw, 1200, 15, 1340, 55, 3, font=font)      # Email Statement / Export
    draw_callout(draw, 1110, 15, 1195, 55, 4, font=font)      # Filter Options
    img.save('annotated_screenshots/04_transactions_history.png')

# 5. 05_budgets_goals.png
if os.path.exists('screenshots/05_budgets_goals.png'):
    img = Image.open('screenshots/05_budgets_goals.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 270, 135, 790, 280, 1, font=font)      # This Month's Budgets
    draw_callout(draw, 810, 135, 1330, 280, 2, font=font)     # Savings Goals
    draw_callout(draw, 725, 90, 790, 130, 3, font=font)       # + Add Budget
    draw_callout(draw, 1260, 90, 1335, 130, 4, font=font)     # + Add Goal
    img.save('annotated_screenshots/05_budgets_goals.png')

# 6. 06_calendar_view.png
if os.path.exists('screenshots/06_calendar_view.png'):
    img = Image.open('screenshots/06_calendar_view.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 270, 55, 1330, 95, 1, font=font)       # Monthly In/Out/Net Summary Strip
    draw_callout(draw, 270, 140, 880, 510, 2, font=font)      # Interactive Calendar Date Grid
    draw_callout(draw, 910, 140, 1330, 400, 3, font=font)     # Day Drill-Down Inspector
    draw_callout(draw, 1270, 160, 1335, 205, 4, font=font)    # Quick Day Add
    img.save('annotated_screenshots/06_calendar_view.png')

# 7. 07_analytics_insights.png
if os.path.exists('screenshots/07_analytics_insights.png'):
    img = Image.open('screenshots/07_analytics_insights.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 270, 75, 720, 120, 1, font=font)       # Time Horizon Tabs (Week/Month/Year)
    draw_callout(draw, 270, 130, 790, 200, 2, font=font)      # High-Level Metrics (Avg / Total)
    draw_callout(draw, 270, 220, 700, 480, 3, font=font)      # Spending by Category (Donut)
    draw_callout(draw, 720, 220, 1330, 480, 4, font=font)     # Monthly Spending Bar Graph
    draw_callout(draw, 720, 500, 1330, 690, 5, font=font)     # Daily Spend Trend & Anomaly Band
    img.save('annotated_screenshots/07_analytics_insights.png')

# 8. 08_emis_tracker.png
if os.path.exists('screenshots/08_emis_tracker.png'):
    img = Image.open('screenshots/08_emis_tracker.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 1220, 12, 1340, 52, 1, font=font)      # + Add EMI Button
    draw_callout(draw, 270, 75, 1330, 330, 2, font=font)      # EMI Portfolio Dashboard Card
    draw_callout(draw, 525, 255, 660, 310, 3, font=font)      # Add Your First EMI CTA
    img.save('annotated_screenshots/08_emis_tracker.png')

# 9. 09_settings_export.png
if os.path.exists('screenshots/09_settings_export.png'):
    img = Image.open('screenshots/09_settings_export.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 560, 80, 1040, 165, 1, font=font)      # User Account & Sign Out
    draw_callout(draw, 560, 210, 1040, 305, 2, font=font)     # Currency Configuration
    draw_callout(draw, 560, 315, 1040, 365, 3, font=font)     # Theme Mode
    draw_callout(draw, 560, 380, 1040, 520, 4, font=font)     # Email Notifications & Reminders
    draw_callout(draw, 560, 560, 1040, 630, 5, font=font)     # Manage Categories
    draw_callout(draw, 560, 650, 1040, 715, 6, font=font)     # Export / Backup & Restore
    img.save('annotated_screenshots/09_settings_export.png')

print("All annotations re-generated perfectly!")
