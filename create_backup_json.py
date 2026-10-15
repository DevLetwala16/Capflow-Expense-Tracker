import json
from datetime import datetime, timedelta

now = datetime.now()
cur_month = now.strftime("%Y-%m")
y = now.year
m = now.strftime("%m")

def get_day(days_ago):
    return (now - timedelta(days=days_ago)).strftime("%Y-%m-%d")

categories = [
    {"id": 1, "userId": "demo_user", "name": "Food & Dining", "icon": "utensils", "color": "#F97316", "type": "expense", "order": 1, "isDefault": True, "createdAt": now.isoformat()},
    {"id": 2, "userId": "demo_user", "name": "Housing & Rent", "icon": "home", "color": "#6366F1", "type": "expense", "order": 2, "isDefault": True, "createdAt": now.isoformat()},
    {"id": 3, "userId": "demo_user", "name": "Travel & Commute", "icon": "plane", "color": "#0EA5E9", "type": "expense", "order": 3, "isDefault": True, "createdAt": now.isoformat()},
    {"id": 4, "userId": "demo_user", "name": "Utilities & Bills", "icon": "zap", "color": "#F59E0B", "type": "expense", "order": 4, "isDefault": True, "createdAt": now.isoformat()},
    {"id": 5, "userId": "demo_user", "name": "Shopping & Clothes", "icon": "shopping-bag", "color": "#8B5CF6", "type": "expense", "order": 5, "isDefault": True, "createdAt": now.isoformat()},
    {"id": 6, "userId": "demo_user", "name": "Salary & Income", "icon": "wallet", "color": "#34D399", "type": "income", "order": 6, "isDefault": True, "createdAt": now.isoformat()},
    {"id": 7, "userId": "demo_user", "name": "EMI & Loans", "icon": "banknote", "color": "#EF4444", "type": "expense", "order": 7, "isDefault": True, "createdAt": now.isoformat()},
    {"id": 8, "userId": "demo_user", "name": "Healthcare & Meds", "icon": "heart-pulse", "color": "#10B981", "type": "expense", "order": 8, "isDefault": True, "createdAt": now.isoformat()},
    {"id": 9, "userId": "demo_user", "name": "Freelance & Bonus", "icon": "coins", "color": "#38BDF8", "type": "income", "order": 9, "isDefault": True, "createdAt": now.isoformat()}
]

transactions = [
    {"id": 1, "userId": "demo_user", "type": "income", "amount": 85000, "currency": "INR", "categoryId": 6, "title": "Monthly Salary Credit", "notes": "Tech Corp Oct Salary", "date": f"{y}-{m}-01", "paymentMethod": "bank_transfer", "createdAt": now.isoformat(), "updatedAt": now.isoformat()},
    {"id": 2, "userId": "demo_user", "type": "income", "amount": 15000, "currency": "INR", "categoryId": 9, "title": "Freelance UI Project", "notes": "Client milestone payout", "date": get_day(5), "paymentMethod": "bank_transfer", "createdAt": now.isoformat(), "updatedAt": now.isoformat()},
    {"id": 3, "userId": "demo_user", "type": "expense", "amount": 22000, "currency": "INR", "categoryId": 2, "title": "Apartment Monthly Rent", "notes": "2BHK flat rent transfer", "date": f"{y}-{m}-02", "paymentMethod": "bank_transfer", "createdAt": now.isoformat(), "updatedAt": now.isoformat()},
    {"id": 4, "userId": "demo_user", "type": "expense", "amount": 8500, "currency": "INR", "categoryId": 7, "title": "Car Loan EMI", "notes": "HDFC auto debit", "date": f"{y}-{m}-05", "paymentMethod": "bank_transfer", "createdAt": now.isoformat(), "updatedAt": now.isoformat()},
    {"id": 5, "userId": "demo_user", "type": "expense", "amount": 4850, "currency": "INR", "categoryId": 1, "title": "Supermarket Grocery & Food", "notes": "Provisions, dairy, fruits", "date": get_day(7), "paymentMethod": "upi", "createdAt": now.isoformat(), "updatedAt": now.isoformat()},
    {"id": 6, "userId": "demo_user", "type": "expense", "amount": 2200, "currency": "INR", "categoryId": 4, "title": "Electricity & Broadband Bill", "notes": "Torrent Power + Airtel Fiber", "date": get_day(6), "paymentMethod": "upi", "createdAt": now.isoformat(), "updatedAt": now.isoformat()},
    {"id": 7, "userId": "demo_user", "type": "expense", "amount": 1850, "currency": "INR", "categoryId": 1, "title": "Family Weekend Dinner", "notes": "Barbeque Nation buffet", "date": get_day(4), "paymentMethod": "credit_card", "createdAt": now.isoformat(), "updatedAt": now.isoformat()},
    {"id": 8, "userId": "demo_user", "type": "expense", "amount": 1400, "currency": "INR", "categoryId": 3, "title": "Fuel / Petrol Refill", "notes": "Shell Petrol Station full tank", "date": get_day(3), "paymentMethod": "upi", "createdAt": now.isoformat(), "updatedAt": now.isoformat()},
    {"id": 9, "userId": "demo_user", "type": "expense", "amount": 3200, "currency": "INR", "categoryId": 5, "title": "Winter Jacket & Apparel", "notes": "Zara seasonal shopping", "date": get_day(2), "paymentMethod": "credit_card", "createdAt": now.isoformat(), "updatedAt": now.isoformat()},
    {"id": 10, "userId": "demo_user", "type": "expense", "amount": 950, "currency": "INR", "categoryId": 8, "title": "Pharmacy & Health Vitamins", "notes": "Apollo Pharmacy supplements", "date": get_day(1), "paymentMethod": "upi", "createdAt": now.isoformat(), "updatedAt": now.isoformat()}
]

budgets = [
    {"id": 1, "userId": "demo_user", "categoryId": 1, "month": cur_month, "limit": 10000, "alertThreshold": 80, "createdAt": now.isoformat()},
    {"id": 2, "userId": "demo_user", "categoryId": 5, "month": cur_month, "limit": 6000, "alertThreshold": 80, "createdAt": now.isoformat()},
    {"id": 3, "userId": "demo_user", "categoryId": 3, "month": cur_month, "limit": 4000, "alertThreshold": 80, "createdAt": now.isoformat()},
    {"id": 4, "userId": "demo_user", "categoryId": 4, "month": cur_month, "limit": 3500, "alertThreshold": 80, "createdAt": now.isoformat()}
]

goals = [
    {"id": 1, "userId": "demo_user", "name": "Emergency Safety Fund", "targetAmount": 200000, "savedAmount": 135000, "targetDate": "2026-12-31", "icon": "shield-check", "color": "#10B981", "createdAt": now.isoformat(), "updatedAt": now.isoformat()},
    {"id": 2, "userId": "demo_user", "name": "MacBook Pro M-Series", "targetAmount": 180000, "savedAmount": 110000, "targetDate": "2027-03-31", "icon": "laptop", "color": "#6366F1", "createdAt": now.isoformat(), "updatedAt": now.isoformat()}
]

emis = [
    {"id": 1, "userId": "demo_user", "name": "Car Loan (HDFC Bank)", "totalCost": 450000, "monthlyCost": 12500, "startDate": "2025-01-05", "endDate": "2027-12-05", "dueDay": 5, "totalInstallments": 36, "paidInstallments": 14, "reminderLeadDays": 3, "emailSyncEnabled": True, "createdAt": now.isoformat(), "updatedAt": now.isoformat()},
    {"id": 2, "userId": "demo_user", "name": "Home Renovation Loan", "totalCost": 300000, "monthlyCost": 15000, "startDate": "2026-02-10", "endDate": "2027-09-10", "dueDay": 10, "totalInstallments": 20, "paidInstallments": 8, "reminderLeadDays": 3, "emailSyncEnabled": True, "createdAt": now.isoformat(), "updatedAt": now.isoformat()}
]

backup_data = {
    "version": 1,
    "userId": "demo_user",
    "userEmail": "dev.letwala@capflow.app",
    "categories": categories,
    "transactions": transactions,
    "budgets": budgets,
    "goals": goals,
    "emis": emis,
    "exportedAt": now.isoformat()
}

with open("demo_backup.json", "w", encoding="utf-8") as f:
    json.dump(backup_data, f, indent=2)

print("demo_backup.json written successfully!")
