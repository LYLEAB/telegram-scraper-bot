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

    # 1. Format the Scheme & Basic Data
    scheme_raw = data.get('scheme', '')
    scheme_parts = scheme_raw.split('+')
    scheme_value = scheme_parts[0] if len(scheme_parts) > 0 else "0"
    free_product = scheme_parts[1] if len(scheme_parts) > 1 else "0"
    posm = scheme_parts[2] if len(scheme_parts) > 2 else ""

    brand_name = data.get('brand', 'Unknown Brand')
    price_base = float(data.get('price_base', 0) or 0)
    sell_out = data.get('price_net', '0') # Assuming this is your 'Sell Out Price' field

    # 2. PAP CALCULATION (Net Price)
    try:
        s_val = float(scheme_value if scheme_value.isdigit() else 0)
        f_prod = float(free_product if free_product.isdigit() else 0)
        if (s_val + f_prod) > 0:
            net_price = round((price_base * s_val) / (s_val + f_prod), 2)
        else:
            net_price = price_base
    except:
        net_price = price_base

    # 3. Create Google Maps Link
    gps = data.get('_geolocation', [0, 0])
    location_link = f"https://www.google.com/maps?q={gps[0]},{gps[1]}"

    # 4. Organize Row Data for Google Sheets (A to R)
    row_data = [
        scheme_raw, scheme_value, free_product, posm, price_base, 
        data.get('note', ''), data.get('channel', ''), "", data.get('start', '')[:10], 
        data.get('region', ''), brand_name, data.get('category', ''), "", 
        "", data.get('type', ''), data.get('picture', ''), net_price, kobo_id
    ]

    # 5. Google Sheets Update Logic
    existing_ids = sheet.col_values(18) 
    if kobo_id in existing_ids:
        row_index = existing_ids.index(kobo_id) + 1
        sheet.update(f'A{row_index}:R{row_index}', [row_data])
        status_label = "🔄 UPDATED"
    else:
        sheet.append_row(row_data)
        status_label = "✅ NEW"

    # 6. Formatting the Telegram Message
    telegram_msg = f"""
{status_label} **Promotion of {brand_name}:**
**Region:** {data.get('region', 'N/A')}
**Dealer:** {data.get('dealer_select', 'N/A')}
**Scheme:** {scheme_raw}
**Basic Price:** {price_base}$
**Net Price:** {net_price}$
**Sell Out Price:** {sell_out}$
**Channel:** {data.get('channel', 'N/A')}
**Others:** {posm}
**Type:** {data.get('type', 'N/A')}
**Date:** {data.get('start', '')[:10]}
**Note/Remark:** {data.get('note', 'None')}
**Location:** [View on Map]({location_link})
    """
    send_telegram(telegram_msg)

    return jsonify({"status": "success"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
