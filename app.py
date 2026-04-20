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
KOBO_TOKEN = os.environ.get('KOBO_TOKEN') 
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
CATEGORY_MAP = {
    "beer": "Beer",
    "ed": "ED",
    "med": "MED",
    "csd": "CSD",
    "scsd": "SCSD",
    "isotonic": "Isotonic",
    "rtd_tea": "RTD Tea",
    "water": "Water"
}

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

BRAND_MAP = {
    "beer_abc_can_330ml": "ABC Can 330ml", "beer_abc_pint_330ml": "ABC Pint 330ml", "beer_abc_smooth_stout_can_330ml": "ABC Smooth Stout Can 330ml",
    "beer_anchor_can_330ml": "Anchor Can 330ml", "beer_anchor_pint_330ml": "Anchor Pint 330ml", "beer_anchor_white_pint_330ml": "Anchor White Pint 330ml",
    "beer_anchor_white_can_330ml": "Anchor White Can 330ml", "beer_anchor_ultra_can_330ml": "Anchor Ultra Can 330ml", "beer_angkor_can_330ml": "Angkor Can 330ml",
    "beer_angkor_pint_330ml": "Angkor Pint 330ml", "beer_angkor_sky_can_330ml": "Angkor Sky Can 330ml", "beer_barrley_black_can_330ml": "Barrley Black Can 330ml",
    "beer_black_panther_can_330ml": "Black Panther Can 330ml", "beer_cambodia_can_330ml": "Cambodia Beer Can 330ml", "beer_cambodia_pint_330ml": "Cambodia Beer Pint 330ml",
    "beer_cambodia_lite_can_330ml": "Cambodia Lite Beer Can 330ml", "beer_cambodia_lite_pint_330ml": "Cambodia Lite Beer Pint 330ml", "beer_cambodia_premium_draft_pint_330ml": "Cambodia Premium Draft Beer Pint 330ml",
    "beer_cambodia_black_can_330ml": "Cambodia Black Beer Can 330ml", "beer_cambodia_black_pint_330ml": "Cambodia Black Beer Pint 330ml", "beer_chang_can_330ml": "Chang Can 330ml",
    "beer_clasei_can_330ml": "Clasei Can 330ml", "beer_dragon_can_330ml": "Dragon Can 330ml", "beer_dragon_nitro_can_330ml": "Dragon Nitro Can 330ml",
    "beer_dragon_nitro_pint_330ml": "Dragon Nitro Pint 330ml", "beer_dragon_silver_can_330ml": "Dragon Silver Can 330ml", "beer_ganzberg_can_330ml": "Ganzberg Can 330ml",
    "beer_ganzberg_gold_lite_can_330ml": "Ganzberg Gold Lite Can 330ml", "beer_ganzberg_snow_can_330ml": "Ganzberg Snow Can 330ml", "beer_greet_can_330ml": "Greet Can 330ml",
    "beer_greet_lite_can_330ml": "Greet Lite Can 330ml", "beer_guiness_can_330ml": "Guiness Can 330ml", "beer_hanuman_can_330ml": "Hanuman Can 330ml",
    "beer_hanuman_pint_330ml": "Hanuman Pint 330ml", "beer_hanuman_lite_can_330ml": "Hanuman Lite Can 330ml", "beer_hanuman_black_can_330ml": "Hanuman Black Can 330ml",
    "beer_hanuman_black_pint_330ml": "Hanuman Black Pint 330ml", "beer_krud_can_330ml": "Krud Can 330ml", "beer_krud_pint_330ml": "Krud Pint 330ml",
    "beer_krud_lite_can_330ml": "Krud Lite Can 330ml", "beer_krud_lite_pint_330ml": "Krud Lite Pint 330ml", "beer_leo_can_330ml": "LEO Can 330ml",
    "beer_mattrid_can_330ml": "Mattrid Can 330ml", "beer_neak_can_330ml": "Neak Beer Can 330ml", "beer_singha_can_330ml": "Singha Beer Can 330ml",
    "beer_singha_pint_330ml": "Signha Beer Pint 330ml", "beer_tiger_can_330ml": "Tiger Can 330ml", "beer_tiger_pint_330ml": "Tiger Pint 330ml",
    "beer_tiger_crystal_can_330ml": "Tiger Crystal Can 330ml", "beer_tiger_crystal_pint_330ml": "Tiger Crystal Pint 330ml", "beer_vattanac_can_330ml": "Vattanac Can 330ml",
    "beer_vattanac_pint_330ml": "Vattanac Pint 330ml", "beer_vattanac_lagerade_can_330ml": "Vattanac Lagerade Can 330ml", "beer_vattanac_premium_light_can_330ml": "Vattanac Premium Light Can 330ml",
    "beer_vattanac_premium_light_pint_330ml": "Vattanac Premium Light Pint 330ml", "beer_umai_mugi_can_330ml": "Umai Mugi Can 330ml", "csd_7up_can_330ml": "7up Can 33ml",
    "csd_big_cola_pet_320ml": "Big Cola PET 320ml", "csd_big_cola_pet_1500ml": "Big Cola PET 1.5L", "csd_big_cola_pet_3100ml": "Big Cola PET 3.1L",
    "csd_cocacola_can_185ml": "Coca-Cola Can 185ml", "csd_cocacola_can_330ml": "Coca-Cola Can 330ml", "csd_cocacola_pet_1500ml": "Coca-Cola PET 1.5L",
    "csd_cocacola_pet_600ml": "Coca-Cola PET 600ml", "csd_cambodia_cola_can_250ml": "Cambodia Cola Can 250ml", "csd_cambodia_cola_can_330ml": "Cambodia Cola Can 330ml",
    "csd_est_cola_pet_1500ml": "Est Cola PET 1.5L", "csd_est_cola_can_325ml": "Est Cola Can 325ml", "csd_fanta_sprite_can_330ml": "Fanta & Sprite Can 330ml",
    "csd_ize_cola_can_330ml": "IZE Cola Can 330ml", "csd_ize_cola_can_250ml": "IZE Cola Can 250ml", "csd_ize_cola_pet_300ml": "IZE Cola PET 300ml",
    "csd_ize_cola_pet_500ml": "IZE Cola PET 500ml", "csd_ize_cola_pet_1500ml": "IZE Cola PET 1.5L", "csd_krud_cola_can_250ml": "Krud Cola Can 250ml",
    "csd_mirinda_green_can_330ml": "Mirinda Green Can 330ml", "csd_mirinda_orange_can_330ml": "Mirinda Orange Can 330ml", "csd_pepsi_can_330ml": "Pepsi Can 330ml",
    "ed_bacchus_can_250ml": "Bacchus Can 250ml", "ed_boostrong_can_250ml": "Boostrong Can 250ml", "ed_super_boostrong_can_250ml": "Super Boostrong Can 250ml",
    "ed_carabao_can_250ml": "Carabao Can 250ml", "ed_dazz_can_250ml": "DAZZ Can 250ml", "ed_dazz_zero_can_250ml": "DAZZ Zero Can 250ml",
    "ed_greet_energy_can_250ml": "Greet Energy Can 250ml", "ed_krud_energy_can_250ml": "Krud Energy Can 250ml", "ed_krud_pure_charge_can_250ml": "Krud Pure Charge Can 250ml",
    "ed_m150_can_250ml": "M-150 Can 250ml", "ed_m150_pint_150ml": "M-150 Pint 150ml", "ed_missile_can_250ml": "Missile Can 250ml",
    "ed_powaram_can_330ml": "POWARAM Can 330ml", "ed_red_ant_can_250ml": "Red Ant Can 250ml", "ed_redbull_can_250ml": "Red-Bull Can 250ml",
    "ed_vikingz_can_250ml": "Vikingz Can 250ml", "ed_wurkz_can_250ml": "Wurkz Can 250ml", "ed_dragon_can_250ml": "Dragon Can 250ml",
    "ed_aira_can_250ml": "Aira Can 250ml", "ed_sting_power_can_250ml": "Sting Power Can 250ml", "ed_kingkong_can_250ml": "King Kong Can 250ml",
    "isotonic_pocari_sweat_pet_500ml": "Pocari Sweat PET 500ml", "isotonic_vactive_white_pet_350ml": "V-Active White PET 350ml", "isotonic_vactive_white_pet_600ml": "V-Active White PET 600ml",
    "isotonic_vactive_white_can_330ml": "V-Active White Can 330ml", "isotonic_vactive_green_can_330ml": "V-Active Green Can 330ml", "isotonic_vactive_red_can_330ml": "V-Active Red Can 330ml",
    "isotonic_vactive_yellow_can_330ml": "V-Active Yellow Can 330ml", "isotonic_vactive_yellow_pet_350ml": "V-Active Yellow PET 350ml", "isotonic_vactive_yellow_pet_600ml": "V-Active Yellow PET 600ml",
    "isotonic_cambodia_sport_pet_300ml": "Cambodia Sport+ PET 300ml", "isotonic_cambodia_sport_pet_500ml": "Cambodia Sport+ PET 500ml", "med_champion_can_250ml": "Champion Can 250ml",
    "med_champion_green_can_250ml": "Champion Green Can 250ml", "med_icy_cool_can_250ml": "Icy Cool Can 250ml", "med_kizz_can_250ml": "KIZZ Can 250ml",
    "med_krud_ice_power_can_250ml": "Krud Ice Power Can 250ml", "med_vigor_can_250ml": "Vigor Can 250ml", "med_wurkz_ice_can_250ml": "Wurkz ICE Can 250ml",
    "rtd_tea_ichitan_pet_500ml": "Ichitan PET 500ml", "rtd_tea_oishi_pet_500ml": "Oishi PET 500ml", "rtd_tea_ad_pet_500ml": "AD PET 500ml",
    "rtd_tea_v_lemon_pet_500ml": "V Lemon PET 500ml", "scsd_exprez_strawberry_can_330ml": "Exprez Strawberry Can 330ml", "scsd_exprez_strawberry_pet_300ml": "Exprez Strawberry PET 300ml",
    "scsd_exprez_strawberry_pet_500ml": "Exprez Strawberry PET 500ml", "scsd_exprez_melon_can_330ml": "Exprez Melon Can 330ml", "scsd_exprez_melon_pet_300ml": "Exprez Melon PET 300ml",
    "scsd_idol_can_330ml": "Idol Can 330ml", "scsd_samurai_can_330ml": "Samurai Can 330ml", "scsd_samurai_pet_480ml": "Samurai PET 480ml",
    "scsd_sting_red_can_330ml": "Sting Red Can 330ml", "scsd_sting_red_pet_500ml": "Sting Red PET 500ml", "scsd_sting_yellow_can_330ml": "Sting Yellow Can 330ml",
    "scsd_sting_yellow_pet_500ml": "Sting Yellow PET 500ml", "scsd_sting_blue_charge_can_330ml": "Sting Blue Can 330ml", "scsd_top_upp_can_330ml": "Top Upp Can 330ml",
    "water_angkor_puro_pet_350ml": "Angkor Puro PET 350ml", "water_angkor_puro_pet_500ml": "Angkor Puro PET 500ml", "water_angkor_puro_pet_1500ml": "Angkor Puro PET 1.5L",
    "water_aruna_pet_500ml": "Aruna PET 500ml", "water_aruna_pet_1500ml": "Aruna PET 1.5L", "water_bn_pet_630ml": "BN Water PET 630ml",
    "water_bn_pet_1500ml": "BN Water PET 1.5L", "water_cambodia_pet_350ml": "Cambodia Water PET 350ml", "water_cambodia_pet_500ml": "Cambodia Water PET 500ml",
    "water_cambodia_pet_1500ml": "Cambodia Water PET 1.5L", "water_colee_pet_300ml": "Colee Water PET 300ml", "water_colee_pet_500ml": "Colee Water PET 500ml",
    "water_colee_pet_1500ml": "Colee Water PET 1.5L", "water_dasani_pet_500ml": "Dasani PET 500ml", "water_dasani_pet_1500ml": "Dasani PET 1.5L",
    "water_hitech_pet_250ml": "Hi-Tech PET 250ml", "water_hitech_pet_350ml": "Hi-Tech PET 350ml", "water_hitech_pet_600ml": "Hi-Tech PET 600ml",
    "water_hitech_pet_1500ml": "Hi-Tech PET 1.5L", "water_lyyon_pet_500ml": "Lyyon PET 500ml", "water_lyyon_pet_1500ml": "Lyyon PET 1.5L",
    "water_namthip_pet_550ml": "Namthip PET 550ml", "water_oral_pet_500ml": "Oral PET 500ml", "water_provida_pet_250ml": "Provida PET 250ml",
    "water_provida_pet_330ml": "Provida PET 330ml", "water_provida_pet_500ml": "Provida PET 500ml", "water_provida_pet_1500ml": "Provida PET 1.5L",
    "water_singha_pet_600ml": "Singha Water PET 600ml", "water_singha_pet_1500ml": "Singha Water PET 1.5L", "water_vital_pet_250ml": "Vital PET 250ml",
    "water_vital_pet_350ml": "Vital PET 350ml", "water_vital_pet_500ml": "Vital PET 500ml", "water_vital_pet_1500ml": "Vital PET 1.5L",
    "water_eragold_pet_300ml": "Eragold PET 300ml", "water_eragold_pet_500ml": "Eragold PET 500ml", "water_eragold_pet_1500ml": "Eragold PET 1500ml",
    "water_bokor_pet_330ml": "Bokor PET 330ml", "water_bokor_pet_500ml": "Bokor PET 500ml", "water_bokor_pet_1500ml": "Bokor PET 1500ml",
    "water_bokor_pet_2000ml": "Bokor PET 2000ml", "water_ganzberg_pet_500ml": "Ganzberg PET 500ml", "water_ganzberg_pet_1500ml": "Ganzberg PET 1500ml",
    "water_kulen_pet_330ml": "Kulen PET 330ml", "water_kulen_pet_500ml": "Kulen PET 500ml", "water_kulen_pet_700ml": "Kulen PET 700ml",
    "water_kulen_pet_1500ml": "Kulen PET 1500ml", "water_kulen_pet_2000ml": "Kulen PET 2000ml", "water_elan_pet_300ml": "Elan PET 300ml",
    "water_elan_pet_500ml": "Elan PET 500ml", "water_elan_pet_1500ml": "Elan PET 1500ml"
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

def convert_to_usd(amount):
    if amount is None or amount == '' or amount == 'N/A':
        return ""
    try:
        val = float(amount)
        if val >= 1000:
            return round(val / 4000.0, 3) 
        return val 
    except ValueError:
        return amount

def to_number(val):
    if not val:
        return ""
    clean_val = str(val).replace(',', '').strip()
    try:
        return float(clean_val) if '.' in clean_val else int(clean_val)
    except ValueError:
        return clean_val

def clean_html(text):
    if text is None:
        return ""
    return str(text).replace('&', 'and').replace('<', '').replace('>', '')

def send_telegram_media_group(message, photo_urls):
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
    
    # --- Category mapped exactly to Kobo form label ---
    cat_raw = str(data.get('category') or '').lower().strip()
    category = CATEGORY_MAP.get(cat_raw, cat_raw.title().replace('_', ' '))
    
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
    
    s_val = to_number(scheme_parts[0] if len(scheme_parts) > 0 else "")
    f_prod = to_number(scheme_parts[1] if len(scheme_parts) > 1 else "")
    posm = "+".join(scheme_parts[2:]) if len(scheme_parts) > 2 else ""

    # --- BRAND & PACKAGING FORMATTING ---
    brand_raw = str(data.get('brand_select') or 'Unknown Brand')
    
    # 1. Map directly to exact Kobo Form Label
    brand_clean = BRAND_MAP.get(brand_raw, brand_raw.replace('_', ' ').title())
    
    # 2. Convert 1000ml or higher to Liters across ANY brand smoothly
    match = re.search(r'([\d\.]+)\s*ml', brand_clean, re.IGNORECASE)
    if match:
        ml_val = float(match.group(1))
        if ml_val >= 1000:
            l_val = ml_val / 1000
            l_str = f"{l_val:g}L"
            brand_clean = re.sub(r'[\d\.]+\s*ml', l_str, brand_clean, flags=re.IGNORECASE)

    # 3. Clean up generic caps in case of unmapped items
    brand_clean = brand_clean.replace('Pet', 'PET').replace('Ml', 'ml')

    # 4. Extract pure packaging to its own column cleanly (e.g., "PET 1.5L" or "Can 330ml")
    pack_match = re.search(r'(Can|Pint|PET|Bottle)[\s_]*[\d\.]+[a-zA-Z]+', brand_clean, re.IGNORECASE)
    packaging = pack_match.group(0) if pack_match else ""
    
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

    # --- 3. GOOGLE SHEETS INJECTION ---
    try:
        existing_ids = clean_sheet.col_values(18) 
        
        if kobo_id in existing_ids:
            row_index = existing_ids.index(kobo_id) + 1
        else:
            row_index = len(existing_ids) + 1 

        pap_formula = f"=IFERROR(($E{row_index}*$B{row_index})/SUM($B{row_index}:$C{row_index}), 0)"

        row_data = [
            scheme_raw, s_val, f_prod, posm, convert_to_usd(price_base), note, channel_clean, "", 
            date_val, region, brand_final, category, packaging, week_val, type_val, 
            photo1, pap_formula, kobo_id
        ]
        row_data = ["" if v is None else v for v in row_data]
        
        clean_sheet.update(f'A{row_index}:R{row_index}', [row_data], value_input_option='USER_ENTERED')
        
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
