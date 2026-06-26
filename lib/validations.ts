import { FormState } from './constants';

export interface ValidationErrors {
  [key: string]: string;
}

export function validateForm(state: FormState): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!state.submitted_by.trim()) {
    errors.submitted_by = 'Staff name is required.';
  }

  if (!state.submission_date) {
    errors.submission_date = 'Submission date is required.';
  }

  if (!state.region_code) {
    errors.region_code = 'Region selection is required.';
  }

  if (!state.province_code) {
    errors.province_code = 'Province selection is required.';
  }

  if (!state.district_code) {
    errors.district_code = 'District selection is required.';
  }

  if (!state.dealer_code) {
    errors.dealer_code = 'Dealer selection is required.';
  }

  if (!state.brand_code) {
    errors.brand_code = 'Brand selection is required.';
  }

  if (!state.channel_code) {
    errors.channel_code = 'Channel selection is required.';
  }

  if (!state.sub_channel_code) {
    errors.sub_channel_code = 'Sub-channel selection is required.';
  }

  if (!state.price_source_code) {
    errors.price_source_code = 'Price source is required.';
  }

  if (!state.type_select_code) {
    errors.type_select_code = 'Packaging/Type selection is required.';
  }

  // Helper to validate decimal number
  const checkPrice = (val: string, fieldName: string) => {
    if (val.trim()) {
      const num = Number(val);
      if (isNaN(num)) {
        errors[fieldName] = 'Must be a valid number.';
      } else if (num < 0) {
        errors[fieldName] = 'Price cannot be negative.';
      }
    }
  };

  checkPrice(state.basic_price, 'basic_price');
  checkPrice(state.net_price, 'net_price');
  checkPrice(state.sellout_price_seller, 'sellout_price_seller');
  checkPrice(state.sellout_price_consumer, 'sellout_price_consumer');

  if (state.lat.trim()) {
    const lat = Number(state.lat);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.lat = 'Latitude must be between -90 and 90.';
    }
  }

  if (state.lng.trim()) {
    const lng = Number(state.lng);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.lng = 'Longitude must be between -180 and 180.';
    }
  }

  return errors;
}
