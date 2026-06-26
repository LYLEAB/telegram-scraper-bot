export interface ReferenceData {
  regions: Array<{ code: string; label: string }>;
  provinces: Array<{ code: string; label: string }>;
  districts: Array<{ code: string; label: string; province_code: string }>;
  dealers: Array<{ code: string; label: string; region_code: string }>;
  district_dealers: Array<{ district_code: string; dealer_code: string }>;
  channels: Array<{ code: string; label: string }>;
  sub_channels: Array<{ code: string; label: string }>;
  categories: Array<{ code: string; label: string }>;
  brands: Array<{ code: string; label: string; category_code: string }>;
  type_selects: Array<{ code: string; label: string }>;
  price_sources: Array<{ code: string; label: string }>;
}

export const INITIAL_FORM_STATE = {
  submitted_by: '',
  submission_date: '',
  region_code: '',
  dealer_code: '',
  province_code: '',
  district_code: '',
  category_code: '', // used client-side to filter brands
  brand_code: '',
  type_select_code: '',
  channel_code: '',
  sub_channel_code: '',
  price_source_code: '',
  scheme: '',
  basic_price: '',
  net_price: '',
  sellout_price_seller: '',
  sellout_price_consumer: '',
  note: '',
  lat: '',
  lng: '',
};

export type FormState = typeof INITIAL_FORM_STATE;
