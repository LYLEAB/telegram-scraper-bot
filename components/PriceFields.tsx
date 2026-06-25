import React from 'react';
import { ReferenceData } from '../lib/constants';
import { ValidationErrors } from '../lib/validations';

interface PriceFieldsProps {
  formState: {
    basic_price: string;
    net_price: string;
    sellout_price_seller: string;
    sellout_price_consumer: string;
    price_source_code: string;
  };
  onFieldChange: (name: string, value: string) => void;
  referenceData: ReferenceData;
  errors: ValidationErrors;
}

export const PriceFields: React.FC<PriceFieldsProps> = ({
  formState,
  onFieldChange,
  referenceData,
  errors,
}) => {
  const handleNumericChange = (name: string, value: string) => {
    // Restrict input to numbers and decimals only (e.g. up to 2 decimal places)
    const cleanValue = value.replace(/[^0-9.]/g, '');
    
    // Check if it's a valid single-decimal structure
    const parts = cleanValue.split('.');
    if (parts.length > 2) return; // Prevent multiple decimal points
    
    onFieldChange(name, cleanValue);
  };

  return (
    <>
      <div className="grid-2">
        {/* Basic Price */}
        <div className="form-group">
          <label className="form-label" htmlFor="basic_price">
            Basic Price ($)
          </label>
          <input
            className="form-input"
            type="text"
            id="basic_price"
            name="basic_price"
            placeholder="e.g. 11.50"
            value={formState.basic_price}
            onChange={(e) => handleNumericChange('basic_price', e.target.value)}
          />
          {errors.basic_price && <span className="error-message">{errors.basic_price}</span>}
        </div>

        {/* Price Source select */}
        <div className="form-group">
          <label className="form-label" htmlFor="price_source_code">
            Price Source *
          </label>
          <select
            className="form-input"
            id="price_source_code"
            name="price_source_code"
            value={formState.price_source_code}
            onChange={(e) => onFieldChange('price_source_code', e.target.value)}
          >
            <option value="">Select Source</option>
            {referenceData.price_sources.map((source) => (
              <option key={source.code} value={source.code}>
                {source.label}
              </option>
            ))}
          </select>
          {errors.price_source_code && (
            <span className="error-message">{errors.price_source_code}</span>
          )}
        </div>
      </div>

      <div className="grid-2">
        {/* Net Price */}
        <div className="form-group">
          <label className="form-label" htmlFor="net_price">
            Net Price ($)
          </label>
          <input
            className="form-input"
            type="text"
            id="net_price"
            name="net_price"
            placeholder="e.g. 11.20"
            value={formState.net_price}
            onChange={(e) => handleNumericChange('net_price', e.target.value)}
          />
          {errors.net_price && <span className="error-message">{errors.net_price}</span>}
        </div>

        {/* Sell Out Price to Seller */}
        <div className="form-group">
          <label className="form-label" htmlFor="sellout_price_seller">
            Sell Out Price (Seller) ($)
          </label>
          <input
            className="form-input"
            type="text"
            id="sellout_price_seller"
            name="sellout_price_seller"
            placeholder="e.g. 11.80"
            value={formState.sellout_price_seller}
            onChange={(e) => handleNumericChange('sellout_price_seller', e.target.value)}
          />
          {errors.sellout_price_seller && (
            <span className="error-message">{errors.sellout_price_seller}</span>
          )}
        </div>
      </div>

      <div className="grid-2">
        {/* Sell Out Price to Consumer */}
        <div className="form-group last">
          <label className="form-label" htmlFor="sellout_price_consumer">
            Sell Out Price (Consumer) ($)
          </label>
          <input
            className="form-input"
            type="text"
            id="sellout_price_consumer"
            name="sellout_price_consumer"
            placeholder="e.g. 12.00"
            value={formState.sellout_price_consumer}
            onChange={(e) => handleNumericChange('sellout_price_consumer', e.target.value)}
          />
          {errors.sellout_price_consumer && (
            <span className="error-message">{errors.sellout_price_consumer}</span>
          )}
        </div>
        
        {/* Intentionally blank grid space to keep spacing consistent */}
        <div className="form-group last"></div>
      </div>
    </>
  );
};
