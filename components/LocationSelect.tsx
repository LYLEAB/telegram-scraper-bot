import React from 'react';
import { ReferenceData } from '../lib/constants';
import { ValidationErrors } from '../lib/validations';

interface LocationSelectProps {
  formState: {
    region_code: string;
    dealer_code: string;
    province_code: string;
    district_code: string;
  };
  onFieldChange: (name: string, value: string) => void;
  referenceData: ReferenceData;
  errors: ValidationErrors;
}

export const LocationSelect: React.FC<LocationSelectProps> = ({
  formState,
  onFieldChange,
  referenceData,
  errors,
}) => {
  // 1. Filter districts based on selected province
  const filteredDistricts = formState.province_code
    ? referenceData.districts.filter((d) => d.province_code === formState.province_code)
    : [];

  // 2. Filter dealers based on selected region and district
  let filteredDealers = referenceData.dealers;

  if (formState.region_code) {
    filteredDealers = filteredDealers.filter((d) => d.region_code === formState.region_code);
  }

  if (formState.district_code) {
    const validDealerCodesForDistrict = new Set(
      referenceData.district_dealers
        .filter((dd) => dd.district_code === formState.district_code)
        .map((dd) => dd.dealer_code)
    );
    filteredDealers = filteredDealers.filter((d) => validDealerCodesForDistrict.has(d.code));
  }

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onFieldChange('province_code', val);
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onFieldChange('district_code', val);
  };

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onFieldChange('region_code', val);
  };

  return (
    <>
      <div className="grid-2">
        {/* Province Select */}
        <div className="form-group">
          <label className="form-label" htmlFor="province_code">
            Province *
          </label>
          <select
            className="form-input"
            id="province_code"
            name="province_code"
            value={formState.province_code}
            onChange={handleProvinceChange}
          >
            <option value="">Select Province</option>
            {referenceData.provinces.map((prov) => (
              <option key={prov.code} value={prov.code}>
                {prov.label}
              </option>
            ))}
          </select>
          {errors.province_code && <span className="error-message">{errors.province_code}</span>}
        </div>

        {/* District Select */}
        <div className="form-group">
          <label className="form-label" htmlFor="district_code">
            District *
          </label>
          <select
            className="form-input"
            id="district_code"
            name="district_code"
            value={formState.district_code}
            onChange={handleDistrictChange}
            disabled={!formState.province_code}
          >
            <option value="">
              {!formState.province_code ? 'Select Province First' : 'Select District'}
            </option>
            {filteredDistricts.map((dist) => (
              <option key={dist.code} value={dist.code}>
                {dist.label}
              </option>
            ))}
          </select>
          {errors.district_code && <span className="error-message">{errors.district_code}</span>}
        </div>
      </div>

      <div className="grid-2">
        {/* Region Select */}
        <div className="form-group">
          <label className="form-label" htmlFor="region_code">
            Region *
          </label>
          <select
            className="form-input"
            id="region_code"
            name="region_code"
            value={formState.region_code}
            onChange={handleRegionChange}
          >
            <option value="">Select Region</option>
            {referenceData.regions.map((reg) => (
              <option key={reg.code} value={reg.code}>
                {reg.label}
              </option>
            ))}
          </select>
          {errors.region_code && <span className="error-message">{errors.region_code}</span>}
        </div>

        {/* Dealer Select */}
        <div className="form-group">
          <label className="form-label" htmlFor="dealer_code">
            Dealer *
          </label>
          <select
            className="form-input"
            id="dealer_code"
            name="dealer_code"
            value={formState.dealer_code}
            onChange={(e) => onFieldChange('dealer_code', e.target.value)}
          >
            <option value="">Select Dealer</option>
            {filteredDealers.map((deal) => (
              <option key={deal.code} value={deal.code}>
                {deal.label}
              </option>
            ))}
          </select>
          {errors.dealer_code && <span className="error-message">{errors.dealer_code}</span>}
        </div>
      </div>
    </>
  );
};
