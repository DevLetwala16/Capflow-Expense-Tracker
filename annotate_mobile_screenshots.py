import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('annotated_mobile_screenshots', exist_ok=True)

def draw_callout(draw, x1, y1, x2, y2, number, radius=10, outline_color="#EF4444", fill_badge="#EF4444", text_color="#FFFFFF", font=None):
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, outline=outline_color, width=3)
    
    badge_radius = 13
    cx = x1 + 5
    cy = y1 + 5
    draw.ellipse([cx - badge_radius, cy - badge_radius, cx + badge_radius, cy + badge_radius], fill=fill_badge, outline="#FFFFFF", width=2)
    
    num_str = str(number)
    if font:
        bbox = font.getbbox(num_str)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        draw.text((cx - w / 2, cy - h / 2 - 2), num_str, fill=text_color, font=font)
    else:
        draw.text((cx - 4, cy - 6), num_str, fill=text_color)

font = None
try:
    font = ImageFont.truetype("arialbd.ttf", 15)
except:
    try:
        font = ImageFont.truetype("arial.ttf", 15)
    except:
        font = ImageFont.load_default()

# 1. 01_auth.png
if os.path.exists('mobile_screenshots/01_auth.png'):
    img = Image.open('mobile_screenshots/01_auth.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 95, 80, 405, 235, 1, font=font)
    draw_callout(draw, 25, 275, 475, 332, 2, font=font)
    draw_callout(draw, 25, 338, 475, 458, 3, font=font)
    draw_callout(draw, 25, 505, 475, 570, 4, font=font)
    draw_callout(draw, 25, 655, 475, 715, 5, font=font)
    img.save('annotated_mobile_screenshots/01_auth.png')
    print("Saved annotated_mobile_screenshots/01_auth.png")

# 2. 02_dashboard.png
if os.path.exists('mobile_screenshots/02_dashboard.png'):
    img = Image.open('mobile_screenshots/02_dashboard.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 15, 10, 485, 50, 1, font=font)
    draw_callout(draw, 135, 55, 365, 95, 2, font=font)
    draw_callout(draw, 20, 108, 480, 265, 3, font=font)
    draw_callout(draw, 20, 275, 480, 320, 4, font=font)
    draw_callout(draw, 20, 335, 480, 495, 5, font=font)
    draw_callout(draw, 20, 505, 480, 650, 6, font=font)
    draw_callout(draw, 10, 662, 490, 725, 7, font=font)
    img.save('annotated_mobile_screenshots/02_dashboard.png')
    print("Saved annotated_mobile_screenshots/02_dashboard.png")

# 3. 03_add_transaction.png (FIGURE 6)
if os.path.exists('mobile_screenshots/03_add_transaction.png'):
    img = Image.open('mobile_screenshots/03_add_transaction.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 65, 138, 435, 185, 1, font=font)      # 1: Expense / Income Toggle
    draw_callout(draw, 72, 202, 428, 285, 2, font=font)      # 2: Currency & Entered Amount
    draw_callout(draw, 72, 292, 428, 338, 3, font=font)      # 3: Quick Amount Presets & Keypad
    draw_callout(draw, 65, 348, 435, 390, 4, font=font)      # 4: Title / Purpose Input ('Supermarket Grocery')
    draw_callout(draw, 58, 405, 442, 630, 5, font=font)      # 5: Visual Category Selector Grid ('Food' selected)
    draw_callout(draw, 58, 655, 442, 715, 6, font=font)      # 6: Primary Save Expense CTA
    img.save('annotated_mobile_screenshots/03_add_transaction.png')
    print("Saved annotated_mobile_screenshots/03_add_transaction.png (FIGURE 6)")

# 4. 04_transactions.png
if os.path.exists('mobile_screenshots/04_transactions.png'):
    img = Image.open('mobile_screenshots/04_transactions.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 20, 55, 480, 92, 1, font=font)
    draw_callout(draw, 20, 95, 230, 135, 2, font=font)
    draw_callout(draw, 335, 10, 430, 45, 3, font=font)
    draw_callout(draw, 20, 145, 480, 580, 4, font=font)
    draw_callout(draw, 420, 590, 485, 655, 5, font=font)
    draw_callout(draw, 10, 662, 490, 725, 6, font=font)
    img.save('annotated_mobile_screenshots/04_transactions.png')
    print("Saved annotated_mobile_screenshots/04_transactions.png")

# 5. 05_budgets_goals.png (FIGURE 10)
if os.path.exists('mobile_screenshots/05_budgets_goals.png'):
    img = Image.open('mobile_screenshots/05_budgets_goals.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 20, 85, 480, 420, 1, font=font)       # 1: Active Category Budgets with Live Spending Gauges
    draw_callout(draw, 400, 80, 480, 118, 2, font=font)      # 2: + Add Budget Quick Action
    draw_callout(draw, 20, 430, 480, 600, 3, font=font)      # 3: Savings Goals Milestones Cards
    draw_callout(draw, 400, 425, 480, 465, 4, font=font)     # 4: + Add Goal Quick Action
    draw_callout(draw, 10, 662, 490, 725, 5, font=font)      # 5: 7-Tab Bottom Navigation Dock
    img.save('annotated_mobile_screenshots/05_budgets_goals.png')
    print("Saved annotated_mobile_screenshots/05_budgets_goals.png (FIGURE 10)")

# 6. 06_calendar.png
if os.path.exists('mobile_screenshots/06_calendar.png'):
    img = Image.open('mobile_screenshots/06_calendar.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 15, 8, 485, 50, 1, font=font)
    draw_callout(draw, 15, 55, 485, 120, 2, font=font)
    draw_callout(draw, 15, 128, 485, 430, 3, font=font)
    draw_callout(draw, 15, 440, 485, 650, 4, font=font)
    draw_callout(draw, 10, 662, 490, 725, 5, font=font)
    img.save('annotated_mobile_screenshots/06_calendar.png')
    print("Saved annotated_mobile_screenshots/06_calendar.png")

# 7. 07_analytics.png
if os.path.exists('mobile_screenshots/07_analytics.png'):
    img = Image.open('mobile_screenshots/07_analytics.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 20, 65, 480, 110, 1, font=font)
    draw_callout(draw, 20, 120, 480, 380, 2, font=font)
    draw_callout(draw, 20, 395, 480, 650, 3, font=font)
    draw_callout(draw, 10, 662, 490, 725, 4, font=font)
    img.save('annotated_mobile_screenshots/07_analytics.png')
    print("Saved annotated_mobile_screenshots/07_analytics.png")

# 8. 08_emis.png (FIGURE 12)
if os.path.exists('mobile_screenshots/08_emis.png'):
    img = Image.open('mobile_screenshots/08_emis.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 20, 10, 480, 55, 1, font=font)        # 1: Title & + Add EMI Quick Button
    draw_callout(draw, 20, 60, 480, 130, 2, font=font)       # 2: Monthly Debt Obligation & Status Badges
    draw_callout(draw, 20, 135, 480, 580, 3, font=font)      # 3: Active Loan Cards & Installment Progress (14/36 paid)
    draw_callout(draw, 10, 662, 490, 725, 4, font=font)      # 4: 7-Tab Bottom Navigation Dock
    img.save('annotated_mobile_screenshots/08_emis.png')
    print("Saved annotated_mobile_screenshots/08_emis.png (FIGURE 12)")

# 9. 09_settings.png
if os.path.exists('mobile_screenshots/09_settings.png'):
    img = Image.open('mobile_screenshots/09_settings.png').convert('RGB')
    draw = ImageDraw.Draw(img)
    draw_callout(draw, 20, 70, 480, 160, 1, font=font)
    draw_callout(draw, 20, 170, 480, 315, 2, font=font)
    draw_callout(draw, 20, 325, 480, 375, 3, font=font)
    draw_callout(draw, 20, 390, 480, 470, 4, font=font)
    draw_callout(draw, 20, 485, 480, 565, 5, font=font)
    draw_callout(draw, 10, 662, 490, 725, 6, font=font)
    img.save('annotated_mobile_screenshots/09_settings.png')
    print("Saved annotated_mobile_screenshots/09_settings.png")

print("All annotated mobile screenshots re-generated successfully!")
