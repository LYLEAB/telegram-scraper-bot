import os
import re
import json
import requests
import gspread
from flask import Flask, request, jsonify
from oauth2client.service_account import ServiceAccountCredentials

app = Flask(__name__)

# --- CONFIGURATION ---
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_TOKEN')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID')
SHEET_NAME = "Promotion Program via Form" 

# Setup Google Sheets
scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
creds_dict = json.loads(os.environ.get('GOOGLE_CREDS_JSON'))
creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
client = gspread.authorize(creds)
sheet = client.open(SHEET_NAME).sheet1

def send_telegram_with_photo(message, photo_url):
    # If there is a photo, send the photo with the message as a caption
    if photo_url and photo_url.startswith('http'):
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
        payload = {"chat_id": TELEGRAM_CHAT_ID, "photo": photo_url, "caption": message, "parse_mode": "Markdown"}
    else:
        # If no photo, just send text
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}
    
    requests.post(url, json=payload)

@app.route('/kobo-webhook', methods=['POST'])
def handle_webhook():
    data = request.json
    if not data:
        return jsonify({"error": "No data received"}), 400

    kobo_id = str(data.get('_id'))

    # 1. Capture Data (Using .get to avoid crashes)
    # Use .upper() to ensure CA8 and R8 are always capital
    brand = str(data.get('brand', 'Unknown Brand')).upper()
    region = str(data.get('region', 'N/A')).upper()
    dealer = str(data.get('dealer_select', data.get('dealer', 'N/A'))).upper()
    scheme_raw = data.get('scheme', '0+0+0')
    price_base = data.get('price_base', 0)
    note = data.get('note', 'No Remark')
    type_val = data.get('type', 'N/A')
    channel = data.get('channel', 'N/A')
    date_val = data.get('start', '')[:10]
    
    # Image logic (Kobo saves images in _attachments)
    attachments = data.get('_attachments', [])
    photo_url = attachments[0].get('download_url') if attachments else None

    # 2. Calculation
    scheme_parts = scheme_raw.split('+')
    s_val = float(scheme_parts[0]) if len(scheme_parts) > 0 and scheme_parts[0].isdigit() else 0
    f_prod = float(scheme_parts[1]) if len(scheme_parts) > 1 and scheme_parts[1].isdigit() else 0
    
    try:
        net_price = round((float(price_base) * s_val) / (s_val + f_prod), 2) if (s_val + f_prod) > 0 else price_base
    except:
        net_price = price_base

    # 3. Telegram Message Construction
    telegram_msg = f"""
🌟 **New Promotion of {brand}**
**Region:** {region}
**Dealer:** {dealer}
**Date:** {date_val}
**Scheme:** {scheme_raw}
**Basic Price:** {price_base}$
**Net Price:** {net_price}$
**Channel:** {channel}
**Type:** {type_val}
**Note/Remark:** {note}
    """

    # 4. Google Sheets Update
    row_data = [scheme_raw, s_val, f_prod, "", price_base, note, channel, "", date_val, region, brand, "", "", "", type_val, photo_url, net_price, kobo_id]
    
    existing_ids = sheet.col_values(18)
    if kobo_id in existing_ids:
        row_index = existing_ids.index(kobo_id) + 1
        sheet.update(f'A{row_index}:R{row_index}', [row_data])
    else:
        sheet.append_row(row_data)

    # 5. Send to Telegram
    send_telegram_with_photo(telegram_msg, photo_url)

    return jsonify({"status": "success"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
