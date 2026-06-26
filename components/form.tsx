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
  const [gpsLoading, setGpsLoading] = useState(false);

  const onFieldChange = (name: string, value: string) => {
    setFormState((prev) => {
      const updated = { ...prev, [name]: value };
      // Cascade resets handled by LocationSelect itself, but also handle category→brand here
      if (name === 'category_code') updated.brand_code = '';
      return updated;
    });
    if (errors[name]) {
      setErrors((prev) => { const c = { ...prev }; delete c[name]; return c; });
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported.'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onFieldChange('lat', pos.coords.latitude.toFixed(6));
        onFieldChange('lng', pos.coords.longitude.toFixed(6));
        setGpsLoading(false);
      },
      (err) => { alert(`Location error: ${err.message}`); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const validationErrors = validateForm(formState);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstKey = Object.keys(validationErrors)[0];
      document.getElementById(firstKey)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    const payload = {
      submitted_by:           formState.submitted_by.trim(),
      region_code:            formState.region_code,
      dealer_code:            formState.dealer_code,
      province_code:          formState.province_code,
      district_code:          formState.district_code,
      brand_code:             formState.brand_code,
      channel_code:           formState.channel_code,
      sub_channel_code:       formState.sub_channel_code,
      price_source_code:      formState.price_source_code,
      type_select_code:       formState.type_select_code || null,
      scheme:                 formState.scheme.trim() || null,
      basic_price:            formState.basic_price ? parseFloat(formState.basic_price) : null,
      net_price:              formState.net_price ? parseFloat(formState.net_price) : null,
      sellout_price_seller:   formState.sellout_price_seller ? parseFloat(formState.sellout_price_seller) : null,
      sellout_price_consumer: formState.sellout_price_consumer ? parseFloat(formState.sellout_price_consumer) : null,
      note:                   formState.note.trim() || null,
      lat:                    formState.lat ? parseFloat(formState.lat) : null,
      lng:                    formState.lng ? parseFloat(formState.lng) : null,
    };
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed.');
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Unexpected error.');
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

  const filteredBrands = formState.category_code
    ? referenceData.brands.filter((b) => b.category_code === formState.category_code)
    : [];

  // ── Success State ──────────────────────────────
  if (success) {
    return (
      <div className="card">
        <div className="success-card">
          <h2>Report Submitted!</h2>
          <p>
            Pricing data saved to the database. A Telegram alert has been sent to the operations group.
          </p>
          <button className="btn-submit" onClick={handleReset} style={{ maxWidth: 280, margin: '0 auto' }}>
            + Submit Another Report
          </button>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────
  return (
    <div className="card">

      {serverError && (
        <div className="form-section" style={{ paddingBottom: '0.5rem' }}>
          <div className="alert alert-warning" role="alert">
            <strong>Error:</strong> {serverError}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>

        {/* ── Section 1: Submitter ──────────────── */}
        <div className="form-section">
          <div className="section-header">
            <h2 className="section-title">Submitter Info</h2>
          </div>
          <div className="grid-2">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="submitted_by">Staff Name *</label>
              <input
                className={`form-input ${errors.submitted_by ? 'input-error' : ''}`}
                type="text"
                id="submitted_by"
                name="submitted_by"
                placeholder="Your full name"
                value={formState.submitted_by}
                onChange={(e) => onFieldChange('submitted_by', e.target.value)}
              />
              {errors.submitted_by && <span className="error-message">{errors.submitted_by}</span>}
            </div>
          </div>
        </div>

        {/* ── Section 2: Location ───────────────── */}
        <div className="form-section">
          <div className="section-header">
            <h2 className="section-title">Location &amp; Dealer</h2>
          </div>
          <LocationSelect
            formState={formState}
            onFieldChange={onFieldChange}
            referenceData={referenceData}
            errors={errors}
          />
        </div>

        {/* ── Section 3: Product & Channel ─────── */}
        <div className="form-section">
          <div className="section-header">
            <h2 className="section-title">Product &amp; Channel</h2>
          </div>

          {/* Category → Brand */}
          <div className="cascade-row">
            <div className="form-group">
              <label className="form-label" htmlFor="category_code">Category *</label>
              <select
                className={`form-input ${errors.category_code ? 'input-error' : ''}`}
                id="category_code"
                name="category_code"
                value={formState.category_code}
                onChange={(e) => onFieldChange('category_code', e.target.value)}
              >
                <option value="">Select Category</option>
                {referenceData.categories.map((cat) => (
                  <option key={cat.code} value={cat.code}>{cat.label}</option>
                ))}
              </select>
              {errors.category_code && <span className="error-message">{errors.category_code}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="brand_code">
                Brand *
                {!formState.category_code && <span className="cascade-hint"> — pick Category first</span>}
              </label>
              <select
                className={`form-input ${errors.brand_code ? 'input-error' : ''} ${!formState.category_code ? 'input-disabled' : ''}`}
                id="brand_code"
                name="brand_code"
                value={formState.brand_code}
                onChange={(e) => onFieldChange('brand_code', e.target.value)}
                disabled={!formState.category_code}
              >
                <option value="">
                  {!formState.category_code
                    ? 'Select Category First'
                    : `Select Brand (${filteredBrands.length})`}
                </option>
                {filteredBrands.map((b) => (
                  <option key={b.code} value={b.code}>{b.label}</option>
                ))}
              </select>
              {errors.brand_code && <span className="error-message">{errors.brand_code}</span>}
            </div>
          </div>

          {/* Packaging + Channel */}
          <div className="cascade-row">
            <div className="form-group">
              <label className="form-label" htmlFor="type_select_code">Packaging/Type *</label>
              <select
                className={`form-input ${errors.type_select_code ? 'input-error' : ''}`}
                id="type_select_code"
                name="type_select_code"
                value={formState.type_select_code}
                onChange={(e) => onFieldChange('type_select_code', e.target.value)}
              >
                <option value="">Select Packaging</option>
                {referenceData.type_selects.map((t) => (
                  <option key={t.code} value={t.code}>{t.label}</option>
                ))}
              </select>
              {errors.type_select_code && <span className="error-message">{errors.type_select_code}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="channel_code">Channel *</label>
              <select
                className={`form-input ${errors.channel_code ? 'input-error' : ''}`}
                id="channel_code"
                name="channel_code"
                value={formState.channel_code}
                onChange={(e) => onFieldChange('channel_code', e.target.value)}
              >
                <option value="">Select Channel</option>
                {referenceData.channels.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              {errors.channel_code && <span className="error-message">{errors.channel_code}</span>}
            </div>
          </div>

          {/* Sub-Channel */}
          <div className="form-group">
            <label className="form-label" htmlFor="sub_channel_code">Sub-Channel *</label>
            <select
              className={`form-input ${errors.sub_channel_code ? 'input-error' : ''}`}
              id="sub_channel_code"
              name="sub_channel_code"
              value={formState.sub_channel_code}
              onChange={(e) => onFieldChange('sub_channel_code', e.target.value)}
            >
              <option value="">Select Sub-Channel</option>
              {referenceData.sub_channels.map((s) => (
                <option key={s.code} value={s.code}>{s.label}</option>
              ))}
            </select>
            {errors.sub_channel_code && <span className="error-message">{errors.sub_channel_code}</span>}
          </div>
        </div>

        {/* ── Section 4: Prices ────────────────── */}
        <div className="form-section">
          <div className="section-header">
            <h2 className="section-title">Price Details</h2>
          </div>
          <PriceFields
            formState={formState}
            onFieldChange={onFieldChange}
            referenceData={referenceData}
            errors={errors}
          />
        </div>

        {/* ── Section 5: Scheme & Note ──────────── */}
        <div className="form-section">
          <div className="section-header">
            <h2 className="section-title">Promotion &amp; Notes</h2>
          </div>
          <div className="form-group" style={{ marginBottom: '0.875rem' }}>
            <label className="form-label" htmlFor="scheme">Promotion Scheme</label>
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
          <div className="form-group">
            <label className="form-label" htmlFor="note">Additional Remarks</label>
            <textarea
              className="form-input"
              id="note"
              name="note"
              placeholder="Market observations, competitor activity..."
              rows={3}
              style={{ resize: 'vertical', lineHeight: '1.5' }}
              value={formState.note}
              onChange={(e) => onFieldChange('note', e.target.value)}
            />
          </div>
        </div>

        {/* ── Section 6: GPS ────────────────────── */}
        <div className="form-section">
          <div className="section-header">
            <h2 className="section-title">GPS Location</h2>
          </div>
          <div className="gps-row">
            <div className="form-group">
              <label className="form-label" htmlFor="lat">Latitude</label>
              <input
                className={`form-input ${errors.lat ? 'input-error' : ''}`}
                type="text"
                id="lat"
                name="lat"
                placeholder="11.5564"
                value={formState.lat}
                onChange={(e) => onFieldChange('lat', e.target.value)}
              />
              {errors.lat && <span className="error-message">{errors.lat}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="lng">Longitude</label>
              <input
                className={`form-input ${errors.lng ? 'input-error' : ''}`}
                type="text"
                id="lng"
                name="lng"
                placeholder="104.9282"
                value={formState.lng}
                onChange={(e) => onFieldChange('lng', e.target.value)}
              />
              {errors.lng && <span className="error-message">{errors.lng}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">&nbsp;</label>
              <button
                type="button"
                className="btn-gps"
                onClick={handleGetLocation}
                disabled={gpsLoading}
                title="Auto-detect GPS coordinates"
              >
                {gpsLoading ? <span className="spinner" /> : null}
                {gpsLoading ? 'Locating…' : 'Get GPS'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Submit ────────────────────────────── */}
        <div className="form-section" style={{ borderBottom: 'none' }}>
          <button className="btn-submit" type="submit" disabled={submitting}>
            {submitting ? (
              <span className="status-badge">
                <span className="spinner" /> Submitting Report…
              </span>
            ) : (
              'Submit Pricing Report'
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
