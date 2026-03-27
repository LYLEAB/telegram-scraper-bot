# scraperBot_firebase.py

from telethon import TelegramClient, events
from datetime import datetime
import re
import os
import json
import firebase_admin
from firebase_admin import credentials, db
from flask import Flask
from threading import Thread

# =========================
# 🔑 TELEGRAM CONFIG
# =========================
# Checks Replit Secrets first, then falls back to hardcoded for local testing
api_id_env = os.getenv("API_ID")
api_id = int(api_id_env) if api_id_env else 38428766 

api_hash = os.getenv("API_HASH") or 'b22851c1a46e029f4bb51e9c3105dc10'
TARGET_GROUP_ID = -5265593385

client = TelegramClient('session', api_id, api_hash)

# =========================
# ☁️ FIREBASE CONFIG
# =========================
firebase_secret = os.getenv("FIREBASE_CREDS")

if firebase_secret:
    # --- RUNNING ON REPLIT (Uses Secret) ---
    creds_dict = json.loads(firebase_secret)
    cred = credentials.Certificate(creds_dict)
else:
    # --- RUNNING ON PC (Uses local file) ---
    # Make sure your file is named exactly this in your folder
    cred = credentials.Certificate("firebase_creds.json")

DATABASE_URL = "https://telegram-scraper-bot-3c1a5-default-rtdb.asia-southeast1.firebasedatabase.app/"

firebase_admin.initialize_app(cred, {
    'databaseURL': DATABASE_URL
})

root_ref = db.reference('telegram_promotions')

# =========================
# 🔹 KEEP ALIVE CONFIG
# =========================
app = Flask('')

@app.route('/')
def home():
    return "Bot is running!"

def run():
    app.run(host='0.0.0.0', port=8080)

def keep_alive():
    t = Thread(target=run)
    t.daemon = True # Allows thread to exit when main script exits
    t.start()

keep_alive()

# =========================
# 🧠 FUNCTIONS (Parsing Logic)
# =========================
def parse_message(text):
    data = {}
    for line in text.split("\n"):
        if ":" in line:
            key, value = line.split(":", 1)
            data[key.strip().lower()] = value.strip()
    return data

def parse_promotion(promo):
    scheme, free_product, posm = "", "", ""
    parts = promo.split("+")
    if len(parts) >= 1:
        match = re.findall(r'\d+', parts[0])
        scheme = match[0] if match else ""
    if len(parts) >= 2:
        match = re.findall(r'\d+', parts[1])
        free_product = match[0] if match else ""
    if len(parts) >= 3:
        posm = parts[2]
    return scheme, free_product, posm

def get_week(date):
    day = date.day
    if day <= 7: return "Week 1"
    elif day <= 14: return "Week 2"
    elif day <= 21: return "Week 3"
    elif day <= 28: return "Week 4"
    else: return "Week 5"

def clean_price(price_text):
    if not price_text: return ""
    match = re.findall(r"\d+\.?\d*", price_text)
    return match[0] if match else ""

# =========================
# 🤖 TELEGRAM LISTENER
# =========================
@client.on(events.NewMessage(chats=TARGET_GROUP_ID))
async def handler(event):
    text = event.message.text
    if not text or "Brand:" not in text:
        return

    data = parse_message(text)
    if "brand" not in data or "category" not in data:
        print("❌ Missing required fields")
        return

    scheme, free_product, posm = parse_promotion(data.get("promotion", ""))
    price = clean_price(data.get("price", ""))
    msg_date = event.message.date
    date_only = msg_date.strftime("%d/%m/%Y")
    week = get_week(msg_date)
    sender = event.sender_id

    try:
        new_entry_ref = root_ref.push({
            "date": date_only,
            "brand": data.get("brand", ""),
            "category": data.get("category", ""),
            "region": data.get("region", ""),
            "packaging": data.get("packaging", ""),
            "promotion": data.get("promotion", ""),
            "scheme": scheme,
            "free_product": free_product,
            "posm": posm,
            "price": price,
            "channel": data.get("channel", ""),
            "function": data.get("function", ""),
            "others": data.get("others", ""),
            "type": data.get("type", ""),
            "week": week,
            "sender_id": sender
        })
        print(f"✅ Saved to Firebase! ID: {new_entry_ref.key}")
    except Exception as e:
        print("❌ Firebase Error:", e)

# =========================
# ▶️ RUN CLIENT
# =========================

print("🚀 Bot is starting...")
client.start()

client.run_until_disconnected()