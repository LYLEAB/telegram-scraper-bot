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

# Connect to Sheet1 (Senior's Report) and Raw Data
doc = client.open(SHEET_NAME)
clean_sheet = doc.sheet1
try:
    raw_sheet = doc.worksheet("Raw Data")
except gspread.exceptions.WorksheetNotFound:
    raw_sheet = doc.add_worksheet(title="Raw Data", rows="1000", cols="3")
    raw_sheet.append_row(["Date", "Kobo ID", "Full Raw Code"])

# --- HELPER: AUTO-CURRENCY MAGIC ---
def format_price(amount):
    if amount is None or amount == '' or amount == 'N/A':
        return "N/A"
    try:
        val = float(amount)
        if val < 1000:
            return f"${val:g}"
        else:
            return f"{val:,.0f} ៛"
    except ValueError:
        return str(amount)

def send_telegram_with_photo(message, photo_url):
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

    # 1. Capture Basic Data (Using 'or' to prevent null crashes)
    date_val = (data.get('start') or '')[:10]
    region = str(data.get('region') or 'N/A').upper()
    dealer = str(data.get('dealer_select') or 'N/A').upper()
    channel = data.get('channel') or 'N/A'
    category = str(data.get('category') or '').upper()
    type_val = str(data.get('type_select') or 'N/A').upper()
    note = str(data.get('note_remark') or '').replace('<', '').replace('>', '').replace('&', 'and')

    # Location Data
    village = data.get('village') or 'N/A'
    commune = data.get('commune') or 'N/A'
    district = data.get('district') or 'N/A'
    province = data.get('province') or 'N/A'

    # Prices
    price_base = data.get('price_base')
    price_net = data.get('price_net')

    # --- ADVANCED FORMATTING FOR SENIOR REPORT ---
    
    # SPLIT SCHEME
    scheme_raw = str(data.get('scheme') or '').replace('&', 'and')
    scheme_parts = scheme_raw.split('+')
    s_val = scheme_parts[0] if len(scheme_parts) > 0 else ""
    f_prod = scheme_parts[1] if len(scheme_parts) > 1 else ""
    posm = "+".join(scheme_parts[2:]) if len(scheme_parts) > 2 else ""

    # CLEAN BRAND & EXTRACT PACKAGING
    brand_raw = str(data.get('brand_select') or 'Unknown Brand')
    if '_' in brand_raw:
        brand_clean = brand_raw.replace('_', ' ').title() 
    else:
        brand_clean = brand_raw
    
    pack_match = re.search(r'(Can|Pint|PET|Bottle)[\s_]*[\d\.]+[a-zA-Z]+', brand_clean, re.IGNORECASE)
    packaging = pack_match.group(0).title().replace('Ml', 'ml') if pack_match else ""
    
    brand_final = f"{brand_clean}-{type_val}" if type_val and type_val != 'N/A' else brand_clean
    week_val = str(data.get('week_num') or '').replace('week', 'Week ')

    # --- PHOTOS & MAPS ---
    attachments = data.get('_attachments', [])
    photo1 = attachments[0].get('download_url') if len(attachments) > 0 else ""

    gps = data.get('gps_location') or ''
    map_link = "No location provided"
    if gps:
        coords = gps.split(' ') 
        if len(coords) >= 2:
            map_link = f"http://maps.google.com/maps?q={coords[0]},{coords[1]}"

    # --- 2. TELEGRAM MESSAGE ---
    telegram_msg = f"""
<b>Promotion of: {brand_clean}</b>
<b>Dealer:</b> {dealer} (Region: {region})
<b>Date:</b> {date_val}

<b>Channel:</b> {channel}
<b>Type:</b> {type_val}
<b>Scheme:</b> {scheme_raw}

Original Price From: {format_price(price_base)}
Net Price: {format_price(price_net)}

<b>Area:</b> {village}, {commune}, {district}, {province}
<b>GPS Map:</b> <a href='{map_link}'>Open Google Maps</a>

<b>Note:</b> {note}
    """

    # --- 3A. EXACT SENIOR REPORT (COLUMNS A TO R) ---
    row_data = [
        scheme_raw,                 # A: Promotion
        s_val,                      # B: Scheme
        f_prod,                     # C: Free Product
        posm,                       # D: POSM
        price_base,                 # E: Price before promotion
        note,                       # F: Others
        channel,                    # G: Channel
        "",                         # H: Function (Blank)
        date_val,                   # I: Date
        region,                     # J: Region
        brand_final,                # K: Brand (e.g., ABC Can 330ml-NCP)
        category,                   # L: Category
        packaging,                  # M: Packaging (e.g., Can 330ml)
        week_val,                   # N: Week
        type_val,                   # O: Type
        photo1,                     # P: Picture
        price_net,                  # Q: PAP
        kobo_id                     # R: Kobo ID
    ]
    
    # SECURITY FIX: Convert any 'None' values into empty strings so Google Sheets doesn't crash
    row_data = ["" if v is None else v for v in row_data]
    
    existing_ids = clean_sheet.col_values(18) 
    if kobo_id in existing_ids:
        row_index = existing_ids.index(kobo_id) + 1
        clean_sheet.update(f'A{row_index}:R{row_index}', [row_data])
    else:
        clean_sheet.append_row(row_data)

    # --- 3B. RAW DATA BACKUP ---
    raw_sheet.append_row([date_val, kobo_id, json.dumps(data)])

    # --- 4. SEND TELEGRAM ---
    send_telegram_with_photo(telegram_msg, photo1)

    return jsonify({"status": "success"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
