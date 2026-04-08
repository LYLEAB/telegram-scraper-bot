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

# --- HELPER: AUTO-CURRENCY MAGIC ---
def format_price(amount):
    """Returns (Formatted Price String, Currency Type for Google Sheets)"""
    if not amount or amount == 'N/A':
        return "N/A", "N/A"
    try:
        val = float(amount)
        if val < 1000:
            return f"${val:g}", "USD ($)"
        else:
            return f"{val:,.0f} ៛", "KHR (៛)"
    except ValueError:
        return str(amount), "Unknown"

def send_telegram_with_photo(message, photo_url):
    # Using HTML parse mode to prevent bolding/underscore errors crashing the bot
    if photo_url and photo_url.startswith('http'):
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
        payload = {"chat_id": TELEGRAM_CHAT_ID, "photo": photo_url, "caption": message, "parse_mode": "HTML"}
    else:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "HTML", "disable_web_page_preview": True}
    
    requests.post(url, json=payload)

@app.route('/kobo-webhook', methods=['POST'])
def handle_webhook():
    data = request.json
    if not data:
        return jsonify({"error": "No data received"}), 400

    kobo_id = str(data.get('_id'))

    # 1. Capture Data from New Form
    date_val = data.get('start', '')[:10]
    region = str(data.get('region', 'N/A')).upper()
    dealer = str(data.get('dealer_select', 'N/A')).upper()
    province = data.get('province', 'N/A')
    district = data.get('district', 'N/A')
    commune = data.get('commune', 'N/A')
    village = data.get('village', 'N/A')
    
    channel = data.get('channel', 'N/A')
    sub_channel = data.get('sub_channel', 'N/A')
    category = data.get('category', 'N/A')
    brand = str(data.get('brand_select', 'Unknown Brand')).upper()
    type_val = data.get('type_select', 'N/A')
    
    price_source = data.get('price_source', 'N/A')
    scheme_raw = data.get('scheme', 'N/A')
    note = data.get('note_remark', 'No Remark')

    # Apply Currency Auto-Detect
    base_price_str, currency_type = format_price(data.get('price_base'))
    net_price_str, _ = format_price(data.get('price_net'))
    sellout_price_str, _ = format_price(data.get('price_sellout'))

    # 2. Extract Multiple Photos
    attachments = data.get('_attachments', [])
    photo1 = attachments[0].get('download_url') if len(attachments) > 0 else ""
    photo2 = attachments[1].get('download_url') if len(attachments) > 1 else ""
    photo3 = attachments[2].get('download_url') if len(attachments) > 2 else ""

    # 3. Create Google Maps Link
    gps = data.get('gps_location', '')
    map_link = "No location provided"
    if gps:
        coords = gps.split(' ') 
        if len(coords) >= 2:
            map_link = f"http://maps.google.com/maps?q={coords[0]},{coords[1]}"

    # 4. Telegram Message Construction (Using HTML)
    telegram_msg = f"""
<b>Promotion of: {brand}</b>
<b>Region:</b> {region}
<b>Dealer:</b> {dealer}
<b>Area:</b> {village}, {commune}, {district}, {province}
<b>Location:</b> <a href='{map_link}'>Open Google Maps</a>
<b>Date:</b> {date_val}

🏪 <b>Channel:</b> {channel} (<i>{sub_channel}</i>)
🏷️ <b>Type:</b> {type_val}
🎁 <b>Scheme:</b> {scheme_raw}

💰 <b>Prices:</b>
• Original Price: {base_price_str} (From {price_source})
• Net Price: {net_price_str}
• Sell Out: {sellout_price_str}

📝 <b>Note:</b> {note}
    """

    # 5. Google Sheets Update (Now mapped to A through X)
    row_data = [
        date_val, region, dealer, province, district, commune, village, map_link, 
        channel, sub_channel, category, brand, type_val, scheme_raw, currency_type, 
        price_source, data.get('price_base', ''), data.get('price_net', ''), 
        data.get('price_sellout', ''), note, photo1, photo2, photo3, kobo_id
    ]
    
    # Check Column 24 (Col X) for the Kobo ID
    existing_ids = sheet.col_values(24) 
    if kobo_id in existing_ids:
        row_index = existing_ids.index(kobo_id) + 1
        sheet.update(f'A{row_index}:X{row_index}', [row_data])
    else:
        sheet.append_row(row_data)

    # 6. Send to Telegram
    send_telegram_with_photo(telegram_msg, photo1)

    return jsonify({"status": "success"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
