# manual_sections_splitter.py
# Chapter 8: Bill Splitter & Group Expenses (Complete Subsystem) for CapFlow Master Manual
import os
from docx.shared import Inches

def build_splitter_chapter(doc, helpers):
    (add_h1, add_h2, add_h3, add_p, add_bullet, add_callout, add_annotated_image, add_callout_table) = helpers

    # =========================================================================
    # CHAPTER 8: BILL SPLITTER & GROUP EXPENSES (COMPLETE SUB-SYSTEM)
    # =========================================================================
    add_h1("Chapter 8: Bill Splitter & Group Expenses (Complete Subsystem)", "अध्याय 8: बिल स्प्लिटर एवं समूह खर्च (संपूर्ण उप-प्रणाली)")
    add_p(
        "One of CapFlow's crowning architectural achievements is the fully integrated Bill Splitter & Group Expense Subsystem. "
        "Whether you are organizing a weekend road trip with friends, sharing an apartment flat with roommates, hosting an office dinner, "
        "or managing joint household family accounts, CapFlow completely eliminates the chaotic headache of who owes whom.",
        "CapFlow का बिल स्प्लिटर एवं समूह खर्च मॉड्यूल दोस्तों के साथ यात्रा, रूममेट्स के साथ फ्लैट का किराया व राशन, डिनर पार्टी अथवा पारिवारिक खर्च बांटने की प्रक्रिया को अत्यंत सरल बनाता है। यह 'किसने किसको कितना पैसा देना है' के भ्रम को पूरी तरह समाप्त कर देता है।"
    )

    # -------------------------------------------------------------------------
    # 8.1 SESSIONS HUB & CREATION
    # -------------------------------------------------------------------------
    add_h2("8.1 Splitter Sessions Hub & Creation", "8.1 स्प्लिटर हब एवं नया ग्रुप सत्र बनाना")
    add_p(
        "The Splitter Hub (/budgets/splitter) serves as the central command for all your group sessions. "
        "Users can create unlimited sessions, filter between Active and Settled groups, or join an existing session via a 6-character code or QR scan.",
        "स्प्लिटर हब (/budgets/splitter) आपके सभी ग्रुप सत्रों का मुख्य पृष्ठ है। आप असीमित ग्रुप बना सकते हैं, सक्रिय व पूर्ण हो चुके ग्रुप्स को देख सकते हैं, अथवा 6-अक्षरों के कोड या क्यूआर कोड को स्कैन करके किसी भी ग्रुप में शामिल हो सकते हैं।"
    )

    add_h3("Desktop Splitter Sessions Hub", "डेस्कटॉप स्प्लिटर सेशन्स हब")
    add_annotated_image("annotated_screenshots/10_splitter_hub.png", "Figure 19: Desktop Bill Splitter Hub & Active Sessions (डेस्कटॉप स्प्लिटर हब)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "Splitter Header & Actions", "Access '+ Create Session' or 'Join Session' modals with 1-click.", "नया ग्रुप बनाने या मौजूदा ग्रुप से जुड़ने के मुख्य बटन।"],
            ["②", "Active Group Session Card", "Displays session title, category badge (Trip/Flat), member count, total expenditure, and your net balance.", "ग्रुप कार्ड: नाम, श्रेणी (यात्रा/फ्लैट), सदस्यों की संख्या, कुल खर्च और आपका व्यक्तिगत बैलेंस।"],
            ["③", "Status Filter Tabs", "Toggle between 'Active Sessions' and 'Settled / Archived Sessions'.", "सक्रिय (Active) और पूर्ण हो चुके (Settled) ग्रुप्स को अलग-अलग देखने के टैब्स।"],
            ["④", "Session Search & Quick Stats", "Real-time search across sessions with total aggregated group spending counter.", "सत्रों में त्वरित खोज और कुल सामूहिक खर्च का आँकड़ा।"]
        ],
        is_mobile=False
    )

    add_h3("Mobile Splitter Sessions Hub", "मोबाइल स्प्लिटर सेशन्स हब", is_mobile=True)
    add_annotated_image("annotated_mobile_screenshots/10_splitter_hub.png", "Figure 20: Mobile Bill Splitter Hub & Session Cards (मोबाइल स्प्लिटर हब)", width=Inches(3.1))
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "Mobile Splitter Header", "Header with fast '+ Create' and 'Join' action buttons.", "शीर्ष बार: नया ग्रुप बनाने व जुड़ने के त्वरित टच बटन।"],
            ["②", "Touch Session Card", "Full-width touch card showing trip name, members, total spend, and net balance badge.", "पूरा टच कार्ड: ग्रुप का नाम, सदस्य, कुल खर्च और आपका लेन-देन बैलेंस।"],
            ["③", "Filter Pill Carousel", "Horizontal swipe pills: 'Active' and 'Settled' groups.", "स्वाइप होने वाले फ़िल्टर पिल्स (सक्रिय एवं पूर्ण सत्र)।"],
            ["④", "7-Tab Bottom Dock", "Persistent bottom navigation dock for rapid tab switching.", "स्क्रीन के नीचे स्थित 7-टैब नेविगेशन डॉक।"]
        ],
        is_mobile=True
    )

    # -------------------------------------------------------------------------
    # 8.2 SESSION TEMPLATES: FAMILY / HOUSEHOLD MODE & BUDGET CAPS
    # -------------------------------------------------------------------------
    add_h2("8.2 Session Templates: Household & Family Mode, Headcount Weights & Budget Caps", "8.2 सत्र टेम्पलेट्स: पारिवारिक मोड, सदस्य भार एवं बजट सीमाएं")
    add_p(
        "Real-world trips and events often feature complex family dynamics. CapFlow introduces dedicated Session Templates (SplitTemplate): "
        "Group Mode, Solo Mode, and Family / Primary Payer (Household Mode). In Family Mode, a household head covers expenses for dependents "
        "(spouse, children, elderly parents) without forcing dependents to settle debts individually.",
        "पारिवारिक यात्राओं और आयोजनों में अक्सर एक ही व्यक्ति पूरे परिवार का खर्च वहन करता है। CapFlow में 'Family / Primary Payer (Household Mode)' टेम्पलेट शामिल है। इसमें परिवार का मुखिया (जैसे: माता-पिता) आश्रित सदस्यों (बच्चों, बुजुर्गों) का खर्च उठाता है और ऋण स्वतः मुखिया के खाते में जुड़ जाता है।"
    )
    add_bullet("Family Headcount Weight", "Each member can be assigned a family count (e.g. Member with family of 3 = count of 3). The split engine calculates shares automatically: Amount * (FamilyCount / TotalHeadcount).", "सदस्य संख्या भार (Headcount): प्रत्येक सदस्य के साथ उसके परिवार के सदस्यों की संख्या दर्ज करें। सिस्टम प्रति व्यक्ति के आधार पर सही अनुपात में खर्च बांटता है।")
    add_bullet("Dependent Debt Routing", "Enabling the 'Dependent' checkbox marks a member as non-settling; any expense consumed by the dependent is mathematically rerouted to the primary household payer.", "आश्रित सदस्य (Dependent): इस विकल्प को चुनने पर उस सदस्य की देनदारी सीधे परिवार के मुखिया के नाम पर स्थानांतरित हो जाती है।")
    add_bullet("Session Budget Cap", "Set an overall expenditure ceiling (e.g. ₹50,000). A real-time progress bar warns when the group approaches 80% or exceeds the cap.", "ग्रुप बजट सीमा (Budget Cap): पूरे ट्रिप या इवेंट के लिए खर्च की अधिकतम सीमा तय करें। 80% या 100% खर्च होने पर चेतावनी मिलती है।")

    add_h3("Desktop Family Mode Session Configuration", "डेस्कटॉप पारिवारिक सत्र कॉन्फ़िगरेशन")
    add_annotated_image("annotated_screenshots/17_splitter_create_family.png", "Figure 33: Desktop Create Session Modal with Family Mode & Budget Cap (डेस्कटॉप फैमिली मोड सत्र निर्माण)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "Session Template Selector", "Choose between Group Mode, Family / Primary Payer (Household Mode), and Solo Project Mode.", "सत्र टेम्पलेट चयन: ग्रुप मोड, पारिवारिक मोड (Household Mode) अथवा सोलो प्रोजेक्ट।"],
            ["②", "Session Name & Purpose", "Title field (e.g. 'Manali Family Trip 2026') with optional notes.", "सत्र का नाम एवं उद्देश्य दर्ज करने का स्थान।"],
            ["③", "Dates, Currency & Budget Cap", "Define start/end calendar dates, currency (INR/USD), and maximum session budget cap.", "तारीख, मुद्रा (₹) और कुल बजट सीमा (जैसे: ₹50,000) दर्ज करें।"],
            ["④", "Member Directory & Headcount", "Add members with Family Headcount (+ / -) stepper and Dependent checkbox.", "सदस्य सूची: परिवार के सदस्यों की संख्या (+/-) और 'आश्रित' (Dependent) टिक मार्क।"],
            ["⑤", "Primary Create Session CTA", "Commits new session to local IndexedDB and opens session dashboard.", "सत्र निर्माण पूरा करने वाला मुख्य 'Create Split Session' बटन।"]
        ],
        is_mobile=False
    )

    add_h3("Mobile Family Mode Session Creation", "मोबाइल पारिवारिक सत्र निर्माण", is_mobile=True)
    add_annotated_image("annotated_mobile_screenshots/17_splitter_create_family.png", "Figure 34: Mobile Create Session with Family & Headcount Mode (मोबाइल फैमिली मोड सत्र निर्माण)", width=Inches(3.1))
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "Mobile Template Tiles", "Touch tile to activate Family / Household Mode.", "पारिवारिक मोड सक्रिय करने वाला टच कार्ड।"],
            ["②", "Mobile Title Input", "Tap to enter session name and trip notes.", "सत्र का नाम टाइप करने का टेक्स्ट बॉक्स।"],
            ["③", "Currency & Budget Cap", "Input total allocated budget limit for the trip.", "ट्रिप के लिए अधिकतम बजट राशि दर्ज करने का स्थान।"],
            ["④", "Family Headcount Stepper", "Touch '-' and '+' buttons to adjust family member count for each participant.", "प्रति सदस्य परिवार के लोगों की संख्या बदलने वाले +/- बटन।"],
            ["⑤", "Primary Submit CTA", "Tap to create group session and invite family members.", "सत्र शुरू करने वाला मुख्य 'Create' बटन।"]
        ],
        is_mobile=True
    )

    # -------------------------------------------------------------------------
    # 8.3 MEMBERS & CONTACT PROFILES
    # -------------------------------------------------------------------------
    add_h2("8.3 Member Profiles & Contact Directory", "8.3 सदस्य प्रोफाइल एवं संपर्क विवरण")
    add_p(
        "Each session supports an unlimited roster of members. Members can be added by name, email address, and their verified UPI ID (VPA). "
        "Adding a UPI ID (e.g., rahul@oksbi) is critical because it unlocks instant one-tap settlement across Indian payment apps.",
        "प्रत्येक सत्र में आप असीमित सदस्य जोड़ सकते हैं। प्रत्येक सदस्य का नाम, ईमेल और उनकी UPI ID (जैसे: rahul@oksbi) दर्ज की जा सकती है। UPI ID दर्ज करने से ग्रुप के अन्य सदस्य एक क्लिक में सीधे पैसे ट्रांसफर कर सकते हैं।"
    )
    add_bullet("Invite via 6-Character Code", "Every session has a unique short code (e.g., 'GOA24X'). Friends enter this code to join in seconds.", "प्रत्येक ग्रुप का एक अद्वितीय 6-अक्षरों का कोड होता है, जिसे दर्ज कर मित्र तुरंत जुड़ सकते हैं।")
    add_bullet("Invite via Direct Link & QR", "Tap 'Share Invite' to copy the direct URL (capflow.app/splitter/join?code=...) or display a join QR code.", "एक क्लिक में डायरेक्ट लिंक कॉपी करें अथवा जुड़ने के लिए क्यूआर कोड दिखाएं।")
    add_bullet("Guest / Offline Members", "You can add members who don't have smartphones or CapFlow accounts; you can manage their splits on their behalf.", "जिन मित्रों के पास ऐप नहीं है, उन्हें भी बतौर ऑफलाइन सदस्य जोड़कर उनका हिसाब रखा जा सकता है।")

    # -------------------------------------------------------------------------
    # 8.4 4 SPLIT MODES
    # -------------------------------------------------------------------------
    add_h2("8.4 Logging Shared Expenses & 4 Split Distribution Modes", "8.4 सामूहिक खर्च दर्ज करना एवं बंटवारे के 4 तरीके")
    add_p(
        "Real-world group expenses are rarely straightforward. CapFlow provides 4 mathematically rigorous split modes to accommodate any scenario:",
        "वास्तविक जीवन में खर्च हमेशा बराबर नहीं बंटते। CapFlow में किसी भी स्थिति के अनुसार खर्च बांटने के 4 सटीक गणितीय तरीके दिए गए हैं:"
    )
    add_bullet("1. Equal Split (=)", "Divides the total amount equally among all selected participants. Perfect for shared rental cabs or common meals.", "बराबर बंटवारा (=): कुल राशि को सभी चयनित सदस्यों में बिल्कुल बराबर बांटता है (जैसे: साझा कैब या होटल रूम का किराया)।")
    add_bullet("2. Exact Amounts (₹)", "Allows specifying exact non-uniform currency amounts for each individual (e.g. Rahul pays ₹450 for his pizza, Priya pays ₹650 for pasta). Must tally to total.", "सटीक राशि (₹): प्रत्येक व्यक्ति के खाने या खर्च के अनुसार अलग-अलग सटीक राशि दर्ज करें।")
    add_bullet("3. Percentages (%)", "Allocates costs by percentage points (e.g. 50% / 30% / 20%). The validation engine ensures the sum strictly equals 100.0%.", "प्रतिशत आधार (%): प्रतिशत के अनुसार खर्च बांटे (जैसे: 50%, 30%, 20%)। सिस्टम 100% योग की पुष्टि करता है।")
    add_bullet("4. Shares / Units (x)", "Assigns integer units or weights (e.g. Member with family takes 2 shares, solo member takes 1 share). Math: Amount * (Individual Shares / Total Shares).", "हिस्सेदारी / यूनिट्स (x): सदस्यों की संख्या के अनुसार यूनिट्स आवंटित करें (जैसे: परिवार वाले सदस्य के 2 हिस्से, अकेले सदस्य का 1 हिस्सा)।")

    # -------------------------------------------------------------------------
    # 8.5 FLOATING CALCULATOR
    # -------------------------------------------------------------------------
    add_h2("8.5 Built-in Floating In-App Calculator", "8.5 इन-ऐप फ्लोटिंग कैलकुलेटर एवं हिस्ट्री टेप")
    add_p(
        "Switching between your expense tracker and an external phone calculator app causes cognitive friction and input mistakes. "
        "CapFlow solves this with a built-in Floating Calculator (FloatingCalculator.tsx) powered by a robust mathematical parser (calculatorEngine.ts). "
        "A calculator icon is embedded directly beside the amount input in both the general expense sheet and the group split expense modal.",
        "खर्च दर्ज करते समय अलग से कैलकुलेटर ऐप खोलने की आवश्यकता को समाप्त करने के लिए CapFlow में इन-ऐप फ्लोटिंग कैलकुलेटर दिया गया है। खर्च दर्ज करने वाले बॉक्स के ठीक बगल में कैलकुलेटर बटन दिया गया है, जिससे आप रेस्तरां के बिल, टैक्स, डिस्काउंट की गणना करके तुरंत 1-टैप में राशि भर सकते हैं।"
    )

    add_h3("Desktop Floating Calculator & Expression Tape", "डेस्कटॉप फ्लोटिंग कैलकुलेटर")
    add_annotated_image("annotated_screenshots/16_floating_calculator.png", "Figure 31: Desktop Floating Calculator & Expression Tape (डेस्कटॉप फ्लोटिंग कैलकुलेटर)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "Calculator Header & Mode Bar", "Drag header to reposition floating window, minimize or clear tape.", "कैलकुलेटर हेडर: विंडो को हिलाने, छोटा करने या रीसेट करने के लिए।"],
            ["②", "Real-Time Formula & Result Display", "Live equation parser supporting compound math e.g. '(1250 * 3) + 450 - 15%'.", "लाइव समीकरण और परिणाम डिस्प्ले: जटिल गणितीय सूत्रों को तुरंत हल करता है।"],
            ["③", "Full Arithmetic Keypad", "Touch-friendly grid with digits 0-9, decimal point, operators (+, -, *, /), parentheses (), and backspace.", "पूर्ण कीपैड: अंक 0-9, जोड़, घटाव, गुणा, भाग, कोष्ठक और बैकस्पेस।"],
            ["④", "One-Tap 'Apply to Amount' Action", "Transfers calculated result directly into the active transaction or split input field.", "1-टैब 'Apply to Amount' बटन: गणना की गई राशि को सीधे खर्च वाले बॉक्स में भर देता है।"]
        ],
        is_mobile=False
    )

    add_h3("Mobile Floating Calculator", "मोबाइल फ्लोटिंग कैलकुलेटर", is_mobile=True)
    add_annotated_image("annotated_mobile_screenshots/16_floating_calculator.png", "Figure 32: Mobile Floating Calculator Sheet (मोबाइल फ्लोटिंग कैलकुलेटर)", width=Inches(3.1))
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "Live Expression & Output", "Displays active mathematical formula and computed answer.", "स्क्रीन पर सक्रिय गणितीय समीकरण और तुरंत परिणाम डिस्प्ले।"],
            ["②", "Mobile Touch Arithmetic Keypad", "Large ergonomic touch buttons designed for thumb typing without typos.", "अंगूठे से आसानी से टाइप करने के लिए बड़े और सटीक टच बटन।"],
            ["③", "One-Tap Apply CTA", "Tap to inject the computed value straight into the expense form.", "एक टैप में राशि को खर्च फ़ॉर्म में स्थानांतरित करने वाला बटन।"]
        ],
        is_mobile=True
    )

    # -------------------------------------------------------------------------
    # 8.6 DEBT SIMPLIFICATION ENGINE
    # -------------------------------------------------------------------------
    add_h2("8.6 Graph-Based Debt Simplification Engine", "8.6 ग्राफ़-आधारित ऋण सरलीकरण इंजन (Debt Simplification)")
    add_p(
        "In a group of 6 friends over a 4-day vacation, hundreds of cross-debts can accumulate (A owes B, B owes C, C owes A). "
        "CapFlow's Debt Simplification Engine (debtEngine.ts) runs a greedy graph-reduction algorithm to minimize the total number of transactions required to settle all debts.",
        "यात्रा के दौरान कई लोगों के बीच लेन-देन अत्यंत उलझ जाता है। CapFlow का ऋण सरलीकरण इंजन एक विशेष एल्गोरिदम चलाकर सभी के आपसी कर्जों को न्यूनतम संभावित लेन-देन में समेट देता है।"
    )

    add_callout(
        "Real-World Debt Simplification Example / वास्तविक उदाहरण",
        "Scenario: Aniket pays ₹3,000 for dinner for Aniket, Bhavna, and Chirag. Bhavna pays ₹1,500 for breakfast for all three.\n"
        "Without Simplification: 6 individual cross-transactions.\n"
        "CapFlow Engine Simplification: Chirag pays ₹1,500 to Aniket. Bhavna pays ₹0. All balances are 100% settled in exactly 1 transaction!\n"
        "हिंदी: अनिकेत ने ₹3,000 डिनर का दिया। भावना ने ₹1,500 नाश्ते का दिया। बिना सरलीकरण के 6 बार पैसे भेजने पड़ते। CapFlow ने इसे मात्र 1 लेन-देन में बदल दिया: चिराग केवल अनिकेत को ₹1,500 देगा और सबका हिसाब चुकता!",
        "example"
    )

    add_h3("Desktop Splitter Session Ledger & Settlements", "डेस्कटॉप सत्र बहीखाता एवं निपटान")
    add_annotated_image("annotated_screenshots/11_splitter_session.png", "Figure 21: Desktop Splitter Session Detail, Net Balances & Debt Roadmap (डेस्कटॉप सत्र विवरण व हिसाब)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "Session Header & Metadata", "Title, dates, session currency, share code, and Lock status.", "सत्र हेडर: नाम, तारीख, मुद्रा, शेयर कोड और लॉक स्थिति।"],
            ["②", "Net Balances Summary Bar", "Overview of total group expenditure and your personal net position ('You are owed ₹1,850' in Green or 'You owe ₹600' in Red).", "कुल खर्च और आपकी स्थिति: 'आपको ₹1,850 मिलने हैं' (हरा) अथवा 'आपको ₹600 देने हैं' (लाल)।"],
            ["③", "Module Navigation Tabs", "Switch between 'Expenses Feed', 'Net Balances Table', and 'Settlement Roadmap'.", "टैब्स: 'खर्चों की सूची', 'सदस्यों का बैलेंस' और 'निपटान का आसान रास्ता'।"],
            ["④", "Itemized Expenses & Settle Road", "Shows chronological expenses and simplified 'Who owes Whom' payment cards with Pay buttons.", "खर्चों का विवरण और 'किसने किसको कितना देना है' के कार्ड्स मय 'Pay Now' बटन।"]
        ],
        is_mobile=False
    )

    add_h3("Mobile Splitter Session View", "मोबाइल सत्र विवरण स्क्रीन", is_mobile=True)
    add_annotated_image("annotated_mobile_screenshots/11_splitter_session.png", "Figure 22: Mobile Splitter Session Detail (मोबाइल सत्र विवरण)", width=Inches(3.1))
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "Mobile Session Header", "Title, back navigation, and share invite icon.", "शीर्ष बार: ग्रुप का नाम, वापस जाने का बटन और शेयर आइकन।"],
            ["②", "Net Position Card", "Prominent card showing whether you get money back or owe money.", "मुख्य कार्ड: आपकी शुद्ध लेनदारी या देनदारी की स्थिति।"],
            ["③", "Tab Switcher Pills", "Touch pills to view Expenses, Balances, or Settlement roadmap.", "टच पिल्स: खर्च, बैलेंस और निपटान देखने के लिए।"],
            ["④", "Actionable Settlement Cards", "Touch cards showing exact payment dues with 1-tap UPI Pay button.", "निपटान कार्ड्स: सीधे 1-टैप में यूपीआई से भुगतान करने का विकल्प।"],
            ["⑤", "7-Tab Bottom Dock", "Persistent bottom navigation dock.", "नीचे स्थित 7-टैब नेविगेशन बार।"]
        ],
        is_mobile=True
    )

    # -------------------------------------------------------------------------
    # 8.7 DYNAMIC UPI PAYMENT & DIRECT SETTLEMENT
    # -------------------------------------------------------------------------
    add_h2("8.7 Dynamic UPI Payment QR Code & Direct Settlement", "8.7 डायनामिक यूपीआई क्यूआर कोड एवं सीधा मोबाइल भुगतान")
    add_p(
        "Settling debts traditionally required copying account numbers or searching UPI IDs in external apps. "
        "CapFlow revolutionizes this with standard National Payments Corporation of India (NPCI) UPI deep-linking (upiPayment.ts). "
        "Clicking 'Pay' on any settlement card opens a dynamic settlement modal with the verified payee VPA, exact balance pre-filled, "
        "a dynamic QR code, and a fullscreen expander modal (QRCodeExpandModal.tsx) for effortless scanning.",
        "कर्ज चुकाने के लिए पहले बैंक खाता नंबर या यूपीआई आईडी कॉपी करनी पड़ती थी। CapFlow ने इसे पूरी तरह स्वचालित कर दिया है। यह NPCI मानक के अनुसार डायनामिक यूपीआई लिंक और क्यूआर कोड तैयार करता है। 'Pay' दबाते ही प्राप्तकर्ता का नाम, UPI ID, सटीक राशि और फुलस्क्रीन क्यूआर कोड खुल जाता है।"
    )

    add_h3("Desktop Dynamic UPI Settlement QR Modal", "डेस्कटॉप डायनामिक यूपीआई भुगतान मॉडल")
    add_annotated_image("annotated_screenshots/18_splitter_settlement_qr.png", "Figure 35: Desktop Dynamic Settlement QR Code & UPI Deep-Link Modal (डेस्कटॉप यूपीआई भुगतान)")
    add_callout_table(
        ["Badge", "UI Component", "English Description & Function", "हिंदी विवरण एवं कार्य"],
        [
            ["①", "Dynamic Settlement QR Code", "Auto-generated NPCI-standard QR code encoding payee VPA, payer name, and exact settlement dues.", "सटीक राशि और पाने वाले की UPI ID के साथ अपने-आप बना हुआ क्यूआर कोड।"],
            ["②", "Verified Payee VPA & Fast Copy", "Displays payee UPI address with 1-click copy to clipboard.", "पाने वाले की सत्यापित UPI ID और 1-क्लिक कॉपी बटन।"],
            ["③", "'Pay via UPI' & Expand Modal", "One-tap trigger launching native UPI intent on desktop or smartphone, plus fullscreen QR expander.", "सीधे पेमेंट ऐप खोलने का बटन और क्यूआर कोड को बड़ा (फुलस्क्रीन) करने का विकल्प।"],
            ["④", "Record Settlement Audit CTA", "Records payment in ledger, balance reconciles to zero for both members.", "भुगतान को बहीखाते में दर्ज करने वाला 'Record Settlement' बटन।"]
        ],
        is_mobile=False
    )

    add_h3("Mobile Dynamic UPI Settlement View", "मोबाइल यूपीआई भुगतान दृश्य", is_mobile=True)
    add_annotated_image("annotated_mobile_screenshots/18_splitter_settlement_qr.png", "Figure 36: Mobile Dynamic Settlement QR Sheet (मोबाइल यूपीआई भुगतान)", width=Inches(3.1))
    add_callout_table(
        ["Badge", "Mobile Component", "English Description & Touch Action", "हिंदी विवरण एवं टच क्रिया"],
        [
            ["①", "High-Contrast Mobile QR", "Crisp vector QR code for in-person scanning across phones.", "दूसरे फोन से आसानी से स्कैन होने वाला उच्च-कंट्रास्ट क्यूआर कोड।"],
            ["②", "Payee VPA & Touch Copy", "Touch to copy UPI ID to clipboard.", "टच करके यूपीआई आईडी कॉपी करें।"],
            ["③", "1-Tap 'Pay via UPI' Button", "Opens PhonePe, Google Pay, Paytm, or BHIM instantly on device.", "फोन में मौजूद PhonePe/GPay/Paytm तुरंत खोलने वाला 1-टैप बटन।"],
            ["④", "Record Settlement Button", "Tap to mark debt as paid and zero out balances.", "भुगतान पूर्ण दर्ज करने वाला बटन।"]
        ],
        is_mobile=True
    )

    # -------------------------------------------------------------------------
    # 8.8 REPORTS & DISPATCHES
    # -------------------------------------------------------------------------
    add_h2("8.8 Branded PDF Settlement Reports & Automated Dispatches", "8.8 ब्रांडेड पीडीएफ रिपोर्ट, ईमेल एवं व्हाट्सएप सारांश")
    add_p(
        "CapFlow ensures complete transparency by providing instant multi-channel reporting:",
        "हिसाब में पूर्ण पारदर्शिता बनाए रखने के लिए CapFlow कई माध्यमों से रिपोर्ट साझा करने की सुविधा देता है:"
    )
    add_bullet("Branded Official PDF", "Generates a clean, professional PDF document featuring the CapFlow logo, trip dates, itemized expense breakdown, category charts, and final settlement receipts.", "आधिकारिक पीडीएफ रिपोर्ट: CapFlow लोगो, खर्चों की विस्तृत सूची, श्रेणीवार ग्राफ और अंतिम भुगतान रसीद सहित उच्च कोटि की पीडीएफ फाइल तैयार करता है।")
    add_bullet("Automated Email Reports", "Tapping 'Email Report to Members' dispatches the full settlement ledger to all registered participant email addresses simultaneously.", "ईमेल रिपोर्ट: एक क्लिक में ग्रुप के सभी सदस्यों के ईमेल पर संपूर्ण हिसाब की विस्तृत रिपोर्ट भेज दी जाती है।")
    add_bullet("Pre-Formatted WhatsApp Summaries", "Tapping 'Share via WhatsApp' formats a clean, human-readable text message (with emojis and bullet points) ready to send to your group chat.", "व्हाट्सएप सारांश: एक क्लिक में सुंदर और स्पष्ट संदेश (बुलेट पॉइंट्स सहित) तैयार होकर व्हाट्सएप ग्रुप में भेजने के लिए खुल जाता है।")

    # -------------------------------------------------------------------------
    # 8.9 LOCK & SETTLE
    # -------------------------------------------------------------------------
    add_h2("8.9 Lock & Settle Finalization", "8.9 ग्रुप लॉक एवं अंतिम निपटान (Lock & Settle)")
    add_p(
        "Once all debts have been resolved, session administrators can toggle the 'Lock Session' switch. "
        "Locking a session archives all records into read-only mode, preventing accidental edits, additions, or deletions while keeping the historical audit trail intact forever.",
        "जब सभी सदस्यों का हिसाब चुकता हो जाता है, तो एडमिन 'Lock Session' बटन दबाकर ग्रुप को सुरक्षित लॉक कर सकता है। इससे कोई भी व्यक्ति बाद में छेड़छाड़ या नया खर्च नहीं जोड़ सकता, और पूरा रिकॉर्ड हमेशा के लिए सुरक्षित रहता है।"
    )

    print("Chapter 8 (Splitter Subsystem) updated with Family Mode & Settlement QR!")
