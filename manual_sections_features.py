# manual_sections_features.py
# Chapters 9 to 16 for CapFlow Master Manual
import os
from docx.shared import Inches

def build_features_chapters(doc, helpers):
    (add_h1, add_h2, add_h3, add_p, add_bullet, add_callout, add_annotated_image, add_callout_table) = helpers

    # =========================================================================
    # CHAPTER 9: EMI & LOAN PORTFOLIO TRACKING
    # =========================================================================
    add_h1("Chapter 9: EMI & Loan Portfolio Tracking", "अध्याय 9: ईएमआई एवं ऋण पोर्टफोलियो ट्रैकिंग")
    add_p(
        "Monthly loan commitments and equipment installments represent fixed outflows that can strain liquidity if unmonitored. "
        "CapFlow provides a specialized EMI & Debt Portfolio Tracker (/emis) to keep you fully aware of total debt burden, "
        "repayment tenure progress, and upcoming due dates.",
        "मासिक ऋण किस्तें (EMI) और लोन का भुगतान समय पर न होने से वित्तीय तनाव पैदा हो सकता है। CapFlow का ईएमआई ट्रैकर आपके कुल ऋण भार, चुकाई गई किश्तों और आगामी देय तिथियों का सटीक हिसाब रखता है।"
    )

    add_h2("9.1 Desktop EMI Portfolio Dashboard", "डेस्कटॉप ईएमआई पोर्टफोलियो डैशबोर्ड")
    add_annotated_image("annotated_screenshots/08_emis_tracker.png", "Figure 15: Desktop EMI & Loan Portfolio Tracker (डेस्कटॉप ईएमआई ट्रैकर)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "+ Add New EMI Button", "Opens modal to configure new loan: Principal, Monthly EMI, Due Day, and Tenure in months.", "नई ईएमआई जोड़ने का बटन: ऋण राशि, मासिक किस्त, तारीख और अवधि दर्ज करें।"],
            ["②", "EMI Portfolio Summary Card", "Displays total monthly EMI liability, total principal debt outstanding, and average interest.", "ईएमआई सारांश कार्ड: प्रति माह कुल देय किस्त, शेष मूलधन और ब्याज का विवरण।"],
            ["③", "Empty State / Get Started CTA", "Helpful onboarding prompt guiding users through their first loan entry.", "नई शुरुआत का बटन: अपनी पहली ईएमआई जोड़ने के लिए मार्गदर्शक।"]
        ],
        is_mobile=False
    )

    add_h2("9.2 Mobile EMI Tracker Interface", "मोबाइल ईएमआई ट्रैकर इंटरफ़ेस")
    add_annotated_image("annotated_mobile_screenshots/08_emis.png", "Figure 16: Mobile EMI Portfolio & Loan Progress (मोबाइल ईएमआई विवरण)", width=Inches(3.1))
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "Header & '+ Add EMI' Action", "Tap to add a new personal loan, home loan, vehicle EMI, or gadget installment.", "शीर्ष हेडर एवं नई ईएमआई जोड़ने का त्वरित बटन।"],
            ["②", "Monthly Commitment Badge", "Prominently displays total outflow scheduled for this billing cycle.", "इस माह जाने वाली कुल ईएमआई राशि का मुख्य बैज।"],
            ["③", "Active Loan Card & Progress", "Shows loan name, monthly installment (e.g. ₹4,500), tenure progress (14/36 paid), and next due date.", "सक्रिय लोन कार्ड: लोन का नाम, किस्त राशि, कितनी किस्तें भरीं (14/36) और अगली तारीख।"],
            ["④", "7-Tab Bottom Dock", "Persistent bottom navigation dock.", "नीचे स्थित 7-टैब नेविगेशन बार।"]
        ],
        is_mobile=True
    )

    add_callout(
        "Automated EMI Due Reminders / स्वचालित ईएमआई रिमाइंडर",
        "CapFlow's background service worker monitors your active EMI due dates. Exactly 3 days before your installment is due, CapFlow fires an on-device push notification and an automated email reminder so your bank balance is always adequately funded.\n"
        "हिंदी: किस्त कटने की तारीख से ठीक 3 दिन पहले CapFlow आपके मोबाइल पर नोटिफिकेशन और ईमेल भेजकर याद दिलाता है ताकि खाते में पर्याप्त राशि रहे।",
        "tip"
    )

    # =========================================================================
    # CHAPTER 10: INTERACTIVE FINANCIAL CALENDAR & DAILY DRILL-DOWN
    # =========================================================================
    add_h1("Chapter 10: Interactive Financial Calendar & Daily Drill-Down", "अध्याय 10: इंटरएक्टिव वित्तीय कैलेंडर एवं दैनिक विश्लेषण")
    add_p(
        "Viewing numbers in spreadsheets can obscure temporal spending patterns. "
        "CapFlow transforms your financial life into a 7x5 interactive calendar heatmap (/calendar) showing daily cash inflows, outflows, and net balances.",
        "संख्याओं को केवल सूची में देखने से यह समझ नहीं आता कि किस दिन अधिक खर्च हुआ। CapFlow आपके वित्तीय जीवन को एक सुंदर 7x5 कैलेंडर हीटमैप में बदल देता है।"
    )

    add_h2("10.1 Desktop Financial Calendar View", "डेस्कटॉप वित्तीय कैलेंडर दृश्य")
    add_annotated_image("annotated_screenshots/06_calendar_view.png", "Figure 11: Desktop Interactive Financial Calendar (डेस्कटॉप वित्तीय कैलेंडर)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "Monthly Summary Cash Strip", "Displays Month Inflow (+), Month Outflow (-), and Month Net Savings at the top.", "मासिक सारांश पट्टी: कुल आमदनी (+), कुल खर्च (-) और शुद्ध मासिक बचत।"],
            ["②", "Interactive 7x5 Calendar Grid", "Date tiles color-coded by spending intensity with badges for income and expense counts.", "7x5 कैलेंडर ग्रिड: तारीख के अनुसार खर्च की तीव्रता दर्शाने वाले रंगीन बॉक्सेस।"],
            ["③", "Day Drill-Down Inspector", "Clicking any date opens the side inspector showing every transaction logged on that specific day.", "दैनिक विवरण इंस्पेक्टर: किसी भी तारीख पर क्लिक करने पर उस दिन के सभी खर्चों की सूची खुलती है।"],
            ["④", "Quick Day Add Action", "Pre-fills selected date in Add Transaction modal for fast retrospective backlogging.", "त्वरित प्रविष्टि बटन: चुनी हुई तारीख में तुरंत पुराना छूटा हुआ खर्च जोड़ने के लिए।"]
        ],
        is_mobile=False
    )

    add_h2("10.2 Mobile Financial Calendar", "मोबाइल वित्तीय कैलेंडर")
    add_annotated_image("annotated_mobile_screenshots/06_calendar.png", "Figure 12: Mobile Financial Calendar View (मोबाइल वित्तीय कैलेंडर)", width=Inches(3.1))
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "Calendar Top Bar", "Month picker and quick month forward/backward controls.", "माह चयनकर्ता एवं आगे-पीछे जाने के बटन।"],
            ["②", "Mobile Mini Metrics Strip", "Compact banner showing income vs expense balance for the month.", "मासिक आमदनी और खर्च दर्शाने वाली कॉम्पैक्ट पट्टी।"],
            ["③", "Touch Date Matrix Grid", "Tap any date box to highlight and view detailed daily expenses.", "कैलेंडर तारीख ग्रिड: किसी भी तारीख को छूकर उस दिन का हिसाब देखें।"],
            ["④", "Day Detail Bottom Sheet", "Slides up showing itemized transactions for the tapped day.", "नीचे से खुलने वाली शीट: उस दिन के सभी लेन-देन का विवरण।"],
            ["⑤", "7-Tab Bottom Dock", "Persistent bottom navigation dock.", "नीचे स्थित 7-टैब नेविगेशन बार।"]
        ],
        is_mobile=True
    )

    # =========================================================================
    # CHAPTER 11: ADVANCED ANALYTICS & SPENDING INTELLIGENCE
    # =========================================================================
    add_h1("Chapter 11: Advanced Analytics & Spending Intelligence", "अध्याय 11: उन्नत एनालिटिक्स एवं व्यय बुद्धिमत्ता (Analytics)")
    add_p(
        "True financial control requires understanding macro behavioral trends. "
        "CapFlow's Analytics engine (/analytics) computes dynamic category distributions, historical multi-month burn rates, "
        "and daily moving average anomaly bands.",
        "पैसों पर पूर्ण नियंत्रण के लिए खर्च के रुझानों को समझना आवश्यक है। CapFlow का एनालिटिक्स इंजन आपके खर्चों को श्रेणीवार पाई चार्ट, 6-महीने के तुलनात्मक बार ग्राफ और औसत खर्च रुझानों में प्रदर्शित करता है।"
    )

    add_h2("11.1 Desktop Analytics & Insights Interface", "डेस्कटॉप एनालिटिक्स इंटरफ़ेस")
    add_annotated_image("annotated_screenshots/07_analytics_insights.png", "Figure 13: Desktop Analytics & Spending Intelligence (डेस्कटॉप एनालिटिक्स)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "Time Horizon Tabs", "Toggle between 'Weekly', 'Monthly', and 'Annual' historical horizons.", "समय सीमा टैब: साप्ताहिक, मासिक या वार्षिक आधार पर आंकड़े देखने के लिए।"],
            ["②", "Executive Metrics Banner", "Average Daily Spend, Highest Spend Category, and Monthly Burn Rate.", "मुख्य वित्तीय संकेतक: दैनिक औसत खर्च, सबसे बड़ा खर्च क्षेत्र और बचत दर।"],
            ["③", "Category Donut Distribution", "Interactive SVG donut chart breaking down spending into percentage slices.", "श्रेणीवार डोनट चार्ट: किस श्रेणी में कितने प्रतिशत खर्च हुआ (भोजन, किराया आदि)।"],
            ["④", "Historical 6-Month Comparison", "Bar graph comparing monthly income vs expense over the past 6 months.", "पिछले 6 महीनों का तुलनात्मक बार ग्राफ: हर महीने की आय बनाम खर्च।"],
            ["⑤", "Daily Spend Velocity & Moving Average", "Trendline tracking daily spending spikes with upper control threshold.", "दैनिक खर्च की गति और औसत रेखा: असामान्य खर्च वाले दिनों को तुरंत पकड़ने हेतु।"]
        ],
        is_mobile=False
    )

    add_h2("11.2 Mobile Analytics Interface", "मोबाइल एनालिटिक्स इंटरफ़ेस")
    add_annotated_image("annotated_mobile_screenshots/07_analytics.png", "Figure 14: Mobile Analytics Charts & Trends (मोबाइल एनालिटिक्स)", width=Inches(3.1))
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "Time Range Pill Selector", "Touch pills for Week, Month, and Year views.", "समय अवधि चयनकर्ता (सप्ताह / माह / वर्ष)।"],
            ["②", "Mobile Category Donut", "Touch-interactive category distribution chart with legend list.", "मोबाइल डोनट चार्ट: श्रेणियों का प्रतिशत विभाजन।"],
            ["③", "Monthly Cash Flow Graph", "Horizontal scrolling bar graph of historical monthly spending.", "मासिक खर्च का तुलनात्मक चार्ट।"],
            ["④", "7-Tab Bottom Dock", "Persistent bottom navigation dock.", "नीचे स्थित 7-टैब नेविगेशन बार।"]
        ],
        is_mobile=True
    )

    # =========================================================================
    # CHAPTER 12: PERSONAL PAYMENT QR CODE SYSTEM
    # =========================================================================
    add_h1("Chapter 12: Personal Payment QR Code System", "अध्याय 12: व्यक्तिगत भुगतान क्यूआर कोड प्रणाली")
    add_p(
        "Receiving settlements in group trips or splitting rent with flatmates often leads to cumbersome copy-pasting of UPI handles. "
        "CapFlow solves this with a built-in Personal Payment QR Code vault accessible directly from Settings and Splitter settlements.",
        "ग्रुप में पैसे मंगाने या दोस्तों से उधारी वापस लेने के लिए अपनी UPI ID बार-बार बताना असुविधाजनक होता है। CapFlow में एक समर्पित व्यक्तिगत भुगतान क्यूआर कोड वॉल्ट दिया गया है।"
    )

    add_h2("12.1 Desktop Personal Payment QR Modal", "डेस्कटॉप व्यक्तिगत क्यूआर कोड")
    add_annotated_image("annotated_screenshots/15_payment_qr.png", "Figure 29: Desktop Personal Payment QR Code Modal (डेस्कटॉप व्यक्तिगत भुगतान क्यूआर)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "Personal Payment QR Display", "Crisp vector QR code rendering your verified UPI payment address for in-person scanning.", "स्पष्ट क्यूआर कोड: सामने वाले व्यक्ति द्वारा किसी भी स्कैनर से स्कैन करने हेतु।"],
            ["②", "Verified Payee VPA & Fast Copy", "Displays payee VPA (e.g. dev@okaxis) with a 1-click 'Copy UPI ID' button with checkmark feedback.", "सत्यापित UPI ID और 1-क्लिक कॉपी बटन (जैसे: dev@okaxis)।"],
            ["③", "Upload / Replace QR Button", "Upload your own static Google Pay/PhonePe QR image; CapFlow's client-side scanner decodes the VPA automatically.", "नया क्यूआर अपलोड करें: अपनी PhonePe/GPay क्यूआर फोटो अपलोड करें, ऐप खुद UPI ID पहचान लेगा।"]
        ],
        is_mobile=False
    )

    add_h2("12.2 Mobile Personal Payment QR Interface", "मोबाइल व्यक्तिगत क्यूआर कोड")
    add_annotated_image("annotated_mobile_screenshots/15_payment_qr.png", "Figure 30: Mobile Personal Payment QR Code Sheet (मोबाइल व्यक्तिगत क्यूआर)", width=Inches(3.1))
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "Mobile QR Code Viewport", "Centered high-contrast QR code for easy scanning across phone screens.", "स्क्रीन के केंद्र में स्पष्ट क्यूआर कोड: दूसरे फोन से आसानी से स्कैन करने हेतु।"],
            ["②", "UPI VPA & Touch Copy", "Touch to copy UPI ID directly to mobile clipboard.", "एक स्पर्श में UPI ID को क्लिपबोर्ड में कॉपी करें।"],
            ["③", "Upload & Decode Button", "Tap to pick QR photo from smartphone gallery or photo album.", "गैलरी से अपनी पसंदीदा क्यूआर फोटो चुनने का बटन।"]
        ],
        is_mobile=True
    )

    # =========================================================================
    # CHAPTER 13: DEVICE-TO-DEVICE DATA TRANSFER & ACCOUNT MIGRATION
    # =========================================================================
    add_h1("Chapter 13: Device-to-Device Data Transfer & Account Migration", "अध्याय 13: डिवाइस-टू-डिवाइस डेटा ट्रांसफर एवं माइग्रेशन")
    add_p(
        "Because CapFlow is local-first, switching to a new smartphone, laptop, or work desktop requires a seamless migration path. "
        "CapFlow includes a zero-cloud, peer-to-peer Device Transfer Console (/settings/transfer) utilizing encrypted 6-digit tokens and live camera QR scanning.",
        "चूंकि CapFlow सारा डेटा स्थानीय डिवाइस पर रखता है, नया फोन या कंप्यूटर लेने पर डेटा ट्रांसफर करना बहुत आसान है। CapFlow में बिना किसी क्लाउड सर्वर के, एन्क्रिप्टेड 6-अंकों के कोड और कैमरा क्यूआर स्कैनर से सीधा डेटा ट्रांसफर हो जाता है।"
    )

    add_h2("13.1 Desktop Device Transfer Console", "डेस्कटॉप डिवाइस ट्रांसफर कंसोल")
    add_annotated_image("annotated_screenshots/14_device_transfer.png", "Figure 27: Desktop Device Transfer & Migration Console (डेस्कटॉप डेटा ट्रांसफर)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "Push / Sender Mode", "Generates an ephemeral 6-digit Transfer Token and dynamic QR code with a 15-minute security countdown.", "भेजने वाला मोड (Sender): 6-अंकों का सुरक्षित टोकन और 15 मिनट की समय-सीमा वाला क्यूआर कोड बनाता है।"],
            ["②", "Pull / Receiver Mode", "Enter the 6-digit token or launch the camera QR scanner to pull the complete database onto the new device.", "प्राप्त करने वाला मोड (Receiver): 6-अंकों का कोड दर्ज करें या कैमरा स्कैनर से स्कैन कर सारा डेटा मंगाएं।"],
            ["③", "End-to-End Encryption Notice", "Certifies that ledger transfer occurs over temporary encrypted channels without server storage.", "सुरक्षा प्रमाणपत्र: ट्रांसफर पूर्णतः एन्क्रिप्टेड है और सर्वर पर कोई डेटा नहीं रुकता।"]
        ],
        is_mobile=False
    )

    add_h2("13.2 Mobile Device Transfer View", "मोबाइल डिवाइस ट्रांसफर दृश्य")
    add_annotated_image("annotated_mobile_screenshots/14_transfer.png", "Figure 28: Mobile Device Transfer Screen (मोबाइल डेटा ट्रांसफर)", width=Inches(3.1))
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "Mobile Push Card", "Displays generated transfer token and transfer QR code.", "पुराने फोन पर: ट्रांसफर कोड और क्यूआर कोड दर्शाने वाला कार्ड।"],
            ["②", "Mobile Pull Card", "Tap 'Scan QR with Camera' to immediately migrate data from old phone to new phone.", "नए फोन पर: 'Scan QR with Camera' दबाएं और तुरंत पुराना सारा हिसाब नए फोन में पाएं।"],
            ["③", "7-Tab Bottom Dock", "Persistent bottom navigation dock.", "नीचे स्थित 7-टैब नेविगेशन बार।"]
        ],
        is_mobile=True
    )

    # =========================================================================
    # CHAPTER 14: APPEARANCE CUSTOMIZATION CONSOLE
    # =========================================================================
    add_h1("Chapter 14: Appearance Customization Console", "अध्याय 14: रूप-रंग एवं थीम अनुकूलन कंसोल (Appearance)")
    add_p(
        "A finance app should be comfortable to use in any lighting condition and tailored to your aesthetic tastes. "
        "CapFlow provides a dedicated Appearance Console (/settings/appearance) with 4 themes, 5 accent colors, custom hex colors, 5 font scales, and density options.",
        "CapFlow में आपकी सुविधा और पसंद के अनुसार ऐप का पूरा रंग-रूप बदलने की स्वतंत्रता है। इसमें 4 थीम मोड्स (OLED डार्क सहित), 5 ब्रांड कलर्स, कस्टम हेक्स कलर पिकर, 5 फॉन्ट साइज और कॉम्पैक्ट लेआउट विकल्प शामिल हैं।"
    )

    add_h2("14.1 Desktop Appearance Customization", "डेस्कटॉप थीम एवं रूप-रंग कंसोल")
    add_annotated_image("annotated_screenshots/12_appearance_settings.png", "Figure 23: Desktop Appearance Customization & Themes (डेस्कटॉप थीम सेटिंग्स)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "Theme Mode Selector", "Choose between Light Mode, Dark Mode, System Auto (follows OS preference), and OLED Midnight Black (pure #000000 for battery saving).", "थीम मोड: लाइट, डार्क, सिस्टम ऑटो और ओलेड मिडनाइट ब्लैक (बैटरी बचाने के लिए शुद्ध काला रंग)।"],
            ["②", "Brand Accent Palette & Hex Picker", "Select from 5 presets (Indigo, Emerald, Purple, Orange, Blue) or click custom color wheel for any custom Hex code.", "एक्सेंट रंग: 5 खूबसूरत रंग (इंडिगो, पन्ना, बैंगनी, संतरी, नीला) अथवा अपनी पसंद का कोई भी हेक्स रंग।"],
            ["③", "Font Scaling Stepper", "Adjust typography scaling across 5 levels: Small, Medium, Default, Large, and Extra Large.", "फॉन्ट साइज: 5 स्तर (छोटा, मध्यम, सामान्य, बड़ा, बहुत बड़ा) ताकि पढ़ने में आसानी हो।"],
            ["④", "Layout Density Controls", "Toggle between Comfortable (generous breathing room) and Compact (high information density).", "लेआउट घनत्व: आरामदायक (Comfortable) अथवा सघन (Compact) दृश्य।"],
            ["⑤", "Live Interactive Widget Preview", "Live simulation card demonstrating how buttons, badges, and progress bars look under active styling.", "लाइव प्रिव्यू कार्ड: आपके द्वारा चुने गए रंगों और फॉन्ट का तुरंत लाइव नमूना दिखाता है।"]
        ],
        is_mobile=False
    )

    add_h2("14.2 Mobile Appearance Settings", "मोबाइल रूप-रंग सेटिंग्स")
    add_annotated_image("annotated_mobile_screenshots/12_appearance.png", "Figure 24: Mobile Appearance Settings (मोबाइल थीम सेटिंग्स)", width=Inches(3.1))
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "Touch Theme Mode Grid", "Large touch tiles for Light, Dark, System, and OLED Black.", "थीम मोड्स के बड़े टच टाइल्स (लाइट, डार्क, सिस्टम, ओलेड ब्लैक)।"],
            ["②", "Accent Color Circles", "Horizontal circles to pick your favorite app highlight color with 1 tap.", "मनपसंद मुख्य रंग चुनने वाले सुंदर रंगीन सर्कल।"],
            ["③", "Font Scale Stepper Buttons", "Touch '-' and '+' buttons to immediately enlarge or shrink screen text.", "टेक्स्ट को बड़ा या छोटा करने वाले माइनस (-) और प्लस (+) बटन।"],
            ["④", "Touch Density Switch", "Toggle between Spacious and Compact view for smaller screens.", "छोटी स्क्रीन पर अधिक जानकारी देखने के लिए कॉम्पैक्ट लेआउट टॉगल।"],
            ["⑤", "7-Tab Bottom Dock", "Persistent bottom navigation dock.", "नीचे स्थित 7-टैब नेविगेशन बार।"]
        ],
        is_mobile=True
    )

    # =========================================================================
    # CHAPTER 15: PRIVACY CENTER, APP LOCK & STORAGE HEALTH
    # =========================================================================
    add_h1("Chapter 15: Privacy Center, App Lock & Storage Health", "अध्याय 15: गोपनीयता केंद्र, ऐप लॉक एवं स्टोरेज स्वास्थ्य")
    add_p(
        "Financial data requires bank-grade defenses. CapFlow's dedicated Privacy Center (/settings/privacy) integrates "
        "Incognito Privacy Masking, hardware-backed 4-digit PIN lock, WebAuthn Biometrics, intelligent categorization rules, and storage diagnostics.",
        "वित्तीय डेटा की सुरक्षा सर्वोपरि है। CapFlow के गोपनीयता केंद्र (/settings/privacy) में इनकॉग्निटो प्राइवेसी मास्क (बैलेंस छिपाना), 4-अंकों का पिन लॉक, बायोमेट्रिक फिंगरप्रिंट/फेस आईडी और स्टोरेज हेल्थ क्लीनर उपलब्ध है।"
    )

    add_h2("15.1 Desktop Privacy Center Interface", "डेस्कटॉप गोपनीयता केंद्र इंटरफ़ेस")
    add_annotated_image("annotated_screenshots/13_privacy_center.png", "Figure 25: Desktop Privacy Center, App Lock & Storage Health (डेस्कटॉप प्राइवेसी सेंटर)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "Privacy Mask Mode (Incognito)", "Toggling Privacy Mode masks all balance figures, transaction amounts, and net savings with '••••' to prevent shoulder-surfing in public.", "प्राइवेसी मास्क (इनकॉग्निटो): सार्वजनिक स्थानों पर आपके बैलेंस और खर्च की राशि को '••••' से छिपा देता है।"],
            ["②", "App Lock & Hardware Biometrics", "Set a 4-digit numeric security PIN or enable WebAuthn biometrics (Touch ID, Windows Hello, Fingerprint). Includes Auto-Lock timeouts.", "ऐप लॉक: 4-अंकों का पिन अथवा फिंगरप्रिंट/फेस आईडी लॉक लगाएं। ऑटो-लॉक टाइमर सेट करें।"],
            ["③", "Auto-Categorization Rules Engine", "Define smart rules (e.g. if title contains 'Uber' -> assign category 'Transport'). Executes automatically upon entry.", "ऑटो-कैटेगरी रूल्स: नियम बनाएं (जैसे: यदि नाम में 'Uber' हो तो श्रेणी अपने आप 'यात्रा' हो जाए)।"],
            ["④", "IndexedDB Storage Health Diagnostics", "Live inspection showing storage used (in MB) vs browser quota (GB), and item counters for transactions, categories, budgets, and EMIs.", "स्टोरेज डायग्नोस्टिक्स: ब्राउज़र मेमोरी (MB) और कुल दर्ज लेन-देनों की वास्तविक संख्या दिखाता है।"],
            ["⑤", "Safe Cache Cleaner & Nuclear Reset", "Clear ephemeral cache or perform an authenticated nuclear factory reset.", "सुरक्षित कैश क्लीनर और फ़ैक्टरी रीसेट विकल्प।"]
        ],
        is_mobile=False
    )

    add_h2("15.2 Mobile Privacy Center View", "मोबाइल गोपनीयता केंद्र दृश्य")
    add_annotated_image("annotated_mobile_screenshots/13_privacy.png", "Figure 26: Mobile Privacy Center & Security Settings (मोबाइल प्राइवेसी सेंटर)", width=Inches(3.1))
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "Privacy Mask Switch", "1-tap switch to instantly obscure balances on mobile.", "एक स्पर्श में मोबाइल स्क्रीन पर सारे बैलेंस छिपाने का टॉगल।"],
            ["②", "Mobile Biometric Lock", "Enable smartphone Fingerprint / Face Unlock for instant app entry.", "मोबाइल फिंगरप्रिंट या फेस आईडी लॉक चालू करने का विकल्प।"],
            ["③", "Smart Rules Manager", "Create keyword-based auto-tagging rules directly on your phone.", "कीवर्ड आधारित स्वचालित श्रेणी नियम बनाने का सेक्शन।"],
            ["④", "Mobile Storage Health & Cleaner", "Inspect device storage utilization and tap to optimize database cache.", "फोन की मेमोरी जांचें और एक क्लिक में डेटाबेस कैश साफ करें।"]
        ],
        is_mobile=True
    )

    # =========================================================================
    # CHAPTER 16: SETTINGS, MULTI-CURRENCY, NUMBERING & SESSIONS
    # =========================================================================
    add_h1("Chapter 16: Settings, Multi-Currency, Numbering & Device Sessions", "अध्याय 16: सेटिंग्स, बहु-मुद्रा, संख्या प्रणाली एवं सक्रिय सत्र")
    add_p(
        "The Settings console (/settings) lets you configure regional preferences, multi-currency options, "
        "Indian numbering format (Lakhs / Crores) vs Western format (Millions / Billions), custom month start days, and active device security sessions.",
        "सेटिंग्स पृष्ठ (/settings) पर आप अपनी क्षेत्रीय प्राथमिकताएं, मुद्रा चयन (₹, $, €), भारतीय संख्या प्रणाली (लाख/करोड़) बनाम अंतर्राष्ट्रीय प्रणाली (मिलियन), महीने की आरंभिक तिथि और सक्रिय डिवाइस सत्र प्रबंधित कर सकते हैं।"
    )

    add_h2("16.1 Desktop Settings & Backups", "डेस्कटॉप सेटिंग्स एवं बैकअप")
    add_annotated_image("annotated_screenshots/09_settings_export.png", "Figure 17: Desktop Settings, Currency & Data Management (डेस्कटॉप सेटिंग्स)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "User Account & Unique Member Handle", "Shows profile name, email, and your unique member handle (e.g. @dev_49x1) with Sign Out button.", "उपयोगकर्ता खाता: नाम, ईमेल, यूनिक मेंबर हैंडल (@dev_49x1) और लॉगआउट बटन।"],
            ["②", "Currency & Numbering Configuration", "Switch primary currency (INR, USD, EUR, GBP) and numbering format (Indian Lakhs/Crores vs Western Millions).", "मुद्रा एवं संख्या प्रणाली: भारतीय लाख/करोड़ अथवा पश्चिमी मिलियन प्रणाली का चयन करें।"],
            ["③", "Theme & Appearance Shortcut", "Quick access link to customize theme colors and typography.", "थीम और रूप-रंग सेटिंग्स में जाने का त्वरित लिंक।"],
            ["④", "Email Notifications & Reminders", "Toggle automated monthly summary reports, EMI reminders, and budget warnings.", "ईमेल नोटिफिकेशन: मासिक रिपोर्ट, ईएमआई और बजट चेतावनी अलर्ट चालू/बंद करें।"],
            ["⑤", "Custom Category Manager", "Create custom categories with custom icons and color pickers.", "अपनी पसंद की नई श्रेणियां बनाएं और उनके रंग-आइकन चुनें।"],
            ["⑥", "Data Export & JSON Backup Vault", "Download encrypted .json full database backup or restore from previous backup file.", "पूरा डेटाबेस बैकअप डाउनलोड करें (.json) अथवा पुरानी फाइल से डेटा पुनर्स्थापित करें।"]
        ],
        is_mobile=False
    )

    add_h2("16.2 Mobile Settings Interface", "मोबाइल सेटिंग्स इंटरफ़ेस")
    add_annotated_image("annotated_mobile_screenshots/09_settings.png", "Figure 18: Mobile Settings & Account Management (मोबाइल सेटिंग्स)", width=Inches(3.1))
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "Mobile Profile Card", "User email and unique member ID with Sign Out action.", "उपयोगकर्ता प्रोफाइल कार्ड एवं लॉगआउट बटन।"],
            ["②", "Currency & Numbering Setting", "Tap to set INR / USD and toggle Indian Lakhs numbering.", "मुद्रा और लाख/करोड़ संख्या प्रणाली सेट करें।"],
            ["③", "Appearance & Themes", "Shortcut to customize colors and dark mode.", "थीम और डार्क मोड सेटिंग्स का शॉर्टकट।"],
            ["④", "Notifications Center", "Configure mobile push notifications and email alerts.", "पुश नोटिफिकेशन और ईमेल अलर्ट सेटिंग्स।"],
            ["⑤", "Backup & Restore Vault", "Tap to export instant JSON backup directly to smartphone files.", "एक टैप में फोन में बैकअप फाइल डाउनलोड करें।"],
            ["⑥", "7-Tab Bottom Dock", "Persistent bottom navigation dock.", "नीचे स्थित 7-टैब नेविगेशन बार।"]
        ],
        is_mobile=True
    )

    add_callout(
        "Active Device Sessions Tracker / सक्रिय डिवाइस सत्र ट्रैकर",
        "Inside Settings, CapFlow maintains an active audit log of all browsers and devices that have accessed your account (e.g. 'Chrome on Windows 11 - Active Now', 'Safari on iPhone 15 - 2 hours ago'). Users can remotely revoke any suspicious or old device session with a single click.\n"
        "हिंदी: सेटिंग्स में आप यह देख सकते हैं कि आपका खाता किन-किन मोबाइलों या कंप्यूटरों पर खुला हुआ है। किसी भी पुराने या अनजान डिवाइस को आप एक क्लिक में तुरंत लॉगआउट (रिमोट रीवोक) कर सकते हैं।",
        "note"
    )

    print("Chapters 9-16 (Features) successfully compiled.")
