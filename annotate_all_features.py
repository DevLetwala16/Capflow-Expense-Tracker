import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('annotated_screenshots', exist_ok=True)
os.makedirs('annotated_mobile_screenshots', exist_ok=True)

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

font_desk = None
font_mob = None
try:
    font_desk = ImageFont.truetype("arialbd.ttf", 18)
    font_mob = ImageFont.truetype("arialbd.ttf", 15)
except:
    try:
        font_desk = ImageFont.truetype("arial.ttf", 18)
        font_mob = ImageFont.truetype("arial.ttf", 15)
    except:
        font_desk = ImageFont.load_default()
        font_mob = ImageFont.load_default()

# ─────────────────────────────────────────────────────────────────────────────
# 1. NEW DESKTOP ANNOTATIONS
# ─────────────────────────────────────────────────────────────────────────────

# 10_splitter_hub.png
if os.path.exists('screenshots/10_splitter_hub.png'):
    im = Image.open('screenshots/10_splitter_hub.png').convert('RGB')
    d = ImageDraw.Draw(im)
    draw_callout(d, 270, 20, 1330, 80, 1, font=font_desk)      # Hub Header & Create / Join Actions
    draw_callout(d, 270, 95, 1330, 310, 2, font=font_desk)     # Active Group Sessions Card (Goa Roadtrip)
    draw_callout(d, 270, 325, 750, 375, 3, font=font_desk)     # Status Filter Tabs (All / Active / Settled)
    draw_callout(d, 10, 15, 240, 690, 4, font=font_desk)       # Left Navigation Sidebar
    im.save('annotated_screenshots/10_splitter_hub.png')
    print("Saved annotated_screenshots/10_splitter_hub.png")

# 11_splitter_session.png
if os.path.exists('screenshots/11_splitter_session.png'):
    im = Image.open('screenshots/11_splitter_session.png').convert('RGB')
    d = ImageDraw.Draw(im)
    draw_callout(d, 270, 20, 1330, 85, 1, font=font_desk)      # Session Title, QR, Share & PDF Export
    draw_callout(d, 270, 95, 1330, 195, 2, font=font_desk)     # Financial Overview (Total Spend & Net Position)
    draw_callout(d, 270, 205, 820, 255, 3, font=font_desk)     # 4 Core Tabs (Expenses, Balances, Settlements, Activity)
    draw_callout(d, 270, 265, 1330, 650, 4, font=font_desk)    # Itemized Expenses Feed & Simplified Roadmap
    draw_callout(d, 1140, 95, 1330, 145, 5, font=font_desk)    # + Add Group Expense Action CTA
    im.save('annotated_screenshots/11_splitter_session.png')
    print("Saved annotated_screenshots/11_splitter_session.png")

# 12_appearance_settings.png
if os.path.exists('screenshots/12_appearance_settings.png'):
    im = Image.open('screenshots/12_appearance_settings.png').convert('RGB')
    d = ImageDraw.Draw(im)
    draw_callout(d, 270, 85, 850, 190, 1, font=font_desk)      # Theme Mode (Light / Dark / System)
    draw_callout(d, 270, 205, 850, 340, 2, font=font_desk)     # 5 Accent Presets & Custom Hex Color Picker
    draw_callout(d, 270, 355, 850, 465, 3, font=font_desk)     # Font Scaling Controls (Small to Extra Large)
    draw_callout(d, 270, 480, 850, 580, 4, font=font_desk)     # UI Density & Reset to Factory Defaults
    draw_callout(d, 875, 85, 1330, 580, 5, font=font_desk)     # Live Interactive Widget Preview Card
    im.save('annotated_screenshots/12_appearance_settings.png')
    print("Saved annotated_screenshots/12_appearance_settings.png")

# 13_privacy_center.png
if os.path.exists('screenshots/13_privacy_center.png'):
    im = Image.open('screenshots/13_privacy_center.png').convert('RGB')
    d = ImageDraw.Draw(im)
    draw_callout(d, 270, 85, 850, 175, 1, font=font_desk)      # Privacy Mode (Mask Balances with Dots)
    draw_callout(d, 270, 190, 850, 315, 2, font=font_desk)     # App Lock (4-Digit PIN & Biometrics)
    draw_callout(d, 270, 330, 850, 455, 3, font=font_desk)     # Auto-Categorization Smart Rules Engine
    draw_callout(d, 875, 85, 1330, 455, 4, font=font_desk)     # In-Depth IndexedDB Storage Diagnostics
    draw_callout(d, 270, 475, 1330, 600, 5, font=font_desk)    # Safe Cache Cleaner & Nuclear Reset
    im.save('annotated_screenshots/13_privacy_center.png')
    print("Saved annotated_screenshots/13_privacy_center.png")

# 14_device_transfer.png
if os.path.exists('screenshots/14_device_transfer.png'):
    im = Image.open('screenshots/14_device_transfer.png').convert('RGB')
    d = ImageDraw.Draw(im)
    draw_callout(d, 270, 95, 785, 480, 1, font=font_desk)      # Push / Sender Mode (6-Digit Token & QR Code)
    draw_callout(d, 810, 95, 1330, 480, 2, font=font_desk)     # Pull / Receiver Mode (Live Camera QR Scanner)
    draw_callout(d, 270, 495, 1330, 580, 3, font=font_desk)    # 100% Client-Side End-to-End Encryption Notice
    im.save('annotated_screenshots/14_device_transfer.png')
    print("Saved annotated_screenshots/14_device_transfer.png")

# 15_payment_qr.png
if os.path.exists('screenshots/15_payment_qr.png'):
    im = Image.open('screenshots/15_payment_qr.png').convert('RGB')
    d = ImageDraw.Draw(im)
    draw_callout(d, 520, 150, 860, 430, 1, font=font_desk)     # Personal UPI Payment QR Code
    draw_callout(d, 450, 440, 930, 490, 2, font=font_desk)     # Verified Payee UPI VPA ID & Fast Copy
    draw_callout(d, 450, 505, 930, 580, 3, font=font_desk)     # Upload / Replace QR & Auto-Decoding
    im.save('annotated_screenshots/15_payment_qr.png')
    print("Saved annotated_screenshots/15_payment_qr.png")

# 16_floating_calculator.png
if os.path.exists('screenshots/16_floating_calculator.png'):
    im = Image.open('screenshots/16_floating_calculator.png').convert('RGB')
    d = ImageDraw.Draw(im)
    draw_callout(d, 795, 120, 1285, 175, 1, font=font_desk)    # Calculator Header & Mode Controls
    draw_callout(d, 810, 180, 1270, 265, 2, font=font_desk)    # Real-Time Formula Expression & Output
    draw_callout(d, 810, 275, 1270, 525, 3, font=font_desk)    # Full Arithmetic Keypad (+, -, *, /, %, ())
    draw_callout(d, 810, 535, 1270, 595, 4, font=font_desk)    # One-Tap "Apply to Amount" Action CTA
    im.save('annotated_screenshots/16_floating_calculator.png')
    print("Saved annotated_screenshots/16_floating_calculator.png")

# ─────────────────────────────────────────────────────────────────────────────
# 2. NEW MOBILE ANNOTATIONS
# ─────────────────────────────────────────────────────────────────────────────

# 10_splitter_hub.png (Mobile)
if os.path.exists('mobile_screenshots/10_splitter_hub.png'):
    im = Image.open('mobile_screenshots/10_splitter_hub.png').convert('RGB')
    d = ImageDraw.Draw(im)
    draw_callout_mobile(d, 20, 15, 480, 75, 1, font=font_mob)   # Mobile Splitter Header & Create/Join Actions
    draw_callout_mobile(d, 20, 90, 480, 280, 2, font=font_mob)  # Active Group Session Card
    draw_callout_mobile(d, 20, 295, 480, 350, 3, font=font_mob) # Session Filter Tabs
    draw_callout_mobile(d, 10, 662, 490, 725, 4, font=font_mob) # Bottom Navigation Dock
    im.save('annotated_mobile_screenshots/10_splitter_hub.png')
    print("Saved annotated_mobile_screenshots/10_splitter_hub.png")

# 11_splitter_session.png (Mobile)
if os.path.exists('mobile_screenshots/11_splitter_session.png'):
    im = Image.open('mobile_screenshots/11_splitter_session.png').convert('RGB')
    d = ImageDraw.Draw(im)
    draw_callout_mobile(d, 15, 10, 485, 60, 1, font=font_mob)   # Session Title & QR/Share Icons
    draw_callout_mobile(d, 15, 75, 485, 175, 2, font=font_mob)  # Summary Banner (Total Spend & Net Position)
    draw_callout_mobile(d, 15, 190, 485, 235, 3, font=font_mob) # Tab Switcher (Expenses, Balances, Settlements)
    draw_callout_mobile(d, 15, 250, 485, 640, 4, font=font_mob) # Itemized Expenses & Settlement Cards
    draw_callout_mobile(d, 10, 662, 490, 725, 5, font=font_mob) # Bottom Navigation Dock
    im.save('annotated_mobile_screenshots/11_splitter_session.png')
    print("Saved annotated_mobile_screenshots/11_splitter_session.png")

# 12_appearance.png (Mobile)
if os.path.exists('mobile_screenshots/12_appearance.png'):
    im = Image.open('mobile_screenshots/12_appearance.png').convert('RGB')
    d = ImageDraw.Draw(im)
    draw_callout_mobile(d, 15, 75, 485, 185, 1, font=font_mob)  # Mobile Theme Mode Switcher
    draw_callout_mobile(d, 15, 200, 485, 330, 2, font=font_mob) # Brand Accent Color Presets
    draw_callout_mobile(d, 15, 345, 485, 455, 3, font=font_mob) # Touch Font Scale Step Buttons
    draw_callout_mobile(d, 15, 470, 485, 580, 4, font=font_mob) # Layout Density & Reset Option
    draw_callout_mobile(d, 10, 662, 490, 725, 5, font=font_mob) # Bottom Navigation Dock
    im.save('annotated_mobile_screenshots/12_appearance.png')
    print("Saved annotated_mobile_screenshots/12_appearance.png")

# 13_privacy.png (Mobile)
if os.path.exists('mobile_screenshots/13_privacy.png'):
    im = Image.open('mobile_screenshots/13_privacy.png').convert('RGB')
    d = ImageDraw.Draw(im)
    draw_callout_mobile(d, 15, 75, 485, 165, 1, font=font_mob)  # Privacy Mask Mode (Hide Balances)
    draw_callout_mobile(d, 15, 180, 485, 310, 2, font=font_mob) # App Lock & Biometrics Security
    draw_callout_mobile(d, 15, 325, 485, 445, 3, font=font_mob) # Auto-Categorization Smart Rules
    draw_callout_mobile(d, 15, 460, 485, 640, 4, font=font_mob) # Mobile Storage Health Diagnostics
    im.save('annotated_mobile_screenshots/13_privacy.png')
    print("Saved annotated_mobile_screenshots/13_privacy.png")

# 14_transfer.png (Mobile)
if os.path.exists('mobile_screenshots/14_transfer.png'):
    im = Image.open('mobile_screenshots/14_transfer.png').convert('RGB')
    d = ImageDraw.Draw(im)
    draw_callout_mobile(d, 15, 75, 485, 340, 1, font=font_mob)  # Mobile Push Card (Token & Dynamic QR)
    draw_callout_mobile(d, 15, 355, 485, 620, 2, font=font_mob) # Mobile Pull Card (Camera Scanner & Code Input)
    draw_callout_mobile(d, 10, 662, 490, 725, 3, font=font_mob) # Bottom Navigation Dock
    im.save('annotated_mobile_screenshots/14_transfer.png')
    print("Saved annotated_mobile_screenshots/14_transfer.png")

# 15_payment_qr.png (Mobile)
if os.path.exists('mobile_screenshots/15_payment_qr.png'):
    im = Image.open('mobile_screenshots/15_payment_qr.png').convert('RGB')
    d = ImageDraw.Draw(im)
    draw_callout_mobile(d, 80, 120, 420, 420, 1, font=font_mob) # Mobile UPI QR Display
    draw_callout_mobile(d, 35, 435, 465, 490, 2, font=font_mob) # UPI VPA ID & Fast Copy
    draw_callout_mobile(d, 35, 505, 465, 610, 3, font=font_mob) # Upload / Auto-Decode QR
    im.save('annotated_mobile_screenshots/15_payment_qr.png')
    print("Saved annotated_mobile_screenshots/15_payment_qr.png")

# 16_floating_calculator.png (Mobile)
if os.path.exists('mobile_screenshots/16_floating_calculator.png'):
    im = Image.open('mobile_screenshots/16_floating_calculator.png').convert('RGB')
    d = ImageDraw.Draw(im)
    draw_callout_mobile(d, 35, 150, 465, 235, 1, font=font_mob) # Live Equation & Computed Result
    draw_callout_mobile(d, 35, 250, 465, 535, 2, font=font_mob) # Mobile Touch Arithmetic Keypad
    draw_callout_mobile(d, 35, 550, 465, 615, 3, font=font_mob) # "Apply Amount" One-Tap CTA
    im.save('annotated_mobile_screenshots/16_floating_calculator.png')
    print("Saved annotated_mobile_screenshots/16_floating_calculator.png")

print("ALL_FEATURES_ANNOTATED_SUCCESSFULLY!")
