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

doc = client.open(SHEET_NAME)
clean_sheet = doc.sheet1
try:
    raw_sheet = doc.worksheet("Raw Data")
except gspread.exceptions.WorksheetNotFound:
    raw_sheet = doc.add_worksheet(title="Raw Data", rows="1000", cols="3")
    raw_sheet.append_row(["Date", "Kobo ID", "Full Raw Code"])

# --- HELPERS ---
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

def clean_html(text):
    """Washes text of symbols that cause Telegram to crash"""
    if text is None:
        return ""
    return str(text).replace('&', 'and').replace('<', '').replace('>', '')

def send_telegram_with_photo(message, photo_url):
    try:
        if photo_url and photo_url.startswith('http'):
            # Step 1: Try sending the image directly to Telegram
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
            payload = {"chat_id": TELEGRAM_CHAT_ID, "photo": photo_url, "caption": message, "parse_mode": "HTML"}
            response = requests.post(url, json=payload)
            
            # Step 2: If Kobo blocks Telegram from downloading the photo, FALLBACK to text
            if response.status_code != 200:
                print(f"⚠️ Telegram couldn't download photo. Falling back to text-only.")
                
                # Add the photo link to the bottom of the message instead
                fallback_msg = message + f"\n\n📷 <a href='{photo_url}'>Click here to view Photo in Kobo</a>"
                fallback_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
                fallback_payload = {"chat_id": TELEGRAM_CHAT_ID, "text": fallback_msg, "parse_mode": "HTML", "disable_web_page_preview": False}
                
                requests.post(fallback_url, json=fallback_payload)
                
        else:
            # If there is no photo at all, just send text normally
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
            payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "HTML", "disable_web_page_preview": True}
            requests.post(url, json=payload)
            
    except Exception as e:
        print(f"❌ TELEGRAM SERVER CRASH: {e}")

@app.route('/kobo-webhook', methods=['POST'])
def handle_webhook():
    data = request.json
    if not data:
        return jsonify({"error": "No data received"}), 400

    kobo_id = str(data.get('_id'))

    # 1. Capture Basic Data
    date_val = (data.get('start') or '')[:10]
    region = str(data.get('region') or 'N/A').upper()
    dealer = str(data.get('dealer_select') or 'N/A').upper()
    channel = data.get('channel') or 'N/A'
    category = str(data.get('category') or '').upper()
    type_val = str(data.get('type_select') or 'N/A').upper()
    note = str(data.get('note_remark') or '')

    village = data.get('village') or 'N/A'
    commune = data.get('commune') or 'N/A'
    district = data.get('district') or 'N/A'
    province = data.get('province') or 'N/A'

    price_base = data.get('price_base')
    price_net = data.get('price_net')

    scheme_raw = str(data.get('scheme') or '')
    scheme_parts = scheme_raw.split('+')
    s_val = scheme_parts[0] if len(scheme_parts) > 0 else ""
    f_prod = scheme_parts[1] if len(scheme_parts) > 1 else ""
    posm = "+".join(scheme_parts[2:]) if len(scheme_parts) > 2 else ""

    brand_raw = str(data.get('brand_select') or 'Unknown Brand')
    if '_' in brand_raw:
        brand_clean = brand_raw.replace('_', ' ').title() 
    else:
        brand_clean = brand_raw
    
    pack_match = re.search(r'(Can|Pint|PET|Bottle)[\s_]*[\d\.]+[a-zA-Z]+', brand_clean, re.IGNORECASE)
    packaging = pack_match.group(0).title().replace('Ml', 'ml') if pack_match else ""
    
    brand_final = f"{brand_clean}-{type_val}" if type_val and type_val != 'N/A' else brand_clean
    week_val = str(data.get('week_num') or '').replace('week', 'Week ')

    attachments = data.get('_attachments', [])
    photo1 = attachments[0].get('download_url') if len(attachments) > 0 else ""

    gps = data.get('gps_location') or ''
    map_link = "No location provided"
    if gps:
        coords = gps.split(' ') 
        if len(coords) >= 2:
            map_link = f"http://maps.google.com/maps?q={coords[0]},{coords[1]}"

    # --- 2. TELEGRAM MESSAGE (Wrapped in clean_html) ---
    telegram_msg = f"""
<b>Promotion of: {clean_html(brand_clean)}</b>
<b>Dealer:</b> {clean_html(dealer)} (Region: {clean_html(region)})
<b>Date:</b> {clean_html(date_val)}

<b>Channel:</b> {clean_html(channel)}
<b>Type:</b> {clean_html(type_val)}
<b>Scheme:</b> {clean_html(scheme_raw)}

Original Price From: {clean_html(format_price(price_base))}
Net Price: {clean_html(format_price(price_net))}

<b>Area:</b> {clean_html(village)}, {clean_html(commune)}, {clean_html(district)}, {clean_html(province)}
<b>GPS Map:</b> <a href='{map_link}'>Open Google Maps</a>

<b>Note:</b> {clean_html(note)}
    """

    # --- 3A. EXACT SENIOR REPORT ---
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
        brand_final,                # K: Brand 
        category,                   # L: Category
        packaging,                  # M: Packaging 
        week_val,                   # N: Week
        type_val,                   # O: Type
        photo1,                     # P: Picture
        price_net,                  # Q: PAP
        kobo_id                     # R: Kobo ID
    ]
    
    # Convert 'None' to empty string for Google Sheets
    row_data = ["" if v is None else v for v in row_data]
    
    try:
        existing_ids = clean_sheet.col_values(18) 
        if kobo_id in existing_ids:
            row_index = existing_ids.index(kobo_id) + 1
            clean_sheet.update(f'A{row_index}:R{row_index}', [row_data])
        else:
            clean_sheet.append_row(row_data)
    except Exception as e:
        print(f"❌ REPORT SHEET ERROR: {e}")

    # --- 3B. RAW DATA BACKUP (Wrapped in Safety Net) ---
    try:
        raw_sheet.append_row([date_val, kobo_id, json.dumps(data)])
    except Exception as e:
        print(f"❌ RAW SHEET ERROR: {e}")

    # --- 4. SEND TELEGRAM ---
    send_telegram_with_photo(telegram_msg, photo1)

    return jsonify({"status": "success"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
