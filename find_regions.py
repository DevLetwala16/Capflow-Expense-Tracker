from PIL import Image

def find_regions(img_path):
    img = Image.open(img_path).convert('RGB')
    w, h = img.size
    print(f"\nAnalyzing: {img_path}")
    
    # Check horizontal projection of bright pixels (cards have border/text)
    threshold = 40
    rows = []
    for y in range(h):
        bright_count = sum(1 for x in range(w) if sum(img.getpixel((x, y))) / 3 > threshold)
        rows.append(bright_count)
    
    in_block = False
    start_y = 0
    blocks = []
    for y, count in enumerate(rows):
        if count > 20 and not in_block:
            in_block = True
            start_y = y
        elif count <= 20 and in_block:
            in_block = False
            if y - start_y > 15:
                blocks.append((start_y, y))
    if in_block:
        blocks.append((start_y, h))
        
    for b in blocks:
        print(f"  Vertical block: y={b[0]} to y={b[1]} (height: {b[1]-b[0]})")

for p in ['mobile_screenshots/03_add_transaction.png', 'mobile_screenshots/05_budgets_goals.png', 'mobile_screenshots/08_emis.png']:
    find_regions(p)
