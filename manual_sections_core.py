# manual_sections_core.py
# Chapters 1 to 7 for CapFlow Master Manual
import os
from docx.shared import Inches

def build_core_chapters(doc, helpers):
    (add_h1, add_h2, add_h3, add_p, add_bullet, add_callout, add_annotated_image, add_callout_table) = helpers

    # =========================================================================
    # CHAPTER 1: APPLICATION ARCHITECTURE & PRIVACY FOUNDATION
    # =========================================================================
    add_h1("Chapter 1: Application Architecture & Privacy Foundation", "अध्याय 1: एप्लिकेशन आर्किटेक्चर एवं गोपनीयता आधार")
    
    add_h2("1.1 Local-First Database Philosophy", "स्थानीय-प्रथम (Local-First) डेटाबेस संरचना")
    add_p(
        "CapFlow is engineered from the ground up as a zero-knowledge, local-first progressive web application. "
        "Unlike conventional expense trackers that stream your financial habits, bank accounts, and transactions "
        "to remote cloud databases, CapFlow maintains all core financial records directly within your browser's "
        "IndexedDB storage engine powered by Dexie.js. Your ledger, budgets, goals, and splits never leave your device without your explicit action.",
        "CapFlow को पूर्णतः ज़ीरो-नॉलेज और स्थानीय-प्रथम (Local-First) प्रोग्रेसिव वेब एप्लिकेशन के रूप में डिज़ाइन किया गया है। "
        "पारंपरिक ऐप्स के विपरीत जो आपके वित्तीय लेन-देन और बैंक विवरण को क्लाउड सर्वर पर भेजते हैं, CapFlow आपके संपूर्ण डेटा को सीधे आपके ब्राउज़र के IndexedDB (Dexie.js) में सुरक्षित रखता है। आपका डेटा आपकी अनुमति के बिना कभी भी डिवाइस से बाहर नहीं जाता।"
    )
    add_bullet("Zero-Knowledge Storage", "All financial numbers, categories, notes, and receipts reside inside isolated client-side storage keys.", "सभी वित्तीय आंकड़े, श्रेणियां और रसीदें आपके क्लाउड पर नहीं बल्कि स्थानीय डिवाइस पर सुरक्षित रहती हैं।")
    add_bullet("Sub-Millisecond Queries", "Because all operations execute locally in memory, page transitions, search queries, and balance calculations render instantly without network latency.", "स्थानीय डेटाबेस होने के कारण सभी गणनाएं और खोज बिना किसी नेटवर्क देरी के तुरंत (0.01 सेकंड में) निष्पादित होती हैं।")
    add_bullet("Offline Continuity", "Users can log expenses, review historical analytics, and manage budgets in remote areas, flights, or subways without internet connectivity.", "इंटरनेट न होने पर भी आप लेन-देन दर्ज कर सकते हैं, बजट देख सकते हैं और ऑफलाइन काम कर सकते हैं।")

    add_callout(
        "Architecture Insight: Local-First vs Cloud-First / आर्किटेक्चर विशेषता",
        "In CapFlow, the device is the source of truth. When online, optional synchronization and P2P device transfers leverage cryptographic tokens without long-term server ledger retention.\n"
        "हिंदी: CapFlow में आपका व्यक्तिगत डिवाइस ही डेटा का मुख्य केंद्र है। सर्वर केवल एन्क्रिप्टेड ट्रांसफर सुविधा प्रदान करता है, कोई वित्तीय डेटा संग्रहीत नहीं करता।",
        "tip"
    )

    # =========================================================================
    # CHAPTER 2: GETTING STARTED & SECURE AUTHENTICATION
    # =========================================================================
    add_h1("Chapter 2: Getting Started & Secure Authentication", "अध्याय 2: शुरुआत एवं सुरक्षित प्रमाणीकरण")
    add_p(
        "Accessing CapFlow requires no cumbersome account activation or invasive KYC forms. "
        "Users can initiate their session via enterprise-grade Google OAuth, Apple ID, Facebook Login, "
        "or passwordless 6-digit Email One-Time Passcodes (OTP). Furthermore, users can test the application in Guest Mode.",
        "CapFlow में प्रवेश के लिए किसी जटिल फॉर्म या केवाईसी की आवश्यकता नहीं है। आप Google OAuth, Apple ID, Facebook अथवा ईमेल पर प्राप्त होने वाले 6-अंकों के वन-टाइम पासवर्ड (OTP) से तुरंत सुरक्षित लॉगिन कर सकते हैं।"
    )

    add_h2("2.1 Desktop Authentication Interface", "डेस्कटॉप प्रमाणीकरण इंटरफ़ेस")
    add_p(
        "Figure 1 illustrates the Desktop authentication portal featuring direct SSO buttons, passwordless email login, and security assurances.",
        "चित्र 1 डेस्कटॉप प्रमाणीकरण स्क्रीन को दर्शाता है जिसमें सिंगल-साइन-ऑन (SSO) बटन, पासवर्ड-रहित ईमेल ओटीपी और सुरक्षा नोटिस शामिल हैं।"
    )
    add_annotated_image("annotated_screenshots/01_auth_page.png", "Figure 1: CapFlow Desktop Authentication & Login Portal (डेस्कटॉप लॉगिन स्क्रीन)")
    
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "Brand Identity Header", "Displays official CapFlow brand logo and secure access welcome banner.", "आधिकारिक CapFlow लोगो और सुरक्षित लॉगिन स्वागत संदेश।"],
            ["②", "Google OAuth SSO", "One-click OAuth 2.0 authentication using your verified Google Account.", "Google खाते से तुरंत 1-क्लिक सुरक्षित लॉगिन।"],
            ["③", "Social Sign-In (Apple/FB)", "Alternative SSO providers for cross-platform iOS and social ecosystem users.", "Apple और Facebook उपयोगकर्ताओं के लिए वैकल्पिक प्रमाणीकरण।"],
            ["④", "Passwordless Email OTP", "Secure 6-digit magic code delivered to your inbox without password fatigue.", "बिना पासवर्ड के ईमेल पर प्राप्त 6-अंकों के कोड द्वारा लॉगिन।"],
            ["⑤", "Zero-Knowledge Notice", "Reassures users that personal financial data remains encrypted on-device.", "गोपनीयता आश्वासन: वित्तीय डेटा डिवाइस पर ही एन्क्रिप्टेड रहता है।"]
        ],
        is_mobile=False
    )

    add_h2("2.2 Mobile Authentication Interface", "मोबाइल प्रमाणीकरण इंटरफ़ेस")
    add_p(
        "Figure 2 illustrates the Mobile-optimized login viewport designed for one-handed operation on smartphones.",
        "चित्र 2 मोबाइल-अनुकूलित लॉगिन स्क्रीन को दर्शाता है जो स्मार्टफोन पर एक हाथ से सुगमता से उपयोग के लिए बनाई गई है।"
    )
    add_annotated_image("annotated_mobile_screenshots/01_auth.png", "Figure 2: CapFlow Mobile Authentication Screen (मोबाइल लॉगिन स्क्रीन)", width=Inches(3.1))
    
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "Mobile Logo Header", "Compact branding header optimized for mobile vertical viewports.", "मोबाइल स्क्रीन के लिए कॉम्पैक्ट ब्रांड हेडर।"],
            ["②", "Primary Google CTA", "Touch-friendly OAuth button spanning the full screen width.", "पूरी चौड़ाई वाला टच-फ्रेंडली Google लॉगिन बटन।"],
            ["③", "Social Identity Row", "Compact side-by-side buttons for Apple and Facebook sign-in.", "Apple और Facebook लॉगिन के लिए कॉम्पैक्ट बटन।"],
            ["④", "Email Magic Link Entry", "Mobile-optimized text field with numeric OTP trigger button.", "ईमेल दर्ज कर तुरंत मोबाइल पर ओटीपी मंगाने का विकल्प।"],
            ["⑤", "Privacy Disclaimer Badge", "Highlights end-to-end device storage security.", "डिवाइस सुरक्षा और गोपनीयता की जानकारी देने वाला फुटर।"]
        ],
        is_mobile=True
    )

    # =========================================================================
    # CHAPTER 3: INTERACTIVE ONBOARDING & LIVE SPOTLIGHT TOUR
    # =========================================================================
    add_h1("Chapter 3: Interactive Onboarding & Live Spotlight Tour", "अध्याय 3: इंटरएक्टिव ऑनबोर्डिंग एवं लाइव स्पॉटलाइट टूर")
    add_p(
        "To ensure new users achieve financial mastery within minutes, CapFlow includes a guided interactive walkthrough "
        "powered by the WalkthroughProvider architecture. When a user logs in for the first time, a spotlight modal highlights key controls.",
        "नए उपयोगकर्ताओं को ऐप के प्रत्येक फीचर से परिचित कराने के लिए CapFlow में इंटरएक्टिव स्पॉटलाइट टूर शामिल है। पहली बार लॉगिन करने पर यह टूर स्वचालित रूप से मुख्य बटनों और फीचर्स पर प्रकाश डालता है।"
    )
    add_bullet("Step 1: Dashboard Tour", "Highlights the primary Net Cash Flow card and 7-day velocity chart.", "डैशबोर्ड के कुल बैलेंस कार्ड और 7-दिवसीय खर्च ग्राफ को समझाता है।")
    add_bullet("Step 2: Sub-3-Tap Logging", "Directs attention to the '+' FAB and explains how to add expenses in 3 seconds.", "त्वरित '+' बटन पर ले जाकर 3 सेकंड में खर्च दर्ज करना सिखाता है।")
    add_bullet("Step 3: Budgets & Splitter", "Introduces monthly category guardrails and the shared group splitter.", "बजट सीमाओं और ग्रुप बिल स्प्लिटर के उपयोग का परिचय देता है।")
    add_bullet("On-Demand Re-Tour", "Users can re-trigger this tour anytime from Settings -> General -> Replay Tour.", "सेटिंग्स में जाकर इस टूर को कभी भी दोबारा देखा जा सकता है।")

    # =========================================================================
    # CHAPTER 4: DASHBOARD & FINANCIAL COMMAND CENTER
    # =========================================================================
    add_h1("Chapter 4: Dashboard & Financial Command Center", "अध्याय 4: डैशबोर्ड एवं वित्तीय नियंत्रण केंद्र")
    add_p(
        "The CapFlow Dashboard serves as your executive cockpit. At a single glance, it aggregates total monthly income, "
        "total expenses, net savings, cash velocity trends, and recent transaction feeds.",
        "CapFlow डैशबोर्ड आपका मुख्य वित्तीय नियंत्रण केंद्र है। एक नज़र में यह आपकी कुल मासिक आय, कुल खर्च, शुद्ध बचत और हाल के लेन-देन को प्रदर्शित करता है।"
    )

    add_h2("4.1 Desktop Dashboard Interface", "डेस्कटॉप डैशबोर्ड इंटरफ़ेस")
    add_annotated_image("annotated_screenshots/02_dashboard.png", "Figure 3: CapFlow Desktop Financial Dashboard (डेस्कटॉप डैशबोर्ड)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "Primary Navigation Sidebar", "Quick switching between Dashboard, Transactions, Budgets, Calendar, Analytics, EMIs, and Settings.", "साइडबार नेविगेशन: डैशबोर्ड, लेन-देन, बजट, कैलेंडर, एनालिटिक्स, ईएमआई और सेटिंग्स में जाने के लिए।"],
            ["②", "Month Navigator Strip", "Previous/Next cycle switcher with dynamic date range label.", "माह बदलने का नेविगेटर: पिछले या अगले महीने के डेटा को देखने के लिए।"],
            ["③", "Cash Flow Summary Card", "Displays Current Net Balance, Total Monthly Income (+), and Total Expenses (-).", "कुल बैलेंस, मासिक आय (Income) और कुल खर्च (Expense) का मुख्य कार्ड।"],
            ["④", "Quick Add Action Bar", "One-click shortcuts to immediately launch '+ Expense' or '+ Income' modals.", "एक क्लिक में खर्च या आय दर्ज करने के लिए शॉर्टकट बटन।"],
            ["⑤", "7-Day Velocity Chart", "Interactive bar chart visualizing daily spending spikes over the past 7 days.", "पिछले 7 दिनों के दैनिक खर्च को दर्शाने वाला इंटरएक्टिव ग्राफ।"],
            ["⑥", "Recent Activity Feed", "Chronological list of recent entries with category icons and timestamps.", "हाल ही में किए गए लेन-देन की समयवार विस्तृत सूची।"],
            ["⑦", "Global Floating Action Button", "Persistent bottom-right button to log transactions from anywhere.", "स्क्रीन पर हमेशा मौजूद त्वरित खर्च जोड़ने वाला फ्लोटिंग बटन (+)।"]
        ],
        is_mobile=False
    )

    add_h2("4.2 Mobile Dashboard & 7-Tab Bottom Dock", "मोबाइल डैशबोर्ड एवं 7-टैब नेविगेशन डॉक")
    add_annotated_image("annotated_mobile_screenshots/02_dashboard.png", "Figure 4: CapFlow Mobile Dashboard & Bottom Dock (मोबाइल डैशबोर्ड)", width=Inches(3.1))
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "Mobile Top Bar", "App title, user avatar, and quick notification alerts bell.", "शीर्ष बार: ऐप नाम, प्रोफाइल अवतार और नोटिफिकेशन घंटी।"],
            ["②", "Touch Month Scroller", "Swipeable or tap-friendly month navigation carousel.", "टच-अनुकूलित माह चयनकर्ता (पिछला/अगला महीना)।"],
            ["③", "Compact Balance Card", "High-contrast card showing Net Balance and income/expense pills.", "नेट बैलेंस और आय-व्यय दर्शाने वाला मुख्य कार्ड।"],
            ["④", "Dual Quick Action Buttons", "Large tap-targets for instant 'Add Expense' and 'Add Income'.", "आसानी से टैप होने वाले बड़े 'खर्च जोड़ें' और 'आय जोड़ें' बटन।"],
            ["⑤", "Mobile Velocity Bar Chart", "Touch-responsive micro bar chart of weekly cash flow.", "मोबाइल के अनुकूल पिछले 7 दिनों का स्पेंडिंग चार्ट।"],
            ["⑥", "Scrollable Recent Feed", "Touch-friendly transaction rows with swipe gesture support.", "स्क्रॉल होने वाली हालिया लेन-देन सूची।"],
            ["⑦", "7-Tab Bottom Navigation Dock", "Direct 1-tap switching: Dashboard, Ledger, Budgets, Calendar, Analytics, EMIs, Settings.", "स्क्रीन के नीचे स्थित 7-टैब डॉक: सभी 7 मुख्य पृष्ठों पर तुरंत जाने के लिए।"]
        ],
        is_mobile=True
    )

    # =========================================================================
    # CHAPTER 5: LOGGING TRANSACTIONS & CAMERA RECEIPT CAPTURE
    # =========================================================================
    add_h1("Chapter 5: Logging Transactions & Camera Receipt Capture", "अध्याय 5: लेन-देन प्रविष्टि एवं कैमरा रसीद कैप्चर")
    add_p(
        "Friction is the primary reason personal finance apps are abandoned. CapFlow eliminates friction with sub-3-tap logging, "
        "one-tap preset chips, currency switching, 9 visual categories, and direct camera paper receipt capture.",
        "लेन-देन दर्ज करने में कठिनाई ही बजटिंग छोड़ने का मुख्य कारण होती है। CapFlow में आप मात्र 3 टैप में, प्रीसेट बटनों, 9 स्पष्ट श्रेणियों और मोबाइल कैमरे से रसीद फोटो खींचकर खर्च दर्ज कर सकते हैं।"
    )

    add_h2("5.1 Desktop Add Transaction Modal", "डेस्कटॉप लेन-देन प्रविष्टि मॉडल")
    add_annotated_image("annotated_screenshots/03_add_transaction_modal.png", "Figure 5: Desktop Add Transaction Modal (डेस्कटॉप खर्च प्रविष्टि)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "Type Switcher Toggle", "Seamlessly toggle between Expense (Red) and Income (Green) modes.", "खर्च (लाल) और आय (हरा) के बीच बदलने वाला टॉगल स्विच।"],
            ["②", "Currency & Amount Display", "Large typography amount display with active currency prefix (₹ / $ / €).", "मुद्रा चयन और बड़े अक्षरों में राशि दर्ज करने का मुख्य बॉक्स।"],
            ["③", "Quick Amount Presets", "One-click chips (+₹100, +₹500, +₹1,000, +₹2,000) for instant entry.", "त्वरित राशि बटन: +₹100, +₹500, +₹1,000 एक क्लिक में जोड़ने के लिए।"],
            ["④", "Description & Note Input", "Freeform title field with intelligent smart autocomplete.", "विवरण या शीर्षक दर्ज करने का स्थान (जैसे: 'किराने का सामान')।"],
            ["⑤", "9 Visual Category Grid", "Color-coded icons: Food, Transport, Utilities, Shopping, Entertainment, Health, Education, Personal, General.", "रंग-बिरंगी 9 श्रेणियां: भोजन, यात्रा, बिल, खरीदारी, मनोरंजन, स्वास्थ्य आदि।"],
            ["⑥", "Primary Save Transaction CTA", "Validates inputs, commits to IndexedDB, and updates balances instantly.", "लेन-देन को तुरंत सेव कर बैलेंस अपडेट करने वाला मुख्य बटन।"]
        ],
        is_mobile=False
    )

    add_h2("5.2 Mobile Add Transaction & Camera Capture", "मोबाइल खर्च प्रविष्टि एवं कैमरा कैप्चर")
    add_annotated_image("annotated_mobile_screenshots/03_add_transaction.png", "Figure 6: Mobile Add Transaction & Receipt Scanner (मोबाइल खर्च प्रविष्टि)", width=Inches(3.1))
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "Touch Type Pill Selector", "Top segmented pill to toggle Expense vs Income.", "ऊपरी पिल बटन: खर्च या आय का चयन करने हेतु।"],
            ["②", "Large Numeric Amount Input", "Optimized for mobile keyboard pop-up with currency symbol.", "मोबाइल कीपैड के अनुकूल बड़ी राशि प्रविष्टि फ़ील्ड।"],
            ["③", "One-Tap Preset Chips", "Horizontal scrolling chips for fast addition of common amounts.", "एक टैप में राशि जोड़ने वाले हॉरिजॉन्टल चिप्स।"],
            ["④", "Description & Merchant Field", "Tap to type merchant name or transaction purpose.", "दुकान या लेन-देन का नाम दर्ज करने का बॉक्स।"],
            ["⑤", "Visual Grid Category Selector", "Large 3x3 touch grid allowing immediate 1-tap category selection.", "बड़ी 3x3 टच ग्रिड: एक ही स्पर्श में सही श्रेणी चुनने के लिए।"],
            ["⑥", "Primary Save Button", "Bottom docked full-width button to save transaction immediately.", "स्क्रीन के नीचे स्थित बड़ा 'Save Transaction' बटन।"]
        ],
        is_mobile=True
    )

    add_callout(
        "Camera Receipt Capture Feature / कैमरा रसीद स्कैनिंग",
        "On mobile devices, tapping the Camera icon in the transaction modal activates your smartphone camera. You can snap physical grocery bills, restaurant receipts, or fuel invoices. CapFlow compresses and binds the receipt image to the transaction record for audit verification.\n"
        "हिंदी: मोबाइल पर कैमरा आइकन छूने से आपका फ़ोन कैमरा चालू हो जाता है। आप किसी भी बिल की फोटो खींचकर तुरंत खर्च के साथ सुरक्षित संलग्न कर सकते हैं।",
        "tip"
    )

    # =========================================================================
    # CHAPTER 6: TRANSACTION HISTORY, FILTERING & STATEMENTS
    # =========================================================================
    add_h1("Chapter 6: Transaction History, Filtering & Official Statements", "अध्याय 6: लेन-देन इतिहास, फ़िल्टर एवं आधिकारिक स्टेटमेंट")
    add_p(
        "The Transactions ledger provides a granular record of every penny spent or received. "
        "Equipped with instant real-time search, multi-condition filter drawers, and official PDF/CSV statement exports.",
        "लेन-देन इतिहास पृष्ठ आपके प्रत्येक खर्च और आय का पूर्ण विवरण प्रदान करता है। इसमें त्वरित खोज बार, फ़िल्टर विकल्प और बैंक-जैसी आधिकारिक पीडीएफ/सीएसवी स्टेटमेंट डाउनलोड करने की सुविधा उपलब्ध है।"
    )

    add_h2("6.1 Desktop Ledger Interface", "डेस्कटॉप लेन-देन इतिहास इंटरफ़ेस")
    add_annotated_image("annotated_screenshots/04_transactions_history.png", "Figure 7: Desktop Transaction History Ledger & Statement Export (डेस्कटॉप लेन-देन सूची)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "Live Instant Search Bar", "Sub-string matching across descriptions, notes, and category tags.", "शीर्षक, नोट या श्रेणी के आधार पर तुरंत खोज करने वाला सर्च बॉक्स।"],
            ["②", "Type Filter Segment", "Filter by 'All', 'Expense Only', or 'Income Only' with live count badges.", "सभी, केवल खर्च या केवल आय देखने के लिए फ़िल्टर टैब।"],
            ["③", "Official Statement Export", "Generates branded PDF bank-grade statements and downloadable CSV spreadsheets.", "ब्रांडेड पीडीएफ स्टेटमेंट अथवा एक्सेल सीएसवी फाइल डाउनलोड करने का बटन।"],
            ["④", "Advanced Filter Drawer Button", "Opens drawer to filter by date ranges, category multiselect, and amount ranges.", "तिथि सीमा, विशेष श्रेणी और राशि के आधार पर छांटने का उन्नत फ़िल्टर।"]
        ],
        is_mobile=False
    )

    add_h2("6.2 Mobile Ledger Interface", "मोबाइल लेन-देन सूची इंटरफ़ेस")
    add_annotated_image("annotated_mobile_screenshots/04_transactions.png", "Figure 8: Mobile Transaction List & Filter Bar (मोबाइल लेन-देन सूची)", width=Inches(3.1))
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "Mobile Search Input", "Tap to launch keyboard search across all transaction records.", "मोबाइल सर्च बार: टाइप करते ही तुरंत परिणाम दिखते हैं।"],
            ["②", "Type Filter Pills", "Quick-tap buttons to toggle between All, Expenses, and Income.", "खर्च और आय के बीच चयन करने वाले टच पिल्स।"],
            ["③", "Export Action Icon", "Tap to export clean PDF or CSV statement directly to your phone files.", "मोबाइल में पीडीएफ या सीएसवी स्टेटमेंट सेव करने का आइकन।"],
            ["④", "Itemized Transaction Rows", "Touch cards showing Category Icon, Title, Date, and Amount in INR.", "प्रत्येक लेन-देन का कार्ड: श्रेणी आइकन, नाम, तारीख और राशि।"],
            ["⑤", "Floating Quick Add FAB", "Floating '+' button to add transactions while browsing records.", "स्क्रीन पर तैरता हुआ '+' बटन: तुरंत नया खर्च जोड़ने हेतु।"],
            ["⑥", "Bottom Navigation Dock", "Persistent 7-tab bar for instant module switching.", "नीचे स्थित 7-टैब नेविगेशन बार।"]
        ],
        is_mobile=True
    )

    # =========================================================================
    # CHAPTER 7: BUDGETS, SPENDING LIMITS & SAVINGS GOALS
    # =========================================================================
    add_h1("Chapter 7: Budgets, Spending Limits & Savings Goals", "अध्याय 7: बजट सीमाएं एवं बचत लक्ष्य (Savings Goals)")
    add_p(
        "Financial freedom starts with strict boundary enforcement and disciplined savings targets. "
        "CapFlow combines monthly category spending guardrails with milestone-driven savings goals.",
        "वित्तीय स्वतंत्रता के लिए खर्च की सीमा तय करना और बचत लक्ष्य निर्धारित करना आवश्यक है। CapFlow आपको प्रत्येक श्रेणी के लिए मासिक बजट सीमा निर्धारित करने और सपनों के लिए बचत लक्ष्य बनाने की सुविधा देता है।"
    )

    add_h2("7.1 Desktop Budgets & Goals Hub", "डेस्कटॉप बजट एवं बचत लक्ष्य हब")
    add_annotated_image("annotated_screenshots/05_budgets_goals.png", "Figure 9: Desktop Budgets & Savings Goals Dashboard (डेस्कटॉप बजट व लक्ष्य)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "Monthly Category Budgets", "Visual cards with dynamic 3-tier progress bars (Green <70%, Yellow 70-99%, Red ≥100%).", "श्रेणीवार बजट कार्ड: हरा (<70%), पीला (70-99%) और लाल (ओवरबजट ≥100%)।"],
            ["②", "Savings Goals Showcase", "Goal progress cards tracking Target Amount, Saved Amount, and % achieved.", "बचत लक्ष्य कार्ड: कुल लक्ष्य, अब तक की बचत और प्रतिशत प्रगति।"],
            ["③", "+ Add Budget Button", "Opens modal to assign a monthly spending limit to any category.", "नया बजट बनाने का बटन: किसी भी श्रेणी पर मासिक सीमा लगाएं।"],
            ["④", "+ Add Goal Button", "Opens modal to define a target savings amount, deadline, and target icon.", "नया बचत लक्ष्य बनाने का बटन: लक्ष्य राशि, अंतिम तिथि और नाम दर्ज करें।"]
        ],
        is_mobile=False
    )

    add_h2("7.2 Mobile Budgets & Goals Interface", "मोबाइल बजट एवं लक्ष्य इंटरफ़ेस")
    add_annotated_image("annotated_mobile_screenshots/05_budgets_goals.png", "Figure 10: Mobile Budgets & Savings Goals View (मोबाइल बजट व लक्ष्य)", width=Inches(3.1))
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "Category Budget Cards", "Touch cards showing spent amount, remaining allowance, and percentage bar.", "मासिक बजट कार्ड: कितना खर्च हुआ, कितना बचा और प्रगति पट्टी।"],
            ["②", "+ Add Budget Quick Action", "Tap to create a new category spending limit.", "नया बजट जोड़ने का त्वरित बटन।"],
            ["③", "Savings Goal Milestones", "Visual cards showing goal progress with 1-tap '+ Deposit' action.", "बचत लक्ष्य कार्ड: प्रगति देखने और सीधे पैसे जोड़ने हेतु।"],
            ["④", "+ Add Goal Action", "Tap to create a new target fund (e.g. Vacation, Bike, Emergency).", "नया लक्ष्य बनाने का बटन (जैसे: नया फ़ोन, यात्रा, आपातकालीन फंड)।"],
            ["⑤", "7-Tab Bottom Dock", "Persistent bottom navigation dock.", "नीचे स्थित 7-टैब नेविगेशन बार।"]
        ],
        is_mobile=True
    )

    print("Core chapters (1-7) successfully compiled.")
