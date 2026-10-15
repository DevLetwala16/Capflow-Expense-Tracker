import os
import sys
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def create_manual():
    doc = Document()
    
    # ── Page Setup ────────────────────────────────────────────────────────────
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        section.page_width = Inches(8.5)
        section.page_height = Inches(11.0)
        
        # Header / Footer
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("CapFlow — Expense Tracker | Official User Manual (उपयोगकर्ता मार्गदर्शिका)")
        hrun.font.name = "Arial"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(148, 163, 184)
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("CapFlow • Private, Local-First Personal Finance • https://capflow-rho.vercel.app/")
        frun.font.name = "Arial"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(148, 163, 184)

    # ── Styling Helpers ───────────────────────────────────────────────────────
    PRIMARY_COLOR = RGBColor(30, 27, 75)      # Deep Indigo #1E1B4B
    ACCENT_COLOR = RGBColor(79, 70, 229)      # Brand Indigo #4F46E5
    SECONDARY_COLOR = RGBColor(14, 165, 233)  # Sky Blue #0EA5E9
    TEXT_DARK = RGBColor(15, 23, 42)          # Slate 900 #0F172A
    TEXT_MUTED = RGBColor(71, 85, 105)        # Slate 600 #475569
    HINDI_COLOR = RGBColor(51, 65, 85)        # Slate 700 #334155
    MOBILE_ACCENT = RGBColor(225, 29, 72)     # Rose 600 #E11D48

    def set_cell_shading(cell, color_hex):
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
        cell._tc.get_or_add_tcPr().append(shd)

    def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
        tcPr.append(tcMar)

    def set_table_borders(table, color="CBD5E1", sz="4", val="single"):
        tblPr = table._tbl.tblPr
        borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:insideV w:val="none"/><w:left w:val="none"/><w:right w:val="none"/></w:tblBorders>')
        tblPr.append(borders)

    def add_callout(title, text, box_type="note"):
        colors = {
            "note": {"border": "4F46E5", "bg": "EEF2FF", "title_color": RGBColor(67, 56, 202)},
            "tip": {"border": "10B981", "bg": "ECFDF5", "title_color": RGBColor(6, 95, 70)},
            "warning": {"border": "EF4444", "bg": "FEF2F2", "title_color": RGBColor(153, 27, 27)},
            "example": {"border": "0EA5E9", "bg": "F0F9FF", "title_color": RGBColor(12, 74, 96)},
            "mobile": {"border": "E11D48", "bg": "FFF1F2", "title_color": RGBColor(159, 18, 57)}
        }
        cfg = colors.get(box_type, colors["note"])
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        cell = tbl.cell(0, 0)
        cell.width = Inches(6.9)
        set_cell_shading(cell, cfg["bg"])
        set_cell_margins(cell, top=110, bottom=110, left=170, right=150)
        
        borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="24" w:space="0" w:color="{cfg["border"]}"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>')
        cell._tc.get_or_add_tcPr().append(borders)
        
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.15
        run_t = p.add_run(title + "\n")
        run_t.bold = True
        run_t.font.size = Pt(10)
        run_t.font.color.rgb = cfg["title_color"]
        run_t.font.name = "Arial"
        
        run_c = p.add_run(text)
        run_c.font.size = Pt(9.5)
        run_c.font.color.rgb = TEXT_DARK
        run_c.font.name = "Arial"
        
        sp = doc.add_paragraph()
        sp.paragraph_format.space_before = Pt(0)
        sp.paragraph_format.space_after = Pt(4)

    def add_h1(text, hindi_text=None):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(15.5)
        run.font.color.rgb = PRIMARY_COLOR
        run.font.name = "Arial"
        if hindi_text:
            run_hi = p.add_run(" | " + hindi_text)
            run_hi.bold = True
            run_hi.font.size = Pt(13.5)
            run_hi.font.color.rgb = ACCENT_COLOR
            run_hi.font.name = "Arial"

    def add_h2(text, hindi_text=None):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(12.5)
        run.font.color.rgb = ACCENT_COLOR
        run.font.name = "Arial"
        if hindi_text:
            run_hi = p.add_run(" (" + hindi_text + ")")
            run_hi.font.size = Pt(11)
            run_hi.font.color.rgb = HINDI_COLOR
            run_hi.font.name = "Arial"

    def add_h3(text, hindi_text=None, is_mobile=False):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(9)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(11)
        run.font.color.rgb = MOBILE_ACCENT if is_mobile else PRIMARY_COLOR
        run.font.name = "Arial"
        if hindi_text:
            run_hi = p.add_run(" — " + hindi_text)
            run_hi.font.size = Pt(10)
            run_hi.font.color.rgb = HINDI_COLOR
            run_hi.font.name = "Arial"

    def add_p(en_text, hi_text=None):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        run = p.add_run(en_text)
        run.font.size = Pt(9.5)
        run.font.color.rgb = TEXT_DARK
        run.font.name = "Arial"
        if hi_text:
            p2 = doc.add_paragraph()
            p2.paragraph_format.space_before = Pt(0)
            p2.paragraph_format.space_after = Pt(5)
            p2.paragraph_format.line_spacing = 1.15
            run_hi = p2.add_run("हिंदी व्याख्या: " + hi_text)
            run_hi.font.size = Pt(9)
            run_hi.font.color.rgb = HINDI_COLOR
            run_hi.font.name = "Arial"

    def add_annotated_image(img_path, caption, width=Inches(6.2)):
        if os.path.exists(img_path):
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run()
            run.add_picture(img_path, width=width)
            
            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_before = Pt(2)
            p_cap.paragraph_format.space_after = Pt(6)
            run_cap = p_cap.add_run(caption)
            run_cap.font.size = Pt(8.5)
            run_cap.italic = True
            run_cap.font.color.rgb = TEXT_MUTED
            run_cap.font.name = "Arial"

    def add_callout_table(headers, rows_data, is_mobile=False):
        tbl = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        
        # Header shading
        hdr_color = "9F1239" if is_mobile else "1E1B4B"  # Rose-800 for mobile, Deep indigo for desktop
        hdr_cells = tbl.rows[0].cells
        for idx, h_text in enumerate(headers):
            hdr_cells[idx].text = h_text
            set_cell_shading(hdr_cells[idx], hdr_color)
            set_cell_margins(hdr_cells[idx], top=70, bottom=70, left=90, right=90)
            p = hdr_cells[idx].paragraphs[0]
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            for r in p.runs:
                r.bold = True
                r.font.size = Pt(8.5)
                r.font.color.rgb = RGBColor(255, 255, 255)
                r.font.name = "Arial"
        
        # Format Data Rows
        for r_idx, row in enumerate(rows_data):
            row_cells = tbl.rows[r_idx + 1].cells
            bg_color = "FFF1F2" if (is_mobile and r_idx % 2 == 1) else ("F8FAFC" if r_idx % 2 == 1 else "FFFFFF")
            for c_idx, val in enumerate(row):
                row_cells[c_idx].text = val
                set_cell_shading(row_cells[c_idx], bg_color)
                set_cell_margins(row_cells[c_idx], top=60, bottom=60, left=90, right=90)
                p = row_cells[c_idx].paragraphs[0]
                p.paragraph_format.space_before = Pt(1)
                p.paragraph_format.space_after = Pt(1)
                for r in p.runs:
                    r.font.size = Pt(8.5)
                    r.font.color.rgb = TEXT_DARK
                    r.font.name = "Arial"
        
        # Apply borders
        tblPr = tbl._tbl.tblPr
        border_color = "FDA4AF" if is_mobile else "CBD5E1"
        borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/><w:left w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/><w:right w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/></w:tblBorders>')
        tblPr.append(borders)
        
        sp = doc.add_paragraph()
        sp.paragraph_format.space_before = Pt(0)
        sp.paragraph_format.space_after = Pt(5)

    # ══════════════════════════════════════════════════════════════════════════
    # COVER PAGE
    # ══════════════════════════════════════════════════════════════════════════
    
    # Logo
    logo_path = 'nextjs/public/capflow-logo.png'
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(30)
        p_logo.paragraph_format.space_after = Pt(10)
        run_l = p_logo.add_run()
        run_l.add_picture(logo_path, width=Inches(1.8))
    
    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(6)
    p_title.paragraph_format.space_after = Pt(4)
    run_t1 = p_title.add_run("CapFlow — EXPENSE TRACKER\n")
    run_t1.bold = True
    run_t1.font.size = Pt(26)
    run_t1.font.color.rgb = PRIMARY_COLOR
    run_t1.font.name = "Arial"
    
    run_t2 = p_title.add_run("Official User Manual & Dual-Interface Architecture Guide\nविस्तृत उपयोगकर्ता मैनुअल: डेस्कटॉप एवं मोबाइल इंटरफ़ेस गाइड")
    run_t2.bold = True
    run_t2.font.size = Pt(13.5)
    run_t2.font.color.rgb = ACCENT_COLOR
    run_t2.font.name = "Arial"

    # Subtitle / Philosophy
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(6)
    p_sub.paragraph_format.space_after = Pt(20)
    run_sub = p_sub.add_run("Responsive Mobile-First & Desktop Personal Finance Web Application\nComplete Visual Guide with Annotated Real UI Photos (Red Round Markers & Callouts)\n100% Client-Side Privacy: All Records Reside Exclusively on Your Device via IndexedDB")
    run_sub.font.size = Pt(9.5)
    run_sub.font.color.rgb = TEXT_MUTED
    run_sub.font.name = "Arial"

    # Metadata Table
    meta_table = doc.add_table(rows=7, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False
    
    meta_data = [
        ("Deployed Live Application", "https://capflow-rho.vercel.app/"),
        ("Software Version", "Version 1.0 (Production Release)"),
        ("Dual-Interface Visuals", "Desktop Full View + Mobile Touch View with Red Callout Badges (①, ②, ③...)"),
        ("Architecture Type", "Local-First PWA (IndexedDB / Dexie.js) + Fast Cloud Auth Option"),
        ("Primary Languages", "Bilingual: English & हिन्दी (Detailed Step-by-Step Instructions)"),
        ("Frontend & UI Stack", "Next.js 14 (App Router), React 18, Tailwind CSS, Framer Motion, Lucide"),
        ("Data Persistence Engine", "In-Browser IndexedDB (Dexie.js), Pyodide / FastAPI Analytics")
    ]
    
    for r_idx, (k, v) in enumerate(meta_data):
        row_cells = meta_table.rows[r_idx].cells
        row_cells[0].width = Inches(2.2)
        row_cells[1].width = Inches(4.5)
        row_cells[0].text = k
        row_cells[1].text = v
        set_cell_shading(row_cells[0], "EEF2FF")
        set_cell_shading(row_cells[1], "F8FAFC")
        set_cell_margins(row_cells[0], top=50, bottom=50, left=110, right=90)
        set_cell_margins(row_cells[1], top=50, bottom=50, left=110, right=90)
        p0 = row_cells[0].paragraphs[0]
        p1 = row_cells[1].paragraphs[0]
        p0.paragraph_format.space_before = Pt(1)
        p0.paragraph_format.space_after = Pt(1)
        p1.paragraph_format.space_before = Pt(1)
        p1.paragraph_format.space_after = Pt(1)
        p0.runs[0].bold = True
        p0.runs[0].font.size = Pt(8.5)
        p0.runs[0].font.color.rgb = PRIMARY_COLOR
        p1.runs[0].font.size = Pt(8.5)
        p1.runs[0].font.color.rgb = TEXT_DARK
        
    set_table_borders(meta_table, color="CBD5E1", sz="4")
    
    doc.add_page_break()

    # ══════════════════════════════════════════════════════════════════════════
    # 1. INTRODUCTION & CORE ARCHITECTURE
    # ══════════════════════════════════════════════════════════════════════════
    add_h1("1. Introduction & Privacy Architecture", "परिचय एवं डेटा गोपनीयता वास्तुकला")
    
    add_p(
        "CapFlow is a mobile-first, offline-capable personal expense tracker engineered with privacy as its primary tenet. Unlike conventional finance applications that upload sensitive transaction entries to central cloud databases, CapFlow enforces a strictly local data boundary: all transactions, budgets, recurring loans (EMIs), and financial savings goals reside entirely within the user's browser database (IndexedDB via Dexie.js).",
        "CapFlow एक आधुनिक, मोबाइल-फ्रेंडली और ऑफलाइन-सक्षम पर्सनल फाइनेंस ट्रैकर है जिसे उपयोगकर्ता की डेटा गोपनीयता को सर्वोच्च प्राथमिकता देकर बनाया गया है। पारंपरिक फाइनेंस ऐप्स के विपरीत जो आपके संवेदनशील वित्तीय विवरणों को क्लाउड सर्वर पर अपलोड करते हैं, CapFlow एक सख्त स्थानीय डेटा सीमा का पालन करता है। आपके सभी लेनदेन (खर्च एवं आय), बजट, ईएमआई (EMI) और बचत लक्ष्य केवल आपके अपने डिवाइस के इन-ब्राउज़र डेटाबेस (IndexedDB) में सुरक्षित रहते हैं।"
    )

    add_callout(
        "Core Privacy Guarantee (मूल गोपनीयता गारंटी)",
        "Zero Financial Data Leakage: Neither your income amounts, expenditure history, vendor names, notes, nor receipt images are ever transmitted to any remote server. Server communication is strictly restricted to optional user authentication and optional scheduled email delivery (such as monthly statements or EMI reminders).",
        "note"
    )

    add_h2("1.1 Dual Deployment Modes", "दो कार्यप्रणाली मोड")
    add_p(
        "CapFlow supports two deployment architectures to serve different user needs:",
        "CapFlow उपयोगकर्ताओं की विभिन्न आवश्यकताओं को पूरा करने के लिए दो अलग-अलग परिनियोजन मोड प्रदान करता है:"
    )

    mode_headers = ["Feature (सुविधा)", "Mode A — Cloud Auth (Primary)", "Mode B — Fully Local (Lite)"]
    mode_rows = [
        ["Authentication (लॉगिन)", "OAuth (Google / Apple / FB) or Email OTP", "No login required; single local profile"],
        ["Data Storage (डेटा भंडारण)", "IndexedDB (Device) + Cloud Auth ID", "100% In-Browser IndexedDB (Dexie.js)"],
        ["Email Reminders (ईमेल सूचनाएं)", "Supported (Automated EMI & Statements)", "Disabled (No remote identity/server)"],
        ["Offline Usability (ऑफलाइन उपयोग)", "100% Functional Offline after login", "100% Functional Offline continuously"],
        ["Multi-Device Cloud Sync", "No (Privacy by Design — local only)", "No (Manual JSON/CSV export required)"],
        ["Analytics Engine (एनालिटिक्स इंजन)", "FastAPI + pandas microservice (optional)", "Pyodide (WebAssembly Python in browser)"]
    ]
    add_callout_table(mode_headers, mode_rows)

    # ══════════════════════════════════════════════════════════════════════════
    # 2. GETTING STARTED & AUTHENTICATION
    # ══════════════════════════════════════════════════════════════════════════
    add_h1("2. Getting Started & Authentication", "शुरुआत एवं सुरक्षित लॉगिन")
    
    add_p(
        "When launching CapFlow at https://capflow-rho.vercel.app/, new users are greeted by the authentication portal. CapFlow provides multiple seamless sign-in methods designed to remember user sessions indefinitely across browser sessions without requiring recurring password entries.",
        "जब आप https://capflow-rho.vercel.app/ पर CapFlow खोलते हैं, तो सबसे पहले ऑथेंटिकेशन पोर्टल प्रदर्शित होता है। CapFlow आपको बिना किसी जटिल पासवर्ड के सुरक्षित लॉगिन करने की सुविधा देता है, जिससे आपका सत्र लंबे समय तक बना रहता है।"
    )

    # Desktop Auth
    add_h2("2.1 Desktop Authentication Interface", "डेस्कटॉप प्रमाणीकरण स्क्रीन")
    add_annotated_image('annotated_screenshots/01_auth_page.png', "Figure 1: Desktop Authentication Screen with Red Highlight Outlines (डेस्कटॉप लॉगिन स्क्रीन)")

    auth_headers = ["Callout #", "UI Element (तत्व)", "Functionality (कार्यप्रणाली)", "Hindi Explanation (उपयोग एवं विवरण)"]
    auth_rows = [
        ["1", "CapFlow Brand Header", "Displays application branding and tagline", "ऐप्लिकेशन लोगो और 'Your finances, private and under control' संदेश।"],
        ["2", "Continue with Google", "One-click OAuth sign-in via Google account", "गूगल खाते के माध्यम से सिर्फ एक क्लिक में सुरक्षित लॉगिन करें।"],
        ["3", "Social Sign-In (FB & Apple)", "Secondary OAuth options (marked coming soon)", "फेसबुक और एप्पल से लॉगिन की आगामी सुविधाएं।"],
        ["4", "Continue with Email (OTP)", "Passwordless login via 6-digit email verification code", "ईमेल दर्ज करें और इनबॉक्स में आए 6-अंकीय OTP कोड द्वारा लॉगिन करें।"],
        ["5", "Privacy Guarantee Banner", "Explicit disclaimer guaranteeing zero server upload", "स्पष्ट घोषणा कि आपका वित्तीय डेटा कभी किसी सर्वर पर अपलोड नहीं होता।"]
    ]
    add_callout_table(auth_headers, auth_rows)

    # Mobile Auth
    add_h2("2.2 Mobile Touch Experience — Mobile Authentication", "मोबाइल टच अनुभव — मोबाइल लॉगिन")
    add_p(
        "On smartphones (Android & iOS), the authentication portal features oversized, thumb-friendly tap targets and auto-focus fields tailored for virtual keyboards.",
        "स्मार्टफोन (एंड्रॉयड और आईफोन) पर लॉगिन स्क्रीन को विशेष रूप से अंगूठे से आसानी से टैप करने योग्य बड़े बटनों और वर्चुअल कीबोर्ड के अनुकूल डिज़ाइन किया गया है।"
    )
    add_annotated_image('annotated_mobile_screenshots/01_auth.png', "Figure 2: Mobile Authentication Screen with Red Circular Markers (मोबाइल लॉगिन स्क्रीन)", width=Inches(3.1))

    mobile_auth_headers = ["Callout #", "Mobile UI Element (मोबाइल तत्व)", "Touch Action & Function (जेस्चर एवं कार्य)", "Hindi Explanation (हिंदी विवरण)"]
    mobile_auth_rows = [
        ["1", "Mobile Header & Brand Icon", "Compact CapFlow branding optimized for narrow mobile viewports", "फोन स्क्रीन के शीर्ष पर लोगो एवं स्वागत संदेश।"],
        ["2", "Google OAuth Quick Tap", "Single tap launches native Google account picker on mobile", "एक टैप में गूगल अकाउंट पिकर खोलकर तुरंत लॉगिन करता है।"],
        ["3", "Social Sign-In Alternatives", "Facebook and Apple sign-in options formatted for mobile", "मोबाइल स्क्रीन के अनुकूल फेसबुक एवं एप्पल साइन-इन विकल्प।"],
        ["4", "Email Passwordless OTP Button", "Tap opens inline email field with instant numeric OTP entry", "टैप करने पर ईमेल इनपुट खुलता है और 6-अंकीय ओटीपी दर्ज किया जाता है।"],
        ["5", "Local Storage Security Note", "Explains mobile IndexedDB data protection and sandbox", "स्पष्ट करता है कि आपका वित्तीय डेटा फोन की सुरक्षित मेमोरी में है।"]
    ]
    add_callout_table(mobile_auth_headers, mobile_auth_rows, is_mobile=True)

    add_callout(
        "Step-by-Step Login Tutorial (कदम-दर-कदम लॉगिन मार्गदर्शिका)",
        "Step 1: Open https://capflow-rho.vercel.app/ in Chrome, Edge, or Safari on phone or PC.\n"
        "Step 2: Tap 'Continue with Google' (Callout ②) for instant access, OR click 'Continue with Email' (Callout ④).\n"
        "Step 3: If using Email, type your email address and tap 'Send Code'. Check your inbox for the 6-digit OTP code.\n"
        "Step 4: Enter the OTP. Once verified, CapFlow instantly initializes your private, encrypted local IndexedDB database and redirects to the Dashboard.\n\n"
        "चरण 1: अपने फोन या कंप्यूटर ब्राउज़र में https://capflow-rho.vercel.app/ खोलें।\n"
        "चरण 2: तुरंत लॉगिन के लिए 'Continue with Google' (कॉलआउट ②) पर टैप करें, या 'Continue with Email' (कॉलआउट ④) चुनें।\n"
        "चरण 3: ईमेल चुनने पर अपना ईमेल डालें और 'Send Code' दबाएं। अपने इनबॉक्स में प्राप्त 6-अंकीय OTP देखें।\n"
        "चरण 4: कोड दर्ज करें। सत्यापन के तुरंत बाद CapFlow आपका सुरक्षित डेटाबेस तैयार कर आपको सीधे डैशबोर्ड पर ले जाएगा।",
        "example"
    )

    # ══════════════════════════════════════════════════════════════════════════
    # 3. DASHBOARD & FINANCIAL COMMAND CENTER
    # ══════════════════════════════════════════════════════════════════════════
    add_h1("3. Dashboard & Financial Command Center", "डैशबोर्ड एवं मुख्य वित्तीय केंद्र")
    
    add_p(
        "The Dashboard is the central command center of CapFlow. It aggregates total monthly inflows, expenses, net savings balance, weekly spending velocity, and recent transactions into a unified, high-contrast visual display.",
        "डैशबोर्ड CapFlow का मुख्य नियंत्रण केंद्र है। यह आपके चालू माह की कुल आय, कुल खर्च, शुद्ध बचत, 7 दिनों की खर्च गति और हालिया लेनदेन को एक सुंदर और स्पष्ट इंटरफ़ेस में प्रस्तुत करता है।"
    )

    # Desktop Dashboard
    add_h2("3.1 Desktop Dashboard Overview", "डेस्कटॉप डैशबोर्ड अवलोकन")
    add_annotated_image('annotated_screenshots/02_dashboard.png', "Figure 3: Desktop Dashboard with Real-Time Financial Cards & Callouts (डेस्कटॉप डैशबोर्ड)")

    dash_headers = ["Callout #", "UI Element (तत्व)", "Functionality (कार्यप्रणाली)", "Hindi Explanation (उपयोग एवं विवरण)"]
    dash_rows = [
        ["1", "Navigation Sidebar", "Direct access to Dashboard, History, Analytics, Calendar, Budgets, EMIs & Settings", "सभी मुख्य पृष्ठों (होम, इतिहास, एनालिटिक्स, कैलेंडर, बजट, ईएमआई, सेटिंग्स) पर जाने का साइडबार।"],
        ["2", "Month Selector (< >)", "Navigate forward and backward between calendar months", "पिछले या अगले महीनों का डेटा देखने के लिए तीर के निशानों पर क्लिक करें।"],
        ["3", "Balance & Cash Flow Card", "Displays This Month's Income, Expense, Net Savings, and % of Income Burn Rate", "चालू माह की आय, कुल खर्च, शेष बचत और आय के उपयोग का प्रतिशत बार दिखाता है।"],
        ["4", "Quick Action Buttons", "Instant triggers: 'Add Expense' (red) and 'Add Income' (green)", "त्वरित खर्च जोड़ने के लिए लाल बटन और आय दर्ज करने के लिए हरा बटन।"],
        ["5", "Weekly Spending Bar Chart", "Day-by-day bar visualization of expenses incurred over the last 7 days", "पिछले 7 दिनों में किस दिन कितना खर्च हुआ, उसका तुलनात्मक बार ग्राफ।"],
        ["6", "Recent Transactions Stream", "Chronological list of recent entries with category pills, payment badges, and amounts", "तारीख, श्रेणी, भुगतान विधि (UPI/Card/Cash) और राशि के साथ नवीनतम खर्चों की सूची।"],
        ["7", "Floating Action Button (+)", "Accessible floating button to record a new transaction from any scroll position", "स्क्रीन पर कहीं भी रहते हुए तुरंत नया खर्च या आय दर्ज करने वाला फ्लोटिंग बटन।"]
    ]
    add_callout_table(dash_headers, dash_rows)

    # Mobile Dashboard
    add_h2("3.2 Mobile Dashboard & 7-Tab Bottom Navigation", "मोबाइल डैशबोर्ड एवं 7-टैब बॉटम नेविगेशन")
    add_p(
        "On mobile devices, the left sidebar transitions into an ergonomic 7-tab bottom navigation bar permanently docked within easy thumb reach. Financial summary cards, quick action buttons, and weekly charts stack vertically for smooth single-hand scrolling.",
        "मोबाइल डिवाइस पर बायां साइडबार एक एर्गोनॉमिक 7-टैब बॉटम नेविगेशन बार में बदल जाता है जो हमेशा अंगूठे की पहुंच में रहता है। वित्तीय कार्ड, त्वरित बटन और खर्च चार्ट एक हाथ से स्क्रॉल करने के लिए लंबवत (vertically) व्यवस्थित हो जाते हैं।"
    )
    add_annotated_image('annotated_mobile_screenshots/02_dashboard.png', "Figure 4: Mobile Dashboard with Red Circular Markings (मोबाइल डैशबोर्ड एवं बॉटम नेविगेशन)", width=Inches(3.1))

    mobile_dash_headers = ["Callout #", "Mobile UI Element (तत्व)", "Touch Gesture & Behavior (जेस्चर एवं कार्य)", "Hindi Explanation (हिंदी विवरण)"]
    mobile_dash_rows = [
        ["1", "Top App Bar & Quick Settings", "Header showing Overview title, Quick Add, and direct Settings gear icon", "शीर्ष बार: अवलोकन शीर्षक, त्वरित जोड़ें बटन और सेटिंग्स का सीधा आइकन।"],
        ["2", "Month Navigator Switcher", "Horizontal tap pills to toggle between previous, current, and upcoming months", "पिछले या अगले माह के वित्तीय आंकड़ों पर जाने हेतु टच पिल्स (< माह >)।"],
        ["3", "Net Balance & Cash Flow Card", "Touch-friendly card presenting Inflow, Outflow, Net Balance, and % Burn Gauge", "आय, कुल खर्च, शुद्ध बचत और खर्च प्रतिशत को दर्शाने वाला मुख्य कार्ड।"],
        ["4", "Quick Action Buttons (Dual Pill)", "Oversized 'Add Expense' (red) and 'Add Income' (green) thumb buttons", "अंगूठे से आसानी से दबाने योग्य बड़े लाल (+ खर्च) और हरे (+ आय) बटन।"],
        ["5", "Weekly Spending Bar Chart", "Interactive bar chart for last 7 days; tap any bar to see that day's total", "पिछले 7 दिनों का बार चार्ट; किसी भी बार पर टैप करके उस दिन का खर्च देखें।"],
        ["6", "Recent Activity Feed", "Scrollable list of latest entries with category icons and formatted amounts", "हालिया लेनदेन की सूची; टैप करने पर संपादन (edit) विकल्प खुलता है।"],
        ["7", "7-Tab Bottom Navigation Bar", "Fixed bottom dock: Home, History, Analytics, Calendar, Budgets, EMIs, Settings", "स्थिर बॉटम बार: होम, इतिहास, एनालिटिक्स, कैलेंडर, बजट, ईएमआई, सेटिंग्स।"]
    ]
    add_callout_table(mobile_dash_headers, mobile_dash_rows, is_mobile=True)

    add_callout(
        "Practical Example: Interpreting the Cash Flow Card (व्यावहारिक उदाहरण: कैश फ्लो का विश्लेषण)",
        "Example Analysis:\n"
        "• Income: ₹1,00,000 (Monthly salary + freelance payout)\n"
        "• Expense: ₹35,700 (Rent ₹22k, EMI ₹8.5k, Groceries ₹4.8k, Utilities ₹2.2k, Meds ₹950)\n"
        "• Balance: ₹64,300 Net Savings (Accumulated surplus)\n"
        "• Spent of Month's Income: 35.7% (Healthy safety zone — 64.3% saved for investment and emergency goals).\n\n"
        "विश्लेषण उदाहरण:\n"
        "• कुल आय: ₹1,00,000 (वेतन + फ्रीलांस कार्य)\n"
        "• कुल खर्च: ₹35,700 (किराया, ईएमआई, राशन, बिल, दवाइयां आदि)\n"
        "• शेष बचत: ₹64,300 (शुद्ध बचत)\n"
        "• खर्च प्रतिशत: 35.7% (अत्यंत सुरक्षित सीमा — 64.3% राशि भविष्य के लक्ष्यों हेतु सुरक्षित है)।",
        "tip"
    )

    # ══════════════════════════════════════════════════════════════════════════
    # 4. TRANSACTION MANAGEMENT — ADDING EXPENSES & INCOME
    # ══════════════════════════════════════════════════════════════════════════
    add_h1("4. Transaction Entry & Management", "लेनदेन प्रबंधन — खर्च एवं आय दर्ज करना")
    
    add_p(
        "CapFlow is engineered for rapid input. Entering an expense takes less than 3 taps: select or type the amount, tap the category icon, and tap Save. Advanced options such as payment methods (UPI, Credit Card, Bank, Cash), receipt photo uploads, and recurring schedules are readily accessible.",
        "CapFlow को बेहद तेज़ एंट्री के लिए डिज़ाइन किया गया है। किसी भी खर्च को दर्ज करने में 3 सेकंड से भी कम समय लगता है: राशि चुनें या टाइप करें, श्रेणी आइकन पर टैप करें और 'Save' दबाएं। इसके अलावा भुगतान विधि (UPI, कार्ड, बैंक, नकद), रसीद की फोटो और आवर्ती खर्च जैसी सुविधाएं भी उपलब्ध हैं।"
    )

    # Desktop Modal
    add_h2("4.1 Desktop Transaction Modal", "डेस्कटॉप लेनदेन डायलॉग")
    add_annotated_image('annotated_screenshots/03_add_transaction_modal.png', "Figure 5: Desktop Add Transaction Modal with Red Highlights (डेस्कटॉप खर्च एंट्री डायलॉग)")

    tx_headers = ["Callout #", "UI Element (तत्व)", "Functionality (कार्यप्रणाली)", "Hindi Explanation (उपयोग एवं विवरण)"]
    tx_rows = [
        ["1", "Type Toggle (Expense/Income)", "Switch between recording an outflow (Expense) or inflow (Income)", "खर्च (लाल) या आय (हरा) दर्ज करने के बीच चयन करने वाला टॉगल स्विच।"],
        ["2", "Currency Pill & Amount Display", "Shows the active currency (e.g. INR ₹) and real-time numeric entry", "सक्रिय मुद्रा (जैसे ₹ INR) और प्रविष्ट की जा रही राशि का बड़ा डिस्प्ले।"],
        ["3", "Quick Amount Presets", "One-tap increment buttons (+₹100, +₹500, +₹1k, +₹2k) and Custom Keypad", "बिना टाइप किए तुरंत राशि बढ़ाने वाले बटन (+₹100, +₹500, +₹1k) और कीपैड।"],
        ["4", "Title / Purpose Input", "Text field (e.g. 'Lunch with team', 'Fuel') for quick description", "खर्च का नाम या उद्देश्य लिखने का इनपुट बॉक्स (जैसे राशन, पेट्रोल आदि)।"],
        ["5", "Category Grid Selector", "Visual grid of 9 color-coded category icons for instant categorization", "रंग-बिरंगे श्रेणी आइकन्स (Food, Rent, Travel आदि) में से एक टैप में चयन।"],
        ["6", "Save Transaction Action", "Commits data instantly to IndexedDB with tactile feedback animation", "डेटा को तुरंत स्थानीय डेटाबेस में सुरक्षित करने वाला मुख्य सेव बटन।"]
    ]
    add_callout_table(tx_headers, tx_rows)

    # Mobile Bottom Sheet
    add_h2("4.2 Mobile Slide-Up Bottom Sheet", "मोबाइल स्लाइड-अप बॉटम शीट")
    add_p(
        "On smartphones, tapping '+ Add Expense' or the '+' FAB smoothly slides up an animated modal sheet from the bottom of the display. This keeps all controls—quick amount pills (+₹100, +₹500, +₹1k, +₹2k), title input, category grid, and the primary Save button—directly within natural thumb range.",
        "स्मार्टफोन पर '+ Add Expense' या '+' बटन दबाते ही स्क्रीन के नीचे से एक स्मूथ बॉटम शीट ऊपर की ओर स्लाइड होती है। इसमें त्वरित राशि बटन (+₹100, +₹500, +₹1k), शीर्षक बॉक्स, श्रेणी ग्रिड और सेव बटन सब अंगूठे की स्वाभाविक पहुंच में होते हैं।"
    )
    add_annotated_image('annotated_mobile_screenshots/03_add_transaction.png', "Figure 6: Mobile Add Transaction Bottom Sheet with Red Callout Badges (मोबाइल खर्च दर्ज करने की बॉटम शीट)", width=Inches(3.1))

    mobile_tx_headers = ["Callout #", "Mobile UI Element (तत्व)", "Touch Gesture & Behavior (जेस्चर एवं कार्य)", "Hindi Explanation (हिंदी विवरण)"]
    mobile_tx_rows = [
        ["1", "Expense / Income Segmented Toggle", "Tap left for Expense (red highlight) or right for Income (green highlight)", "खर्च (लाल) अथवा आय (हरा) चुनने हेतु सेग्मेंटेड टच स्विच।"],
        ["2", "Currency Selector & Amount Field", "Tap currency symbol to switch currency; tap amount to open full numeric pad", "मुद्रा बदलने के लिए टैप करें; राशि टाइप करने हेतु न्यूमेरिक पैड खोलें।"],
        ["3", "Quick Increment Pills & Keypad", "Tap +₹100, +₹500, +₹1k, +₹2k to accumulate total without manual typing", "बिना टाइपिंग के तुरंत राशि जोड़ने वाले क्विक टच पिल्स एवं कीपैड।"],
        ["4", "Purpose / Title Input Field", "Tap to open mobile keyboard with predictive financial suggestions", "खर्च का नाम (जैसे Lunch, Grocery) टाइप करने हेतु इनपुट बॉक्स।"],
        ["5", "Visual 9-Category Grid", "High-contrast touch icons (Food, Rent, Travel, Utilities, Shopping, etc.)", "एक टैप में श्रेणी चुनने हेतु 9 रंगीन और स्पष्ट श्रेणी आइकन्स।"],
        ["6", "Primary Save Transaction CTA", "Full-width bottom action button that saves to IndexedDB and dismisses sheet", "पूरे चौड़ाई का मुख्य सेव बटन जो डेटा सुरक्षित कर शीट को बंद करता है।"]
    ]
    add_callout_table(mobile_tx_headers, mobile_tx_rows, is_mobile=True)

    add_callout(
        "Step-by-Step Tutorial: Adding a Daily Grocery Expense on Mobile (कदम-दर-कदम: मोबाइल पर राशन खर्च दर्ज करना)",
        "Scenario: You paid ₹4,850 at DMart Supermarket via UPI for monthly groceries.\n\n"
        "Step 1: On your phone, tap the '+ Add Expense' button on the dashboard or the bottom '+' button.\n"
        "Step 2: In the Amount presets (Callout ③), tap '+₹1k' four times and '+₹500' once (or tap Keypad to type '4850').\n"
        "Step 3: In the Title box (Callout ④), type 'Supermarket Grocery & Food'.\n"
        "Step 4: From the category grid (Callout ⑤), tap 'Food & Dining' (Orange Utensils icon).\n"
        "Step 5: Tap '+ More details' to expand payment options: select 'UPI', and take a photo of the receipt if desired.\n"
        "Step 6: Tap the red 'Save Expense' button (Callout ⑥). The sheet slides shut and your balance immediately updates!\n\n"
        "चरण 1: फोन पर डैशबोर्ड के '+ Add Expense' या '+' बटन पर टैप करें।\n"
        "चरण 2: राशि में '+₹1k' चार बार और '+₹500' एक बार दबाएं (या कीपैड से 4850 टाइप करें)।\n"
        "चरण 3: शीर्षक बॉक्स में 'Supermarket Grocery & Food' लिखें।\n"
        "चरण 4: श्रेणी ग्रिड से 'Food & Dining' (संतरी चम्मच-कांटा आइकन) चुनें।\n"
        "चरण 5: '+ More details' दबाकर 'UPI' चुनें और बिल की फोटो अपलोड करें।\n"
        "चरण 6: 'Save Expense' दबाएं। शीट तुरंत बंद हो जाएगी और आपका बैलेंस अपडेट हो जाएगा!",
        "example"
    )

    # ══════════════════════════════════════════════════════════════════════════
    # 5. TRANSACTION HISTORY, SEARCH & STATEMENTS
    # ══════════════════════════════════════════════════════════════════════════
    add_h1("5. Transaction History, Filtering & Statements", "लेनदेन इतिहास, खोज एवं स्टेटमेंट")
    
    add_p(
        "The Transactions page provides a searchable ledger of every financial record stored on your device. Users can instantly filter by transaction type, search titles or notes in real-time, inspect item details, edit entries, and export professional PDF or CSV statements.",
        "लेनदेन पृष्ठ (Transactions) आपके डिवाइस पर संग्रहीत सभी वित्तीय रिकॉर्ड की एक संपूर्ण खाता-बही (Ledger) प्रदान करता है। उपयोगकर्ता किसी भी प्रविष्टि को खोज सकते हैं, श्रेणी या प्रकार के अनुसार फ़िल्टर कर सकते हैं और आधिकारिक PDF या CSV स्टेटमेंट डाउनलोड कर सकते हैं।"
    )

    # Desktop History
    add_h2("5.1 Desktop Transaction Ledger & Filters", "डेस्कटॉप लेनदेन लेजर एवं फ़िल्टर्स")
    add_annotated_image('annotated_screenshots/04_transactions_history.png', "Figure 7: Desktop Transactions History Page with Search & Export (डेस्कटॉप लेनदेन इतिहास)")

    hist_headers = ["Callout #", "UI Element (तत्व)", "Functionality (कार्यप्रणाली)", "Hindi Explanation (उपयोग एवं विवरण)"]
    hist_rows = [
        ["1", "Global Search Input", "Real-time fuzzy search across transaction titles, notes, and categories", "लेनदेन के नाम, विवरण या श्रेणी के आधार पर तुरंत खोजने वाला सर्च बार।"],
        ["2", "Type Filter Pills", "Quick toggles to view All entries, Expenses only, or Incomes only", "सभी रिकॉर्ड, केवल खर्च, या केवल आय देखने के लिए फ़िल्टर टैब।"],
        ["3", "Email Statement / Export", "Generate formal monthly financial statement and dispatch via email/PDF", "मासिक वित्तीय स्टेटमेंट तैयार करने और ईमेल/पीडीएफ पर भेजने का बटन।"],
        ["4", "Advanced Filters Drawer", "Filter by specific date intervals, payment methods (UPI/Card/Cash), and categories", "विशिष्ट तिथि सीमा, भुगतान विधि और श्रेणियों के आधार पर गहरा फ़िल्टर।"]
    ]
    add_callout_table(hist_headers, hist_rows)

    # Mobile History
    add_h2("5.2 Mobile Transaction History & Search", "मोबाइल लेनदेन इतिहास एवं खोज")
    add_p(
        "On mobile, the transaction history is optimized for fast vertical scrolling. A sticky search bar remains anchored at the top, accompanied by horizontally swipeable filter pills (All, Expense, Income) and a floating action button for instant new additions.",
        "मोबाइल पर लेनदेन इतिहास तेज़ वर्टिकल स्क्रॉलिंग के लिए अनुकूलित है। सर्च बार शीर्ष पर स्थिर रहता है, जिसके नीचे क्षैतिज रूप से स्वाइप होने वाले फ़िल्टर पिल्स (All, Expense, Income) और एक फ्लोटिंग एक्शन बटन (+) उपलब्ध रहता है।"
    )
    add_annotated_image('annotated_mobile_screenshots/04_transactions.png', "Figure 8: Mobile Transactions Page with Red Markers (मोबाइल लेनदेन इतिहास स्क्रीन)", width=Inches(3.1))

    mobile_hist_headers = ["Callout #", "Mobile UI Element (तत्व)", "Touch Gesture & Behavior (जेस्चर एवं कार्य)", "Hindi Explanation (हिंदी विवरण)"]
    mobile_hist_rows = [
        ["1", "Instant Search Bar", "Tap to search titles, merchants, or notes with immediate live filtering", "दुकानदार, सामान का नाम या नोट्स टाइप करते ही तुरंत परिणाम दिखाने वाला सर्च बार।"],
        ["2", "Type Filter Touch Pills", "Single tap switches view: All records, Expenses only, or Incomes only", "सभी, केवल खर्च, या केवल आय देखने के लिए एक टैप में बदलने वाले पिल्स।"],
        ["3", "Advanced Filters Button", "Tap opens slide-over panel for custom date range, category, and payment mode", "कस्टम तारीख सीमा, श्रेणी और भुगतान मोड चुनने वाला एडवांस्ड फ़िल्टर।"],
        ["4", "Scrollable Transaction Cards", "Tap any card to view detailed notes, attached receipt photo, or edit/delete", "किसी भी कार्ड पर टैप करके पूरा विवरण, बिल की फोटो देखें या एडिट करें।"],
        ["5", "Floating Action Button (+)", "Elevated floating button pinned at bottom right for one-tap transaction logging", "स्क्रीन के निचले दाईं ओर स्थित फ्लोटिंग बटन जो तुरंत नया खर्च जोड़ता है।"],
        ["6", "Bottom Navigation Dock", "Switch seamlessly between History and other modules via bottom bar", "निचले बार से इतिहास और अन्य पेजों के बीच तुरंत स्विच करें।"]
    ]
    add_callout_table(mobile_hist_headers, mobile_hist_rows, is_mobile=True)

    add_callout(
        "How to Download or Email Your Monthly Statement (मासिक स्टेटमेंट कैसे प्राप्त करें)",
        "1. Open the Transactions page from the navigation bar.\n"
        "2. Click the 'Email Statement' or 'Filters / Export' button (Callout ③).\n"
        "3. Select the target statement month (e.g. October 2026).\n"
        "4. Choose format: 'PDF Statement' (includes professional tables, category breakdown, and summary charts) or 'CSV Spreadsheet' (for Excel / Google Sheets).\n"
        "5. Enter recipient email and click 'Send Statement'. A beautifully formatted document is sent directly to your inbox!\n\n"
        "1. नेविगेशन बार से 'Transactions' पेज पर जाएं।\n"
        "2. ऊपर 'Email Statement' या 'Filters' (कॉलआउट ③) पर क्लिक करें।\n"
        "3. वांछित माह (जैसे October 2026) का चयन करें।\n"
        "4. प्रारूप चुनें: 'PDF Statement' (चार्ट और तालिकाओं सहित) या 'CSV Spreadsheet' (एक्सेल हेतु)।\n"
        "5. ईमेल दर्ज कर 'Send' दबाएं। आपका स्टेटमेंट तुरंत आपके इनबॉक्स में पहुंच जाएगा!",
        "tip"
    )

    # ══════════════════════════════════════════════════════════════════════════
    # 6. BUDGETS & CATEGORY SPENDING LIMITS
    # ══════════════════════════════════════════════════════════════════════════
    add_h1("6. Budgets & Spending Limits", "बजट एवं श्रेणी खर्च सीमाएं")
    
    add_p(
        "Budgets prevent overspending by establishing monthly caps for individual categories. CapFlow visualizes consumption through animated progress rings and color-coded alerts: green indicates safe spending, amber warns when spending crosses 80% of the limit, and red alerts when a budget has been breached.",
        "बजट सुविधा आपको अधिक खर्च करने से रोकती है। CapFlow में आप प्रत्येक श्रेणी (जैसे भोजन, खरीदारी, मनोरंजन) के लिए मासिक सीमा निर्धारित कर सकते हैं। प्रोग्रेस रिंग्स रंग के माध्यम से स्थिति दर्शाती हैं: हरा (सुरक्षित), पीला (80% से अधिक खर्च होने पर चेतावनी) और लाल (बजट सीमा पार होने पर)।"
    )

    # Desktop Budgets
    add_h2("6.1 Desktop Budgets & Goals Panel", "डेस्कटॉप बजट एवं बचत लक्ष्य पैनल")
    add_annotated_image('annotated_screenshots/05_budgets_goals.png', "Figure 9: Desktop Budgets & Savings Goals Dashboard (डेस्कटॉप बजट स्क्रीन)")

    bgt_headers = ["Callout #", "UI Element (तत्व)", "Functionality (कार्यप्रणाली)", "Hindi Explanation (उपयोग एवं विवरण)"]
    bgt_rows = [
        ["1", "This Month's Budgets Panel", "Lists active category budgets with spent vs. limit metrics and % progress rings", "चालू माह के सक्रिय बजट, खर्च की गई राशि, सीमा और प्रतिशत प्रोग्रेस चक्र।"],
        ["2", "Savings Goals Panel", "Displays long-term financial targets with accumulated funds and target dates", "दीर्घकालिक वित्तीय लक्ष्य (जैसे नया लैपटॉप, आपातकालीन फंड) और उनकी प्रगति।"],
        ["3", "+ Add Budget Button", "Opens modal to configure category, monthly allowance, and alert threshold", "नई श्रेणी का मासिक बजट और चेतावनी प्रतिशत सेट करने का बटन।"],
        ["4", "+ Add Goal Button", "Opens modal to define milestone name, target amount, deadline, and icon", "नया बचत लक्ष्य, लक्ष्य राशि, अंतिम तिथि और आइकन जोड़ने का बटन।"]
    ]
    add_callout_table(bgt_headers, bgt_rows)

    # Mobile Budgets
    add_h2("6.2 Mobile Budgets & Savings Goals Screen", "मोबाइल बजट एवं बचत लक्ष्य स्क्रीन")
    add_p(
        "On mobile displays, budget progress indicators adapt into stacked health bars and compact progress gauges with quick '+ Add' buttons prominently positioned at section headers for fast thumb access.",
        "मोबाइल स्क्रीन पर बजट प्रोग्रेस इंडिकेटर स्टैक्ड हेल्थ बार्स और कॉम्पैक्ट प्रोग्रेस गेज में बदल जाते हैं, जिनके शीर्ष पर त्वरित '+ Add' बटन अंगूठे की पहुंच में उपलब्ध रहते हैं।"
    )
    add_annotated_image('annotated_mobile_screenshots/05_budgets_goals.png', "Figure 10: Mobile Budgets & Goals Screen with Red Markers (मोबाइल बजट स्क्रीन)", width=Inches(3.1))

    mobile_bgt_headers = ["Callout #", "Mobile UI Element (तत्व)", "Touch Gesture & Behavior (जेस्चर एवं कार्य)", "Hindi Explanation (हिंदी विवरण)"]
    mobile_bgt_rows = [
        ["1", "Category Budget Progress Cards", "Touch cards showing spent amount, remaining allowance, and color alert bar", "खर्च राशि, बची हुई सीमा और रंग-बिरंगे अलर्ट बार दिखाने वाले बजट कार्ड्स।"],
        ["2", "+ Add Budget Quick Button", "Tap opens bottom sheet to select category and assign monthly budget limit", "टैप करने पर नई श्रेणी का मासिक बजट तय करने वाली बॉटम शीट खुलती है।"],
        ["3", "Savings Goals Milestone Cards", "Displays target goals (Emergency Fund, Laptop) with saved % and due date", "बचत लक्ष्यों (इमरजेंसी फंड, लैपटॉप) की प्रगति और अंतिम तारीख का प्रदर्शन।"],
        ["4", "+ Add Goal Quick Button", "Tap opens modal to configure a new financial milestone and target amount", "नया बचत लक्ष्य, लक्ष्य राशि और समय-सीमा जोड़ने का त्वरित बटन।"],
        ["5", "Mobile Bottom Navigation Bar", "Access Budgets or switch back to Home/Transactions with one tap", "बॉटम बार से बजट या अन्य पेजों पर तुरंत नेविगेट करने की सुविधा।"]
    ]
    add_callout_table(mobile_bgt_headers, mobile_bgt_rows, is_mobile=True)

    add_callout(
        "Practical Example: Setting a Food & Dining Budget (व्यावहारिक उदाहरण: भोजन बजट तय करना)",
        "Goal: Restrict dining out and grocery expenses to ₹10,000 for October.\n"
        "• Step 1: Tap '+ Add' next to 'This Month's Budgets' (Callout ②).\n"
        "• Step 2: Select Category as 'Food & Dining'.\n"
        "• Step 3: Set Monthly Limit to ₹10,000.\n"
        "• Step 4: Set Alert Threshold to 80% (₹8,000).\n"
        "• Step 5: Save. As you log grocery and dinner transactions, the bar fills up. When total reaches ₹8,000, CapFlow turns the bar amber to alert you before you overspend!\n\n"
        "लक्ष्य: अक्टूबर माह में भोजन और बाहर खाने का खर्च ₹10,000 तक सीमित रखना।\n"
        "• चरण 1: 'This Month's Budgets' के पास '+ Add' (कॉलआउट ②) पर टैप करें।\n"
        "• चरण 2: श्रेणी में 'Food & Dining' चुनें।\n"
        "• चरण 3: मासिक सीमा ₹10,000 दर्ज करें।\n"
        "• चरण 4: चेतावनी सीमा 80% (₹8,000) पर सेट करें और सहेजें।\n"
        "• परिणाम: जैसे ही खर्च ₹8,000 पहुंचेगा, बार पीला होकर आपको सतर्क कर देगा ताकि बजट पार न हो!",
        "example"
    )

    # ══════════════════════════════════════════════════════════════════════════
    # 7. EMI & LOAN PORTFOLIO MANAGEMENT
    # ══════════════════════════════════════════════════════════════════════════
    add_h1("7. EMI & Loan Portfolio Tracking", "ईएमआई एवं ऋण प्रबंधन")
    
    add_p(
        "Managing multiple debts, home loans, vehicle installments, or gadget credit cards can lead to costly late fees if dates slip. CapFlow includes a specialized EMI Management engine that calculates total interest burden, tracks paid versus pending installments, and dispatches automated due-date reminder emails before deadlines.",
        "विभिन्न ऋणों, कार लोन, होम लोन अथवा इलेक्ट्रॉनिक्स ईएमआई को ट्रैक करना अक्सर चुनौतीपूर्ण होता है। CapFlow में एक विशेष ईएमआई प्रबंधन इंजन दिया गया है जो कुल ऋण राशि, मासिक किस्त, चुकाई गई किस्तों की संख्या और बाकी महीनों की गणना करता है तथा देय तिथि से पहले ईमेल अलर्ट भेजता है।"
    )

    # Desktop EMI
    add_h2("7.1 Desktop EMI Management Dashboard", "डेस्कटॉप ईएमआई प्रबंधन डैशबोर्ड")
    add_annotated_image('annotated_screenshots/08_emis_tracker.png', "Figure 11: Desktop EMI Tracker with Active Loan Cards (डेस्कटॉप ईएमआई ट्रैकर)")

    emi_headers = ["Callout #", "UI Element (तत्व)", "Functionality (कार्यप्रणाली)", "Hindi Explanation (उपयोग एवं विवरण)"]
    emi_rows = [
        ["1", "+ Add EMI Button", "Opens form to define loan name, total cost, monthly EMI, due day, and tenure", "नया लोन या ईएमआई जोड़ने का बटन (नाम, कुल राशि, मासिक किस्त, तारीख)।"],
        ["2", "EMI Portfolio Container", "Displays total monthly debt obligation and active loan cards with status pills", "मासिक कुल ऋण देयता और सक्रिय ईएमआई कार्ड्स (Overdue / Due Soon / Upcoming)।"],
        ["3", "Add First EMI CTA", "Quick onboarding action button to create the user's initial installment schedule", "पहला ईएमआई शेड्यूल जोड़ने का सीधा बटन।"]
    ]
    add_callout_table(emi_headers, emi_rows)

    # Mobile EMI
    add_h2("7.2 Mobile EMI Management & Due Reminders", "मोबाइल ईएमआई प्रबंधन एवं देय रिमाइंडर")
    add_p(
        "On mobile devices, each loan installment is formatted as an independent card highlighting the due date countdown, installment progress (e.g. 14/36 paid), and monthly outflow impact.",
        "मोबाइल पर प्रत्येक लोन किस्त एक स्वतंत्र कार्ड के रूप में दिखती है जिसमें देय तिथि का काउंटडाउन, किस्तों की प्रगति (जैसे 14/36 चुकाई गई) और मासिक खर्च का प्रभाव स्पष्ट दिखाई देता है।"
    )
    add_annotated_image('annotated_mobile_screenshots/08_emis.png', "Figure 12: Mobile EMI Management Screen with Red Callouts (मोबाइल ईएमआई स्क्रीन)", width=Inches(3.1))

    mobile_emi_headers = ["Callout #", "Mobile UI Element (तत्व)", "Touch Gesture & Behavior (जेस्चर एवं कार्य)", "Hindi Explanation (हिंदी विवरण)"]
    mobile_emi_rows = [
        ["1", "Top Header & + Add EMI Button", "Header with direct thumb trigger to configure a new loan or recurring installment", "शीर्ष बार और नया लोन/ईएमआई जोड़ने का सीधा टच बटन (+ Add EMI)।"],
        ["2", "Active Loan Progress Cards", "Displays loan name, monthly payment, remaining installments, and progress bar", "ऋण का नाम, मासिक किस्त, शेष किस्तें और प्रोग्रेस बार दिखाने वाले कार्ड्स।"],
        ["3", "Monthly Debt Obligation Summary", "Aggregates total monthly outflow required across all active EMI schedules", "सभी सक्रिय ईएमआई के लिए प्रति माह जाने वाली कुल राशि का सारांश।"],
        ["4", "Mobile Bottom Navigation Bar", "One-tap navigation between EMIs, Dashboard, and History", "निचले नेविगेशन बार से ईएमआई और अन्य पेजों के बीच तुरंत स्विच करें।"]
    ]
    add_callout_table(mobile_emi_headers, mobile_emi_rows, is_mobile=True)

    add_callout(
        "Practical Example: Setting up a Car Loan EMI (व्यावहारिक उदाहरण: कार लोन ईएमआई सेटअप)",
        "Scenario: HDFC Bank Car Loan of ₹4,50,000 at ₹12,500/month, due on the 5th of each month for 36 months.\n\n"
        "Step 1: Tap '+ Add EMI' (Callout ①).\n"
        "Step 2: Enter Loan Name: 'Car Loan (HDFC Bank)'.\n"
        "Step 3: Enter Total Cost: ₹4,50,000 and Monthly Payment: ₹12,500.\n"
        "Step 4: Set Due Day of Month to '5'.\n"
        "Step 5: Set Total Installments to '36' and Paid Installments to '14'.\n"
        "Step 6: Toggle 'Enable Email Reminder Sync' and select '3 Days Before Due Date'.\n"
        "Result: CapFlow automatically calculates that 22 installments remain. On the 2nd of every month, CapFlow automatically emails you a reminder with the payment breakdown so you never miss a due date!\n\n"
        "परिदृश्य: एचडीएफसी बैंक का ₹4,50,000 का कार लोन, ₹12,500 मासिक किस्त, प्रत्येक माह की 5 तारीख को देय।\n"
        "चरण 1: '+ Add EMI' (कॉलआउट ①) पर टैप करें।\n"
        "चरण 2: लोन का नाम 'Car Loan (HDFC Bank)' लिखें।\n"
        "चरण 3: कुल लागत ₹4,50,000 और मासिक किस्त ₹12,500 दर्ज करें।\n"
        "चरण 4: देय तारीख '5' चुनें, कुल किस्तें '36' और चुकाई गई किस्तें '14' दर्ज करें।\n"
        "चरण 5: 'Email Reminder' चालू करें और 3 दिन पहले का विकल्प चुनें।\n"
        "परिणाम: हर माह की 2 तारीख को CapFlow आपको ईमेल रिमाइंडर भेजेगा, जिससे कभी पेनल्टी नहीं लगेगी!",
        "example"
    )

    # ══════════════════════════════════════════════════════════════════════════
    # 8. CALENDAR VISUALIZATION & DAY DRILL-DOWN
    # ══════════════════════════════════════════════════════════════════════════
    add_h1("8. Calendar Heatmap & Day Drill-Down", "इंटरैक्टिव कैलेंडर एवं दैनिक विश्लेषण")
    
    add_p(
        "The Calendar view maps your financial activity directly onto a monthly grid. Each day with recorded transactions displays spending indicators, enabling users to pinpoint cash flow spikes, weekend splurges, or payment clusters at a single glance.",
        "कैलेंडर दृश्य (Calendar View) आपके सभी खर्चों और आय को माह के कैलेंडर ग्रिड पर दर्शाता है। जिस दिन भी कोई लेनदेन हुआ हो, उस तारीख पर इंडिकेटर दिखाई देता है। इससे आप आसानी से समझ सकते हैं कि किस दिन या सप्ताहांत पर सबसे अधिक खर्च हुआ।"
    )

    # Desktop Calendar
    add_h2("8.1 Desktop Financial Calendar Grid", "डेस्कटॉप वित्तीय कैलेंडर ग्रिड")
    add_annotated_image('annotated_screenshots/06_calendar_view.png', "Figure 13: Desktop Calendar View & Day Inspector (डेस्कटॉप कैलेंडर दृश्य)")

    cal_headers = ["Callout #", "UI Element (तत्व)", "Functionality (कार्यप्रणाली)", "Hindi Explanation (उपयोग एवं विवरण)"]
    cal_rows = [
        ["1", "Monthly Financial Strip", "Top summary showing total Inflow (In: ₹), Outflow (Out: ₹), and Net Surplus", "माह की कुल आवक (In), कुल खर्च (Out) और शुद्ध बचत (Net) की संक्षिप्त पट्टी।"],
        ["2", "Calendar Date Heatmap", "7x5 calendar grid with highlighted dates and color-coded expense indicators", "महीने का पूरा कैलेंडर ग्रिड जहां सक्रिय खर्च वाले दिन हाइलाइट होते हैं।"],
        ["3", "Day Drill-Down Drawer", "Side inspector displaying itemized transactions recorded on the selected calendar date", "चयनित तारीख पर हुए सभी खर्चों और आय की विस्तृत सूची देखने वाला पैनल।"],
        ["4", "+ Add on Date Action", "One-tap button to log a new expense directly pre-filled with the selected calendar date", "चुनी गई तारीख के लिए सीधे नया खर्च दर्ज करने का त्वरित बटन।"]
    ]
    add_callout_table(cal_headers, cal_rows)

    # Mobile Calendar
    add_h2("8.2 Mobile Calendar Touch Heatmap", "मोबाइल कैलेंडर टच हीटमैप")
    add_p(
        "On smartphone displays, the monthly calendar adopts a touch-optimized grid. Tapping any calendar day expands an inline bottom inspection card displaying every transaction logged on that specific day, along with a quick '+' button pre-filling the selected date.",
        "स्मार्टफोन पर कैलेंडर टच-अनुकूलित ग्रिड में प्रदर्शित होता है। किसी भी तारीख पर टैप करते ही नीचे उस दिन के सभी खर्चों का विस्तृत कार्ड खुल जाता है और उसी तारीख का खर्च तुरंत जोड़ने का विकल्प मिलता है।"
    )
    add_annotated_image('annotated_mobile_screenshots/06_calendar.png', "Figure 14: Mobile Calendar Touch View with Red Circular Markers (मोबाइल कैलेंडर स्क्रीन)", width=Inches(3.1))

    mobile_cal_headers = ["Callout #", "Mobile UI Element (तत्व)", "Touch Gesture & Behavior (जेस्चर एवं कार्य)", "Hindi Explanation (हिंदी विवरण)"]
    mobile_cal_rows = [
        ["1", "Month Navigation & Today Tap", "Shows active month with '<' and '>' arrows plus 'Today' jump button", "सक्रिय महीना, आगे-पीछे जाने के तीर और आज की तारीख पर जाने वाला 'Today' बटन।"],
        ["2", "Inflow/Outflow Summary Bar", "Compact horizontal pill displaying Month In, Out, and Net figures", "मासिक कुल आय, खर्च और बचत को एक नज़र में दिखाने वाली संक्षिप्त पट्टी।"],
        ["3", "Touch Date Grid (Heatmap)", "Tap any date cell (1-31); dot indicators signify days with active spending", "कैलेंडर तारीख ग्रिड; रंगीन डॉट्स उन दिनों को दर्शाते हैं जिन दिन खर्च हुए हैं।"],
        ["4", "Selected Day Detail Card", "Shows transactions logged on the selected date with one-tap add button", "चुनी गई तारीख के सभी खर्च और उसी तारीख के लिए नया खर्च जोड़ने का विकल्प।"],
        ["5", "Mobile Bottom Navigation Dock", "Instant access to Calendar or other modules from the persistent bottom bar", "निचले नेविगेशन बार से कैलेंडर अथवा अन्य पेजों पर जाने की सुविधा।"]
    ]
    add_callout_table(mobile_cal_headers, mobile_cal_rows, is_mobile=True)

    add_callout(
        "How to Drill Down into a Specific Date (किसी विशेष तारीख का विवरण कैसे देखें)",
        "1. Open the Calendar page from the bottom navigation or sidebar.\n"
        "2. Tap on any date cell (e.g. October 16th, marked in Callout ③).\n"
        "3. The Day Detail card (Callout ④) immediately displays all transactions recorded on that day.\n"
        "4. To log an overlooked bill for that day, tap '+ Add'—the date is automatically populated!\n\n"
        "1. नेविगेशन बार से 'Calendar' पेज खोलें।\n"
        "2. किसी भी तारीख (जैसे 16 अक्टूबर, कॉलआउट ③) पर टैप करें।\n"
        "3. नीचे दिया गया कार्ड (कॉलआउट ④) उस दिन के सभी बिल और खर्च तुरंत दिखा देगा।\n"
        "4. छूटे हुए बिल को जोड़ने के लिए '+ Add' दबाएं—तारीख अपने आप भर जाएगी!",
        "tip"
    )

    # ══════════════════════════════════════════════════════════════════════════
    # 9. ADVANCED ANALYTICS & SMART FINANCIAL INSIGHTS
    # ══════════════════════════════════════════════════════════════════════════
    add_h1("9. Advanced Analytics & Smart Insights", "उन्नत एनालिटिक्स एवं वित्तीय अंतर्दृष्टि")
    
    add_p(
        "CapFlow provides comprehensive analytics to uncover hidden spending patterns. The Analytics engine offers time horizons (This Week, This Month, This Year), category breakdowns via interactive donut charts, 6-month historical comparisons, and daily spend trendlines with moving averages and anomaly bands.",
        "CapFlow आपके खर्च करने के तौर-तरीकों को समझने के लिए उच्च स्तरीय एनालिटिक्स प्रदान करता है। इसमें विभिन्न समयावधि (यह सप्ताह, यह महीना, यह वर्ष), पाई/डोनट चार्ट द्वारा श्रेणीवार खर्च, पिछले 6 महीनों की तुलना और दैनिक खर्च के ट्रेंड्स शामिल हैं।"
    )

    # Desktop Analytics
    add_h2("9.1 Desktop Analytics & Visualization Engine", "डेस्कटॉप एनालिटिक्स एवं विज़ुअलाइज़ेशन इंजन")
    add_annotated_image('annotated_screenshots/07_analytics_insights.png', "Figure 15: Desktop Analytics Dashboard with Charts & Anomaly Detection (डेस्कटॉप एनालिटिक्स)")

    ana_headers = ["Callout #", "UI Element (तत्व)", "Functionality (कार्यप्रणाली)", "Hindi Explanation (उपयोग एवं विवरण)"]
    ana_rows = [
        ["1", "Time Horizon Selector", "Pills to filter analysis scope between This Week, This Month, and This Year", "सप्ताह, माह अथवा वर्ष के अनुसार विश्लेषण बदलने वाले फ़िल्टर टैब्स।"],
        ["2", "Key Metric Tiles", "Displays Average Daily Spend velocity and Total Outflow in active currency", "दैनिक औसत खर्च (Avg daily spend) और कुल खर्च (Total spent) के कार्ड्स।"],
        ["3", "Spending by Category", "Proportional Donut Chart breaking down expenses across all active categories", "किस श्रेणी (भोजन, यात्रा, किराया आदि) में कितने प्रतिशत खर्च हुआ, उसका डोनट चार्ट।"],
        ["4", "Monthly Spending Trend", "Comparative bar chart illustrating spending evolution over the past 6 calendar months", "पिछले 6 महीनों के खर्च की तुलना करने वाला बार ग्राफ।"],
        ["5", "Daily Spend Trendline", "Continuous timeline plot with 7-day moving average and anomaly highlight bands", "दैनिक खर्च की समय-रेखा, 7-दिवसीय मूविंग एवरेज और असामान्य खर्च की पहचान।"]
    ]
    add_callout_table(ana_headers, ana_rows)

    # Mobile Analytics
    add_h2("9.2 Mobile Analytics & Spending Distribution", "मोबाइल एनालिटिक्स एवं खर्च वितरण")
    add_p(
        "On smartphone screens, charts resize responsively with touch-activated tooltips. Swiping through time horizons (Week/Month/Year) recalculates category distributions instantly using client-side algorithms.",
        "मोबाइल स्क्रीन पर सभी चार्ट टच-अनुकूलित टूलटिप्स के साथ स्वतः रीसाइज़ हो जाते हैं। सप्ताह, माह या वर्ष के टैब पर स्वाइप करते ही श्रेणीवार वितरण तुरंत पुनर्गणना होकर दिखता है।"
    )
    add_annotated_image('annotated_mobile_screenshots/07_analytics.png', "Figure 16: Mobile Analytics Screen with Red Highlight Indicators (मोबाइल एनालिटिक्स स्क्रीन)", width=Inches(3.1))

    mobile_ana_headers = ["Callout #", "Mobile UI Element (तत्व)", "Touch Gesture & Behavior (जेस्चर एवं कार्य)", "Hindi Explanation (हिंदी विवरण)"]
    mobile_ana_rows = [
        ["1", "Time Horizon Switcher", "Tap 'This Week', 'This Month', or 'This Year' for instant recalculation", "सप्ताह, महीना अथवा वर्ष के अनुसार आंकड़ों को तुरंत बदलने वाले टच पिल्स।"],
        ["2", "Spending by Category Chart", "Touch donut chart displaying percentage share of Food, Rent, Travel, etc.", "भोजन, किराया, यात्रा आदि श्रेणियों में हुए खर्च का प्रतिशत डोनट चार्ट।"],
        ["3", "Monthly Spend & Payment Mode Toggle", "Comparative graph with Category vs. Payment Method (UPI/Card/Cash) switch", "मासिक खर्च का तुलनात्मक चार्ट तथा भुगतान विधि (UPI/कार्ड/नकद) टॉगल।"],
        ["4", "Mobile Bottom Navigation Dock", "Persistent bottom navigation bar for effortless module transitions", "निचले नेविगेशन बार से तुरंत किसी भी अन्य मॉड्यूल में जाने की सुविधा।"]
    ]
    add_callout_table(mobile_ana_headers, mobile_ana_rows, is_mobile=True)

    add_callout(
        "Analytics Architecture: Local vs. Microservice (एनालिटिक्स इंजन आर्किटेक्चर)",
        "CapFlow provides two execution options for analytics calculations:\n"
        "• Option 1 (Default / Mode B): In-Browser WebAssembly Python (Pyodide) or Pure JavaScript. Calculations execute 100% on device with zero server dependency.\n"
        "• Option 2 (Mode A): FastAPI Python Microservice. Anonymized numerical arrays are computed via high-performance pandas/numpy routines for instant anomaly detection.\n\n"
        "CapFlow में एनालिटिक्स के दो विकल्प हैं:\n"
        "• विकल्प 1 (डिफ़ॉल्ट): ब्राउज़र के अंदर ही चलने वाला इंजन (JavaScript / Pyodide WebAssembly)। बिना किसी सर्वर के पूर्ण गोपनीयता के साथ त्वरित गणना।\n"
        "• विकल्प 2: FastAPI पायथन माइक्रोसर्विस, जो उन्नत सांख्यिकीय गणना और विसंगति पहचान (Anomaly Detection) प्रदान करती है।",
        "note"
    )

    # ══════════════════════════════════════════════════════════════════════════
    # 10. SETTINGS, DATA PORTABILITY & BACKUP
    # ══════════════════════════════════════════════════════════════════════════
    add_h1("10. Settings, Customization & Data Portability", "सेटिंग्स, डेटा पोर्टेबिलिटी एवं बैकअप")
    
    add_p(
        "The Settings section puts the user in total command of application preferences, aesthetics, multi-currency live conversions, custom category creation, and full local database export and restore operations.",
        "सेटिंग्स अनुभाग उपयोगकर्ता को ऐप्लिकेशन प्राथमिकताओं, थीम (डार्क/लाइट), लाइव विनिमय दर रूपांतरण (Currency Conversion), कस्टम श्रेणियां बनाने और पूर्ण डेटा बैकअप एवं रीस्टोर करने का पूर्ण नियंत्रण देता है।"
    )

    # Desktop Settings
    add_h2("10.1 Desktop Settings & Configuration Console", "डेस्कटॉप सेटिंग्स एवं कॉन्फ़िगरेशन कंसोल")
    add_annotated_image('annotated_screenshots/09_settings_export.png', "Figure 17: Desktop Settings, Theme, Currency & Backup Console (डेस्कटॉप सेटिंग्स)")

    set_headers = ["Callout #", "UI Element (तत्व)", "Functionality (कार्यप्रणाली)", "Hindi Explanation (उपयोग एवं विवरण)"]
    set_rows = [
        ["1", "User Profile & Session", "Displays active account name, email, and one-tap Sign Out button", "सक्रिय खाते का नाम, ईमेल आईडी और सुरक्षित रूप से लॉगआउट करने का बटन।"],
        ["2", "Currency Configuration", "Multi-currency switcher (INR, USD, EUR, GBP, AED, CAD, JPY) with auto rate sync", "अपनी मुख्य मुद्रा (रुपया, डॉलर, यूरो आदि) बदलने और लाइव दरों से सिंक करने की सुविधा।"],
        ["3", "Theme Mode Toggle", "Select between Light Theme, Dark Theme (OLED friendly), or System Auto", "लाइट मोड, डार्क मोड (आंखों के लिए आरामदायक) और सिस्टम थीम टॉगल।"],
        ["4", "Notification Preferences", "Enable/disable EMI due date email reminders and monthly statement dispatches", "ईएमआई देय तिथि ईमेल और मासिक वित्तीय रिपोर्ट भेजने की प्राथमिकताएं।"],
        ["5", "Manage Categories", "Add custom categories, assign bespoke icons, and choose custom hex colors", "अपनी पसंद की नई श्रेणियां बनाएं, रंग और मनपसंद आइकन चुनें।"],
        ["6", "Export / Backup & Restore", "Full JSON database backup download, CSV exports, and one-click data restore", "पूरे डेटा का JSON बैकअप डाउनलोड करें और नए फोन या ब्राउज़र में तुरंत रीस्टोर करें।"]
    ]
    add_callout_table(set_headers, set_rows)

    # Mobile Settings
    add_h2("10.2 Mobile Preferences & Data Backup Center", "मोबाइल प्राथमिकताएं एवं डेटा बैकअप केंद्र")
    add_p(
        "On mobile, Settings are grouped into clean, touch-friendly cards for currency selection, theme switching (Light, System, Dark), category customization, and one-tap JSON backup file downloads.",
        "मोबाइल पर सेटिंग्स को साफ-सुथरे कार्ड्स में बांटा गया है: मुद्रा चयन, थीम बदलना (लाइट, सिस्टम, डार्क), कस्टम श्रेणियां बनाना और एक टैप में पूरा JSON बैकअप डाउनलोड करना।"
    )
    add_annotated_image('annotated_mobile_screenshots/09_settings.png', "Figure 18: Mobile Settings & Data Management with Red Markers (मोबाइल सेटिंग्स स्क्रीन)", width=Inches(3.1))

    mobile_set_headers = ["Callout #", "Mobile UI Element (तत्व)", "Touch Gesture & Behavior (जेस्चर एवं कार्य)", "Hindi Explanation (हिंदी विवरण)"]
    mobile_set_rows = [
        ["1", "User Profile & Sign Out", "Shows logged-in account name, email, and red 'Sign Out' action button", "सक्रिय उपयोगकर्ता का नाम, ईमेल और सुरक्षित रूप से लॉगआउट करने का लाल बटन।"],
        ["2", "Default Currency & Sync Tool", "Tap to change currency (₹ INR, $ USD, € EUR) and sync historical entries", "मुख्य मुद्रा बदलने और पुराने रिकॉर्ड्स को लाइव एक्सचेंज दरों से सिंक करने का विकल्प।"],
        ["3", "Theme Mode Switcher", "Three-way toggle for Light Theme, System Match, or Dark Theme (OLED)", "लाइट मोड, सिस्टम मोड, या डार्क मोड (बैटरी बचत हेतु) के बीच चयन करें।"],
        ["4", "Manage Categories Button", "Tap to add bespoke expense categories, assign icons and choose colors", "अपनी पसंद की नई श्रेणियां, नए रंग और विशेष आइकन जोड़ने का बटन।"],
        ["5", "Export / Backup & Restore Card", "One-tap full JSON database backup download and restore from file", "फोन में संपूर्ण डेटा का JSON बैकअप डाउनलोड और रीस्टोर करने की सुविधा।"],
        ["6", "Mobile Bottom Navigation Dock", "Persistent 7-tab bottom bar allowing effortless returns to any screen", "हमेशा मौजूद बॉटम बार जिससे किसी भी समय होम या अन्य पेज पर जा सकते हैं।"]
    ]
    add_callout_table(mobile_set_headers, mobile_set_rows, is_mobile=True)

    add_callout(
        "How to Take a Full Backup & Restore on Another Device (डेटा बैकअप एवं रीस्टोर करने की विधि)",
        "Because CapFlow does not upload your transactions to any central cloud server, taking regular backups ensures your data is never lost if you clear your browser cache:\n\n"
        "How to Backup (बैकअप कैसे लें):\n"
        "1. Open Settings -> tap 'Export / Backup & Restore' (Callout ⑤).\n"
        "2. Tap 'Export Full JSON Backup'.\n"
        "3. A secure file named 'capflow_backup_YYYY-MM-DD.json' is downloaded to your phone's downloads folder. Store this safely on Google Drive, iCloud, or a USB drive.\n\n"
        "How to Restore on a New Phone or Laptop (नए फोन पर रीस्टोर कैसे करें):\n"
        "1. Open CapFlow on your new device and sign in.\n"
        "2. Go to Settings -> 'Export / Backup & Restore'.\n"
        "3. Tap 'Import JSON Backup' and select your saved backup file.\n"
        "4. CapFlow instantly populates your entire financial history, budgets, and EMIs into the new device's IndexedDB!\n\n"
        "चूंकि CapFlow आपके डेटा को क्लाउड पर स्टोर नहीं करता, इसलिए नियमित बैकअप लेना सुरक्षित रहता है:\n"
        "1. सेटिंग्स में जाकर 'Export / Backup & Restore' (कॉलआउट ⑤) पर टैप करें।\n"
        "2. 'Export Full JSON Backup' दबाएं। आपकी सभी फाइलों का बैकअप फोन में डाउनलोड हो जाएगा।\n"
        "3. नए डिवाइस पर ऐप खोलकर 'Import JSON Backup' दबाएं और फाइल चुनें। आपका पूरा खाता नए फोन में आ जाएगा!",
        "tip"
    )

    # ══════════════════════════════════════════════════════════════════════════
    # 11. PROGRESSIVE WEB APP (PWA) & OFFLINE USABILITY
    # ══════════════════════════════════════════════════════════════════════════
    add_h1("11. PWA Installation & Offline Usability", "PWA इंस्टॉलेशन एवं ऑफलाइन उपयोग")
    
    add_p(
        "CapFlow is a certified Progressive Web App (PWA) meeting Google and Apple web standards. It installs directly onto your phone's home screen or laptop desktop without going through an app store, consumes less than 5 MB of storage, and boots instantly even in airplane mode.",
        "CapFlow एक प्रमाणित प्रोग्रेसिव वेब ऐप्लिकेशन (PWA) है। इसे बिना किसी ऐप स्टोर के सीधे आपके फोन की होम स्क्रीन अथवा कंप्यूटर डेस्कटॉप पर इंस्टॉल किया जा सकता है। यह 5 MB से भी कम मेमोरी लेता है और बिना इंटरनेट (फ्लाइट मोड में भी) बिजली की गति से खुलता है।"
    )

    pwa_headers = ["Platform (डिवाइस)", "Installation Steps (इंस्टॉलेशन के चरण)", "Hindi Instructions (हिंदी निर्देश)"]
    pwa_rows = [
        ["Android (Chrome / Edge)", "Tap 'Install CapFlow' banner at bottom of screen, OR tap Chrome 3 dots (⋮) -> 'Install App' / 'Add to Home Screen'.", "स्क्रीन पर नीचे दिख रहे 'Install CapFlow' बैनर पर टैप करें, या क्रोम के 3 डॉट्स दबाकर 'Install App' चुनें।"],
        ["iOS / iPhone (Safari)", "Open link in Safari -> Tap Share Icon (square with upward arrow) -> Scroll down and tap 'Add to Home Screen'.", "सफारी में खोलें -> नीचे 'Share' आइकन (तीर वाला बॉक्स) दबाएं -> नीचे स्क्रॉल कर 'Add to Home Screen' चुनें।"],
        ["Windows / Mac (Desktop)", "In Chrome or Edge, click the install icon (computer with down arrow) on the address bar -> Click 'Install'.", "ब्राउज़र के एड्रेस बार में दाईं ओर दिख रहे 'Install' आइकन पर क्लिक करें। ऐप डेस्कटॉप पर आ जाएगा।"]
    ]
    add_callout_table(pwa_headers, pwa_rows)

    # ══════════════════════════════════════════════════════════════════════════
    # 12. FREQUENTLY ASKED QUESTIONS & TROUBLESHOOTING
    # ══════════════════════════════════════════════════════════════════════════
    add_h1("12. Frequently Asked Questions (FAQ)", "अक्सर पूछे जाने वाले प्रश्न एवं समाधान")

    faqs = [
        ("Q1: Where is my financial data stored? (मेरा डेटा कहाँ स्टोर होता है?)",
         "Answer (English): 100% on your device's internal storage via IndexedDB (a high-performance structured database built into modern web browsers). CapFlow never sends your amounts, transactions, notes, or bills to any remote cloud server.\n"
         "उत्तर (हिंदी): आपका 100% डेटा आपके अपने डिवाइस के अंदर IndexedDB में सुरक्षित रहता है। CapFlow आपके किसी भी खर्च, राशि या बिल को किसी रिमोट सर्वर पर नहीं भेजता।"),

        ("Q2: What happens if I clear my browser history or site data? (यदि मैं ब्राउज़र डेटा साफ कर दूँ तो क्या होगा?)",
         "Answer (English): Clearing cookies does not erase transactions, but clicking 'Clear Site Data / Storage' in your browser settings will reset IndexedDB. To protect against accidental cache deletion, always export a monthly JSON backup from Settings -> Export & Backup.\n"
         "उत्तर (हिंदी): केवल कुकीज़ हटाने से डेटा नहीं मिटता, परंतु यदि आप ब्राउज़र सेटिंग्स में 'Clear Site Data' चुनते हैं तो स्थानीय डेटाबेस रीसेट हो सकता है। इसलिए सेटिंग्स में जाकर हर महीने JSON बैकअप फाइल डाउनलोड करके सुरक्षित रखें।"),

        ("Q3: Does the app work when my device has no internet connection? (क्या यह ऐप बिना इंटरनेट के काम करता है?)",
         "Answer (English): Yes, absolutely! CapFlow is fully offline-capable. You can add expenses, inspect budgets, check calendars, and view analytics while on flights, trains, or in remote areas. Everything syncs to your local device immediately.\n"
         "उत्तर (हिंदी): जी हाँ, बिल्कुल! CapFlow पूरी तरह ऑफलाइन काम करता है। फ्लाइट में, ट्रेन में या बिना नेटवर्क वाले क्षेत्रों में भी आप खर्च जोड़ सकते हैं, बजट देख सकते हैं और एनालिटिक्स चेक कर सकते हैं।"),

        ("Q4: How does multi-currency conversion work? (मुद्रा रूपांतरण कैसे काम करता है?)",
         "Answer (English): CapFlow automatically fetches global foreign exchange rates every 3 hours. When switching from USD to INR (or EUR/GBP), CapFlow accurately converts your records or displays live equivalences while preserving original values.\n"
         "उत्तर (हिंदी): CapFlow हर 3 घंटे में आधिकारिक विदेशी मुद्रा दरें अपडेट करता है। जब आप अपनी मुद्रा बदलते हैं, तो सभी आंकड़े वास्तविक विनिमय दर के अनुसार सटीक रूप से प्रदर्शित होते हैं।"),

        ("Q5: How do automated EMI reminders reach me? (ईएमआई रिमाइंडर मुझे कैसे प्राप्त होते हैं?)",
         "Answer (English): When 'EMI Email Sync' is enabled in Settings, only your loan name, monthly amount, and due date are scheduled with our automated email worker. No personal transactions are ever transmitted. The server dispatches an email reminder 3 days prior to the due date.\n"
         "उत्तर (हिंदी): जब आप सेटिंग्स में ईएमआई ईमेल सिंक चालू करते हैं, तो देय तारीख से 3 दिन पहले आपके पंजीकृत ईमेल पर एक विनम्र अनुस्मारक (Reminder) आ जाता है ताकि कोई भी किस्त मिस न हो।"),

        ("Q6: How can I migrate my data from my old phone to a new one? (पुराने फोन से नए फोन में डेटा कैसे ट्रांसफर करें?)",
         "Answer (English): On your old phone, go to Settings -> Export / Backup -> 'Export Full JSON Backup'. Transfer the downloaded file to your new phone (via WhatsApp, Google Drive, or Bluetooth). Open CapFlow on the new phone, go to Settings -> 'Import JSON Backup', and select the file. Done!\n"
         "उत्तर (हिंदी): पुराने फोन में Settings -> Export / Backup में जाकर 'Export Full JSON Backup' करें। उस फाइल को नए फोन पर भेजें और नए फोन में ऐप खोलकर 'Import JSON Backup' चुन लें। आपका पूरा खाता नए फोन में आ जाएगा।")
    ]

    for q, a in faqs:
        add_callout(q, a, "note")

    # ══════════════════════════════════════════════════════════════════════════
    # SAVE DOCUMENT
    # ══════════════════════════════════════════════════════════════════════════
    output_filename = "CapFlow_Application_Manual.docx"
    doc.save(output_filename)
    file_size_mb = os.path.getsize(output_filename) / (1024 * 1024)
    print(f"Manual successfully written to {output_filename} ({file_size_mb:.2f} MB, {os.path.getsize(output_filename)} bytes)")

if __name__ == "__main__":
    create_manual()
