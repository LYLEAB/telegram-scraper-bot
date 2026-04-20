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

# --- DICTIONARIES FOR KOBO DATA TRANSLATION ---
# Kobo sends hidden XML values. We translate them back to beautiful labels here.
PROVINCE_MAP = {
    "omeanc": "Oddar Meanchey", "bmean": "Banteay Meanchey", "btb": "Battambang",
    "kcham": "Kampong Cham", "kchhnang": "Kampong Chhnang", "kspeu": "Kampong Speu",
    "kthom": "Kampong Thom", "kpot": "Kampot", "kdal": "Kandal", "kkong": "Koh Kong",
    "mndkiri": "Mondulkiri", "pvihear": "Preah Vihear", "pveng": "Prey Veng",
    "psat": "Pursat", "rkiri": "Ratanakiri", "sreap": "Siem Reap", 
    "snouk": "Preah Sihanouk", "streng": "Stung Treng", "srieng": "Svay Rieng",
    "tbkhmum": "Tboung Khmum", "pp": "Phnom Penh"
}

CHANNEL_MAP = {
    "off_trade": "Off-Trade", 
    "horeca": "HORECA", 
    "wedding": "Wedding"
}

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
    if text is None:
        return ""
    return str(text).replace('&', 'and').replace('<', '').replace('>', '')

def send_telegram_media_group(message, photo_urls):
    """Sends up to 3 photos directly as a Telegram Album"""
    valid_urls = [url for url in photo_urls if url and url.startswith('http')]
    
    try:
        if len(valid_urls) == 0:
            # No photos, send text only
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
            payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "HTML", "disable_web_page_preview": True}
            requests.post(url, json=payload)
        elif len(valid_urls) == 1:
            # Single photo
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
            payload = {"chat_id": TELEGRAM_CHAT_ID, "photo": valid_urls[0], "caption": message, "parse_mode": "HTML"}
            res = requests.post(url, json=payload)
            if res.status_code != 200:
                print(f"⚠️ Photo blocked by Kobo. Falling back to links.")
                fallback_msg = message + f"\n\n📷 <b>Photo Link:</b>\n{valid_urls[0]}"
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage", json={"chat_id": TELEGRAM_CHAT_ID, "text": fallback_msg, "parse_mode": "HTML"})
        else:
            # Multiple photos (Media Group / Album)
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMediaGroup"
            media = []
            for i, p_url in enumerate(valid_urls):
                media.append({
                    "type": "photo",
                    "media": p_url,
                    "caption": message if i == 0 else "", # Put caption only on the first photo
                    "parse_mode": "HTML"
                })
            res = requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "media": media})
            if res.status_code != 200:
                print(f"⚠️ Album blocked by Kobo. Falling back to links.")
                fallback_msg = message + "\n\n📷 <b>Photo Links:</b>\n" + "\n".join(valid_urls)
                requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage", json={"chat_id": TELEGRAM_CHAT_ID, "text": fallback_msg, "parse_mode": "HTML"})
                
    except Exception as e:
        print(f"❌ TELEGRAM SERVER CRASH: {e}")

@app.route('/kobo-webhook', methods=['POST'])
def handle_webhook():
    data = request.json
    if not data:
        return jsonify({"error": "No data received"}), 400

    kobo_id = str(data.get('_id'))

    # 1. Capture Basic Data (Fixing Region to look for region_select)
    date_val = (data.get('start') or '')[:10]
    region = str(data.get('region_select') or data.get('region') or 'N/A').upper()
    dealer = str(data.get('dealer_select') or 'N/A').upper()
    
    category = str(data.get('category') or '').upper().replace('_', ' ')
    type_val = str(data.get('type_select') or 'N/A').upper()
    note = str(data.get('note_remark') or '')

    # --- LOCATION FORMATTING ---
    village = str(data.get('village') or 'N/A').title()
    commune = str(data.get('commune') or 'N/A').title()
    district = str(data.get('district') or 'N/A').title()
    
    prov_raw = str(data.get('province') or 'N/A').lower()
    province = PROVINCE_MAP.get(prov_raw, prov_raw.title())

    # --- CHANNEL FORMATTING ---
    c_raw = data.get('channel') or 'N/A'
    channel_clean = CHANNEL_MAP.get(c_raw, c_raw.replace('_', ' ').title())
    
    sub_raw = data.get('sub_channel') or 'N/A'
    if sub_raw != 'N/A' and sub_raw.strip() != '':
        channel_display = f"{channel_clean} (<i>{sub_raw.replace('_', ' ').title()}</i>)"
    else:
        channel_display = f"{channel_clean}"

    # --- PRICES ---
    price_base = data.get('price_base')
    price_net = data.get('price_net')
    price_sellout = data.get('price_sellout')
    price_source = str(data.get('price_source') or 'N/A').title()

    # --- SCHEME ---
    scheme_raw = str(data.get('scheme') or '')
    scheme_parts = scheme_raw.split('+')
    s_val = scheme_parts[0] if len(scheme_parts) > 0 else ""
    f_prod = scheme_parts[1] if len(scheme_parts) > 1 else ""
    posm = "+".join(scheme_parts[2:]) if len(scheme_parts) > 2 else ""

    # --- BRAND FORMATTING ---
    brand_raw = str(data.get('brand_select') or 'Unknown Brand')
    if '_' in brand_raw:
        brand_clean = brand_raw.replace('_', ' ').title() 
    else:
        brand_clean = brand_raw
    
    pack_match = re.search(r'(Can|Pint|PET|Bottle)[\s_]*[\d\.]+[a-zA-Z]+', brand_clean, re.IGNORECASE)
    packaging = pack_match.group(0).title().replace('Ml', 'ml') if pack_match else ""
    
    # This creates EXACTLY "Greet Energy Can 250ml-NCP"
    brand_final = f"{brand_clean}-{type_val}" if type_val and type_val != 'N/A' else brand_clean
    week_val = str(data.get('week_num') or '').replace('week', 'Week ')

    # --- MULTIPLE PHOTOS ---
    attachments = data.get('_attachments', [])
    photo_urls = []
    for att in attachments[:3]: # Grab up to 3 photos
        if att.get('download_url'):
            photo_urls.append(att.get('download_url'))
            
    # Keep photo1 isolated for the Google Sheet column
    photo1 = photo_urls[0] if len(photo_urls) > 0 else ""

    # --- MAPS ---
    gps = data.get('gps_location') or ''
    map_link = "No location provided"
    if gps:
        coords = gps.split(' ') 
        if len(coords) >= 2:
            map_link = f"http://maps.google.com/maps?q={coords[0]},{coords[1]}"

    # --- 2. TELEGRAM MESSAGE ---
    telegram_msg = f"""
<b>Promotion of: {clean_html(brand_final)}</b>
<b>Region:</b> {clean_html(region)} (Dealer: {clean_html(dealer)}), 
<b>Location:</b> {clean_html(village)}, {clean_html(commune)}, {clean_html(district)}, {clean_html(province)}
<b>Location Map:</b> <a href='{map_link}'>Open Google Maps</a>
<b>Channel:</b> {channel_display}
<b>Scheme:</b> {clean_html(scheme_raw)}
• Basic Price: {clean_html(format_price(price_base))} (From {clean_html(price_source)})
• Net Price: {clean_html(format_price(price_net))}
• Sell Out Price: {clean_html(format_price(price_sellout))}
<b>Date:</b> {clean_html(date_val)}
<b>Note:</b> {clean_html(note)}
    """

    # --- 3A. EXACT SENIOR REPORT (17 Columns) ---
    row_data = [
        scheme_raw,                 # A: Promotion
        s_val,                      # B: Scheme
        f_prod,                     # C: Free Product
        posm,                       # D: POSM
        price_base,                 # E: Price before promotion
        note,                       # F: Others
        channel_clean,              # G: Channel (Using clean name without sub_channel here)
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

    # --- 3B. RAW DATA BACKUP ---
    try:
        raw_sheet.append_row([date_val, kobo_id, json.dumps(data)])
    except Exception as e:
        print(f"❌ RAW SHEET ERROR: {e}")

    # --- 4. SEND TELEGRAM ---
    send_telegram_media_group(telegram_msg, photo_urls)

    return jsonify({"status": "success"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
