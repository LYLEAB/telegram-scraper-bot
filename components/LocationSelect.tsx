'use client';

import React, { useMemo } from 'react';
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
  // Step 1: Province → filter Districts
  const filteredDistricts = useMemo(
    () =>
      formState.province_code
        ? referenceData.districts.filter((d) => d.province_code === formState.province_code)
        : [],
    [formState.province_code, referenceData.districts]
  );

  // Step 2: District → filter Dealers via district_dealers join
  const filteredDealers = useMemo(() => {
    if (!formState.district_code) return [];
    const validCodes = new Set(
      referenceData.district_dealers
        .filter((dd) => dd.district_code === formState.district_code)
        .map((dd) => dd.dealer_code)
    );
    return referenceData.dealers.filter((d) => validCodes.has(d.code));
  }, [formState.district_code, referenceData.district_dealers, referenceData.dealers]);

  // Step 3: When a Dealer is selected, auto-derive Region from dealer.region_code
  const handleDealerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dealerCode = e.target.value;
    onFieldChange('dealer_code', dealerCode);
    if (dealerCode) {
      const dealer = referenceData.dealers.find((d) => d.code === dealerCode);
      if (dealer?.region_code) {
        onFieldChange('region_code', dealer.region_code);
      }
    } else {
      onFieldChange('region_code', '');
    }
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFieldChange('province_code', e.target.value);
    onFieldChange('district_code', '');
    onFieldChange('dealer_code', '');
    onFieldChange('region_code', '');
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFieldChange('district_code', e.target.value);
    onFieldChange('dealer_code', '');
    onFieldChange('region_code', '');
  };

  // Derive the region label to show as a read-only pill when auto-filled
  const selectedRegion = formState.region_code
    ? referenceData.regions.find((r) => r.code === formState.region_code)
    : null;

  return (
    <>
      {/* Row 1: Province → District */}
      <div className="cascade-row">
        <div className="form-group">
          <label className="form-label" htmlFor="province_code">
            Province *
          </label>
          <div className="select-wrapper">
            <select
              className={`form-input ${errors.province_code ? 'input-error' : ''}`}
              id="province_code"
              name="province_code"
              value={formState.province_code}
              onChange={handleProvinceChange}
            >
              <option value="">📍 Select Province</option>
              {referenceData.provinces.map((prov) => (
                <option key={prov.code} value={prov.code}>
                  {prov.label}
                </option>
              ))}
            </select>
          </div>
          {errors.province_code && <span className="error-message">{errors.province_code}</span>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="district_code">
            District *
            {!formState.province_code && (
              <span className="cascade-hint"> — pick Province first</span>
            )}
          </label>
          <div className="select-wrapper">
            <select
              className={`form-input ${errors.district_code ? 'input-error' : ''} ${!formState.province_code ? 'input-disabled' : ''}`}
              id="district_code"
              name="district_code"
              value={formState.district_code}
              onChange={handleDistrictChange}
              disabled={!formState.province_code}
            >
              <option value="">
                {!formState.province_code ? '⬆ Select Province First' : '🏘 Select District'}
              </option>
              {filteredDistricts.map((dist) => (
                <option key={dist.code} value={dist.code}>
                  {dist.label}
                </option>
              ))}
            </select>
          </div>
          {errors.district_code && <span className="error-message">{errors.district_code}</span>}
        </div>
      </div>

      {/* Row 2: Dealer (filtered by district) → Region (auto-filled) */}
      <div className="cascade-row">
        <div className="form-group">
          <label className="form-label" htmlFor="dealer_code">
            Dealer *
            {!formState.district_code && (
              <span className="cascade-hint"> — pick District first</span>
            )}
          </label>
          <div className="select-wrapper">
            <select
              className={`form-input ${errors.dealer_code ? 'input-error' : ''} ${!formState.district_code ? 'input-disabled' : ''}`}
              id="dealer_code"
              name="dealer_code"
              value={formState.dealer_code}
              onChange={handleDealerChange}
              disabled={!formState.district_code}
            >
              <option value="">
                {!formState.district_code
                  ? '⬆ Select District First'
                  : filteredDealers.length === 0
                  ? 'No Dealers in this District'
                  : `🏪 Select Dealer (${filteredDealers.length})`}
              </option>
              {filteredDealers.map((deal) => (
                <option key={deal.code} value={deal.code}>
                  {deal.label}
                </option>
              ))}
            </select>
          </div>
          {errors.dealer_code && <span className="error-message">{errors.dealer_code}</span>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="region_code">
            Region
            <span className="cascade-hint"> — auto-filled from dealer</span>
          </label>
          <div className={`region-display ${selectedRegion ? 'region-filled' : 'region-empty'}`}>
            {selectedRegion ? (
              <>
                <span className="region-icon">✅</span>
                <span className="region-label">{selectedRegion.label}</span>
              </>
            ) : (
              <span className="region-placeholder">Auto-filled when dealer is selected</span>
            )}
          </div>
          {/* Hidden input to carry the value */}
          <input type="hidden" id="region_code" name="region_code" value={formState.region_code} />
          {errors.region_code && <span className="error-message">{errors.region_code}</span>}
        </div>
      </div>
    </>
  );
};
