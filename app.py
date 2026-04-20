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
KOBO_TOKEN = os.environ.get('KOBO_TOKEN') # Optional: If photos are strictly locked
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
PROVINCE_MAP = {
    "omeanc": "Oddar Meanchey", "bmean": "Banteay Meanchey", "btb": "Battambang",
    "btt": "Battambang", "kcham": "Kampong Cham", "kchhnang": "Kampong Chhnang", 
    "kspeu": "Kampong Speu", "kthom": "Kampong Thom", "kpot": "Kampot", 
    "kdal": "Kandal", "kkong": "Koh Kong", "mndkiri": "Mondulkiri", 
    "pvihear": "Preah Vihear", "pveng": "Prey Veng", "psat": "Pursat", 
    "rkiri": "Ratanakiri", "sreap": "Siem Reap", "snouk": "Preah Sihanouk", 
    "streng": "Stung Treng", "srieng": "Svay Rieng", "tbkhmum": "Tboung Khmum", 
    "pp": "Phnom Penh"
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
    """Downloads photos directly via Python and uploads them natively to Telegram"""
    valid_urls = [url for url in photo_urls if url and url.startswith('http')]
    
    if len(valid_urls) == 0:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "HTML", "disable_web_page_preview": True}
        requests.post(url, json=payload, timeout=15)
        return

    # 1. Download images to memory to bypass Telegram URL blocking
    downloaded_files = {}
    media = []
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    if KOBO_TOKEN:
        headers['Authorization'] = f'Token {KOBO_TOKEN}'

    for i, url in enumerate(valid_urls):
        try:
            res = requests.get(url, headers=headers, timeout=10)
            if res.status_code == 200:
                filename = f"photo{i}.jpg"
                downloaded_files[filename] = res.content
                media.append({
                    "type": "photo",
                    "media": f"attach://{filename}",
                    "caption": message if len(media) == 0 else "", # Caption only on the first actual downloaded image
                    "parse_mode": "HTML"
                })
        except Exception as e:
            print(f"Error downloading {url}: {e}")

    # 2. Upload directly to Telegram
    try:
        if len(media) == 0:
            # Fallback if download totally failed
            fallback_msg = message + "\n\n📷 <b>Photo Links:</b>\n" + "\n".join(valid_urls)
            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage", json={"chat_id": TELEGRAM_CHAT_ID, "text": fallback_msg, "parse_mode": "HTML"}, timeout=15)
        
        elif len(media) == 1:
            # Safe Single Photo Upload
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
            first_filename = list(downloaded_files.keys())[0] # Fixes the missing image bug!
            files = {'photo': downloaded_files[first_filename]}
            data = {"chat_id": TELEGRAM_CHAT_ID, "caption": message, "parse_mode": "HTML"}
            requests.post(url, data=data, files=files, timeout=15)
            
        else:
            # Album Upload
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMediaGroup"
            files = {name: content for name, content in downloaded_files.items()}
            data = {"chat_id": TELEGRAM_CHAT_ID, "media": json.dumps(media)}
            requests.post(url, data=data, files=files, timeout=20)
            
    except Exception as e:
        print(f"❌ TELEGRAM UPLOAD FAILED: {e}")

@app.route('/kobo-webhook', methods=['POST'])
def handle_webhook():
    data = request.json
    if not data:
        return jsonify({"error": "No data received"}), 400

    kobo_id = str(data.get('_id'))

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
    
    prov_raw = str(data.get('province') or 'N/A').lower().strip()
    province = PROVINCE_MAP.get(prov_raw, prov_raw.title())

    # --- CHANNEL FORMATTING ---
    c_raw = data.get('channel') or 'N/A'
    channel_clean = CHANNEL_MAP.get(c_raw, c_raw.replace('_', ' ').title())
    
    sub_raw = data.get('sub_channel') or 'N/A'
    if sub_raw != 'N/A' and sub_raw.strip() != '':
        channel_display = f"{channel_clean} ({sub_raw.replace('_', ' ').title()})"
    else:
        channel_display = f"{channel_clean}"

    # --- PRICES & SCHEME ---
    price_base = data.get('price_base')
    price_net = data.get('price_net')
    price_sellout = data.get('price_sellout')
    price_source = str(data.get('price_source') or 'N/A').title()

    scheme_raw = str(data.get('scheme') or '')
    scheme_parts = scheme_raw.split('+')
    s_val = scheme_parts[0] if len(scheme_parts) > 0 else ""
    f_prod = scheme_parts[1] if len(scheme_parts) > 1 else ""
    posm = "+".join(scheme_parts[2:]) if len(scheme_parts) > 2 else ""

    # --- BRAND FORMATTING ---
    brand_raw = str(data.get('brand_select') or 'Unknown Brand')
    brand_clean = brand_raw.replace('_', ' ').title()
    
    for prefix in ["Ed ", "Csd ", "Med ", "Rtd ", "Scsd "]:
        if prefix in brand_clean:
            brand_clean = brand_clean.replace(prefix, prefix.upper())
            
    brand_clean = brand_clean.replace('Ml', 'ml')
    
    pack_match = re.search(r'(Can|Pint|PET|Bottle)[\s_]*[\d\.]+[a-zA-Z]+', brand_clean, re.IGNORECASE)
    packaging = pack_match.group(0).replace('Ml', 'ml') if pack_match else ""
    
    brand_final = f"{brand_clean}-{type_val}" if type_val and type_val != 'N/A' else brand_clean
    week_val = str(data.get('week_num') or '').replace('week', 'Week ')

    # --- PHOTOS & MAPS ---
    attachments = data.get('_attachments', [])
    photo_urls = [att.get('download_url') for att in attachments[:3] if att.get('download_url')]
    photo1 = photo_urls[0] if photo_urls else ""

    gps = data.get('gps_location') or ''
    map_link = "No location provided"
    if gps:
        coords = gps.split(' ') 
        if len(coords) >= 2:
            map_link = f"http://maps.google.com/maps?q={coords[0]},{coords[1]}"

    # --- 2. EXACT TELEGRAM MESSAGE FORMAT ---
    telegram_msg = f"""<b>Promotion of:</b> {clean_html(brand_final)}
<b>Region:</b> {clean_html(region)}
<b>Dealer:</b> {clean_html(dealer)}
<b>Location:</b> {clean_html(village)}, {clean_html(commune)}, {clean_html(district)}, {clean_html(province)}
<b>Location Map:</b> <a href='{map_link}'>Open Google Maps</a>
<b>Channel:</b> {clean_html(channel_display)}
<b>Scheme:</b> {clean_html(scheme_raw)}
• Basic Price: {clean_html(format_price(price_base))} (From {clean_html(price_source)})
• Net Price: {clean_html(format_price(price_net))}
• Sell Out Price: {clean_html(format_price(price_sellout))}
<b>Date:</b> {clean_html(date_val)}
<b>Note:</b> {clean_html(note)}"""

    # --- 3. GOOGLE SHEETS ---
    row_data = [
        scheme_raw, s_val, f_prod, posm, price_base, note, channel_clean, "", 
        date_val, region, brand_final, category, packaging, week_val, type_val, 
        photo1, price_net, kobo_id
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

    try:
        raw_sheet.append_row([date_val, kobo_id, json.dumps(data)])
    except Exception as e:
        pass

    # --- 4. SEND TELEGRAM ---
    send_telegram_media_group(telegram_msg, photo_urls)

    return jsonify({"status": "success"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
