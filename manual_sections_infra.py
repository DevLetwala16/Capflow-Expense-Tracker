# manual_sections_infra.py
# Chapters 17 to 20 for CapFlow Master Manual
import os
from docx.shared import Inches

def build_infra_chapters(doc, helpers):
    (add_h1, add_h2, add_h3, add_p, add_bullet, add_callout, add_annotated_image, add_callout_table) = helpers

    # =========================================================================
    # CHAPTER 17: WEB PUSH NOTIFICATIONS & BACKGROUND ALERTS
    # =========================================================================
    add_h1("Chapter 17: Web Push Notifications & Background Alerts", "अध्याय 17: वेब पुश नोटिफिकेशन एवं पृष्ठभूमि अलर्ट")
    add_p(
        "Staying on top of financial health requires timely nudges without spam. "
        "CapFlow implements the standard W3C Web Push API, in-app notification banners (InAppNotificationBanner.tsx), "
        "and automated cron worker dispatch engines (api/cron/) to deliver relevant, privacy-conscious notifications.",
        "वित्तीय अनुशासन बनाए रखने के लिए समय पर सूचनाएं मिलना आवश्यक है। CapFlow मानक W3C वेब पुश एपीआई, इन-ऐप बैनर नोटिफिकेशन और स्वचालित बैकग्राउंड क्रॉन इंजनों का उपयोग करके समय पर उपयोगी अलर्ट प्रदान करता है।"
    )

    add_h2("17.1 Automated Background Dispatch Engines", "स्वचालित पृष्ठभूमि प्रेषण इंजन (Automated Dispatch Engines)")
    add_p(
        "Figure 37 illustrates the Notification & Auto-Dispatch configuration settings panel inside Settings -> Preferences.",
        "चित्र 37 सेटिंग्स में स्थित नोटिफिकेशन एवं स्वचालित प्रेषण कॉन्फ़िगरेशन पैनल को दर्शाता है।"
    )
    add_annotated_image("annotated_screenshots/19_notifications_auto_dispatch.png", "Figure 37: Desktop Notification & Auto-Dispatch Settings Console (डेस्कटॉप नोटिफिकेशन सेटिंग्स)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "Monthly Statement Dispatch", "Automatically compiles bank-grade PDF statement on 1st of month and emails it to your registered inbox.", "हर माह की 1 तारीख को बैंक जैसी विस्तृत पीडीएफ स्टेटमेंट बनाकर आपकी ईमेल पर स्वतः भेजने का टॉगल।"],
            ["②", "3-Day Advance EMI Reminders", "Monitors active loans; dispatches push alerts & email exactly 3 days before payment due date.", "ईएमआई कटने की तारीख से 3 दिन पहले मोबाइल नोटिफिकेशन और ईमेल अलर्ट भेजने का विकल्प।"],
            ["③", "In-App Notification Banners", "Configures real-time toast alert banners for budget limits (80%, 100%) and splitter settlements.", "बजट सीमा (80% व 100%) और ग्रुप पेमेंट्स के लिए स्क्रीन पर तुरंत अलर्ट बैनर दिखाने की सेटिंग।"],
            ["④", "Web Push Permissions & Test CTA", "View browser permission status and fire an immediate test email/notification to verify delivery.", "ब्राउज़र पुश अनुमति की स्थिति और तुरंत टेस्ट ईमेल/नोटिफिकेशन भेजकर जांचने का बटन।"]
        ],
        is_mobile=False
    )

    add_bullet("Upcoming EMI Reminders (/api/cron/emi-reminders)", "Alerts triggered 3 days prior to an EMI payment due date, displaying the exact amount and loan name.", "ईएमआई देय तिथि से ठीक 3 दिन पहले रिमाइंडर भेजा जाता है, जिसमें ऋण का नाम और राशि शामिल होती है।")
    add_bullet("Monthly Financial Statement (/api/cron/monthly-statement)", "Compiles and emails the complete itemized transaction ledger and PDF statement on the 1st of each month.", "मासिक वित्तीय स्टेटमेंट: हर महीने की पहली तारीख को पिछले महीने का पूरा बहीखाता ईमेल करता है।")
    add_bullet("Monthly Spending Digest (/api/cron/monthly-summary)", "A discrete notification summarizing previous month net savings, highest expense category, and burn rate.", "मासिक बचत, सबसे बड़ा खर्च क्षेत्र और औसत दैनिक खर्च का संक्षिप्त सारांश।")
    add_bullet("Device Permission Modal (DevicePermissionModal.tsx)", "Gracefully guides users through enabling browser notifications and camera access with clear privacy rationales.", "अनुमति मार्गदर्शक: कैमरा और नोटिफिकेशन की अनुमति मांगने वाला पारदर्शी मॉडल।")

    # =========================================================================
    # CHAPTER 18: PROGRESSIVE WEB APP (PWA) & OFFLINE USABILITY
    # =========================================================================
    add_h1("Chapter 18: Progressive Web App (PWA) & Offline Usability", "अध्याय 18: प्रोग्रेसिव वेब ऐप (PWA) एवं ऑफलाइन उपयोगिता")
    add_p(
        "CapFlow is engineered as a first-class Progressive Web Application (PWA). It provides a full standalone native app experience "
        "without consuming hundreds of megabytes of phone storage or requiring intrusive app store permissions.",
        "CapFlow को एक उन्नत प्रोग्रेसिव वेब ऐप (PWA) के रूप में तैयार किया गया है। यह प्ले स्टोर या ऐप स्टोर के बिना भी एक असली नेटिव ऐप की तरह काम करता है और फोन की मेमोरी बहुत कम लेता है।"
    )

    add_h2("18.1 Installation Instructions", "विभिन्न प्लेटफॉर्म पर इंस्टॉल करने की विधि")
    add_bullet("Android (Chrome / Edge / Brave)", "Open https://capflow-rho.vercel.app/ -> Tap browser three dots (⋮) -> Tap 'Install app' or 'Add to Home screen'. An app icon appears on your home launcher.", "एंड्रॉइड: ब्राउज़र में लिंक खोलें -> ऊपर 3 डॉट्स (⋮) पर टैप करें -> 'Install app' या 'Add to Home screen' चुनें। ऐप आइकन स्क्रीन पर आ जाएगा।")
    add_bullet("iOS / iPhone / iPad (Safari)", "Open https://capflow-rho.vercel.app/ in Apple Safari -> Tap the Share button (square with up arrow) -> Scroll down and tap 'Add to Home Screen' -> Tap 'Add'.", "आईफोन (Safari): सफारी में लिंक खोलें -> शेयर बटन (तीर वाला बॉक्स) दबाएं -> नीचे जाकर 'Add to Home Screen' चुनें -> 'Add' पर टैप करें।")
    add_bullet("Desktop (Windows / macOS / Linux Chrome)", "Open the app in Chrome or Edge -> Click the install computer icon in the address bar (right side) -> Click 'Install'. Launches in an independent window.", "कंप्यूटर / लैपटॉप: क्रोम एड्रेस बार के दाईं ओर दिए गए 'Install' आइकन पर क्लिक करें। यह अलग विंडो में एक स्वतंत्र सॉफ्टवेयर की तरह खुलेगा।")

    add_callout(
        "Offline-First Reliability / ऑफलाइन काम करने की क्षमता",
        "Even in airplane mode, remote trekking mountains, or basement garages with zero internet signal, CapFlow launches instantaneously. You can record expenses, check budget limits, use the calculator, and view reports without interruption. All data syncs automatically when connection resumes.\n"
        "हिंदी: हवाई जहाज, यात्रा या बिना नेटवर्क वाली जगह पर भी ऐप तुरंत खुलता है। आप खर्च लिख सकते हैं, बजट देख सकते हैं और ऑफलाइन काम कर सकते हैं। नेटवर्क आने पर सब कुछ स्वतः सुरक्षित रहता है।",
        "tip"
    )

    # =========================================================================
    # CHAPTER 19: ABOUT & LEGAL SUPPORT HUB
    # =========================================================================
    add_h1("Chapter 19: About & Legal Support Hub", "अध्याय 19: हमारे बारे में एवं कानूनी सहायता केंद्र")
    add_p(
        "Trust and transparency are core to financial software. CapFlow provides full disclosure regarding architecture, data ownership, and legal policies accessible via /settings/about.",
        "वित्तीय सॉफ्टवेयर में विश्वास और पारदर्शिता सबसे महत्वपूर्ण है। CapFlow अपने डेटा स्वामित्व और नीतियों की पूरी जानकारी /settings/about पर उपलब्ध कराता है।"
    )
    add_bullet("Help Center & Documentation (/settings/about/help)", "Searchable knowledgebase with tutorials, quick answers, keyboard shortcuts, and best practices.", "सहायता केंद्र: ट्यूटोरियल्स, सामान्य प्रश्न और कीबोर्ड शॉर्टकट्स की पूरी जानकारी।")
    add_bullet("Privacy Policy (/settings/about/privacy)", "Formal legal statement confirming that zero financial transactions are sold, tracked, or monetized.", "गोपनीयता नीति: यह कानूनी पुष्टि कि आपका कोई भी वित्तीय डेटा किसी तीसरे पक्ष को नहीं बेचा या ट्रैक किया जाता।")
    add_bullet("Terms of Service (/settings/about/terms)", "Clear guidelines on software usage, local data ownership, and license conditions.", "सेवा की शर्तें: सॉफ्टवेयर उपयोग और उपयोगकर्ता के डेटा स्वामित्व के नियम।")
    add_bullet("Version & Changelog", "CapFlow Version 1.0 (Build 2026.10) with verified security signatures.", "वर्जन 1.0 रिलीज नोट्स और सुरक्षा जानकारी।")

    # =========================================================================
    # CHAPTER 20: COMPREHENSIVE FAQ & TROUBLESHOOTING GUIDE
    # =========================================================================
    add_h1("Chapter 20: Comprehensive FAQ & Troubleshooting Guide", "अध्याय 20: सामान्य प्रश्न एवं समस्या निवारण मार्गदर्शिका (FAQ)")
    add_p(
        "Below are 12 of the most frequently asked questions and technical troubleshooting steps for CapFlow users:",
        "नीचे CapFlow उपयोगकर्ताओं द्वारा सबसे अधिक पूछे जाने वाले 12 प्रश्न और उनके विस्तृत समाधान दिए गए हैं:"
    )

    faqs = [
        (
            "Q1: Where is my financial data stored? Can CapFlow creators see my bank balances?",
            "प्रश्न 1: मेरा वित्तीय डेटा कहाँ सुरक्षित रहता है? क्या ऐप निर्माता मेरा बैलेंस देख सकते हैं?",
            "Answer: Absolutely not. All your transactions, budgets, goals, and splits are stored strictly inside your browser's IndexedDB engine on your own device. CapFlow servers do not store or inspect your private ledger. Your data belongs 100% to you.",
            "उत्तर: बिल्कुल नहीं! आपका सारा डेटा केवल आपके अपने डिवाइस के ब्राउज़र (IndexedDB) में रहता है। CapFlow के पास आपका कोई निजी डेटा नहीं जाता। आपका डेटा 100% आपका अपना है।"
        ),
        (
            "Q2: What happens if I clear my browser history or cookies? Will my data be lost?",
            "प्रश्न 2: यदि मैं ब्राउज़र हिस्ट्री या कुकीज़ डिलीट कर दूं तो क्या मेरा डेटा खो जाएगा?",
            "Answer: Clearing basic browsing history or cookies typically preserves IndexedDB databases. However, performing an aggressive 'Clear All Site Data and Storage' will erase local records. We strongly recommend downloading a weekly JSON backup from Settings -> Export Data, or using Device Transfer.",
            "उत्तर: सामान्य हिस्ट्री डिलीट करने से डेटा नहीं हटता। लेकिन 'Clear All Site Data' करने पर स्थानीय डेटाबेस हट सकता है। इसलिए सेटिंग्स से साप्ताहिक JSON बैकअप डाउनलोड करने या डिवाइस ट्रांसफर का उपयोग करने की सलाह दी जाती है।"
        ),
        (
            "Q3: How do I transfer my data to a new phone without cloud backup?",
            "प्रश्न 3: बिना क्लाउड के पुराने फोन से नए फोन में डेटा कैसे ट्रांसफर करें?",
            "Answer: Navigate to Settings -> Device Transfer on both devices. On your old phone, select 'Push Mode' to reveal a 6-digit token and dynamic QR code. On your new phone, select 'Pull Mode' and scan the QR with your camera. The entire database transfers in under 5 seconds.",
            "उत्तर: दोनों फोन में Settings -> Device Transfer खोलें। पुराने फोन में 'Push Mode' चुनें (QR कोड दिखेगा)। नए फोन में 'Pull Mode' चुनकर कैमरा से QR कोड स्कैन करें। 5 सेकंड में पूरा डेटा नए फोन में आ जाएगा।"
        ),
        (
            "Q4: How does the Bill Splitter calculate debts? Is it always fair?",
            "प्रश्न 4: बिल स्प्लिटर हिसाब कैसे लगाता है? क्या यह पूरी तरह सटीक है?",
            "Answer: CapFlow uses a graph-based debt simplification algorithm. It calculates the net financial balance of every member (Total Paid minus Total Share). It then matches the highest debtor with the highest creditor to settle debts in the absolute minimum number of payments.",
            "उत्तर: CapFlow एक गणितीय एल्गोरिदम का उपयोग करता है। यह प्रत्येक सदस्य का शुद्ध बैलेंस (कुल दिया - कुल हिस्सा) निकालता है और न्यूनतम लेन-देन में पूरे ग्रुप का हिसाब शून्य कर देता है।"
        ),
        (
            "Q5: Can I split a restaurant bill where different people ordered different dishes?",
            "प्रश्न 5: क्या अलग-अलग लोगों के अलग-अलग खाने का बिल बांटा जा सकता है?",
            "Answer: Yes! When logging a split expense, choose 'Exact Amounts (₹)' mode. You can enter the exact cost of each person's dish independently instead of dividing equally.",
            "उत्तर: हाँ! खर्च जोड़ते समय 'Exact Amounts (₹)' मोड चुनें। आप प्रत्येक व्यक्ति के खाने की अलग-अलग सटीक राशि लिख सकते हैं।"
        ),
        (
            "Q6: Does the UPI Payment link work with all Indian banking apps?",
            "प्रश्न 6: क्या यूपीआई पेमेंट लिंक सभी भारतीय ऐप्स (GPay, PhonePe, Paytm) में काम करता है?",
            "Answer: Yes. CapFlow generates standard NPCI UPI intent URIs (upi://pay?pa=...&am=...). When tapped on a smartphone, it presents your OS chooser allowing you to select Google Pay, PhonePe, Paytm, BHIM, Cred, or any BHIM-compliant bank app.",
            "उत्तर: हाँ! यह राष्ट्रीय भुगतान निगम (NPCI) के आधिकारिक मानक पर आधारित है। 'Pay via UPI' दबाने पर फोन में मौजूद PhonePe, Google Pay, Paytm या BHIM अपने आप खुल जाते हैं।"
        ),
        (
            "Q7: How do I hide my financial numbers from people sitting next to me?",
            "प्रश्न 7: पास बैठे लोगों से अपने पैसों का बैलेंस कैसे छिपाएं?",
            "Answer: Navigate to Settings -> Privacy Center and enable 'Privacy Mask Mode (Incognito)'. All account balances and transaction numbers immediately display as '••••' across all screens.",
            "उत्तर: Settings -> Privacy Center में जाकर 'Privacy Mask Mode' चालू कर दें। पूरी स्क्रीन पर सभी राशि और बैलेंस तुरंत '••••' में बदल जाएंगे।"
        ),
        (
            "Q8: Can I lock CapFlow with my fingerprint or face unlock?",
            "प्रश्न 8: क्या ऐप में फिंगरप्रिंट या फेस आईडी लॉक लगाया जा सकता है?",
            "Answer: Yes. In Settings -> Privacy Center -> App Lock, enable Biometric Authentication. CapFlow uses the WebAuthn standard to interface directly with your device's Touch ID, Windows Hello, or Android Fingerprint sensor.",
            "उत्तर: हाँ! Settings -> Privacy Center में जाकर ऐप लॉक चालू करें और बायोमेट्रिक सक्षम करें। आप फिंगरप्रिंट या फेस अनलॉक से ऐप खोल सकेंगे।"
        ),
        (
            "Q9: How do I switch between Indian Lakhs/Crores and Western Millions?",
            "प्रश्न 9: भारतीय लाख/करोड़ और विदेशी मिलियन/बिलियन प्रारूप को कैसे बदलें?",
            "Answer: Open Settings -> Preferences -> Numbering Format. Select 'Indian (₹1,00,000)' for the 2,2,3 grouping or 'Western ($100,000)' for the standard 3,3 grouping.",
            "उत्तर: Settings -> Preferences में जाएं और 'Indian (₹1,00,000)' या 'Western ($100,000)' में से अपनी पसंद का प्रारूप चुनें।"
        ),
        (
            "Q10: Why did my EMI reminder not fire?",
            "प्रश्न 10: मेरा ईएमआई रिमाइंडर क्यों नहीं आया?",
            "Answer: Verify that you have granted browser notification permissions for CapFlow (click the padlock icon in the address bar -> Allow Notifications). Also ensure your EMI record has an active due date set in /emis.",
            "उत्तर: सुनिश्चित करें कि आपने ब्राउज़र में नोटिफिकेशन की अनुमति (Allow) दी हुई है। साथ ही /emis में जाकर जांचें कि आपकी ईएमआई की तारीख सही दर्ज है।"
        ),
        (
            "Q11: Can I export my data to Microsoft Excel or Google Sheets?",
            "प्रश्न 11: क्या मैं अपना डेटा एक्सेल या गूगल शीट्स में ले जा सकता हूँ?",
            "Answer: Yes. Navigate to Transactions -> Click the Export icon -> Choose 'Export CSV'. A standard comma-separated spreadsheet file will download instantly, fully compatible with Excel and Sheets.",
            "उत्तर: हाँ! Transactions पृष्ठ पर जाएं और Export पर क्लिक करके 'Export CSV' चुनें। तुरंत एक्सेल फाइल डाउनलोड हो जाएगी जिसे आप आसानी से खोल सकते हैं।"
        ),
        (
            "Q12: Is CapFlow completely free to use?",
            "प्रश्न 12: क्या CapFlow का उपयोग पूरी तरह मुफ़्त है?",
            "Answer: Yes! CapFlow is 100% free, with no hidden subscription fees, no locked premium features, and no intrusive commercial advertisements.",
            "उत्तर: हाँ! CapFlow पूर्णतः 100% मुफ़्त है। इसमें कोई छुपा हुआ शुल्क नहीं है, कोई विज्ञापन नहीं है और सारे फीचर्स सभी के लिए खुले हैं।"
        )
    ]

    for q_en, q_hi, a_en, a_hi in faqs:
        add_h3(q_en, q_hi)
        add_p(a_en, a_hi)

    print("Infra chapters (17-20) updated with Automated Dispatch Figure 37!")
