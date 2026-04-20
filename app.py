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
    "bmc": "Banteay Meanchey", "btt": "Battambang", "kc": "Kampong Cham", 
    "kchh": "Kampong Chhnang", "kspe": "Kampong Speu", "ktho": "Kampong Thom", 
    "kka": "Kampot", "kd": "Kandal", "kep": "Kep", "kkg": "Koh Kong", 
    "kkr": "Kratie", "mkiri": "Mondul Kiri", "omeanc": "Oddar Meanchey", 
    "ppa": "Pailin", "pp": "Phnom Penh", "psihan": "Preah Sihanouk", 
    "pvihea": "Preah Vihear", "pv": "Prey Veng", "ppu": "Pursat", 
    "rkir": "Ratanak Kiri", "sr": "Siem Reap", "streng": "Stung Treng", 
    "svr": "Svay Rieng", "tke": "Takeo", "tkhmu": "Tboung Khmum",
    "bmean": "Banteay Meanchey", "btb": "Battambang", "kcham": "Kampong Cham",
    "kchhnang": "Kampong Chhnang", "kspeu": "Kampong Speu", "kthom": "Kampong Thom",
    "kpot": "Kampot", "kdal": "Kandal", "kkong": "Koh Kong", "mndkiri": "Mondulkiri",
    "pvihear": "Preah Vihear", "pveng": "Prey Veng", "psat": "Pursat",
    "rkiri": "Ratanakiri", "sreap": "Siem Reap", "snouk": "Preah Sihanouk",
    "srieng": "Svay Rieng", "tbkhmum": "Tboung Khmum"
}

DISTRICT_MAP = {
    "omaec": "Odongk Maechay", "as": "Angk Snuol", "plueu": "Ponhea Lueu",
    "praekpnov": "Praek Pnov", "russeykeo": "Russey Keo", "bkk": "Boeng Keng Kang",
    "chamkarmon": "Chamkar Mon", "dounpenh": "Doun Penh", "pmea": "Prampir Meakkakra",
    "dangkao": "Dangkao", "meanchey": "Mean Chey", "saensokh": "Saensokh",
    "kamboul": "Kamboul", "pursenchey": "Pur SenChey", "tuolkouk": "Tuol Kouk",
    "kiensvay": "Kien Svay", "chbarampov": "Chbar Ampov", "mukhkampul": "Mukh Kampul",
    "chraoychongvar": "Chraoy Chongvar", "kaohsoutin": "Kaoh Soutin", 
    "sreisanthor": "Srei Santhor", "khsachkandal": "Khsach Kandal", "lveaaem": "Lvea Aem",
    "akreiyksatr": "Akreiy Ksatr", "peareang": "Pea Reang", "purrieng": "Pur Rieng",
    "basedth": "Basedth", "kongpisei": "Kong Pisei", "bati": "Bati", "samraong": "Samraong",
    "bavet": "Bavet", "chantrea": "Chantrea", "kampongrou": "Kampong Rou",
    "svayteab": "Svay Teab", "srig": "Svay Rieng", "kandalstueng": "Kandal Stueng",
    "sang": "S'ang", "takhmau": "Ta Khmau", "kaohthum": "Kaoh Thum", "leukdaek": "Leuk Daek",
    "sampeoupoun": "Sampeou Poun", "boreicholsar": "Borei Cholsar", 
    "kaohandaet": "Kaoh Andaet", "kirivong": "Kiri Vong", "treang": "Treang",
    "kampongtrabaek": "Kampong Trabaek", "mesang": "Me Sang", "preahsdach": "Preah Sdach",
    "angkorborei": "Angkor Borei", "preykabbas": "Prey Kabbas", "baphnum": "Ba Phnum",
    "peamchor": "Peam Chor", "peamro": "Peam Ro", "kamchaymear": "Kamchay Mear",
    "kanhchriech": "Kanhchriech", "sithorkandal": "Sithor Kandal", "pvg": "Prey Veng",
    "svayantor": "Svay Antor", "romeashaek": "Romeas Haek", "rumduol": "Rumduol",
    "svaychrum": "Svay Chrum", "dounkaev": "Doun Kaev", "tramkak": "Tram Kak",
    "chhuk": "Chhuk", "chumkiri": "Chum Kiri", "dangtong": "Dang Tong", "kamt": "Kampot",
    "baribour": "Baribour", "kampongleaeng": "Kampong Leaeng", "kampongchh": "Kampong Chhnang",
    "roleabier": "Rolea B'ier", "tuekphos": "Tuek Phos", "botumsakor": "Botum Sakor",
    "khemaraphoumin": "Khemara Phoumin", "kirisakor": "Kiri Sakor", 
    "mondolseima": "Mondol Seima", "thmabang": "Thma Bang", "phnumsruoch": "Phnum Sruoch",
    "samraongtong": "Samraong Tong", "bokor": "Bokor", "tuekchhou": "Tuek Chhou",
    "kampongsoam": "Kampong Soam", "kaohrung": "Kaoh Rung", "preynob": "Prey Nob",
    "preahsiha": "Preah Sihanouk", "aoral": "Aoral", "chbarmon": "Chbar Mon",
    "samkkeimunichay": "Samkkei Munichay", "thpong": "Thpong", "cholkiri": "Chol Kiri",
    "kampongtralach": "Kampong Tralach", "sameakkimeanchey": "Sameakki Mean Chey",
    "angkorchey": "Angkor Chey", "banteaymeas": "Banteay Meas", 
    "damnakchangaeur": "Damnak Chang'aeur", "kaeb": "Kaeb", "kagtrach": "Kampong Trach",
    "kampongseila": "Kampong Seila", "stuenghav": "Stueng Hav", "sraeambel": "Srae Ambel",
    "aekphnum": "Aek Phnum", "banan": "Banan", "battambangd": "Battambang",
    "koaskrala": "Koas Krala", "sangkae": "Sangkae", "thmakoul": "Thma Koul",
    "bavel": "Bavel", "rotonakmondol": "Rotonak Mondol", "kamrieng": "Kamrieng",
    "phnumproek": "Phnum Proek", "sampovlun": "Sampov Lun", "moungruessei": "Moung Ruessei",
    "rukhkiri": "Rukh Kiri", "bakan": "Bakan", "samlout": "Samlout", "salakrau": "Sala Krau",
    "pail": "Pailin", "malai": "Malai", "ouchrov": "Ou Chrov", "paoypaet": "Paoy Paet",
    "kandieng": "Kandieng", "krakor": "Krakor", "purs": "Pursat", 
    "phnumkravanh": "Phnum Kravanh", "talousenchey": "Ta Lou Senchey", 
    "vealveaeng": "Veal Veaeng", "mongkolborei": "Mongkol Borei", 
    "sereisaophoan": "Serei Saophoan", "svaychek": "Svay Chek", "thmapuok": "Thma Puok",
    "chikraeng": "Chi Kraeng", "soutrnikom": "Soutr Nikom", "svayleu": "Svay Leu",
    "kampongsvay": "Kampong Svay", "prasatballangk": "Prasat Ballangk",
    "prasatsambour": "Prasat Sambour", "sandan": "Sandan", "santuk": "Santuk",
    "stoung": "Stoung", "stuengsaen": "Stueng Saen", "baray": "Baray", 
    "taingkouk": "Taing Kouk", "phnumsrok": "Phnum Srok", "preahnetrpreah": "Preah Netr Preah",
    "angkorchum": "Angkor Chum", "kralanh": "Kralanh", "puok": "Puok",
    "siemreapd": "Siem Reap", "sreisnam": "Srei Snam", "angkorthum": "Angkor Thum",
    "banteaysrei": "Banteay Srei", "prasatbakong": "Prasat Bakong",
    "runtaaektechosen": "Run Ta Aek Techo Sen", "varin": "Varin", "batheay": "Batheay",
    "cheungprey": "Cheung Prey", "kangmeas": "Kang Meas", "preychhor": "Prey Chhor",
    "kampongsiem": "Kampong Siem", "kamgcham": "Kampong Cham", "dambae": "Dambae",
    "memot": "Memot", "ponheakraek": "Ponhea Kraek", "chamkarleu": "Chamkar Leu",
    "stuengtrang": "Stueng Trang", "krouchchhmar": "Krouch Chhmar", 
    "oureangov": "Ou Reang Ov", "suong": "Suong", "tbogkhm": "Tboung Khmum",
    "andoungmeas": "Andoung Meas", "barkaev": "Bar Kaev", "lumphat": "Lumphat",
    "ouyadav": "Ou Ya Dav", "chetrborei": "Chetr Borei", "chhloung": "Chhloung",
    "kracheh": "Kracheh", "oukriengsaenchey": "Ou Krieng Saenchey", 
    "prekprasab": "Prek Prasab", "sambour": "Sambour", "snuol": "Snuol",
    "kaevseima": "Kaev Seima", "kaohnheaek": "Kaoh Nheaek", "oureang": "Ou Reang",
    "pechchreada": "Pech Chreada", "saenmonourom": "Saen Monourom", "banlung": "Ban Lung",
    "kounmom": "Koun Mom", "ouchum": "Ou Chum", "taveaeng": "Ta Veaeng",
    "veunsai": "Veun Sai", "boreiousvaysenchey": "Borei Ou Svay Senchey", "sesan": "Sesan",
    "siembouk": "Siem Bouk", "siempang": "Siem Pang", "stuengtraeng": "Stueng Traeng",
    "thalabarivat": "Thala Barivat", "anlongveaeng": "Anlong Veaeng",
    "trapeangprasat": "Trapeang Prasat", "choamksant": "Choam Ksant", 
    "cheysaen": "Chey Saen", "chhaeb": "Chhaeb", "kuleaen": "Kuleaen", 
    "rovieng": "Rovieng", "sangkumthmei": "Sangkum Thmei", 
    "tbaengmeanchey": "Tbaeng Mean Chey", "prvih": "Preah Vihear", 
    "banteayampil": "Banteay Ampil", "chongkal": "Chong Kal", "kgsr": "Krong Samraong"
}

CHANNEL_MAP = {
    "off_trade": "Off-Trade", 
    "horeca": "HORECA", 
    "wedding": "Wedding"
}

# --- HELPERS ---
def format_price(amount):
    """Formats prices for TELEGRAM display (Keeps original Riel or USD)"""
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

def convert_to_usd(amount):
    """Converts KHR to pure USD numbers for GOOGLE SHEETS calculation"""
    if amount is None or amount == '' or amount == 'N/A':
        return ""
    try:
        val = float(amount)
        if val >= 1000:
            return round(val / 4000.0, 3) # Converts Riel to Dollars securely
        return val # If already under 1000, it's already a Dollar value
    except ValueError:
        return amount

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
                    "caption": message if len(media) == 0 else "", 
                    "parse_mode": "HTML"
                })
        except Exception as e:
            print(f"Error downloading {url}: {e}")

    try:
        if len(media) == 0:
            fallback_msg = message + "\n\n📷 <b>Photo Links:</b>\n" + "\n".join(valid_urls)
            requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage", json={"chat_id": TELEGRAM_CHAT_ID, "text": fallback_msg, "parse_mode": "HTML"}, timeout=15)
        elif len(media) == 1:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
            first_filename = list(downloaded_files.keys())[0] 
            files = {'photo': downloaded_files[first_filename]}
            data = {"chat_id": TELEGRAM_CHAT_ID, "caption": message, "parse_mode": "HTML"}
            requests.post(url, data=data, files=files, timeout=15)
        else:
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
    
    dist_raw = str(data.get('district') or 'N/A').lower().strip()
    district = DISTRICT_MAP.get(dist_raw, dist_raw.title())
    
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

    # --- BRAND FORMATTING (WITH PREFIX STRIPPER) ---
    brand_raw = str(data.get('brand_select') or 'Unknown Brand')
    
    # 1. Chop off the Kobo Category Prefix before formatting
    prefixes_to_remove = ["beer_", "csd_", "ed_", "isotonic_", "med_", "rtd_tea_", "scsd_", "water_"]
    for p in prefixes_to_remove:
        if brand_raw.startswith(p):
            brand_raw = brand_raw[len(p):]
            break

    # 2. Clean it up
    brand_clean = brand_raw.replace('_', ' ').title()
    
    # 3. Force uppercase for acronyms if they appear in the middle of a name
    for prefix in ["Ed ", "Csd ", "Med ", "Rtd ", "Scsd ", "Abc "]:
        if prefix in brand_clean:
            brand_clean = brand_clean.replace(prefix, prefix.upper())
            
    # 4. Fix Ml to ml
    brand_clean = brand_clean.replace('Ml', 'ml')
    
    pack_match = re.search(r'(Can|Pint|PET|Pet|Bottle)[\s_]*[\d\.]+[a-zA-Z]+', brand_clean, re.IGNORECASE)
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

    # --- 3. GOOGLE SHEETS (Using the new convert_to_usd function) ---
    row_data = [
        scheme_raw, s_val, f_prod, posm, convert_to_usd(price_base), note, channel_clean, "", 
        date_val, region, brand_final, category, packaging, week_val, type_val, 
        photo1, convert_to_usd(price_net), kobo_id
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
