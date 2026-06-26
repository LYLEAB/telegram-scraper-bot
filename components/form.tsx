'use client';

import React, { useState } from 'react';
import { INITIAL_FORM_STATE, ReferenceData } from '../lib/constants';
import { validateForm, ValidationErrors } from '../lib/validations';
import { LocationSelect } from './LocationSelect';
import { PriceFields } from './PriceFields';

interface FormProps {
  referenceData: ReferenceData;
}

export default function Form({ referenceData }: FormProps) {
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onFieldChange = (name: string, value: string) => {
    setFormState((prev) => {
      const updated = { ...prev, [name]: value };

      // Reset nested cascading values
      if (name === 'province_code') {
        updated.district_code = '';
        updated.dealer_code = '';
      } else if (name === 'district_code') {
        updated.dealer_code = '';
      } else if (name === 'region_code') {
        updated.dealer_code = '';
      } else if (name === 'category_code') {
        updated.brand_code = '';
      }

      return updated;
    });

    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onFieldChange('lat', position.coords.latitude.toString());
        onFieldChange('lng', position.coords.longitude.toString());
      },
      (error) => {
        alert(`Unable to retrieve location: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateForm(formState);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      
      // Auto scroll to first error
      const firstErrorField = Object.keys(validationErrors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);

    // Convert values and structure payload to match app/api/submit/route.ts expectation
    const payload = {
      submitted_by: formState.submitted_by.trim(),
      submission_date: formState.submission_date,
      region_code: formState.region_code,
      dealer_code: formState.dealer_code,
      province_code: formState.province_code,
      district_code: formState.district_code,
      brand_code: formState.brand_code,
      channel_code: formState.channel_code,
      sub_channel_code: formState.sub_channel_code,
      price_source_code: formState.price_source_code,
      type_select_code: formState.type_select_code || null,
      scheme: formState.scheme.trim() || null,
      basic_price: formState.basic_price ? parseFloat(formState.basic_price) : null,
      net_price: formState.net_price ? parseFloat(formState.net_price) : null,
      sellout_price_seller: formState.sellout_price_seller ? parseFloat(formState.sellout_price_seller) : null,
      sellout_price_consumer: formState.sellout_price_consumer ? parseFloat(formState.sellout_price_consumer) : null,
      note: formState.note.trim() || null,
      lat: formState.lat ? parseFloat(formState.lat) : null,
      lng: formState.lng ? parseFloat(formState.lng) : null,
    };

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit tracking report.');
      }

      setSuccess(true);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'An unexpected error occurred.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormState(INITIAL_FORM_STATE);
    setErrors({});
    setServerError(null);
    setSuccess(false);
  };

  // Filter brands based on category selection client-side
  const filteredBrands = formState.category_code
    ? referenceData.brands.filter((b) => b.category_code === formState.category_code)
    : [];

  return (
    <div className="card">
      {success && (
        <div className="success-overlay">
          <div className="success-modal">
            <div className="success-icon">✓</div>
            <h2>Submission Success!</h2>
            <p>Your pricing and promotion data has been stored. The Telegram alert is being sent.</p>
            <button className="btn-done" onClick={handleReset}>
              Submit Another Report
            </button>
          </div>
        </div>
      )}

      {serverError && (
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Section 1: Staff Details */}
        <div className="form-section">
          <h2 className="section-title">👤 Submitter Info</h2>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="submitted_by">
                Staff Name *
              </label>
              <input
                className="form-input"
                type="text"
                id="submitted_by"
                name="submitted_by"
                placeholder="Enter your full name"
                value={formState.submitted_by}
                onChange={(e) => onFieldChange('submitted_by', e.target.value)}
              />
              {errors.submitted_by && <span className="error-message">{errors.submitted_by}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="submission_date">
                Report Date *
              </label>
              <input
                className="form-input"
                type="date"
                id="submission_date"
                name="submission_date"
                value={formState.submission_date}
                onChange={(e) => onFieldChange('submission_date', e.target.value)}
              />
              {errors.submission_date && (
                <span className="error-message">{errors.submission_date}</span>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Market Location */}
        <div className="form-section">
          <h2 className="section-title">📍 Location & Dealer</h2>
          <LocationSelect
            formState={formState}
            onFieldChange={onFieldChange}
            referenceData={referenceData}
            errors={errors}
          />
        </div>

        {/* Section 3: Product Info */}
        <div className="form-section">
          <h2 className="section-title">🛍️ Product & Channel</h2>
          <div className="grid-2">
            {/* Category Select */}
            <div className="form-group">
              <label className="form-label" htmlFor="category_code">
                Category *
              </label>
              <select
                className="form-input"
                id="category_code"
                name="category_code"
                value={formState.category_code}
                onChange={(e) => onFieldChange('category_code', e.target.value)}
              >
                <option value="">Select Category</option>
                {referenceData.categories.map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Select */}
            <div className="form-group">
              <label className="form-label" htmlFor="brand_code">
                Brand *
              </label>
              <select
                className="form-input"
                id="brand_code"
                name="brand_code"
                value={formState.brand_code}
                onChange={(e) => onFieldChange('brand_code', e.target.value)}
                disabled={!formState.category_code}
              >
                <option value="">
                  {!formState.category_code ? 'Select Category First' : 'Select Brand'}
                </option>
                {filteredBrands.map((brand) => (
                  <option key={brand.code} value={brand.code}>
                    {brand.label}
                  </option>
                ))}
              </select>
              {errors.brand_code && <span className="error-message">{errors.brand_code}</span>}
            </div>
          </div>

          <div className="grid-2">
            {/* Type/Select Code */}
            <div className="form-group">
              <label className="form-label" htmlFor="type_select_code">
                Packaging/Type *
              </label>
              <select
                className="form-input"
                id="type_select_code"
                name="type_select_code"
                value={formState.type_select_code}
                onChange={(e) => onFieldChange('type_select_code', e.target.value)}
              >
                <option value="">Select Packaging</option>
                {referenceData.type_selects.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.type_select_code && (
                <span className="error-message">{errors.type_select_code}</span>
              )}
            </div>

            {/* Empty grid spacer */}
            <div className="form-group"></div>
          </div>

          <div className="grid-2">
            {/* Channel Select */}
            <div className="form-group">
              <label className="form-label" htmlFor="channel_code">
                Channel *
              </label>
              <select
                className="form-input"
                id="channel_code"
                name="channel_code"
                value={formState.channel_code}
                onChange={(e) => onFieldChange('channel_code', e.target.value)}
              >
                <option value="">Select Channel</option>
                {referenceData.channels.map((chan) => (
                  <option key={chan.code} value={chan.code}>
                    {chan.label}
                  </option>
                ))}
              </select>
              {errors.channel_code && <span className="error-message">{errors.channel_code}</span>}
            </div>

            {/* Sub Channel Select */}
            <div className="form-group">
              <label className="form-label" htmlFor="sub_channel_code">
                Sub-Channel *
              </label>
              <select
                className="form-input"
                id="sub_channel_code"
                name="sub_channel_code"
                value={formState.sub_channel_code}
                onChange={(e) => onFieldChange('sub_channel_code', e.target.value)}
              >
                <option value="">Select Sub-Channel</option>
                {referenceData.sub_channels.map((subChan) => (
                  <option key={subChan.code} value={subChan.code}>
                    {subChan.label}
                  </option>
                ))}
              </select>
              {errors.sub_channel_code && (
                <span className="error-message">{errors.sub_channel_code}</span>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Prices */}
        <div className="form-section">
          <h2 className="section-title">💵 Price Details</h2>
          <PriceFields
            formState={formState}
            onFieldChange={onFieldChange}
            referenceData={referenceData}
            errors={errors}
          />
        </div>

        {/* Section 5: Scheme & Note */}
        <div className="form-section">
          <h2 className="section-title">📝 Promotion & Note</h2>
          <div className="form-group">
            <label className="form-label" htmlFor="scheme">
              Promotion Scheme
            </label>
            <input
              className="form-input"
              type="text"
              id="scheme"
              name="scheme"
              placeholder="e.g. 20+1, 10+1 free sample"
              value={formState.scheme}
              onChange={(e) => onFieldChange('scheme', e.target.value)}
            />
          </div>

          <div className="form-group last">
            <label className="form-label" htmlFor="note">
              Additional Remarks
            </label>
            <textarea
              className="form-input"
              id="note"
              name="note"
              placeholder="Any other observations..."
              rows={3}
              style={{ resize: 'vertical' }}
              value={formState.note}
              onChange={(e) => onFieldChange('note', e.target.value)}
            />
          </div>
        </div>

        {/* Section 6: Geolocation details */}
        <div className="form-section">
          <h2 className="section-title">🌐 GPS Coordinates</h2>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="lat">
                Latitude
              </label>
              <div className="geo-input-container">
                <input
                  className="form-input"
                  type="text"
                  id="lat"
                  name="lat"
                  placeholder="e.g. 11.556"
                  value={formState.lat}
                  onChange={(e) => onFieldChange('lat', e.target.value)}
                />
                <button
                  type="button"
                  className="btn-geo"
                  title="Find location"
                  onClick={handleGetLocation}
                >
                  📍
                </button>
              </div>
              {errors.lat && <span className="error-message">{errors.lat}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="lng">
                Longitude
              </label>
              <input
                className="form-input"
                type="text"
                id="lng"
                name="lng"
                placeholder="e.g. 104.928"
                value={formState.lng}
                onChange={(e) => onFieldChange('lng', e.target.value)}
              />
              {errors.lng && <span className="error-message">{errors.lng}</span>}
            </div>
          </div>
        </div>

        <button className="btn-submit" type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <div className="spinner" /> Submitting Report...
            </>
          ) : (
            'Submit Pricing Report'
          )}
        </button>
      </form>
    </div>
  );
}
