import os
import re
import json
import requests
import gspread
from flask import Flask, request, jsonify
from datetime import datetime
from oauth2client.service_account import ServiceAccountCredentials

app = Flask(__name__)

# --- CONFIGURATION (Pulled from Railway Variables) ---
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_TOKEN')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID')
SHEET_NAME = "Promotion Program via Form" # Make sure this matches your Excel file name exactly!

# Setup Google Sheets authentication
scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
creds_dict = json.loads(os.environ.get('GOOGLE_CREDS_JSON'))
creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
client = gspread.authorize(creds)
sheet = client.open(SHEET_NAME).sheet1

def send_telegram(message):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}
    requests.post(url, json=payload)

@app.route('/kobo-webhook', methods=['POST'])
def handle_webhook():
    data = request.json
    if not data:
        return jsonify({"error": "No data received"}), 400

    kobo_id = str(data.get('_id'))

    # Format the Scheme & Data
    scheme_raw = data.get('scheme', '')
    scheme_parts = scheme_raw.split('+')
    promotion = scheme_raw
    scheme_value = scheme_parts[0] if len(scheme_parts) > 0 else ""
    free_product = scheme_parts[1] if len(scheme_parts) > 1 else ""
    posm = scheme_parts[2] if len(scheme_parts) > 2 else ""

    brand_name = data.get('brand', '')
    packaging_match = re.search(r'(Can|PET|Bottle|Draft|Glass)\s*\d+[a-zA-Z]+', brand_name, re.IGNORECASE)
    packaging = packaging_match.group(0) if packaging_match else ""

    row_data = [
        promotion, scheme_value, free_product, posm, data.get('price_base', ''), 
        data.get('note', ''), data.get('channel', ''), "", data.get('start', '')[:10], 
        data.get('region', ''), brand_name, data.get('category', ''), packaging, 
        "", data.get('type', ''), data.get('picture', ''), data.get('price_net', ''), kobo_id
    ]

    # Google Sheets Update Logic
    existing_ids = sheet.col_values(18) # Looks at Column R (Kobo ID)
    
    if kobo_id in existing_ids:
        row_index = existing_ids.index(kobo_id) + 1
        sheet.update(f'A{row_index}:R{row_index}', [row_data])
        action = "🔄 UPDATED"
    else:
        sheet.append_row(row_data)
        action = "✅ NEW"

    # Send Telegram Alert
    telegram_msg = f"""
    {action} **Promotion Report**
    👤 Dealer: {data.get('dealer_select', 'Unknown')}
    📍 Region: {data.get('region_select', 'Unknown')}
    🍺 Brand: {brand_name}
    🎁 Scheme: {promotion}
    💵 Price: ${data.get('price_base', '0')}
    """
    send_telegram(telegram_msg)

    return jsonify({"status": "success", "kobo_id": kobo_id}), 200

if __name__ == '__main__':
    # Railway provides the PORT variable, we must use it
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
