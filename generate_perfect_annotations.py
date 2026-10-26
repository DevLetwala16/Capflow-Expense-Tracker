# generate_perfect_annotations.py
import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('annotated_screenshots', exist_ok=True)
os.makedirs('annotated_mobile_screenshots', exist_ok=True)

font_desk = None
try:
    font_desk = ImageFont.truetype("arialbd.ttf", 18)
except:
    try:
        font_desk = ImageFont.truetype("arial.ttf", 18)
    except:
        font_desk = ImageFont.load_default()

font_mob = None
try:
    font_mob = ImageFont.truetype("arialbd.ttf", 15)
except:
    try:
        font_mob = ImageFont.truetype("arial.ttf", 15)
    except:
        font_mob = ImageFont.load_default()

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

def draw_callout_mobile(draw, x1, y1, x2, y2, number, radius=10, outline_color="#EF4444", fill_badge="#EF4444", text_color="#FFFFFF", font=None):
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, outline=outline_color, width=3)
    badge_radius = 13
    cx = x1 + 4
    cy = y1 + 4
    draw.ellipse([cx - badge_radius, cy - badge_radius, cx + badge_radius, cy + badge_radius], fill=fill_badge, outline="#FFFFFF", width=2)
    num_str = str(number)
    if font:
        bbox = font.getbbox(num_str)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        draw.text((cx - w / 2, cy - h / 2 - 2), num_str, fill=text_color, font=font)
    else:
        draw.text((cx - 4, cy - 7), num_str, fill=text_color)

# =============================================================================
# DESKTOP CONFIG (19 Screenshots)
# =============================================================================
DESKTOP_CONFIG = {
    '01_auth_page.png': [
        (580, 70, 800, 230, 1),
        (490, 275, 890, 335, 2),
        (490, 350, 890, 465, 3),
        (490, 495, 890, 565, 4),
        (470, 625, 910, 680, 5)
    ],
    '02_dashboard.png': [
        (18, 15, 245, 690, 1),
        (690, 55, 915, 95, 2),
        (270, 120, 870, 275, 3),
        (270, 285, 870, 335, 4),
        (270, 345, 870, 505, 5),
        (890, 120, 1330, 690, 6),
        (1250, 620, 1325, 690, 7)
    ],
    '03_add_transaction_modal.png': [
        (505, 135, 875, 185, 1),
        (505, 195, 875, 280, 2),
        (520, 290, 860, 330, 3),
        (505, 340, 875, 390, 4),
        (505, 400, 875, 550, 5),
        (505, 560, 875, 615, 6)
    ],
    '04_transactions_history.png': [
        (270, 55, 1330, 105, 1),
        (270, 110, 480, 155, 2),
        (1200, 15, 1340, 55, 3),
        (1110, 15, 1195, 55, 4)
    ],
    '05_budgets_goals.png': [
        (270, 135, 790, 280, 1),
        (810, 135, 1330, 280, 2),
        (725, 90, 790, 130, 3),
        (1260, 90, 1335, 130, 4)
    ],
    '06_calendar_view.png': [
        (270, 55, 1330, 95, 1),
        (270, 140, 880, 510, 2),
        (910, 140, 1330, 400, 3),
        (1270, 160, 1335, 205, 4)
    ],
    '07_analytics_insights.png': [
        (270, 75, 720, 120, 1),
        (270, 130, 790, 200, 2),
        (270, 220, 700, 480, 3),
        (720, 220, 1330, 480, 4),
        (720, 500, 1330, 690, 5)
    ],
    '08_emis_tracker.png': [
        (1210, 15, 1340, 55, 1),
        (270, 75, 1330, 330, 2),
        (525, 255, 660, 310, 3)
    ],
    '09_settings_export.png': [
        (560, 80, 1040, 165, 1),
        (560, 210, 1040, 305, 2),
        (560, 315, 1040, 365, 3),
        (560, 380, 1040, 520, 4),
        (560, 560, 1040, 630, 5),
        (560, 650, 1040, 715, 6)
    ],
    '10_splitter_hub.png': [
        (270, 85, 1330, 150, 1),
        (270, 165, 790, 420, 2),
        (270, 435, 650, 485, 3),
        (810, 165, 1330, 420, 4)
    ],
    '11_splitter_session.png': [
        (270, 20, 1330, 85, 1),
        (270, 95, 1330, 195, 2),
        (270, 205, 820, 255, 3),
        (270, 265, 1330, 650, 4),
        (1140, 95, 1330, 145, 5)
    ],
    '12_appearance_settings.png': [
        (270, 85, 850, 190, 1),
        (270, 205, 850, 340, 2),
        (270, 355, 850, 465, 3),
        (270, 480, 850, 580, 4),
        (875, 85, 1330, 580, 5)
    ],
    '13_privacy_center.png': [
        (270, 85, 850, 175, 1),
        (270, 190, 850, 315, 2),
        (270, 330, 850, 455, 3),
        (875, 85, 1330, 455, 4),
        (270, 475, 1330, 600, 5)
    ],
    '14_device_transfer.png': [
        (270, 95, 785, 480, 1),
        (810, 95, 1330, 480, 2),
        (270, 495, 1330, 580, 3)
    ],
    '15_payment_qr.png': [
        (520, 150, 860, 430, 1),
        (450, 440, 930, 490, 2),
        (450, 505, 930, 580, 3)
    ],
    '16_floating_calculator.png': [
        (795, 120, 1285, 175, 1),
        (810, 180, 1270, 265, 2),
        (810, 275, 1270, 525, 3),
        (810, 535, 1270, 595, 4)
    ],
    '17_splitter_create_family.png': [
        (460, 110, 920, 235, 1),
        (460, 245, 920, 340, 2),
        (460, 350, 920, 425, 3),
        (460, 435, 920, 565, 4),
        (460, 575, 920, 635, 5)
    ],
    '18_splitter_settlement_qr.png': [
        (535, 120, 845, 410, 1),
        (470, 420, 910, 475, 2),
        (470, 485, 910, 540, 3),
        (470, 550, 910, 605, 4)
    ],
    '19_notifications_auto_dispatch.png': [
        (560, 100, 1040, 200, 1),
        (560, 210, 1040, 310, 2),
        (560, 320, 1040, 410, 3),
        (560, 420, 1040, 500, 4)
    ]
}

# =============================================================================
# MOBILE CONFIG (18 Screenshots)
# =============================================================================
MOBILE_CONFIG = {
    '01_auth.png': [
        (95, 80, 405, 235, 1),
        (25, 275, 475, 332, 2),
        (25, 338, 475, 458, 3),
        (25, 505, 475, 570, 4),
        (25, 655, 475, 715, 5)
    ],
    '02_dashboard.png': [
        (15, 10, 485, 50, 1),
        (135, 55, 365, 95, 2),
        (20, 108, 480, 265, 3),
        (20, 275, 480, 320, 4),
        (20, 335, 480, 495, 5),
        (20, 505, 480, 650, 6),
        (10, 662, 490, 725, 7)
    ],
    '03_add_transaction.png': [
        (65, 138, 435, 185, 1),
        (72, 202, 428, 285, 2),
        (72, 292, 428, 338, 3),
        (65, 348, 435, 390, 4),
        (58, 405, 442, 630, 5),
        (58, 655, 442, 715, 6)
    ],
    '04_transactions.png': [
        (20, 55, 480, 92, 1),
        (20, 95, 230, 135, 2),
        (335, 10, 430, 45, 3),
        (20, 145, 480, 580, 4),
        (420, 590, 485, 655, 5),
        (10, 662, 490, 725, 6)
    ],
    '05_budgets_goals.png': [
        (20, 125, 480, 415, 1),  # Active Category Budgets with Live Spending Gauges
        (375, 75, 485, 118, 2),   # + Add Budget Quick Action
        (20, 472, 480, 640, 3),  # Savings Goals Milestones Cards
        (375, 425, 485, 465, 4),  # + Add Goal Quick Action
        (10, 662, 490, 725, 5)   # 7-Tab Bottom Navigation Dock
    ],
    '06_calendar.png': [
        (15, 8, 485, 50, 1),
        (15, 55, 485, 120, 2),
        (15, 128, 485, 430, 3),
        (15, 440, 485, 650, 4),
        (10, 662, 490, 725, 5)
    ],
    '07_analytics.png': [
        (20, 65, 480, 110, 1),
        (20, 120, 480, 380, 2),
        (20, 395, 480, 650, 3),
        (10, 662, 490, 725, 4)
    ],
    '08_emis.png': [
        (20, 10, 480, 55, 1),
        (20, 60, 480, 130, 2),
        (20, 135, 480, 580, 3),
        (10, 662, 490, 725, 4)
    ],
    '09_settings.png': [
        (20, 70, 480, 160, 1),
        (20, 170, 480, 315, 2),
        (20, 325, 480, 375, 3),
        (20, 390, 480, 470, 4),
        (20, 485, 480, 565, 5),
        (10, 662, 490, 725, 6)
    ],
    '10_splitter_hub.png': [
        (20, 15, 480, 75, 1),
        (20, 90, 480, 280, 2),
        (20, 295, 480, 350, 3),
        (10, 662, 490, 725, 4)
    ],
    '11_splitter_session.png': [
        (15, 10, 485, 60, 1),
        (15, 75, 485, 175, 2),
        (15, 190, 485, 235, 3),
        (15, 250, 485, 640, 4),
        (10, 662, 490, 725, 5)
    ],
    '12_appearance.png': [
        (15, 75, 485, 185, 1),
        (15, 200, 485, 330, 2),
        (15, 345, 485, 455, 3),
        (15, 470, 485, 580, 4),
        (10, 662, 490, 725, 5)
    ],
    '13_privacy.png': [
        (15, 75, 485, 165, 1),
        (15, 180, 485, 310, 2),
        (15, 325, 485, 445, 3),
        (15, 460, 485, 640, 4)
    ],
    '14_transfer.png': [
        (15, 75, 485, 340, 1),
        (15, 355, 485, 620, 2),
        (10, 662, 490, 725, 3)
    ],
    '15_payment_qr.png': [
        (80, 120, 420, 420, 1),
        (35, 435, 465, 490, 2),
        (35, 505, 465, 610, 3)
    ],
    '16_floating_calculator.png': [
        (35, 150, 465, 235, 1),
        (35, 250, 465, 535, 2),
        (35, 550, 465, 615, 3)
    ],
    '17_splitter_create_family.png': [
        (20, 80, 480, 200, 1),
        (20, 210, 480, 310, 2),
        (20, 320, 480, 410, 3),
        (20, 420, 480, 580, 4),
        (20, 600, 480, 660, 5)
    ],
    '18_splitter_settlement_qr.png': [
        (80, 100, 420, 390, 1),
        (30, 405, 470, 460, 2),
        (30, 470, 470, 530, 3),
        (30, 540, 470, 600, 4)
    ]
}

print("Annotating Desktop Screenshots...")
for fname, boxes in DESKTOP_CONFIG.items():
    raw_path = os.path.join('screenshots', fname)
    out_path = os.path.join('annotated_screenshots', fname)
    if os.path.exists(raw_path):
        im = Image.open(raw_path).convert('RGB')
        draw = ImageDraw.Draw(im)
        for x1, y1, x2, y2, num in boxes:
            draw_callout(draw, x1, y1, x2, y2, num, font=font_desk)
        im.save(out_path, quality=95)
        print(f"  Saved {out_path}")
    else:
        print(f"  Missing {raw_path}")

print("\nAnnotating Mobile Screenshots...")
for fname, boxes in MOBILE_CONFIG.items():
    raw_path = os.path.join('mobile_screenshots', fname)
    out_path = os.path.join('annotated_mobile_screenshots', fname)
    if os.path.exists(raw_path):
        im = Image.open(raw_path).convert('RGB')
        draw = ImageDraw.Draw(im)
        for x1, y1, x2, y2, num in boxes:
            draw_callout_mobile(draw, x1, y1, x2, y2, num, font=font_mob)
        im.save(out_path, quality=95)
        print(f"  Saved {out_path}")
    else:
        print(f"  Missing {raw_path}")

print("\nALL 37 SCREENSHOTS ANNOTATED PERFECTLY!")
