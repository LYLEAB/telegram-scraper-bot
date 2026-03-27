from telethon import TelegramClient, events
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
import re

# =========================
# 🔑 TELEGRAM CONFIG
# =========================
api_id = '38428766'
api_hash = 'b22851c1a46e029f4bb51e9c3105dc10'

# 👉 Put your group ID here (example: -1001234567890)
TARGET_GROUP_ID = -5265593385

client = TelegramClient('session', api_id, api_hash)

# =========================
# 📊 GOOGLE SHEETS CONFIG
# =========================
scope = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]
creds = ServiceAccountCredentials.from_json_keyfile_name("creds.json", scope)
gc = gspread.authorize(creds)

sheet = gc.open("Telegram_Test").sheet1

# =========================
# 🧠 FUNCTIONS
# =========================

def parse_message(text):
    data = {}
    for line in text.split("\n"):
        if ":" in line:
            key, value = line.split(":", 1)
            data[key.strip().lower()] = value.strip()
    return data


def parse_promotion(promo):
    scheme = ""
    free_product = ""
    posm = ""

    parts = promo.split("+")

    if len(parts) >= 1:
        scheme_match = re.findall(r'\d+', parts[0])
        scheme = scheme_match[0] if scheme_match else ""

    if len(parts) >= 2:
        free_match = re.findall(r'\d+', parts[1])
        free_product = free_match[0] if free_match else ""

    if len(parts) >= 3:
        posm = parts[2]

    return scheme, free_product, posm


def get_week(date):
    day = date.day

    if day <= 7:
        return "Week 1"
    elif day <= 14:
        return "Week 2"
    elif day <= 21:
        return "Week 3"
    elif day <= 28:
        return "Week 4"
    else:
        return "Week 5"


def clean_price(price_text):
    if not price_text:
        return ""
    match = re.findall(r"\d+\.?\d*", price_text)
    return match[0] if match else ""


# =========================
# 🤖 TELEGRAM LISTENER
# =========================
@client.on(events.NewMessage(chats=TARGET_GROUP_ID))
async def handler(event):
    text = event.message.text

    # ✅ Only process structured messages
    if not text or "Brand:" not in text:
        return

    data = parse_message(text)

    # ✅ Validate required fields
    if "brand" not in data or "category" not in data:
        print("❌ Missing required fields")
        return

    # 🔄 Process promotion
    scheme, free_product, posm = parse_promotion(data.get("promotion", ""))

    # 🧹 Clean price
    price = clean_price(data.get("price", ""))

    # 📅 Get date + week
    msg_date = event.message.date
    week = get_week(msg_date)

    # 👤 Sender
    sender = event.sender_id

    # =========================
    # 📥 FINAL ROW
    # =========================
    row = [
        msg_date.strftime("%d/%m/%Y %H:%M:%S"),
        data.get("brand", ""),
        data.get("category", ""),
        data.get("region", ""),
        data.get("packaging", ""),
        data.get("promotion", ""),
        scheme,
        free_product,
        posm,
        price,
        data.get("channel", ""),
        data.get("function", ""),
        data.get("others", ""),
        data.get("type", ""),
        week,
        str(sender)
    ]

    # =========================
    # ☁️ SAVE TO GOOGLE SHEETS
    # =========================
    sheet.insert_row(row, index=2)

    print("✅ Saved:", row)


# =========================
# ▶️ RUN CLIENT
# =========================
print("🚀 Bot is running...")
client.start()
client.run_until_disconnected()
