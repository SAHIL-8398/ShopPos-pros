import React, { createContext, useContext, ReactNode } from 'react';

export type Language = 'English' | 'Hindi' | 'Marathi' | 'Tamil';

export interface TranslationDictionary {
  [key: string]: string;
}

export interface LanguagePack {
  [lang: string]: TranslationDictionary;
}

export const languagePacks: LanguagePack = {
  English: {
    // Nav Tabs
    dashboard: "Dashboard",
    billing: "POS Billing",
    inventory: "Products & Stock",
    customers: "Customers",
    documents: "Documents",
    reports: "Reports & Analytics",
    settings: "Settings",

    // Dashboard View
    dashboard_title: "Store Command Station",
    dashboard_subtitle: "Real-time register parameters, operator sales ledger, and active low stock alerts",
    sales_summary: "Sales Summary",
    purchase_summary: "Purchase Summary",
    outstanding: "Outstanding Due",
    expenses: "Expenses",
    profit: "Net Profit",
    stock_value: "Stock Valuation",
    recent_sales: "Recent Transaction Ledger",
    staff_personnel: "Active Cashiers",
    popular_products: "Fast Moving Products",
    alerts: "Low Stock Alerts",
    checkout: "Checkout",
    cashier: "Cashier",
    bill_no: "Bill No",
    items: "items",
    total: "Total",
    profit_label: "Profit",
    payment: "Payment",
    status: "Status",
    low_stock_warning: "Warning: Low Stock",
    stock_out: "Stock Out",
    days_to_stockout: "{0} days to stockout",

    // POS Billing View
    billing_title: "Store Checkout Register",
    billing_subtitle: "Scan barcodes, add items to cart, select loyal clients, and issue tax receipts",
    search_placeholder: "Scan barcode or search by name / SKU / category...",
    hold_bill: "Hold Bill",
    resume_bill: "Resume Bill ({0})",
    no_held_bills: "No active held bills",
    cart_empty: "Register Checkout Cart is empty",
    add_items_instruction: "Scan or search items to start billing checkout",
    customer_details: "Customer & Credit Details",
    customer_phone: "Customer Phone",
    customer_address: "Customer Address",
    estimate_quotation: "Quote Estimate",
    delivery_challan: "Delivery Challan",
    proceed_to_payment: "Proceed to Payment Checkout",
    applied_coupon: "Applied coupon discount",

    // Inventory View
    inventory_title: "Stock Control Base",
    inventory_subtitle: "Register products, organize variants, track shelf locations, and manage batch codes",
    add_new_product: "Register New Product",
    search_products: "Search products base...",
    filter_all: "All Categories",
    product_name: "Product Name",
    barcode_label: "Barcode",
    category_label: "Category",
    stock_label: "Stock Quantity",
    sell_price_label: "Selling Price",
    buy_price_label: "Purchase Price",
    mrp_label: "MRP",
    shelf_location: "Shelf Rack",
    actions: "Actions",

    // Customers View
    customers_title: "Loyalty & CRM Desk",
    customers_subtitle: "Manage customer profiles, loyalty tier program, and historic outstanding balance sheets",
    add_new_customer: "Register Client Profile",
    search_customers: "Search customer ledger...",
    phone_label: "Phone",
    email_label: "Email",
    address_label: "Address",
    loyalty_points: "Loyalty Points",
    customer_ledger: "Outstanding Credit Ledger",

    // Reports View
    reports_title: "Financial Auditing Station",
    reports_subtitle: "Compile GST tax invoices, review daily cash flows, and trace operating expenses",
    net_sales_chart: "Daily Net Sales Volume",
    expense_breakdown: "Operating Expense Categories",
    profit_loss_summary: "Profit & Loss Account",
    gross_revenue: "Gross Sales Revenue",
    total_cost: "Cost of Goods Sold (COGS)",
    net_operating_profit: "Net Operating Profit",
    download_excel: "Export Excel (CSV)",
    print_report: "Print Financial Report",

    // Settings View
    settings_title: "System Control Station",
    settings_subtitle: "Configure register limits, operator authentication credentials, and database utilities",
    store_profile: "Store Profile",
    tools_modules: "Tools & Modules",
    security_keys: "Security Keys",
    database_utils: "Database Utilities",
    trade_name: "Trade / Shop Name",
    system_language: "System Language",
    currency_symbol: "Currency Symbol",
    financial_year_label: "Financial Year",
    enable_gst: "Enable GST Taxes",
    parameters_saved: "Parameters Saved",

    // General / Miscellaneous
    search: "Search",
    cancel: "Cancel",
    save: "Save",
    edit: "Edit",
    delete: "Delete",
    success: "Success",
    error: "Error",
    loading: "Loading",
  },
  Hindi: {
    // Nav Tabs
    dashboard: "डैशबोर्ड",
    billing: "पीओएस बिलिंग",
    inventory: "उत्पाद और स्टॉक",
    customers: "ग्राहक सूची",
    documents: "दस्तावेज़",
    reports: "रिपोर्ट और विश्लेषण",
    settings: "सिस्टम सेटिंग्स",

    // Dashboard View
    dashboard_title: "स्टोर कमांड स्टेशन",
    dashboard_subtitle: "वास्तविक समय के रजिस्टर मापदंड, ऑपरेटर बिक्री बहीखाता, और कम स्टॉक चेतावनी",
    sales_summary: "कुल बिक्री",
    purchase_summary: "कुल खरीद",
    outstanding: "बकाया राशि",
    expenses: "कुल खर्च",
    profit: "शुद्ध लाभ",
    stock_value: "स्टॉक मूल्यांकन",
    recent_sales: "हालिया लेन-देन",
    staff_personnel: "सक्रिय कैशियर",
    popular_products: "लोकप्रिय उत्पाद",
    alerts: "कम स्टॉक चेतावनी",
    checkout: "चेकआउट",
    cashier: "कैशियर",
    bill_no: "बिल संख्या",
    items: "उत्पाद",
    total: "कुल",
    profit_label: "लाभ",
    payment: "भुगतान",
    status: "स्थिति",
    low_stock_warning: "चेतावनी: कम स्टॉक",
    stock_out: "स्टॉक समाप्त",
    days_to_stockout: "{0} दिनों में स्टॉक आउट",

    // POS Billing View
    billing_title: "स्टोर चेकआउट रजिस्टर",
    billing_subtitle: "बारकोड स्कैन करें, कार्ट में आइटम जोड़ें, वफादार ग्राहकों का चयन करें, और कर रसीदें जारी करें",
    search_placeholder: "बारकोड स्कैन करें या नाम / SKU / श्रेणी द्वारा खोजें...",
    hold_bill: "बिल होल्ड करें",
    resume_bill: "बिल फिर से शुरू करें ({0})",
    no_held_bills: "कोई सक्रिय होल्ड बिल नहीं है",
    cart_empty: "रजिस्टर चेकआउट कार्ट खाली है",
    add_items_instruction: "बिलिंग चेकआउट शुरू करने के लिए स्कैन करें या खोजें",
    customer_details: "ग्राहक और क्रेडिट विवरण",
    customer_phone: "ग्राहक फोन",
    customer_address: "ग्राहक का पता",
    estimate_quotation: "अनुमानित उद्धरण",
    delivery_challan: "डिलिवरी चालान",
    proceed_to_payment: "भुगतान चेकआउट के लिए आगे बढ़ें",
    applied_coupon: "लागू कूपन छूट",

    // Inventory View
    inventory_title: "स्टॉक नियंत्रण आधार",
    inventory_subtitle: "उत्पादों को पंजीकृत करें, वेरिएंट व्यवस्थित करें, शेल्फ स्थानों को ट्रैक करें, और बैच कोड प्रबंधित करें",
    add_new_product: "नया उत्पाद पंजीकृत करें",
    search_products: "उत्पाद आधार खोजें...",
    filter_all: "सभी श्रेणियां",
    product_name: "उत्पाद का नाम",
    barcode_label: "बारकोड",
    category_label: "श्रेणी",
    stock_label: "स्टॉक मात्रा",
    sell_price_label: "बिक्री मूल्य",
    buy_price_label: "खरीद मूल्य",
    mrp_label: "एमआरपी",
    shelf_location: "शेल्फ रैक",
    actions: "कार्रवाई",

    // Customers View
    customers_title: "लॉयल्टी और ग्राहक डेस्क",
    customers_subtitle: "ग्राहक प्रोफाइल, लॉयल्टी टियर कार्यक्रम, और ऐतिहासिक बकाया बैलेंस शीट प्रबंधित करें",
    add_new_customer: "ग्राहक प्रोफ़ाइल पंजीकृत करें",
    search_customers: "ग्राहक बहीखाता खोजें...",
    phone_label: "फ़ोन",
    email_label: "ईमेल",
    address_label: "पता",
    loyalty_points: "लॉयल्टी अंक",
    customer_ledger: "बकाया क्रेडिट बहीखाता",

    // Reports View
    reports_title: "वित्तीय लेखा परीक्षा स्टेशन",
    reports_subtitle: "जीएसटी कर चालान संकलित करें, दैनिक नकद प्रवाह की समीक्षा करें, और परिचालन व्यय का पता लगाएं",
    net_sales_chart: "दैनिक शुद्ध बिक्री मात्रा",
    expense_breakdown: "परिचालन व्यय श्रेणियां",
    profit_loss_summary: "लाभ और हानि खाता",
    gross_revenue: "सकल बिक्री राजस्व",
    total_cost: "बेचे गए माल की लागत (COGS)",
    net_operating_profit: "शुद्ध परिचालन लाभ",
    download_excel: "एक्सेल निर्यात (CSV)",
    print_report: "वित्तीय रिपोर्ट प्रिंट करें",

    // Settings View
    settings_title: "सिस्टम नियंत्रण स्टेशन",
    settings_subtitle: "रजिस्टर सीमाएं, ऑपरेटर प्रमाणीकरण क्रेडेंशियल, और डेटाबेस उपयोगिताओं को कॉन्फ़िगर करें",
    store_profile: "स्टोर प्रोफाइल",
    tools_modules: "उपकरण और मॉड्यूल",
    security_keys: "सुरक्षा कुंजियाँ",
    database_utils: "डेटाबेस उपयोगिताएँ",
    trade_name: "व्यापार / दुकान का नाम",
    system_language: "सिस्टम की भाषा",
    currency_symbol: "मुद्रा प्रतीक",
    financial_year_label: "वित्तीय वर्ष",
    enable_gst: "जीएसटी कर सक्षम करें",
    parameters_saved: "मापदंड सुरक्षित किये गए",

    // General / Miscellaneous
    search: "खोजें",
    cancel: "रद्द करें",
    save: "सुरक्षित करें",
    edit: "संपादित करें",
    delete: "हटाएं",
    success: "सफलता",
    error: "त्रुटि",
    loading: "लोड हो रहा है...",
  },
  Marathi: {
    // Nav Tabs
    dashboard: "डॅशबोर्ड",
    billing: "पीओएस बिलिंग",
    inventory: "उत्पादने आणि स्टॉक",
    customers: "ग्राहक",
    documents: "दस्तऐवज",
    reports: "अहवाल आणि विश्लेषण",
    settings: "सेटिंग्ज",

    // Dashboard View
    dashboard_title: "स्टोअर कमांड स्टेशन",
    dashboard_subtitle: "रिअल-टाइम रजिस्टर पॅरामीटर्स, ऑपरेटर विक्री लेजर आणि कमी स्टॉक अलर्ट",
    sales_summary: "आजची एकूण विक्री",
    purchase_summary: "एकूण खरेदी",
    outstanding: "थकीत रक्कम",
    expenses: "खर्च",
    profit: "निव्वळ नफा",
    stock_value: "स्टॉक मूल्यमापन",
    recent_sales: "अलीकडील व्यवहार लेजर",
    staff_personnel: "सक्रिय कॅशियर",
    popular_products: "वेगाने विकणारी उत्पादने",
    alerts: "कमी स्टॉक अलर्ट",
    checkout: "चेकआऊट",
    cashier: "कॅशियर",
    bill_no: "बिल क्र.",
    items: "वस्तू",
    total: "एकूण",
    profit_label: "नफा",
    payment: "पेमेंट",
    status: "स्थिती",
    low_stock_warning: "चेतावणी: कमी स्टॉक",
    stock_out: "स्टॉक संपला",
    days_to_stockout: "{0} दिवसांत स्टॉक आउट होईल",

    // POS Billing View
    billing_title: "स्टोअर चेकआउट रजिस्टर",
    billing_subtitle: "बारकोड स्कॅन करा, कार्टमध्ये वस्तू जोडा, ग्राहक निवडा आणि कर पावती जारी करा",
    search_placeholder: "बारकोड स्कॅन करा किंवा नावाने / SKU / श्रेणीने शोधा...",
    hold_bill: "बिल राखून ठेवा (Hold)",
    resume_bill: "बिल पुन्हा सुरू करा ({0})",
    no_held_bills: "कोणतेही राखून ठेवलेले बिल नाही",
    cart_empty: "रजिस्टर चेकआउट कार्ट रिकामी आहे",
    add_items_instruction: "बिलिंग सुरू करण्यासाठी वस्तू स्कॅन किंवा सर्च करा",
    customer_details: "ग्राहक आणि क्रेडिट तपशील",
    customer_phone: "ग्राहक फोन",
    customer_address: "ग्राहकाचा पत्ता",
    estimate_quotation: "अंदाजे कोटेशन",
    delivery_challan: "डिलिव्हरी चलन",
    proceed_to_payment: "पेमेंट चेकआउटसाठी पुढे जा",
    applied_coupon: "लागू केलेली कूपन सवलत",

    // Inventory View
    inventory_title: "स्टॉक नियंत्रण केंद्र",
    inventory_subtitle: "उत्पादने नोंदवा, प्रकार व्यवस्थित करा, शेल्फचे स्थान ट्रॅक करा आणि बॅच कोड व्यवस्थापित करा",
    add_new_product: "नवीन उत्पादन नोंदवा",
    search_products: "उत्पादनांमध्ये शोधा...",
    filter_all: "सर्व श्रेणी",
    product_name: "उत्पादनाचे नाव",
    barcode_label: "बारकोड",
    category_label: "श्रेणी",
    stock_label: "स्टॉक प्रमाण",
    sell_price_label: "विक्री किंमत",
    buy_price_label: "खरेदी किंमत",
    mrp_label: "एमआरपी",
    shelf_location: "शेल्फ रॅक",
    actions: "कृती",

    // Customers View
    customers_title: "लॉयल्टी आणि ग्राहक डेस्क",
    customers_subtitle: "ग्राहक प्रोफाइल, लॉयल्टी प्रोग्राम आणि ऐतिहासिक थकीत ताळेबंद व्यवस्थापित करा",
    add_new_customer: "ग्राहक प्रोफाइल नोंदवा",
    search_customers: "ग्राहकांमध्ये शोधा...",
    phone_label: "फोन",
    email_label: "ईमेल",
    address_label: "पत्ता",
    loyalty_points: "लॉयल्टी पॉईंट्स",
    customer_ledger: "थकीत क्रेडिट लेजर",

    // Reports View
    reports_title: "वित्तीय लेखापरीक्षण स्टेशन",
    reports_subtitle: "जीएसटी कर इनव्हॉइस संकलित करा, दैनंदिन रोख प्रवाह तपासा आणि खर्च ट्रॅक करा",
    net_sales_chart: "दैनंदिन निव्वळ विक्री प्रमाण",
    expense_breakdown: "परिचालन खर्च श्रेणी",
    profit_loss_summary: "नफा आणि तोटा पत्रक",
    gross_revenue: "एकूण विक्री महसूल",
    total_cost: "विकलेल्या मालाची किंमत (COGS)",
    net_operating_profit: "निव्वळ परिचालन नफा",
    download_excel: "एक्सेल निर्यात (CSV)",
    print_report: "वित्तीय अहवाल प्रिंट करा",

    // Settings View
    settings_title: "सिस्टम नियंत्रण स्टेशन",
    settings_subtitle: "रजिस्टर मर्यादा, ऑपरेटर क्रेडेंशियल्स आणि डेटाबेस कॉन्फिगर करा",
    store_profile: "स्टोअर प्रोफाइल",
    tools_modules: "साधने आणि मॉड्यूल्स",
    security_keys: "सुरक्षा की",
    database_utils: "डेटाबेस युटिलिटीज",
    trade_name: "व्यापार / दुकानाचे नाव",
    system_language: "सिस्टम भाषा",
    currency_symbol: "चलन चिन्ह",
    financial_year_label: "आर्थिक वर्ष",
    enable_gst: "जीएसटी कर सक्षम करा",
    parameters_saved: "पॅरामीटर्स सेव्ह केले",

    // General / Miscellaneous
    search: "शोधा",
    cancel: "रद्द करा",
    save: "सेव्ह करा",
    edit: "संपादन करा",
    delete: "हटवा",
    success: "यशस्वी",
    error: "त्रुटी",
    loading: "लोड होत आहे...",
  },
  Tamil: {
    // Nav Tabs
    dashboard: "டாஷ்போர்டு",
    billing: "பிஓஎஸ் பில்லிங்",
    inventory: "தயாரிப்புகள் & பங்கு",
    customers: "வாடிக்கையாளர்கள்",
    documents: "ஆவணங்கள்",
    reports: "அறிக்கைகள் & பகுப்பாய்வு",
    settings: "அமைப்புகள்",

    // Dashboard View
    dashboard_title: "கடை கட்டுப்பாட்டு நிலையம்",
    dashboard_subtitle: "நிகழ்நேர பதிவேடு அளவுருக்கள், காசாளர் விற்பனை கணக்குகள் மற்றும் குறைந்த இருப்பு எச்சரிக்கைகள்",
    sales_summary: "விற்பனை சுருக்கம்",
    purchase_summary: "கொள்முதல் சுருக்கம்",
    outstanding: "நிலுவைத் தொகை",
    expenses: "செலவுகள்",
    profit: "நிகர லாபம்",
    stock_value: "பங்கு மதிப்பு",
    recent_sales: "சமீபத்திய பரிவர்த்தனை கணக்கு",
    staff_personnel: "செயலில் உள்ள காசாளர்கள்",
    popular_products: "பிரபலமான தயாரிப்புகள்",
    alerts: "குறைந்த பங்கு எச்சரிக்கைகள்",
    checkout: "செக்அவுட்",
    cashier: "காசாளர்",
    bill_no: "பில் எண்",
    items: "பொருட்கள்",
    total: "மொத்தம்",
    profit_label: "லாபம்",
    payment: "பணம் செலுத்துதல்",
    status: "நிலை",
    low_stock_warning: "எச்சரிக்கை: குறைந்த இருப்பு",
    stock_out: "இருப்பு இல்லை",
    days_to_stockout: "{0} நாட்களில் இருப்பு தீரும்",

    // POS Billing View
    billing_title: "செக்அவுட் பில்லிங்",
    billing_subtitle: "பார்கோடுகளை ஸ்கேன் செய்து, கார்டில் தயாரிப்புகளைச் சேர்த்து, வாடிக்கையாளர்களைத் தேர்ந்தெடுத்து பில்களை உருவாக்கவும்",
    search_placeholder: "பார்கோடு ஸ்கேன் செய்யவும் அல்லது பெயர் / SKU / வகையின் மூலம் தேடவும்...",
    hold_bill: "பில் ஹோல்ட் செய்க",
    resume_bill: "பில் தொடர்க ({0})",
    no_held_bills: "ஹோல்ட் செய்யப்பட்ட பில்கள் இல்லை",
    cart_empty: "கார்ட் காலியாக உள்ளது",
    add_items_instruction: "பில்லிங் செய்ய பார்கோடு ஸ்கேன் அல்லது பொருளைத் தேடவும்",
    customer_details: "வாடிக்கையாளர் & கடன் விவரங்கள்",
    customer_phone: "தொலைபேசி எண்",
    customer_address: "முகவரி",
    estimate_quotation: "விலை மதிப்பீடு",
    delivery_challan: "டெலிவரி சலான்",
    proceed_to_payment: "பணம் செலுத்தும் முறைக்குச் செல்லவும்",
    applied_coupon: "கூப்பன் தள்ளுபடி பயன்படுத்தப்பட்டது",

    // Inventory View
    inventory_title: "பங்கு மேலாண்மை",
    inventory_subtitle: "தயாரிப்புகளைப் பதிவு செய்யவும், வகைகளை ஒழுங்கமைக்கவும் மற்றும் இருப்பு நிலைகளைக் கண்காணிக்கவும்",
    add_new_product: "புதிய தயாரிப்பு பதிவு",
    search_products: "தயாரிப்பு தேடல்...",
    filter_all: "அனைத்து பிரிவுகளும்",
    product_name: "பெயர்",
    barcode_label: "பார்கோடு",
    category_label: "வகை",
    stock_label: "பங்கு அளவு",
    sell_price_label: "விற்பனை விலை",
    buy_price_label: "கொள்முதல் விலை",
    mrp_label: "எம்ஆர்பி",
    shelf_location: "அடுக்கு இடம்",
    actions: "செயல்கள்",

    // Customers View
    customers_title: "வாடிக்கையாளர் மேலாண்மை",
    customers_subtitle: "வாடிக்கையாளர் சுயவிவரங்கள், விசுவாச புள்ளிகள் மற்றும் நிலுவைக் கணக்குகளை நிர்வகிக்கவும்",
    add_new_customer: "புதிய வாடிக்கையாளர் பதிவு",
    search_customers: "வாடிக்கையாளர் தேடல்...",
    phone_label: "தொலைபேசி",
    email_label: "மின்னஞ்சல்",
    address_label: "முகவரி",
    loyalty_points: "விசுவாச புள்ளிகள்",
    customer_ledger: "நிலுவைக் கடன் கணக்கு",

    // Reports View
    reports_title: "நிதி தணிக்கை நிலையம்",
    reports_subtitle: "ஜிஎஸ்டி வரிகளைத் தொகுக்கவும், தினசரி பணப்புழக்கத்தை மதிப்பாய்வு செய்யவும் மற்றும் செலவுகளைக் கண்காணிக்கவும்",
    net_sales_chart: "தினசரி நிகர விற்பனை அளவு",
    expense_breakdown: "செலவு வகைகள்",
    profit_loss_summary: "லாப நஷ்ட கணக்கு",
    gross_revenue: "மொத்த விற்பனை வருவாய்",
    total_cost: "விற்பனை செய்யப்பட்ட பொருட்களின் அடக்கவிலை (COGS)",
    net_operating_profit: "நிகர இயக்க லாபம்",
    download_excel: "எக்செல் ஏற்றுமதி (CSV)",
    print_report: "நிதி அறிக்கையை அச்சிடு",

    // Settings View
    settings_title: "கணினி கட்டுப்பாட்டு மையம்",
    settings_subtitle: "கடைக் கணக்குகள், காசாளர் குறியீடுகள் மற்றும் தரவுத்தள பயன்பாடுகளை நிர்வகிக்கவும்",
    store_profile: "கடை சுயவிவரம்",
    tools_modules: "கருவிகள் & தொகுதிகள்",
    security_keys: "பாதுகாப்பு விசைகள்",
    database_utils: "தரவுத்தள பயன்பாடுகள்",
    trade_name: "கடையின் பெயர்",
    system_language: "மொழி",
    currency_symbol: "நாணய குறியீடு",
    financial_year_label: "நிதியாண்டு",
    enable_gst: "ஜிஎஸ்டி வரி செயல்படுத்து",
    parameters_saved: "அளவுருக்கள் சேமிக்கப்பட்டன",

    // General / Miscellaneous
    search: "தேடு",
    cancel: "ரத்து செய்",
    save: "சேமி",
    edit: "திருத்து",
    delete: "நீக்கு",
    success: "வெற்றி",
    error: "பிழை",
    loading: "ஏற்றப்படுகிறது...",
  }
};

interface LocalizationContextType {
  language: Language;
  t: (key: string, ...args: (string | number)[]) => string;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export function LocalizationProvider({ children, activeLanguage = 'English' }: { children: ReactNode; activeLanguage?: string }) {
  const language = (activeLanguage === 'Hindi' || activeLanguage === 'Marathi' || activeLanguage === 'Tamil') 
    ? activeLanguage as Language 
    : 'English';

  const t = (key: string, ...args: (string | number)[]): string => {
    const dictionary = languagePacks[language] || languagePacks['English'];
    let translated = dictionary[key] || languagePacks['English'][key] || key;
    
    // Process variables like {0}, {1}
    args.forEach((val, idx) => {
      translated = translated.replace(`{${idx}}`, String(val));
    });

    return translated;
  };

  return (
    <LocalizationContext.Provider value={{ language, t }}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LocalizationProvider');
  }
  return context;
}
